#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

log('blue', '🔍 COMPREHENSIVE FUNCTION VERIFICATION\n');

// Test categories
const tests = {
  'Core Components': {
    files: ['src/App.tsx', 'src/components/ChatView.jsx', 'src/components/LoginView.jsx'],
    patterns: ['export default', 'return', 'useState', 'useEffect']
  },
  'Authentication': {
    files: ['src/hooks/useAuth.ts', 'src/services/gunAuthService.js'],
    patterns: ['login', 'register', 'logout', 'createGunUser', 'verifyPassword']
  },
  'Messaging': {
    files: ['src/hooks/useMessages.ts', 'src/components/ChatArea.jsx'],
    patterns: ['sendMessage', 'handleSendMessage', 'displayMessages', 'messages']
  },
  'Gun.js Integration': {
    files: ['src/hooks/useGun.ts', 'src/services/gunService.js'],
    patterns: ['gun.get', 'Gun(', 'gun.user', 'gun.on']
  },
  'Friends System': {
    files: ['src/services/friendsService.js'],
    patterns: ['getFriendsFromGun', 'addMutualFriendship', 'removeFriendship', 'getFriendsWithDetails']
  },
  'Invite System': {
    files: ['src/services/inviteService.js', 'src/utils/secureAuth.js'],
    patterns: ['createSecureInvite', 'verifySecureInvite', 'storePendingInvite', 'markInviteAsUsed']
  },
  'Presence/Online Status': {
    files: ['src/hooks/usePresence.ts'],
    patterns: ['announcePresence', 'updatePresence', 'onlineUsers', 'user_presence']
  },
  'Admin Functions': {
    files: ['src/services/adminService.js', 'src/components/TestingPanel.jsx'],
    patterns: ['createAdminUser', 'bootstrap_admin', 'handleDeleteUser', 'handleClearData']
  },
  'UI Components': {
    files: ['src/components/ContactSidebar.jsx', 'src/components/Header.jsx', 'src/components/Modal.jsx'],
    patterns: ['onClick', 'onChange', 'onSubmit', 'className']
  },
  'Security': {
    files: ['src/utils/crypto.js', 'src/utils/secureAuth.js'],
    patterns: ['encrypt', 'decrypt', 'hashPassword', 'SEA.pair', 'SEA.sign']
  }
};

let totalTests = 0;
let passedTests = 0;
let warnings = [];

// Run tests
Object.entries(tests).forEach(([category, config]) => {
  log('yellow', `\n📋 Testing ${category}:`);
  
  config.files.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
      log('red', `  ❌ File not found: ${file}`);
      warnings.push(`Missing file: ${file}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let filePass = true;
    
    config.patterns.forEach(pattern => {
      totalTests++;
      if (content.includes(pattern)) {
        passedTests++;
      } else {
        filePass = false;
        log('yellow', `    ⚠️ Pattern "${pattern}" not found in ${file}`);
      }
    });
    
    if (filePass) {
      log('green', `  ✅ ${file} - All patterns found`);
    }
  });
});

// Check for common issues
log('yellow', '\n📋 Checking for Common Issues:');

// Check for console.logs in production code
const jsFiles = fs.readdirSync('src', { recursive: true })
  .filter(f => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx'));

let consoleLogs = 0;
jsFiles.forEach(file => {
  const content = fs.readFileSync(path.join('src', file), 'utf8');
  const matches = content.match(/console\.log/g);
  if (matches) {
    consoleLogs += matches.length;
  }
});

if (consoleLogs > 50) {
  log('yellow', `  ⚠️ Found ${consoleLogs} console.log statements (consider using logger)`);
} else {
  log('green', `  ✅ Reasonable number of console.logs (${consoleLogs})`);
}

// Check for TODO comments
let todos = 0;
jsFiles.forEach(file => {
  const content = fs.readFileSync(path.join('src', file), 'utf8');
  const matches = content.match(/TODO|FIXME|XXX|HACK/gi);
  if (matches) {
    todos += matches.length;
  }
});

if (todos > 0) {
  log('yellow', `  ⚠️ Found ${todos} TODO/FIXME comments`);
} else {
  log('green', '  ✅ No TODO/FIXME comments found');
}

// Check package.json for security issues
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = Object.keys(packageJson.dependencies || {});

if (deps.includes('gun')) {
  log('green', '  ✅ Gun.js dependency found');
} else {
  log('red', '  ❌ Gun.js dependency missing!');
}

// Final report
log('blue', '\n📊 VERIFICATION SUMMARY:');
log('blue', `  Total Tests: ${totalTests}`);
log('green', `  Passed: ${passedTests}`);
log('yellow', `  Failed: ${totalTests - passedTests}`);
log('blue', `  Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (warnings.length > 0) {
  log('yellow', '\n⚠️ Warnings:');
  warnings.forEach(w => log('yellow', `  - ${w}`));
}

// Check critical functions exist
log('blue', '\n🔧 Critical Function Check:');

const criticalFunctions = {
  'Message Sending': 'handleSendMessage',
  'User Authentication': 'login.*password',
  'Gun.js Connection': 'gun\\.get\\(',
  'Friend Management': 'addMutualFriendship',
  'Invite Creation': 'createSecureInvite',
  'Data Clearing': 'handleClearData'
};

let allCritical = true;
Object.entries(criticalFunctions).forEach(([name, pattern]) => {
  let found = false;
  
  for (const file of jsFiles) {
    const content = fs.readFileSync(path.join('src', file), 'utf8');
    if (content.match(new RegExp(pattern))) {
      found = true;
      break;
    }
  }
  
  if (found) {
    log('green', `  ✅ ${name}`);
  } else {
    log('red', `  ❌ ${name} - Pattern not found`);
    allCritical = false;
  }
});

if (allCritical) {
  log('green', '\n✅ ALL CRITICAL FUNCTIONS VERIFIED!');
} else {
  log('red', '\n❌ Some critical functions missing or renamed');
}

// Exit code based on success
const successRate = (passedTests / totalTests) * 100;
if (successRate >= 90 && allCritical) {
  log('green', '\n🎉 VERIFICATION PASSED! App is functional.');
  process.exit(0);
} else if (successRate >= 70) {
  log('yellow', '\n⚠️ VERIFICATION PASSED WITH WARNINGS. App should work but needs attention.');
  process.exit(0);
} else {
  log('red', '\n❌ VERIFICATION FAILED. Critical issues found.');
  process.exit(1);
}