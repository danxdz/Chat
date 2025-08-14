#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/App.jsx',
  'src/components/MobileLayout.jsx',
  'src/components/ChatArea.jsx',
  'src/components/RegisterView.jsx',
  'src/components/TestingPanel.jsx',
  'src/services/storageService.js',
  'src/services/adminService.js'
];

let totalFixed = 0;

function fixBrokenConsoleRemovals(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixedCount = 0;
  
  // Pattern to find broken console.log removals with orphaned content
  // This matches [REMOVED CONSOLE LOG] followed by content that should have been removed
  const patterns = [
    // Pattern 1: [REMOVED CONSOLE LOG] with orphaned object properties
    /\/\/ \[REMOVED CONSOLE LOG\]\n\s+[^}]*\}\)/gm,
    // Pattern 2: [REMOVED CONSOLE LOG] with orphaned content on next lines
    /\/\/ \[REMOVED CONSOLE LOG\]\n\s+[^\/\n][^\n]*(?:\n\s+[^\/\n][^\n]*)*?\n\s*\}\)/gm,
    // Pattern 3: Simple orphaned closing brackets after removal
    /\/\/ \[REMOVED CONSOLE LOG\]\n\s*\}\)/gm,
    // Pattern 4: Orphaned content without closing bracket
    /\/\/ \[REMOVED CONSOLE LOG\]\n\s+\w+:.*$/gm
  ];
  
  // Remove all orphaned content after [REMOVED CONSOLE LOG]
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      fixedCount += matches.length;
      content = content.replace(pattern, '// [REMOVED CONSOLE LOG]');
    }
  });
  
  // Also clean up any standalone orphaned closing brackets
  content = content.replace(/^\s*\}\)\s*$/gm, (match, offset) => {
    // Check if this is an orphaned bracket (preceded by removed console log)
    const before = content.substring(Math.max(0, offset - 100), offset);
    if (before.includes('[REMOVED CONSOLE LOG]')) {
      fixedCount++;
      return '';
    }
    return match;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${filePath}: ${fixedCount} syntax errors`);
    totalFixed += fixedCount;
    return true;
  } else {
    console.log(`✓ ${filePath}: No syntax errors found`);
  }
  
  return false;
}

console.log('🔧 Fixing syntax errors from console.log removal...\n');

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  fixBrokenConsoleRemovals(fullPath);
});

console.log(`\n✅ Fixed ${totalFixed} syntax errors!`);