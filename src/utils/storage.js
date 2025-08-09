// Encrypted localStorage utility using libsodium
let sodiumInstance = null
let masterKey = null

export const initStorage = (sodium, userPIN) => {
  sodiumInstance = sodium
  
  if (!sodium) {
    throw new Error('Sodium not available for storage encryption')
  }
  
  // Derive a master key from the user's PIN for local encryption
  const salt = new Uint8Array([
    0x73, 0x74, 0x6F, 0x72, 0x61, 0x67, 0x65, 0x5F,
    0x73, 0x61, 0x6C, 0x74, 0x5F, 0x76, 0x31, 0x5F
  ])
  
  masterKey = sodium.crypto_pwhash(
    32, // 32 bytes for secretbox key
    userPIN,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID
  )
  
  console.log('🔐 Storage encryption initialized')
}

export const encryptedSetItem = (key, value) => {
  if (!sodiumInstance || !masterKey) {
    throw new Error('Storage encryption not initialized')
  }
  
  // Convert value to string if it isn't already
  const plaintext = typeof value === 'string' ? value : JSON.stringify(value)
  
  // Generate a random nonce
  const nonce = sodiumInstance.randombytes_buf(sodiumInstance.crypto_secretbox_NONCEBYTES)
  
  // Encrypt the data
  const ciphertext = sodiumInstance.crypto_secretbox_easy(plaintext, nonce, masterKey)
  
  // Combine nonce + ciphertext and encode as hex
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce)
  combined.set(ciphertext, nonce.length)
  
  const encrypted = sodiumInstance.to_hex(combined)
  localStorage.setItem(`encrypted_${key}`, encrypted)
}

export const encryptedGetItem = (key) => {
  if (!sodiumInstance || !masterKey) {
    throw new Error('Storage encryption not initialized')
  }
  
  const encrypted = localStorage.getItem(`encrypted_${key}`)
  if (!encrypted) {
    return null
  }
  
  try {
    // Decode from hex
    const combined = sodiumInstance.from_hex(encrypted)
    
    // Extract nonce and ciphertext
    const nonce = combined.slice(0, sodiumInstance.crypto_secretbox_NONCEBYTES)
    const ciphertext = combined.slice(sodiumInstance.crypto_secretbox_NONCEBYTES)
    
    // Decrypt
    const plaintext = sodiumInstance.crypto_secretbox_open_easy(ciphertext, nonce, masterKey)
    
    // Convert back to string
    const result = new TextDecoder().decode(plaintext)
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(result)
    } catch {
      return result
    }
  } catch (error) {
    console.error('Failed to decrypt storage item:', error)
    return null
  }
}

export const encryptedRemoveItem = (key) => {
  localStorage.removeItem(`encrypted_${key}`)
}

export const encryptedHasItem = (key) => {
  return localStorage.getItem(`encrypted_${key}`) !== null
}

// Clear all encrypted storage
export const clearEncryptedStorage = () => {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith('encrypted_')) {
      localStorage.removeItem(key)
    }
  })
  masterKey = null
  console.log('🗑️ Encrypted storage cleared')
}