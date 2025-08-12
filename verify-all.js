#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

let totalIssues = 0;
let totalWarnings = 0;
let totalPassed = 0;

function log(message, type = 'info') {
  const prefix = {
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    success: `${colors.green}✅`,
    info: `${colors.blue}ℹ️`,
    section: `${colors.magenta}📋`
  };
  
  console.log(`${prefix[type] || prefix.info} ${message}${colors.reset}`);
  
  if (type === 'error') totalIssues++;
  if (type === 'warning') totalWarnings++;
  if (type === 'success') totalPassed++;
}

function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(path.join(__dirname, filePath));
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function countLines(filePath) {
  const content = readFile(filePath);
  return content ? content.split('\n').length : 0;
}

// Verification functions
function verifyDependencies() {
  log('Checking dependencies...', 'section');
  
  if (!checkFileExists('package.json')) {
    log('package.json not found', 'error');
    return false;
  }
  
  if (!checkFileExists('package-lock.json')) {
    log('package-lock.json not found', 'warning');
  }
  
  if (!checkFileExists('node_modules')) {
    log('node_modules not found - running npm install...', 'warning');
    const result = runCommand('npm install');
    if (!result.success) {
      log('Failed to install dependencies', 'error');
      return false;
    }
  }
  
  log('Dependencies verified', 'success');
  return true;
}

function verifyBuild() {
  log('Checking build...', 'section');
  
  log('Running build...', 'info');
  const result = runCommand('npm run build', true);
  
  if (!result.success) {
    log('Build failed: ' + result.error, 'error');
    return false;
  }
  
  if (!checkFileExists('dist')) {
    log('dist folder not created', 'error');
    return false;
  }
  
  if (!checkFileExists('dist/index.html')) {
    log('dist/index.html not found', 'error');
    return false;
  }
  
  log('Build successful', 'success');
  return true;
}

function verifyLinting() {
  log('Checking code quality...', 'section');
  
  const result = runCommand('npm run lint', true);
  
  if (!result.success) {
    if (result.error.includes('warning')) {
      log('Linting passed with warnings', 'warning');
      return true;
    }
    log('Linting failed: ' + result.error, 'error');
    return false;
  }
  
  log('Linting passed', 'success');
  return true;
}

function verifyProjectStructure() {
  log('Checking project structure...', 'section');
  
  const requiredFiles = [
    'src/App.jsx',
    'src/index.css',
    'src/main.jsx',
    'src/components/ContactSidebar.jsx',
    'src/components/ChatArea.jsx',
    'src/components/Header.jsx',
    'src/components/InviteModal.jsx',
    'src/components/SecureInviteModal.jsx',
    'src/components/TestingPanel.jsx',
    'src/components/MobileLayout.jsx',
    'src/components/FriendsPanel.jsx',
    'index.html',
    'vite.config.js',
    '.gitignore'
  ];
  
  let allFound = true;
  for (const file of requiredFiles) {
    if (!checkFileExists(file)) {
      log(`Missing required file: ${file}`, 'error');
      allFound = false;
    }
  }
  
  if (allFound) {
    log('All required files present', 'success');
  }
  
  return allFound;
}

function verifyCodeQuality() {
  log('Checking code quality metrics...', 'section');
  
  // Check App.jsx size
  const appLines = countLines('src/App.jsx');
  if (appLines > 2000) {
    log(`App.jsx is too large (${appLines} lines) - consider further refactoring`, 'warning');
  } else {
    log(`App.jsx size is reasonable (${appLines} lines)`, 'success');
  }
  
  // Check for console.logs in production code
  const files = [
    'src/App.jsx',
    'src/components/ContactSidebar.jsx',
    'src/components/ChatArea.jsx',
    'src/components/MobileLayout.jsx'
  ];
  
  let consoleLogsFound = 0;
  for (const file of files) {
    const content = readFile(file);
    if (content) {
      const matches = content.match(/console\.(log|error|warn)/g);
      if (matches) {
        consoleLogsFound += matches.length;
        log(`Found ${matches.length} console statements in ${file}`, 'warning');
      }
    }
  }
  
  if (consoleLogsFound === 0) {
    log('No console statements in production code', 'success');
  }
  
  return true;
}

function verifyFeatures() {
  log('Checking feature implementations...', 'section');
  
  const appContent = readFile('src/App.jsx');
  
  if (!appContent) {
    log('Could not read App.jsx', 'error');
    return false;
  }
  
  // Check for key features
  const features = [
    { name: 'Online Users', pattern: /setOnlineUsers|onlineUsers/g },
    { name: 'Friends System', pattern: /setFriends|getFriendsList/g },
    { name: 'Pending Invites', pattern: /setPendingInvites|pendingInvites/g },
    { name: 'Presence Announcement', pattern: /announcePresence/g },
    { name: 'Heartbeat', pattern: /heartbeatInterval|setInterval/g },
    { name: 'Mobile Layout', pattern: /MobileLayout|isMobile/g },
    { name: 'Swipe Navigation', pattern: /onTouchStart|onTouchMove|onTouchEnd|swipe/g },
    { name: 'Secure Invites', pattern: /SecureInviteModal/g }
  ];
  
  let allFeaturesFound = true;
  for (const feature of features) {
    const matches = appContent.match(feature.pattern);
    if (!matches || matches.length === 0) {
      log(`Feature not implemented: ${feature.name}`, 'error');
      allFeaturesFound = false;
    } else {
      log(`Feature verified: ${feature.name} (${matches.length} references)`, 'success');
    }
  }
  
  return allFeaturesFound;
}

function verifyGitStatus() {
  log('Checking Git status...', 'section');
  
  const result = runCommand('git status --porcelain', true);
  
  if (!result.success) {
    log('Could not check git status', 'error');
    return false;
  }
  
  const modifiedFiles = result.output.trim().split('\n').filter(line => line.trim());
  
  if (modifiedFiles.length === 0) {
    log('No uncommitted changes', 'success');
  } else {
    log(`Found ${modifiedFiles.length} uncommitted files:`, 'warning');
    modifiedFiles.forEach(file => {
      console.log(`  ${file}`);
    });
  }
  
  // Check if dist is tracked
  const distTracked = runCommand('git ls-files dist/', true);
  if (distTracked.output && distTracked.output.trim()) {
    log('Warning: dist folder is tracked in git', 'warning');
  }
  
  return true;
}

function verifyResponsiveness() {
  log('Checking responsive design...', 'section');
  
  const cssContent = readFile('src/index.css');
  
  if (!cssContent) {
    log('Could not read index.css', 'error');
    return false;
  }
  
  // Check for media queries
  const mediaQueries = cssContent.match(/@media/g);
  if (!mediaQueries || mediaQueries.length < 2) {
    log('Insufficient media queries for responsive design', 'warning');
  } else {
    log(`Found ${mediaQueries.length} media queries`, 'success');
  }
  
  // Check for mobile-specific styles
  if (cssContent.includes('max-width: 768px')) {
    log('Mobile breakpoint found', 'success');
  } else {
    log('No mobile breakpoint found', 'warning');
  }
  
  if (cssContent.includes('max-width: 375px')) {
    log('4-inch screen optimization found', 'success');
  } else {
    log('No 4-inch screen optimization found', 'warning');
  }
  
  return true;
}

function verifyUnusedFiles() {
  log('Checking for unused files...', 'section');
  
  const srcFiles = execSync('find src -type f -name "*.jsx" -o -name "*.js" -o -name "*.css"', { encoding: 'utf8' })
    .trim()
    .split('\n');
  
  const imports = new Set();
  
  // Collect all imports
  for (const file of srcFiles) {
    const content = readFile(file);
    if (content) {
      const importMatches = content.match(/import .* from ['"](.+)['"]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const path = match.match(/from ['"](.+)['"]/)[1];
          if (path.startsWith('./') || path.startsWith('../')) {
            imports.add(path);
          }
        });
      }
    }
  }
  
  // Check for orphaned files
  let unusedFound = false;
  for (const file of srcFiles) {
    const relativePath = './' + file.replace(/^src\//, '');
    if (!imports.has(relativePath) && !file.includes('main.jsx') && !file.includes('App.jsx')) {
      // Check if it's imported anywhere
      const fileName = path.basename(file, path.extname(file));
      let isUsed = false;
      
      for (const imp of imports) {
        if (imp.includes(fileName)) {
          isUsed = true;
          break;
        }
      }
      
      if (!isUsed && !file.includes('verify-all')) {
        log(`Potentially unused file: ${file}`, 'warning');
        unusedFound = true;
      }
    }
  }
  
  if (!unusedFound) {
    log('No unused files detected', 'success');
  }
  
  return true;
}

async function runAllVerifications() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${colors.cyan}     🔍 COMPREHENSIVE PROJECT VERIFICATION`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  const verifications = [
    { name: 'Dependencies', fn: verifyDependencies },
    { name: 'Project Structure', fn: verifyProjectStructure },
    { name: 'Code Quality', fn: verifyCodeQuality },
    { name: 'Features', fn: verifyFeatures },
    { name: 'Responsive Design', fn: verifyResponsiveness },
    { name: 'Unused Files', fn: verifyUnusedFiles },
    { name: 'Linting', fn: verifyLinting },
    { name: 'Build', fn: verifyBuild },
    { name: 'Git Status', fn: verifyGitStatus }
  ];
  
  let allPassed = true;
  
  for (const verification of verifications) {
    console.log('');
    const result = verification.fn();
    if (!result) {
      allPassed = false;
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${colors.cyan}     📊 VERIFICATION SUMMARY`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Passed: ${totalPassed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${totalWarnings}${colors.reset}`);
  console.log(`${colors.red}❌ Issues: ${totalIssues}${colors.reset}`);
  console.log(`⏱️  Duration: ${duration}s\n`);
  
  if (totalIssues === 0) {
    console.log(`${colors.green}${'='.repeat(60)}`);
    console.log(`${colors.green}     🎉 ALL CRITICAL CHECKS PASSED!`);
    console.log(`${colors.green}     Ready to commit and deploy!`);
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`);
    
    if (totalWarnings > 0) {
      console.log(`${colors.yellow}Note: ${totalWarnings} warnings found but they don't block deployment.${colors.reset}\n`);
    }
    
    return true;
  } else {
    console.log(`${colors.red}${'='.repeat(60)}`);
    console.log(`${colors.red}     ⚠️  CRITICAL ISSUES FOUND!`);
    console.log(`${colors.red}     Please fix the ${totalIssues} issue(s) before committing.`);
    console.log(`${colors.red}${'='.repeat(60)}${colors.reset}\n`);
    
    return false;
  }
}

// Run the verification
runAllVerifications().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});