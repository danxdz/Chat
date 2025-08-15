/**
 * Secure Key Management System
 * Handles encryption, storage, and recovery of private keys
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

// Simple encryption/decryption using Gun.SEA
export const encryptPrivateKey = async (privateKey, password) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available for encryption');
  }
  
  try {
    // Use Gun.SEA.encrypt with password as key
    const encrypted = await window.Gun.SEA.encrypt(privateKey, password);
    return encrypted;
  } catch (error) {
    console.error('Failed to encrypt private key:', error);
    throw error;
  }
};

export const decryptPrivateKey = async (encryptedKey, password) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available for decryption');
  }
  
  try {
    // Use Gun.SEA.decrypt with password as key
    const decrypted = await window.Gun.SEA.decrypt(encryptedKey, password);
    if (!decrypted) {
      throw new Error('Invalid password or corrupted key');
    }
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    throw error;
  }
};

// Generate recovery phrase (12 words)
export const generateRecoveryPhrase = () => {
  // Simple word list for demo (in production, use BIP39 word list)
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
    'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
    'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
    'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
    'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
    'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
    'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
    'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
    'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
    'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact'
  ];
  
  const phrase = [];
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    phrase.push(words[randomIndex]);
  }
  
  return phrase.join(' ');
};

// Derive key from recovery phrase
export const keyFromRecoveryPhrase = async (phrase, password) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available');
  }
  
  try {
    // Use the phrase + password as seed for deterministic key generation
    const seed = phrase + password;
    const hash = await window.Gun.SEA.work(seed, null, null, {name: 'SHA-256'});
    
    // Generate deterministic keypair from hash
    // Note: Gun.SEA.pair() doesn't accept seed directly, so we'll store the hash
    // and use it to encrypt/decrypt the actual key
    return hash;
  } catch (error) {
    console.error('Failed to derive key from phrase:', error);
    throw error;
  }
};

// Store encrypted key with metadata
export const storeSecureKey = async (privateKey, password, recoveryPhrase) => {
  try {
    const encrypted = await encryptPrivateKey(privateKey, password);
    
    const keyData = {
      encrypted,
      timestamp: Date.now(),
      version: '1.0',
      hint: recoveryPhrase.split(' ').slice(0, 2).join(' ') + '...' // First 2 words as hint
    };
    
    localStorage.setItem('secure_key_data', JSON.stringify(keyData));
    
    if (isDev) {
      console.log('✅ Secure key stored successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to store secure key:', error);
    return false;
  }
};

// Retrieve and decrypt stored key
export const retrieveSecureKey = async (password) => {
  try {
    const storedData = localStorage.getItem('secure_key_data');
    if (!storedData) {
      throw new Error('No stored key found');
    }
    
    const keyData = JSON.parse(storedData);
    const decrypted = await decryptPrivateKey(keyData.encrypted, password);
    
    return decrypted;
  } catch (error) {
    console.error('Failed to retrieve secure key:', error);
    throw error;
  }
};

// Check if secure key exists
export const hasSecureKey = () => {
  return localStorage.getItem('secure_key_data') !== null;
};

// Get key hint (for password recovery UI)
export const getKeyHint = () => {
  try {
    const storedData = localStorage.getItem('secure_key_data');
    if (!storedData) return null;
    
    const keyData = JSON.parse(storedData);
    return keyData.hint;
  } catch (error) {
    return null;
  }
};

// Clear all secure key data
export const clearSecureKeyData = () => {
  localStorage.removeItem('secure_key_data');
  if (isDev) {
    console.log('🗑️ Secure key data cleared');
  }
};

// Export/Import functions for backup
export const exportSecureKeyBackup = async (password) => {
  try {
    const storedData = localStorage.getItem('secure_key_data');
    if (!storedData) {
      throw new Error('No key to export');
    }
    
    const backup = {
      keyData: storedData,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Encrypt the entire backup with password
    const encryptedBackup = await window.Gun.SEA.encrypt(JSON.stringify(backup), password);
    
    return encryptedBackup;
  } catch (error) {
    console.error('Failed to export key backup:', error);
    throw error;
  }
};

export const importSecureKeyBackup = async (encryptedBackup, password) => {
  try {
    // Decrypt the backup
    const decryptedBackup = await window.Gun.SEA.decrypt(encryptedBackup, password);
    if (!decryptedBackup) {
      throw new Error('Invalid backup or password');
    }
    
    const backup = JSON.parse(decryptedBackup);
    
    // Restore the key data
    localStorage.setItem('secure_key_data', backup.keyData);
    
    if (isDev) {
      console.log('✅ Key backup imported successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import key backup:', error);
    throw error;
  }
};