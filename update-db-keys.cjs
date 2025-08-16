#!/usr/bin/env node

/**
 * Script to update all database keys to use the new namespace
 * Run this to update all files at once
 */

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'src/services/gunAuthService.js',
  'src/services/adminService.js',
  'src/services/friendsService.js',
  'src/utils/secureAuth.js',
  'src/App.jsx'
];

// Replacements to make
const replacements = [
  // User database
  { from: /gun\.get\(['"]chat_users['"]\)/g, to: "gun.get(DB_KEYS.USERS)" },
  { from: /gun\.get\(['"]chat_users_by_nick['"]\)/g, to: "gun.get(DB_KEYS.USERS_BY_NICK)" },
  
  // Messages
  { from: /gun\.get\(['"]chat_messages['"]\)/g, to: "gun.get(DB_KEYS.MESSAGES)" },
  { from: /gun\.get\(['"]general_chat['"]\)/g, to: "gun.get(DB_KEYS.GENERAL_CHAT)" },
  
  // Invites and social
  { from: /gun\.get\(['"]secure_invites['"]\)/g, to: "gun.get(DB_KEYS.INVITES)" },
  { from: /gun\.get\(['"]friendships['"]\)/g, to: "gun.get(DB_KEYS.FRIENDSHIPS)" },
  { from: /gun\.get\(['"]notifications['"]\)/g, to: "gun.get(DB_KEYS.NOTIFICATIONS)" },
  
  // Presence
  { from: /gun\.get\(['"]online_users['"]\)/g, to: "gun.get(DB_KEYS.ONLINE_USERS)" },
  { from: /gun\.get\(['"]user_presence['"]\)/g, to: "gun.get(DB_KEYS.USER_PRESENCE)" },
];

// Add import statement if not present
const importStatement = "import DB_KEYS from '../config/database'";

console.log('🔄 Updating database keys to use new namespace...\n');

filesToUpdate.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let changesMade = false;
    
    // Add import if not present and file is .js
    if (filePath.endsWith('.js') && !filePath.includes('config/database')) {
      if (!content.includes("from '../config/database'") && !content.includes('from "./config/database"')) {
        // Find the last import statement
        const importRegex = /^import .* from .*/gm;
        const imports = content.match(importRegex);
        if (imports && imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const lastImportIndex = content.lastIndexOf(lastImport);
          const insertPosition = lastImportIndex + lastImport.length;
          content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
          changesMade = true;
          console.log(`✅ Added import to ${filePath}`);
        }
      }
    }
    
    // Apply replacements
    replacements.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        changesMade = true;
        console.log(`✅ Updated ${matches.length} occurrences in ${filePath}`);
      }
    });
    
    if (changesMade) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`📝 Saved ${filePath}\n`);
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}\n`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('✅ Database key update complete!');
console.log('\n📌 The app now uses namespace: p2pchat_v2');
console.log('📌 This gives you a completely fresh database');
console.log('📌 You can now create a new admin account without conflicts');