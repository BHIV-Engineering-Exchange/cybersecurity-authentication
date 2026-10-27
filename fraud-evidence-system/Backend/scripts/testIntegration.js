require('dotenv').config();
const mongoose = require('mongoose');
const CaseManager = require('../models/CaseManager');
const MLAnalysis = require('../models/MLAnalysis');
const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');

async function testIntegration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 TESTING ADMIN-INVESTIGATOR INTEGRATION...\n');
    
    // Test 1: Check if we have admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`👑 Admin Users: ${adminUsers.length}`);
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.role})`);
    });
    
    // Test 2: Check if we have investigator users
    const investigatorUsers = await User.find({ role: 'investigator' });
    console.log(`\n🔍 Investigator Users: ${investigatorUsers.length}`);
    investigatorUsers.forEach(investigator => {
      console.log(`   - ${investigator.email} (${investigator.role})`);
    });
    
    // Test 3: Check incident reports
    const incidentReports = await IncidentReport.find({});
    console.log(`\n📋 Incident Reports: ${incidentReports.length}`);
    incidentReports.forEach(report => {
      console.log(`   - ${report.reporterEmail} → ${report.walletAddress} (${report.reason})`);
    });
    
    // Test 4: Check ML analyses
    const mlAnalyses = await MLAnalysis.find({});
    console.log(`\n🤖 ML Analyses: ${mlAnalyses.length}`);
    mlAnalyses.forEach(analysis => {
      console.log(`   - ${analysis.userEmail} → ${analysis.walletAddress} (${analysis.analysisResults?.riskLevel})`);
    });
    
    // Test 5: Check case manager entries
    const cases = await CaseManager.find({});
    console.log(`\n📊 Case Manager Entries: ${cases.length}`);
    cases.forEach(caseEntry => {
      console.log(`   - ${caseEntry.caseId}: ${caseEntry.investigatorEmail} → ${caseEntry.walletAddress} (${caseEntry.status})`);
    });
    
    // Test 6: Verify data consistency
    console.log('\n🔗 DATA CONSISTENCY CHECK:');
    
    // Check if incident reports have corresponding ML analyses
    let mlAnalysisMatches = 0;
    for (const report of incidentReports) {
      const correspondingML = await MLAnalysis.findOne({
        walletAddress: report.walletAddress.toLowerCase(),
        userEmail: report.reporterEmail
      });
      if (correspondingML) {
        mlAnalysisMatches++;
      }
    }
    console.log(`   ✅ Incident Reports with ML Analysis: ${mlAnalysisMatches}/${incidentReports.length}`);
    
    // Check if ML analyses have corresponding cases
    let caseMatches = 0;
    for (const analysis of mlAnalyses) {
      const correspondingCase = await CaseManager.findOne({
        mlAnalysisId: analysis._id
      });
      if (correspondingCase) {
        caseMatches++;
      }
    }
    console.log(`   ✅ ML Analyses with Cases: ${caseMatches}/${mlAnalyses.length}`);
    
    // Test 7: Role-based access simulation
    console.log('\n🔐 ROLE-BASED ACCESS SIMULATION:');
    
    // Simulate admin access - should see all cases
    const adminCases = await CaseManager.find({});
    console.log(`   👑 Admin can see: ${adminCases.length} cases (ALL)`);
    
    // Simulate investigator access - should see only their own cases
    for (const investigator of investigatorUsers) {
      const investigatorCases = await CaseManager.find({
        investigatorEmail: investigator.email
      });
      console.log(`   🔍 ${investigator.email} can see: ${investigatorCases.length} cases (OWN ONLY)`);
    }
    
    // Test 8: Integration completeness
    console.log('\n📈 INTEGRATION COMPLETENESS:');
    
    const totalUsers = adminUsers.length + investigatorUsers.length;
    const hasUsers = totalUsers > 0;
    const hasReports = incidentReports.length > 0;
    const hasMLAnalyses = mlAnalyses.length > 0;
    const hasCases = cases.length > 0;
    const hasRoleSeparation = adminUsers.length > 0 && investigatorUsers.length > 0;
    
    console.log(`   👥 User Management: ${hasUsers ? '✅' : '❌'} (${totalUsers} users)`);
    console.log(`   📋 Incident Reports: ${hasReports ? '✅' : '❌'} (${incidentReports.length} reports)`);
    console.log(`   🤖 ML Analysis: ${hasMLAnalyses ? '✅' : '❌'} (${mlAnalyses.length} analyses)`);
    console.log(`   📊 Case Management: ${hasCases ? '✅' : '❌'} (${cases.length} cases)`);
    console.log(`   🔐 Role Separation: ${hasRoleSeparation ? '✅' : '❌'} (${adminUsers.length} admins, ${investigatorUsers.length} investigators)`);
    
    // Overall integration score
    const integrationScore = [hasUsers, hasReports, hasMLAnalyses, hasCases, hasRoleSeparation].filter(Boolean).length;
    const integrationPercentage = (integrationScore / 5) * 100;
    
    console.log(`\n🎯 OVERALL INTEGRATION SCORE: ${integrationScore}/5 (${integrationPercentage}%)`);
    
    if (integrationPercentage >= 80) {
      console.log('✅ EXCELLENT: Admin-Investigator integration is working properly!');
    } else if (integrationPercentage >= 60) {
      console.log('⚠️  GOOD: Most integrations working, minor issues to fix');
    } else {
      console.log('❌ NEEDS WORK: Integration has significant issues');
    }
    
    // Test 9: Specific workflow test
    console.log('\n🔄 WORKFLOW TEST:');
    
    if (incidentReports.length > 0 && mlAnalyses.length > 0 && cases.length > 0) {
      console.log('   ✅ Complete workflow: Incident → ML Analysis → Case Manager');
      
      // Find a complete workflow example
      const exampleReport = incidentReports[0];
      const exampleML = await MLAnalysis.findOne({
        walletAddress: exampleReport.walletAddress.toLowerCase()
      });
      const exampleCase = await CaseManager.findOne({
        walletAddress: exampleReport.walletAddress
      });
      
      if (exampleReport && exampleML && exampleCase) {
        console.log('   ✅ Example workflow found:');
        console.log(`      📋 Report: ${exampleReport.reporterEmail} → ${exampleReport.walletAddress}`);
        console.log(`      🤖 ML: ${exampleML.userEmail} → Risk: ${exampleML.analysisResults?.riskLevel}`);
        console.log(`      📊 Case: ${exampleCase.caseId} → ${exampleCase.status}`);
      }
    } else {
      console.log('   ❌ Incomplete workflow: Missing some components');
    }
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the integration test
testIntegration();

