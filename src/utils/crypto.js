// 🔐 Cryptographic utilities for secure P2P chat
// Provides high-privacy identity management with recovery options
import logger from './logger'

/**
 * Generate a unique device fingerprint
 * Combines browser and device characteristics
 */
export const generateDeviceFingerprint = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Device fingerprint', 2, 2)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    canvas.toDataURL()
  ].join('|')
  
  // Create a hash of the fingerprint
  return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
}

/**
 * Generate a 12-word mnemonic recovery phrase
 * Using a simplified word list for demo purposes
 */
const WORD_LIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'action', 'actor', 'actress', 'actual', 'adapt',
  'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice',
  'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree', 'ahead',
  'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
  'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already',
  'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused',
  'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle',
  'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any',
  'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
  'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around',
  'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork',
  'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete',
  'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august',
  'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
  'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor',
  'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana',
  'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic', 'basket',
  'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before'
]

export const generateMnemonic = (wordCount = 12) => {
  const words = []
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * WORD_LIST.length)
    words.push(WORD_LIST[randomIndex])
  }
  return words.join(' ')
}

/**
 * Validate a mnemonic phrase
 */
export const validateMnemonic = (mnemonic) => {
  const words = mnemonic.trim().toLowerCase().split(' ')
  if (words.length !== 12) return false
  
  return words.every(word => WORD_LIST.includes(word))
}

/**
 * Derive a key from master password + device info
 */
export const deriveKey = async (masterPassword, deviceId, salt = '') => {
  const encoder = new TextEncoder()
  const data = encoder.encode(masterPassword + deviceId + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create a secure user identity with Gun.SEA
 */
export const createSecureIdentity = async (nickname, masterPassword, inviteData = null) => {
  if (!window.Gun || !window.Gun.SEA) {
    throw new Error('Gun.SEA not available')
  }
  
  try {
    // Generate cryptographic keypair
    const identity = await window.Gun.SEA.pair()
    
    // Generate device and recovery info
    const deviceId = generateDeviceFingerprint()
    const recoveryPhrase = generateMnemonic(12)
    const derivedKey = await deriveKey(masterPassword, deviceId)
    
    // Encrypt private data with master password
    const encryptedPrivateKey = await window.Gun.SEA.encrypt(identity.priv, derivedKey)
    const encryptedRecoveryPhrase = await window.Gun.SEA.encrypt(recoveryPhrase, derivedKey)
    
    // Create user account structure
    const userAccount = {
      // Public identity (stored in P2P network)
      publicKey: identity.pub,
      nickname: nickname.trim(),
      deviceId: deviceId,
      createdAt: Date.now(),
      invitedBy: inviteData?.from || null,
      invitedById: inviteData?.fromId || null,
      
      // Local encrypted storage
      encryptedPrivateKey,
      encryptedRecoveryPhrase,
      derivedKey, // For this session only
      
      // Working identity for this session
      identity
    }
    
    logger.log('🔐 SECURE IDENTITY CREATED:', {
      publicKey: identity.pub.substring(0, 16) + '...',
      nickname: nickname,
      deviceId: deviceId,
      recoveryPhrase: recoveryPhrase
    })
    
    return {
      userAccount,
      recoveryPhrase, // Show to user ONCE
      masterPassword: null // Never store this!
    }
    
  } catch (error) {
    logger.error('❌ Failed to create secure identity:', error)
    throw error
  }
}

/**
 * Recover identity from recovery phrase + master password
 */
export const recoverIdentity = async (recoveryPhrase, masterPassword, nickname) => {
  if (!validateMnemonic(recoveryPhrase)) {
    throw new Error('Invalid recovery phrase')
  }
  
  if (!window.Gun || !window.Gun.SEA) {
    throw new Error('Gun.SEA not available')
  }
  
  try {
    const deviceId = generateDeviceFingerprint()
    const derivedKey = await deriveKey(masterPassword, deviceId)
    
    // In a real implementation, we'd derive the keypair from the mnemonic
    // For this demo, we'll simulate recovery by creating a new identity
    // and encrypting it with the same derived key
    const identity = await window.Gun.SEA.pair()
    
    const encryptedPrivateKey = await window.Gun.SEA.encrypt(identity.priv, derivedKey)
    const encryptedRecoveryPhrase = await window.Gun.SEA.encrypt(recoveryPhrase, derivedKey)
    
    const userAccount = {
      publicKey: identity.pub,
      nickname: nickname.trim(),
      deviceId: deviceId,
      recoveredAt: Date.now(),
      encryptedPrivateKey,
      encryptedRecoveryPhrase,
      derivedKey,
      identity
    }
    
    logger.log('🔄 IDENTITY RECOVERED:', {
      publicKey: identity.pub.substring(0, 16) + '...',
      nickname: nickname,
      deviceId: deviceId
    })
    
    return userAccount
    
  } catch (error) {
    logger.error('❌ Failed to recover identity:', error)
    throw error
  }
}

/**
 * Login with master password (existing device)
 */
export const loginWithMasterPassword = async (masterPassword) => {
  const deviceId = generateDeviceFingerprint()
  const storedIdentity = localStorage.getItem('secureIdentity_' + deviceId)
  
  if (!storedIdentity) {
    throw new Error('No account found on this device')
  }
  
  try {
    const encryptedData = JSON.parse(storedIdentity)
    const derivedKey = await deriveKey(masterPassword, deviceId)
    
    // Decrypt private key
    const privateKey = await window.Gun.SEA.decrypt(encryptedData.encryptedPrivateKey, derivedKey)
    if (!privateKey) {
      throw new Error('Invalid master password')
    }
    
    // Reconstruct identity
    const identity = {
      pub: encryptedData.publicKey,
      priv: privateKey
    }
    
    const userAccount = {
      ...encryptedData,
      identity,
      derivedKey,
      lastLogin: Date.now()
    }
    
    logger.log('🔑 SECURE LOGIN SUCCESS:', {
      publicKey: identity.pub.substring(0, 16) + '...',
      nickname: encryptedData.nickname,
      deviceId: deviceId
    })
    
    return userAccount
    
  } catch (error) {
    logger.error('❌ Login failed:', error)
    throw error
  }
}

/**
 * Save identity securely to localStorage
 */
export const saveSecureIdentity = (userAccount) => {
  const deviceId = userAccount.deviceId
  
  const dataToStore = {
    publicKey: userAccount.publicKey,
    nickname: userAccount.nickname,
    deviceId: userAccount.deviceId,
    encryptedPrivateKey: userAccount.encryptedPrivateKey,
    encryptedRecoveryPhrase: userAccount.encryptedRecoveryPhrase,
    createdAt: userAccount.createdAt,
    invitedBy: userAccount.invitedBy,
    invitedById: userAccount.invitedById,
    lastUsed: Date.now()
  }
  
  localStorage.setItem('secureIdentity_' + deviceId, JSON.stringify(dataToStore))
  logger.log('💾 Secure identity saved to device:', deviceId)
}

/**
 * Check if device has a stored identity
 */
export const hasStoredIdentity = () => {
  const deviceId = generateDeviceFingerprint()
  return !!localStorage.getItem('secureIdentity_' + deviceId)
}

/**
 * Clear all identity data from device
 */
export const clearDeviceIdentity = () => {
  const deviceId = generateDeviceFingerprint()
  localStorage.removeItem('secureIdentity_' + deviceId)
  logger.log('🗑️ Device identity cleared:', deviceId)
}