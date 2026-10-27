/**
 * Diagnostic Check Script
 * Run this to identify common issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Diagnostic Check...\n');
console.log('='.repeat(50));

// Check 1: Required directories
console.log('\n📁 Checking Directories...');
const requiredDirs = [
  'Backend',
  'Backend/routes',
  'Backend/services',
  'Backend/models',
  'Backend/middleware',
  'Backend/core',
  'Backend/core/events',
  'BHIV-Fouth-Installment-main'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ❌ ${dir} - MISSING`);
  }
});

// Check 2: Required files
console.log('\n📄 Checking Key Files...');
const requiredFiles = [
  'Backend/server.js',
  'Backend/package.json',
  'Backend/routes/coreRoutes.js',
  'Backend/routes/coreWebhooksRoutes.js',
  'Backend/core/events/core_events.js',
  'Backend/core/events/webhooks.js',
  'Backend/.env'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} - ${file.includes('.env') ? 'Optional' : 'MISSING'}`);
  }
});

// Check 3: Node modules
console.log('\n📦 Checking Dependencies...');
const backendNodeModules = path.join('Backend', 'node_modules');
if (fs.existsSync(backendNodeModules)) {
  console.log('  ✅ Backend/node_modules exists');
  
  // Check for critical dependencies
  const criticalDeps = ['express', 'mongoose', 'axios', 'cors', 'multer'];
  criticalDeps.forEach(dep => {
    const depPath = path.join(backendNodeModules, dep);
    if (fs.existsSync(depPath)) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
    }
  });
} else {
  console.log('  ❌ Backend/node_modules - MISSING');
  console.log('  💡 Run: cd Backend && npm install');
}

// Check 4: Python files (optional)
console.log('\n🐍 Checking Python Files (Optional)...');
const pythonFiles = [
  'Backend/core/events/core_events.py',
  'Backend/core/events/webhooks.py'
];

pythonFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} - Optional (fallback mode available)`);
  }
});

// Check 5: Environment variables
console.log('\n🔐 Checking Environment...');
const envPath = path.join('Backend', '.env');
if (fs.existsSync(envPath)) {
  console.log('  ✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['MONGODB_URI', 'PORT'];
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`  ✅ ${varName} configured`);
    } else {
      console.log(`  ⚠️  ${varName} - not found`);
    }
  });
} else {
  console.log('  ⚠️  .env file not found - using defaults');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ Diagnostic Complete!');
console.log('\nIf you see any ❌ errors above, those need to be fixed.');
console.log('If you see ⚠️  warnings, the system will still work but with limitations.');
console.log('\n💡 To start the backend: cd Backend && npm start');
console.log('💡 To run tests: node test-bhiv-integration.js');

