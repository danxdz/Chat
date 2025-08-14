/**
 * Secure Storage Service - Encrypts sensitive data in localStorage
 * Uses Gun.SEA for encryption with user-specific keys
 */

import { encryptForStorage, decryptFromStorage, generateSecureRandom } from '../utils/security'
import { logger } from '../utils/logger'

// Storage key prefix for encrypted data
const ENCRYPTED_PREFIX = 'enc_'
const STORAGE_KEY_PREFIX = 'sec_'

/**
 * Generate or retrieve storage encryption key for a user
 * @param {string} userId - User ID
 * @param {string} password - User password for key derivation
 * @returns {Promise<string>} - Storage encryption key
 */
const getStorageKey = async (userId, password) => {
  if (!window.Gun?.SEA) {
    throw new Error('Gun.SEA not available')
  }
  
  // Derive a storage-specific key from user credentials
  const storageKey = await window.Gun.SEA.work(password, `storage_${userId}_2024`)
  return storageKey
}

/**
 * Store encrypted data in localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @param {string} encryptionKey - Encryption key
 * @returns {Promise<boolean>} - Success status
 */
export const secureStore = async (key, data, encryptionKey) => {
  try {
    if (!encryptionKey) {
      logger.warn('No encryption key provided, storing unencrypted')
      localStorage.setItem(key, JSON.stringify(data))
      return true
    }
    
    const encrypted = await encryptForStorage(data, encryptionKey)
    localStorage.setItem(ENCRYPTED_PREFIX + key, encrypted)
    
    // Store metadata about encryption
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify({
      encrypted: true,
      timestamp: Date.now(),
      version: '1.0'
    }))
    
    logger.log('✅ Data stored securely')
    return true
  } catch (error) {
    logger.error('Failed to store encrypted data:', error)
    return false
  }
}

/**
 * Retrieve and decrypt data from localStorage
 * @param {string} key - Storage key
 * @param {string} decryptionKey - Decryption key
 * @returns {Promise<any>} - Decrypted data or null
 */
export const secureRetrieve = async (key, decryptionKey) => {
  try {
    // Check if data is encrypted
    const metadata = localStorage.getItem(STORAGE_KEY_PREFIX + key)
    
    if (!metadata) {
      // Try to get unencrypted data (backward compatibility)
      const plainData = localStorage.getItem(key)
      if (plainData) {
        try {
          return JSON.parse(plainData)
        } catch {
          return plainData
        }
      }
      return null
    }
    
    const encryptedData = localStorage.getItem(ENCRYPTED_PREFIX + key)
    if (!encryptedData || !decryptionKey) {
      return null
    }
    
    const decrypted = await decryptFromStorage(encryptedData, decryptionKey)
    logger.log('✅ Data retrieved and decrypted')
    return decrypted
  } catch (error) {
    logger.error('Failed to retrieve encrypted data:', error)
    return null
  }
}

/**
 * Store user credentials securely
 * @param {object} user - User object
 * @returns {Promise<boolean>} - Success status
 */
export const storeUserSecurely = async (user) => {
  try {
    if (!user?._sessionPassword) {
      logger.warn('Cannot store user securely without session password')
      return false
    }
    
    const storageKey = await getStorageKey(user.id, user._sessionPassword)
    
    // Remove sensitive data before storing
    const userToStore = {
      id: user.id,
      nickname: user.nickname,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
      createdAt: user.createdAt,
      friends: user.friends || []
    }
    
    return await secureStore(`user_${user.id}`, userToStore, storageKey)
  } catch (error) {
    logger.error('Failed to store user securely:', error)
    return false
  }
}

/**
 * Retrieve user credentials securely
 * @param {string} userId - User ID
 * @param {string} password - User password
 * @returns {Promise<object|null>} - User object or null
 */
export const retrieveUserSecurely = async (userId, password) => {
  try {
    const storageKey = await getStorageKey(userId, password)
    const user = await secureRetrieve(`user_${userId}`, storageKey)
    
    if (user) {
      // Add session password for this session
      user._sessionPassword = password
    }
    
    return user
  } catch (error) {
    logger.error('Failed to retrieve user securely:', error)
    return null
  }
}

/**
 * Store messages securely
 * @param {string} userId - User ID
 * @param {array} messages - Messages array
 * @param {string} password - User password
 * @returns {Promise<boolean>} - Success status
 */
export const storeMessagesSecurely = async (userId, messages, password) => {
  try {
    const storageKey = await getStorageKey(userId, password)
    
    // Limit to last 1000 messages
    const limitedMessages = messages.slice(-1000)
    
    return await secureStore(`messages_${userId}`, limitedMessages, storageKey)
  } catch (error) {
    logger.error('Failed to store messages securely:', error)
    return false
  }
}

/**
 * Retrieve messages securely
 * @param {string} userId - User ID
 * @param {string} password - User password
 * @returns {Promise<array>} - Messages array
 */
export const retrieveMessagesSecurely = async (userId, password) => {
  try {
    const storageKey = await getStorageKey(userId, password)
    const messages = await secureRetrieve(`messages_${userId}`, storageKey)
    
    return messages || []
  } catch (error) {
    logger.error('Failed to retrieve messages securely:', error)
    return []
  }
}

/**
 * Clear all encrypted data for a user
 * @param {string} userId - User ID
 * @returns {boolean} - Success status
 */
export const clearSecureStorage = (userId) => {
  try {
    const keys = Object.keys(localStorage)
    
    keys.forEach(key => {
      if (key.includes(userId) && (key.startsWith(ENCRYPTED_PREFIX) || key.startsWith(STORAGE_KEY_PREFIX))) {
        localStorage.removeItem(key)
      }
    })
    
    logger.log('✅ Secure storage cleared for user')
    return true
  } catch (error) {
    logger.error('Failed to clear secure storage:', error)
    return false
  }
}

/**
 * Migrate unencrypted data to encrypted storage
 * @param {string} userId - User ID
 * @param {string} password - User password
 * @returns {Promise<boolean>} - Success status
 */
export const migrateToSecureStorage = async (userId, password) => {
  try {
    const storageKey = await getStorageKey(userId, password)
    
    // Migrate user data
    const plainUser = localStorage.getItem('currentUser')
    if (plainUser) {
      const userData = JSON.parse(plainUser)
      await secureStore(`user_${userId}`, userData, storageKey)
      localStorage.removeItem('currentUser')
    }
    
    // Migrate messages
    const plainMessages = localStorage.getItem(`messages_${userId}`)
    if (plainMessages) {
      const messages = JSON.parse(plainMessages)
      await storeMessagesSecurely(userId, messages, password)
      localStorage.removeItem(`messages_${userId}`)
    }
    
    logger.log('✅ Data migrated to secure storage')
    return true
  } catch (error) {
    logger.error('Failed to migrate to secure storage:', error)
    return false
  }
}

export default {
  secureStore,
  secureRetrieve,
  storeUserSecurely,
  retrieveUserSecurely,
  storeMessagesSecurely,
  retrieveMessagesSecurely,
  clearSecureStorage,
  migrateToSecureStorage
}