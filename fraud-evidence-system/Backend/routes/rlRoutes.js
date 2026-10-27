// RL Routes - Reinforcement Learning Predictions and Feedback
const express = require('express');
const router = express.Router();

// Import services and models
const { rlAgent } = require('../services/rlAgentService');
const RLLog = require('../models/RLLog');
const Evidence = require('../models/Evidence');
const { publishEvent, EVENT_TYPES } = require('../services/eventPublisher');
const { logAudit } = require('../services/auditService');

// Import RBAC middleware
const { requirePermission } = require('../middleware/rbacMiddleware');

/**
 * POST /api/rl/predict
 * Get fraud prediction using RL agent
 * 
 * Required Permission: rl-predict
 * Allowed Roles: analyst, investigator, admin, superadmin
 * 
 * Request Body:
 * {
 *   wallet: string (required),
 *   features: {
 *     transactionCount: number,
 *     totalVolume: number,
 *     avgTransactionValue: number,
 *     uniqueAddresses: number,
 *     suspiciousPatterns: number,
 *     accountAge: number,
 *     riskLevel: string
 *   }
 * }
 */
router.post('/predict',
  requirePermission('rl-predict'),
  async (req, res) => {
    try {
      const { wallet, features = {}, evidenceId, caseId } = req.body;

      console.log('🤖 RL Prediction request:', {
        wallet,
        features,
        requestedBy: req.user?.email || 'unknown'
      });

      // Validation
      if (!wallet) {
        return res.status(400).json({
          error: true,
          code: 400,
          message: 'Wallet address is required for prediction',
          timestamp: new Date().toISOString()
        });
      }

      // Validate wallet format (basic Ethereum address check)
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({
          error: true,
          code: 400,
          message: 'Invalid wallet address format. Expected Ethereum address (0x...)',
          timestamp: new Date().toISOString()
        });
      }

      // Get prediction from RL agent (deterministic)
      const prediction = rlAgent.predict({ wallet, features });

      console.log('✅ RL Prediction generated:', {
        wallet,
        action: prediction.action,
        score: prediction.score,
        state: prediction.state
      });

      // Save prediction to RLLog
      const rlLog = new RLLog({
        evidenceId: evidenceId || null,
        wallet,
        features: {
          ...features,
          caseId: caseId || features.caseId
        },
        prediction: {
          action: prediction.action,
          score: prediction.score,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          explainableFeatures: prediction.explainableFeatures
        },
        requestType: 'prediction',
        modelVersion: prediction.modelVersion,
        requestedBy: req.user?.email || 'unknown',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await rlLog.save();

      console.log('📝 Prediction logged to database:', rlLog._id);

      // Audit log (non-blocking)
      logAudit({
        userId: req.user?.id || req.user?.email || 'anonymous',
        userEmail: req.user?.email,
        userRole: req.userRole || 'analyst',
        action: 'rl_predict',
        resourceType: 'rl',
        resourceId: rlLog._id.toString(),
        method: 'POST',
        endpoint: '/api/rl/predict',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success',
        details: {
          wallet,
          action: prediction.action,
          score: prediction.score,
          state: prediction.state,
          evidenceId,
          caseId
        },
        severity: prediction.action === 'freeze' ? 'high' : 'medium'
      }).catch(err => console.warn('Audit log failed (non-critical):', err.message));

      // Publish event to Kafka (non-blocking)
      publishEvent(EVENT_TYPES.RL_PREDICTION_MADE, {
        predictionId: rlLog._id.toString(),
        wallet,
        action: prediction.action,
        score: prediction.score,
        state: prediction.state,
        evidenceId: evidenceId || null,
        caseId: caseId || null
      }, {
        userId: req.user?.email,
        priority: prediction.action === 'freeze' ? 'high' : 'medium'
      }).catch(err => console.warn('Event publish failed (non-critical):', err.message));

      // Return prediction response
      res.status(200).json({
        success: true,
        prediction: {
          wallet,
          action: prediction.action,
          score: prediction.score,
          confidence: prediction.confidence,
          state: prediction.state,
          reasoning: prediction.reasoning,
          explainableFeatures: prediction.explainableFeatures,
          recommendedActions: generateRecommendations(prediction.action, prediction.score),
          modelVersion: prediction.modelVersion,
          timestamp: prediction.timestamp
        },
        metadata: {
          predictionId: rlLog._id,
          evidenceId: evidenceId || null,
          caseId: caseId || null
        }
      });

    } catch (error) {
      console.error('❌ Error in RL prediction:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to generate prediction',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * POST /api/rl/feedback
 * Submit feedback on RL prediction
 * 
 * Required Permission: rl-feedback
 * Allowed Roles: investigator, admin, superadmin
 * 
 * Request Body:
 * {
 *   evidenceId: string OR predictionId: string (required),
 *   wallet: string,
 *   outcome: string (correct|incorrect|partially_correct|false_positive|false_negative),
 *   actualAction: string (monitor|investigate|freeze|dismiss),
 *   adminNotes: string
 * }
 */
router.post('/feedback',
  requirePermission('rl-feedback'),
  async (req, res) => {
    try {
      const {
        evidenceId,
        predictionId,
        wallet,
        outcome,
        actualAction,
        adminNotes
      } = req.body;

      console.log('📊 RL Feedback submission:', {
        evidenceId,
        predictionId,
        outcome,
        submittedBy: req.user?.email || 'unknown'
      });

      // Validation
      if (!evidenceId && !predictionId && !wallet) {
        return res.status(400).json({
          error: true,
          code: 400,
          message: 'Either evidenceId, predictionId, or wallet is required',
          timestamp: new Date().toISOString()
        });
      }

      if (!outcome) {
        return res.status(400).json({
          error: true,
          code: 400,
          message: 'Outcome is required for feedback',
          validOutcomes: ['correct', 'incorrect', 'partially_correct', 'false_positive', 'false_negative'],
          timestamp: new Date().toISOString()
        });
      }

      // Find the prediction log
      let rlLog = null;
      
      if (predictionId) {
        rlLog = await RLLog.findById(predictionId);
      } else if (evidenceId) {
        rlLog = await RLLog.findOne({ evidenceId }).sort({ predictedAt: -1 });
      } else if (wallet) {
        rlLog = await RLLog.findOne({ wallet }).sort({ predictedAt: -1 });
      }

      if (!rlLog) {
        return res.status(404).json({
          error: true,
          code: 404,
          message: 'No prediction found for this evidence/wallet',
          suggestion: 'Make a prediction first using POST /api/rl/predict',
          timestamp: new Date().toISOString()
        });
      }

      // Process feedback and calculate reward
      const feedbackProcessed = rlAgent.processFeedback({
        outcome,
        actualAction,
        predictedAction: rlLog.prediction.action
      });

      // Update RLLog with feedback
      rlLog.feedback = {
        outcome,
        actualAction: actualAction || rlLog.prediction.action,
        adminNotes: adminNotes || '',
        submittedBy: req.user?.email || 'unknown',
        submittedAt: new Date(),
        reward: feedbackProcessed.reward
      };
      rlLog.requestType = 'feedback';

      await rlLog.save();

      console.log('✅ Feedback saved:', {
        predictionId: rlLog._id,
        outcome,
        reward: feedbackProcessed.reward
      });

      // Audit log (non-blocking)
      logAudit({
        userId: req.user?.id || req.user?.email || 'anonymous',
        userEmail: req.user?.email,
        userRole: req.userRole || 'investigator',
        action: 'rl_feedback',
        resourceType: 'rl',
        resourceId: rlLog._id.toString(),
        method: 'POST',
        endpoint: '/api/rl/feedback',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success',
        details: {
          wallet: rlLog.wallet,
          outcome,
          reward: feedbackProcessed.reward,
          predictedAction: rlLog.prediction.action,
          actualAction,
          evidenceId: rlLog.evidenceId
        },
        severity: 'high'
      }).catch(err => console.warn('Audit log failed (non-critical):', err.message));

      // Publish event to Kafka (non-blocking)
      publishEvent(EVENT_TYPES.RL_FEEDBACK_RECEIVED, {
        feedbackId: rlLog._id.toString(),
        wallet: rlLog.wallet,
        predictedAction: rlLog.prediction.action,
        actualAction: actualAction || rlLog.prediction.action,
        outcome,
        reward: feedbackProcessed.reward,
        evidenceId: rlLog.evidenceId ? rlLog.evidenceId.toString() : null
      }, {
        userId: req.user?.email,
        priority: 'high'
      }).catch(err => console.warn('Event publish failed (non-critical):', err.message));

      // Calculate current model accuracy
      const modelAccuracy = await RLLog.calculateAccuracy();

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback: {
          id: rlLog._id,
          wallet: rlLog.wallet,
          predictedAction: rlLog.prediction.action,
          actualAction: actualAction || rlLog.prediction.action,
          outcome,
          reward: feedbackProcessed.reward,
          outcomeCategory: feedbackProcessed.outcomeCategory,
          adminNotes: adminNotes || '',
          submittedBy: req.user?.email || 'unknown',
          submittedAt: rlLog.feedback.submittedAt
        },
        modelImpact: {
          rewardSignal: feedbackProcessed.reward,
          trainingValue: feedbackProcessed.trainingValue,
          currentAccuracy: modelAccuracy.accuracy,
          totalFeedback: modelAccuracy.totalFeedback,
          retrainingScheduled: false // In production, trigger retraining
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to submit feedback',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/rl/stats
 * Get RL model statistics
 * 
 * Required Permission: rl-predict
 */
router.get('/stats',
  requirePermission('rl-predict'),
  async (req, res) => {
    try {
      // Get agent stats
      const agentStats = rlAgent.getStats();
      
      // Get prediction statistics from database
      const totalPredictions = await RLLog.countDocuments({ requestType: 'prediction' });
      const totalFeedback = await RLLog.countDocuments({ 'feedback.outcome': { $exists: true } });
      
      // Get action distribution
      const actionDistribution = await RLLog.aggregate([
        { $match: { requestType: 'prediction' } },
        { $group: { _id: '$prediction.action', count: { $sum: 1 } } }
      ]);
      
      // Get outcome distribution
      const outcomeDistribution = await RLLog.aggregate([
        { $match: { 'feedback.outcome': { $exists: true } } },
        { $group: { _id: '$feedback.outcome', count: { $sum: 1 } } }
      ]);
      
      // Calculate model accuracy
      const modelAccuracy = await RLLog.calculateAccuracy();

      res.json({
        success: true,
        stats: {
          agent: agentStats,
          predictions: {
            total: totalPredictions,
            withFeedback: totalFeedback,
            withoutFeedback: totalPredictions - totalFeedback
          },
          accuracy: modelAccuracy,
          actions: actionDistribution.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          outcomes: outcomeDistribution.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching RL stats:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to fetch RL statistics',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * GET /api/rl/predictions/:wallet
 * Get prediction history for a wallet
 * 
 * Required Permission: rl-predict
 */
router.get('/predictions/:wallet',
  requirePermission('rl-predict'),
  async (req, res) => {
    try {
      const { wallet } = req.params;
      const { limit = 10, page = 1 } = req.query;
      
      const skip = (page - 1) * limit;
      
      const predictions = await RLLog.find({ wallet })
        .sort({ predictedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-ipAddress -userAgent');
      
      const total = await RLLog.countDocuments({ wallet });

      res.json({
        success: true,
        wallet,
        predictions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: 'Failed to fetch prediction history',
        timestamp: new Date().toISOString()
      });
    }
});

/**
 * Helper function to generate action recommendations
 * @param {string} action - Predicted action
 * @param {number} score - Prediction score
 * @returns {Array<string>} - Recommendations
 */
function generateRecommendations(action, score) {
  const recommendations = [];
  
  switch (action) {
    case 'monitor':
      recommendations.push('Continue monitoring wallet activity');
      recommendations.push('Set up alerts for suspicious transactions');
      if (score < 0.7) {
        recommendations.push('Consider periodic manual review');
      }
      break;
      
    case 'investigate':
      recommendations.push('Assign to fraud investigator');
      recommendations.push('Gather additional evidence');
      recommendations.push('Review transaction history');
      if (score > 0.8) {
        recommendations.push('Prioritize investigation due to high confidence');
      }
      break;
      
    case 'freeze':
      recommendations.push('Immediate action required');
      recommendations.push('Freeze wallet if possible');
      recommendations.push('Escalate to authorities');
      recommendations.push('Preserve all evidence');
      if (score > 0.9) {
        recommendations.push('URGENT: High fraud probability detected');
      }
      break;
  }
  
  return recommendations;
}

module.exports = router;
