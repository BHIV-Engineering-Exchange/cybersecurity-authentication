require('dotenv').config();
const mongoose = require('mongoose');
const MLAnalysis = require('../models/MLAnalysis');
const CaseManager = require('../models/CaseManager');
const User = require('../models/User');

async function createMissingCases() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all ML analyses that don't have corresponding case manager entries
    const mlAnalyses = await MLAnalysis.find({});
    console.log(`📊 Found ${mlAnalyses.length} ML analyses`);
    
    let casesCreated = 0;
    let casesSkipped = 0;
    
    for (const mlAnalysis of mlAnalyses) {
      try {
        // Check if case already exists
        const existingCase = await CaseManager.findOne({ mlAnalysisId: mlAnalysis._id });
        if (existingCase) {
          console.log(`⏭️  Case already exists for ML analysis ${mlAnalysis._id}`);
          casesSkipped++;
          continue;
        }
        
        // Get user information
        let userEmail = mlAnalysis.userEmail || 'anonymous@example.com';
        let userRole = mlAnalysis.userRole || 'investigator';
        let user = null;
        
        // Try to find user by email
        if (userEmail !== 'anonymous@example.com') {
          user = await User.findOne({ email: userEmail });
          if (user) {
            userRole = user.role;
          }
        }
        
        // Only create cases for investigators
        if (userRole === 'investigator') {
          // Determine priority based on risk level
          let priority = 'Low';
          if (mlAnalysis.analysisResults.riskLevel === 'CRITICAL') priority = 'Critical';
          else if (mlAnalysis.analysisResults.riskLevel === 'HIGH') priority = 'High';
          else if (mlAnalysis.analysisResults.riskLevel === 'MEDIUM') priority = 'Medium';
          
          // Create new case
          const newCase = new CaseManager({
            walletAddress: mlAnalysis.walletAddress,
            riskScore: Math.round(mlAnalysis.analysisResults.fraudProbability * 100),
            status: 'New',
            investigatorId: user ? user._id : null,
            investigatorName: user ? (user.name || user.email) : userEmail,
            investigatorEmail: userEmail,
            mlAnalysisId: mlAnalysis._id,
            incidentReportId: mlAnalysis.incidentReportId,
            analysisResults: mlAnalysis.analysisResults,
            modelInfo: mlAnalysis.modelInfo,
            priority,
            tags: ['ML Analysis', mlAnalysis.analysisResults.riskLevel],
            createdBy: user ? user._id : null
          });
          
          await newCase.save();
          console.log(`✅ Created case ${newCase.caseId} for investigator ${userEmail} (ML Analysis: ${mlAnalysis._id})`);
          casesCreated++;
        } else {
          console.log(`⏭️  Skipping non-investigator analysis: ${userEmail} (${userRole})`);
          casesSkipped++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ML analysis ${mlAnalysis._id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Cases created: ${casesCreated}`);
    console.log(`⏭️  Cases skipped: ${casesSkipped}`);
    console.log(`📋 Total ML analyses processed: ${mlAnalyses.length}`);
    
    // Show final case count
    const totalCases = await CaseManager.countDocuments();
    console.log(`📋 Total cases in Case Manager: ${totalCases}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createMissingCases();

