require('dotenv').config();
const mongoose = require('mongoose');
const MLAnalysis = require('../models/MLAnalysis');
const CaseManager = require('../models/CaseManager');
const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');

async function checkData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Check incident reports
    const incidentReports = await IncidentReport.find({});
    console.log(`📊 Found ${incidentReports.length} incident reports`);
    
    if (incidentReports.length > 0) {
      console.log('\n📋 Incident Reports:');
      incidentReports.forEach((report, index) => {
        console.log(`${index + 1}. ID: ${report._id}`);
        console.log(`   Wallet: ${report.walletAddress}`);
        console.log(`   Reporter: ${report.reporterEmail}`);
        console.log(`   Reason: ${report.reason}`);
        console.log(`   Has Fraud Analysis: ${report.fraudAnalysis ? 'YES' : 'NO'}`);
        if (report.fraudAnalysis) {
          console.log(`   Risk Level: ${report.fraudAnalysis.riskLevel}`);
          console.log(`   Fraud Probability: ${report.fraudAnalysis.fraudProbability}`);
        }
        console.log(`   Created: ${report.createdAt}`);
        console.log('');
      });
    }
    
    // Check ML analyses
    const mlAnalyses = await MLAnalysis.find({});
    console.log(`📊 Found ${mlAnalyses.length} ML analyses`);
    
    if (mlAnalyses.length > 0) {
      console.log('\n🤖 ML Analyses:');
      mlAnalyses.forEach((analysis, index) => {
        console.log(`${index + 1}. ID: ${analysis._id}`);
        console.log(`   Wallet: ${analysis.walletAddress}`);
        console.log(`   User Email: ${analysis.userEmail}`);
        console.log(`   User Role: ${analysis.userRole}`);
        console.log(`   Risk Level: ${analysis.analysisResults?.riskLevel}`);
        console.log(`   Created: ${analysis.createdAt}`);
        console.log('');
      });
    }
    
    // Check case manager entries
    const cases = await CaseManager.find({});
    console.log(`📊 Found ${cases.length} case manager entries`);
    
    if (cases.length > 0) {
      console.log('\n📋 Case Manager Entries:');
      cases.forEach((caseEntry, index) => {
        console.log(`${index + 1}. Case ID: ${caseEntry.caseId}`);
        console.log(`   Wallet: ${caseEntry.walletAddress}`);
        console.log(`   Investigator: ${caseEntry.investigatorEmail}`);
        console.log(`   Status: ${caseEntry.status}`);
        console.log(`   Risk Score: ${caseEntry.riskScore}%`);
        console.log(`   Created: ${caseEntry.createdAt}`);
        console.log('');
      });
    }
    
    // Check users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users`);
    
    if (users.length > 0) {
      console.log('\n👥 Users:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
checkData();

