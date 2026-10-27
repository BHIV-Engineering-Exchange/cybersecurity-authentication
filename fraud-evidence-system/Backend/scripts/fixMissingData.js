require('dotenv').config();
const mongoose = require('mongoose');
const MLAnalysis = require('../models/MLAnalysis');
const CaseManager = require('../models/CaseManager');
const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');

async function fixMissingData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find incident reports with fraud analysis but no corresponding ML analysis
    const incidentReports = await IncidentReport.find({ fraudAnalysis: { $exists: true } });
    console.log(`📊 Found ${incidentReports.length} incident reports with fraud analysis`);
    
    let mlAnalysesCreated = 0;
    let casesCreated = 0;
    
    for (const incidentReport of incidentReports) {
      try {
        console.log(`\n🔍 Processing incident report: ${incidentReport._id}`);
        console.log(`   Wallet: ${incidentReport.walletAddress}`);
        console.log(`   Reporter: ${incidentReport.reporterEmail}`);
        
        // Check if ML analysis already exists
        const existingMlAnalysis = await MLAnalysis.findOne({ 
          walletAddress: incidentReport.walletAddress.toLowerCase(),
          userEmail: incidentReport.reporterEmail 
        });
        
        if (existingMlAnalysis) {
          console.log(`   ⏭️  ML analysis already exists: ${existingMlAnalysis._id}`);
        } else {
          // Find user by email to get the createdBy field
          const user = await User.findOne({ email: incidentReport.reporterEmail });
          
          // Create ML analysis from incident report
          const mlAnalysis = new MLAnalysis({
            incidentReportId: incidentReport._id,
            walletAddress: incidentReport.walletAddress.toLowerCase(),
            analysisResults: {
              riskLevel: incidentReport.fraudAnalysis.riskLevel || 'LOW',
              fraudProbability: incidentReport.fraudAnalysis.fraudProbability || 0.25,
              isSuspicious: incidentReport.fraudAnalysis.isSuspicious || false,
              anomalyScore: incidentReport.fraudAnalysis.anomalyScore || 0.15,
              suspiciousTransactions: incidentReport.fraudAnalysis.suspiciousTransactions || [],
              suspiciousAddresses: incidentReport.fraudAnalysis.suspiciousAddresses || [],
              analysisTimestamp: incidentReport.fraudAnalysis.analysisTimestamp || new Date()
            },
            modelInfo: {
              modelType: incidentReport.fraudAnalysis.modelInfo?.modelType || 'IsolationForest',
              modelVersion: incidentReport.fraudAnalysis.modelInfo?.modelVersion || '1.0',
              confidence: incidentReport.fraudAnalysis.modelInfo?.confidence || 0.85
            },
            createdBy: user ? user._id : incidentReport.createdBy || null,
            userEmail: incidentReport.reporterEmail || 'anonymous@example.com',
            userRole: user ? user.role : 'investigator', // Use user role if available
            analysisMetadata: {
              totalTransactionsAnalyzed: incidentReport.fraudAnalysis.suspiciousTransactions?.length || 0,
              dataSource: 'bhx_transactions.json',
              processingTime: 1000,
              featuresUsed: ['amount', 'gas_price', 'transaction_frequency', 'address_patterns']
            },
            status: 'COMPLETED'
          });
          
          await mlAnalysis.save();
          console.log(`   ✅ Created ML analysis: ${mlAnalysis._id}`);
          mlAnalysesCreated++;
          
          // Now create case manager entry
          let userRole = user ? user.role : 'investigator';
          
          // Only create cases for investigators
          if (userRole === 'investigator') {
            // Check if case already exists
            const existingCase = await CaseManager.findOne({ mlAnalysisId: mlAnalysis._id });
            if (existingCase) {
              console.log(`   ⏭️  Case already exists: ${existingCase.caseId}`);
            } else {
              // Determine priority based on risk level
              let priority = 'Low';
              if (incidentReport.fraudAnalysis.riskLevel === 'CRITICAL') priority = 'Critical';
              else if (incidentReport.fraudAnalysis.riskLevel === 'HIGH') priority = 'High';
              else if (incidentReport.fraudAnalysis.riskLevel === 'MEDIUM') priority = 'Medium';
              
              const newCase = new CaseManager({
                walletAddress: incidentReport.walletAddress,
                riskScore: Math.round((incidentReport.fraudAnalysis.fraudProbability || 0.25) * 100),
                status: 'New',
                investigatorId: user ? user._id : null,
                investigatorName: user ? (user.name || user.email) : incidentReport.reporterEmail,
                investigatorEmail: incidentReport.reporterEmail,
                mlAnalysisId: mlAnalysis._id,
                incidentReportId: incidentReport._id,
                analysisResults: incidentReport.fraudAnalysis,
                modelInfo: {
                  modelType: 'IsolationForest',
                  modelVersion: '1.0',
                  confidence: 0.85
                },
                priority,
                tags: ['ML Analysis', incidentReport.fraudAnalysis.riskLevel || 'LOW', 'Incident Report'],
                createdBy: user ? user._id : null
              });
              
              await newCase.save();
              console.log(`   ✅ Created case: ${newCase.caseId}`);
              casesCreated++;
            }
          } else {
            console.log(`   ⏭️  Skipping non-investigator user: ${incidentReport.reporterEmail} (${userRole})`);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing incident report ${incidentReport._id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ ML analyses created: ${mlAnalysesCreated}`);
    console.log(`✅ Cases created: ${casesCreated}`);
    console.log(`📋 Total incident reports processed: ${incidentReports.length}`);
    
    // Show final counts
    const finalIncidentReports = await IncidentReport.countDocuments();
    const finalMlAnalyses = await MLAnalysis.countDocuments();
    const finalCases = await CaseManager.countDocuments();
    
    console.log(`\n📊 Final Database Counts:`);
    console.log(`📋 Incident Reports: ${finalIncidentReports}`);
    console.log(`🤖 ML Analyses: ${finalMlAnalyses}`);
    console.log(`📋 Case Manager Entries: ${finalCases}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixMissingData();
