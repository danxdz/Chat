export const initSodium = async (maxAttempts = 30) => {
  console.log('🔧 Initializing libsodium...')
  
  // Check if sodium is already available and ready
  if (window.sodium && window.sodium.ready) {
    console.log('✅ Libsodium already ready!')
    console.log('Available functions:', Object.keys(window.sodium).filter(key => 
      typeof window.sodium[key] === 'function'
    ).slice(0, 10))
    return window.sodium
  }
  
  // Wait for sodium script to load
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts}`)
    
    // Wait for sodium to be available
    if (window.sodium) {
      try {
        // Wait for sodium to be ready
        if (window.sodium.ready) {
          console.log('✅ Libsodium ready!')
          console.log('Available functions:', Object.keys(window.sodium).filter(key => 
            typeof window.sodium[key] === 'function'
          ).slice(0, 10))
          return window.sodium
        } else {
          // Wait for sodium.ready promise if it exists
          await window.sodium.ready
          if (window.sodium.ready) {
            console.log('✅ Libsodium ready after await!')
            console.log('Available functions:', Object.keys(window.sodium).filter(key => 
              typeof window.sodium[key] === 'function'
            ).slice(0, 10))
            return window.sodium
          }
        }
      } catch (error) {
        console.warn(`Sodium ready check failed on attempt ${attempt}:`, error)
      }
    } else {
      console.log('Sodium not yet available, waiting...')
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  throw new Error('❌ Failed to initialize libsodium after ' + maxAttempts + ' attempts. Please refresh the page.')
}

export const hashPIN = (pin, sodium) => {
  if (!sodium) {
    throw new Error('Sodium not initialized')
  }
  
  console.log('🔐 Checking sodium functions...')
  console.log('Sodium object keys:', Object.keys(sodium).slice(0, 20))
  console.log('crypto_pwhash available:', typeof sodium.crypto_pwhash)
  console.log('to_hex available:', typeof sodium.to_hex)
  
  // If crypto_pwhash is not available, use a simpler hash approach
  if (typeof sodium.crypto_pwhash !== 'function') {
    console.log('🔐 Using simple hash instead of crypto_pwhash')
    
    // Use a simple but secure approach with crypto_hash
    if (typeof sodium.crypto_hash === 'function') {
      const pinBytes = new TextEncoder().encode(pin + 'securechat_salt_v1')
      const hash = sodium.crypto_hash(pinBytes)
      return sodium.to_hex ? sodium.to_hex(hash) : Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    
    // Fallback to crypto_generichash if available
    if (typeof sodium.crypto_generichash === 'function') {
      const pinBytes = new TextEncoder().encode(pin + 'securechat_salt_v1')
      const hash = sodium.crypto_generichash(32, pinBytes)
      return sodium.to_hex ? sodium.to_hex(hash) : Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    
    // If no sodium crypto functions work, use Web Crypto API as fallback
    console.log('🔐 Falling back to Web Crypto API')
    return hashPINWithWebCrypto(pin)
  }
  
  if (typeof sodium.to_hex !== 'function') {
    throw new Error('Sodium to_hex function not available')
  }
  
  console.log('🔐 Hashing PIN with crypto_pwhash...')
  
  const salt = new Uint8Array([
    0x73, 0x65, 0x63, 0x75, 0x72, 0x65, 0x63, 0x68,
    0x61, 0x74, 0x73, 0x61, 0x6c, 0x74, 0x76, 0x31
  ])
  
  try {
    const result = sodium.crypto_pwhash(
      32, // output length
      pin,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
      sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID
    )
    return sodium.to_hex(result)
  } catch (error) {
    console.error('❌ PIN hashing failed:', error)
    // Fallback to simple hash
    return hashPINWithWebCrypto(pin)
  }
}

// Fallback function using Web Crypto API
const hashPINWithWebCrypto = async (pin) => {
  console.log('🔐 Using Web Crypto API for PIN hashing')
  
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'securechat_salt_v1')
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const generateRandomNickname = () => {
  const adjectives = [
    'Elite', 'Shadow', 'Cyber', 'Dark', 'Ghost', 'Phantom', 'Matrix', 'Binary',
    'Digital', 'Neon', 'Void', 'Nexus', 'Zero', 'Prime', 'Code', 'Hack'
  ]
  
  const nouns = [
    'Runner', 'Walker', 'Hunter', 'Rider', 'Agent', 'Warrior', 'Master', 'Lord',
    'Knight', 'Ninja', 'Samurai', 'Guardian', 'Sentinel', 'Keeper', 'Slayer', 'Viper'
  ]
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 999) + 1
  
  return `${adj}${noun}${num}`
}