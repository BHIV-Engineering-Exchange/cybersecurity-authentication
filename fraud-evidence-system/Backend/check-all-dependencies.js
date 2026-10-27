// Comprehensive dependency check
console.log('🔍 Checking ALL Backend Dependencies...\n');

const requiredPackages = [
  // Core dependencies
  'express',
  'mongoose',
  'cors',
  'dotenv',
  'multer',
  
  // Storage dependencies
  'aws-sdk',
  'ipfs-http-client',
  
  // Utility dependencies
  'axios',
  'crypto',
  'fs',
  'path',
  
  // Service dependencies
  'geoip-lite',
  'puppeteer'
];

let allOk = true;

requiredPackages.forEach(pkg => {
  try {
    if (['crypto', 'fs', 'path'].includes(pkg)) {
      // Built-in Node.js modules
      require(pkg);
      console.log(`✅ ${pkg} (built-in)`);
    } else {
      require(pkg);
      console.log(`✅ ${pkg}`);
    }
  } catch (err) {
    console.log(`❌ ${pkg} - MISSING`);
    allOk = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allOk) {
  console.log('✅ All dependencies are installed!');
  console.log('💡 You can now start the server:');
  console.log('   npm start');
  process.exit(0);
} else {
  console.log('❌ Some dependencies are missing.');
  console.log('💡 Run: npm install');
  process.exit(1);
}

