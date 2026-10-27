// Start server with full diagnostic output
console.log('🚀 Starting Fraud Evidence Backend with Diagnostics...\n');

// Step 1: Check critical dependencies
console.log('📦 Step 1: Checking Dependencies...');
const criticalDeps = ['express', 'mongoose', 'aws-sdk', 'axios', 'geoip-lite'];
let depsOk = true;

for (const dep of criticalDeps) {
  try {
    require(dep);
    console.log(`  ✅ ${dep}`);
  } catch (err) {
    console.log(`  ❌ ${dep} - ERROR: ${err.message}`);
    depsOk = false;
  }
}

if (!depsOk) {
  console.log('\n❌ Some dependencies are missing. Run: npm install');
  process.exit(1);
}

console.log('\n🔧 Step 2: Loading Server...');
try {
  // Set environment
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.PORT = process.env.PORT || '5050';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_evidence';
  
  console.log(`  - Environment: ${process.env.NODE_ENV}`);
  console.log(`  - Port: ${process.env.PORT}`);
  console.log(`  - MongoDB: ${process.env.MONGODB_URI}`);
  
  // Load server
  require('./server.js');
  
  console.log('\n✅ Server loaded successfully!');
  console.log('💡 Server starting... Check console output above for any errors.');
  
} catch (err) {
  console.log('\n❌ ERROR STARTING SERVER:');
  console.log(`   ${err.message}`);
  console.log('\n📋 Stack Trace:');
  console.log(err.stack);
  console.log('\n💡 This error needs to be fixed before the server can start.');
  process.exit(1);
}

