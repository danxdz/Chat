/**
 * Security utilities for the P2P chat application
 * Provides input sanitization, XSS prevention, and secure encryption
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe HTML string
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHTML = (unsafe) => {
  if (!unsafe) return '';
  
  // Convert special characters to HTML entities
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize user input for display (allows some formatting)
 * @param {string} text - User input text
 * @returns {string} - Sanitized text safe for display
 */
export const sanitizeUserInput = (text) => {
  if (!text) return '';
  
  // First sanitize for XSS
  let safe = sanitizeHTML(text);
  
  // Allow some safe formatting (convert back specific patterns)
  // For example, allow line breaks
  safe = safe.replace(/\n/g, '<br>');
  
  return safe;
};

/**
 * Validate and sanitize nickname
 * @param {string} nickname - User nickname
 * @returns {string} - Sanitized nickname
 */
export const sanitizeNickname = (nickname) => {
  if (!nickname) return '';
  
  // Remove any HTML tags and trim
  let clean = String(nickname).replace(/<[^>]*>/g, '').trim();
  
  // Limit length
  clean = clean.substring(0, 30);
  
  // Remove special characters that could be problematic
  clean = clean.replace(/[^\w\s\-_.]/g, '');
  
  return clean;
};

/**
 * Generate cryptographically secure random string
 * @param {number} length - Length of the random string
 * @returns {string} - Random string
 */
export const generateSecureRandom = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a unique salt for password hashing
 * @returns {string} - Unique salt
 */
export const generateSalt = () => {
  return generateSecureRandom(16);
};

/**
 * Hash password with PBKDF2 and salt
 * @param {string} password - Plain text password
 * @param {string} salt - Salt for hashing
 * @returns {Promise<string>} - Hashed password
 */
export const hashPasswordWithSalt = async (password, salt) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available');
  }
  
  // Use Gun.SEA.work which implements PBKDF2
  const hashedPassword = await window.Gun.SEA.work(password, salt);
  return hashedPassword;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with strength score and issues
 */
export const validatePasswordStrength = (password) => {
  const issues = [];
  let strength = 0;
  
  if (!password) {
    return { valid: false, strength: 0, issues: ['Password is required'] };
  }
  
  // Check length
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters');
  } else if (password.length >= 12) {
    strength += 2;
  } else {
    strength += 1;
  }
  
  // Check for uppercase
  if (/[A-Z]/.test(password)) {
    strength += 1;
  } else {
    issues.push('Include at least one uppercase letter');
  }
  
  // Check for lowercase
  if (/[a-z]/.test(password)) {
    strength += 1;
  } else {
    issues.push('Include at least one lowercase letter');
  }
  
  // Check for numbers
  if (/\d/.test(password)) {
    strength += 1;
  } else {
    issues.push('Include at least one number');
  }
  
  // Check for special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength += 2;
  } else {
    issues.push('Include at least one special character');
  }
  
  return {
    valid: issues.length === 0 && strength >= 4,
    strength: Math.min(strength, 5),
    issues
  };
};

/**
 * Encrypt data for localStorage
 * @param {any} data - Data to encrypt
 * @param {string} key - Encryption key
 * @returns {Promise<string>} - Encrypted data
 */
export const encryptForStorage = async (data, key) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available');
  }
  
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = await window.Gun.SEA.encrypt(jsonString, key);
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
};

/**
 * Decrypt data from localStorage
 * @param {string} encryptedData - Encrypted data
 * @param {string} key - Decryption key
 * @returns {Promise<any>} - Decrypted data
 */
export const decryptFromStorage = async (encryptedData, key) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available');
  }
  
  try {
    const decrypted = await window.Gun.SEA.decrypt(encryptedData, key);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
};

export default {
  sanitizeHTML,
  sanitizeUserInput,
  sanitizeNickname,
  generateSecureRandom,
  generateSalt,
  hashPasswordWithSalt,
  validatePasswordStrength,
  encryptForStorage,
  decryptFromStorage
};