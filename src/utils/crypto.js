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
  
  if (typeof sodium.crypto_pwhash !== 'function') {
    throw new Error('Sodium crypto_pwhash function not available. Available functions: ' + 
      Object.keys(sodium).filter(key => typeof sodium[key] === 'function').slice(0, 10).join(', '))
  }
  
  if (typeof sodium.to_hex !== 'function') {
    throw new Error('Sodium to_hex function not available')
  }
  
  console.log('🔐 Hashing PIN...')
  
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
    console.log('✅ PIN hashed successfully')
    return result
  } catch (error) {
    console.error('❌ PIN hashing failed:', error)
    throw new Error('Failed to hash PIN: ' + error.message)
  }
}

export const generateRandomNickname = () => {
  const adjectives = [
    'Shadow', 'Ghost', 'Dark', 'Silent', 'Swift', 'Steel', 'Binary', 'Cyber',
    'Digital', 'Neon', 'Zero', 'Prime', 'Code', 'Tech', 'Neo', 'Matrix'
  ]
  
  const nouns = [
    'Runner', 'Walker', 'Hunter', 'Agent', 'Master', 'Knight', 'Guardian', 'Warrior',
    'Coder', 'Hacker', 'User', 'Admin', 'Root', 'Shell', 'Terminal', 'Node'
  ]
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 999) + 1
  
  return `${adj}${noun}${num}`
}