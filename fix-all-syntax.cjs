#!/usr/bin/env node

const fs = require('fs');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Pattern to match broken console.log removals with orphaned object properties
// These are lines that start with // [REMOVED CONSOLE LOG] followed by object properties
const brokenPattern = /\/\/ \[REMOVED CONSOLE LOG\]\n(\s+[^\/].*?\n)*?\s*\}\)/gm;

// Replace all broken patterns with just the comment
content = content.replace(brokenPattern, '// [REMOVED CONSOLE LOG]');

// Also fix patterns where there's content between the comment and a closing bracket
const anotherPattern = /\/\/ \[REMOVED CONSOLE LOG\]\n(\s+\w+:.*?\n)+\s*\}\)/gm;
content = content.replace(anotherPattern, '// [REMOVED CONSOLE LOG]');

// Fix standalone orphaned properties after removed console logs
const orphanedProps = /\/\/ \[REMOVED CONSOLE LOG\]\n\s+\w+:.*$/gm;
content = content.replace(orphanedProps, '// [REMOVED CONSOLE LOG]');

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fixed all syntax errors in App.jsx');