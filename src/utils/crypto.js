export const initSodium = async (maxAttempts = 20) => {
  console.log('🔧 Initializing libsodium...')
  
  // Check if sodium is already available
  if (window.sodium && window.sodium.ready) {
    console.log('✅ Libsodium already ready!')
    return window.sodium
  }
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts}`)
    
    // Wait for sodium to load
    if (window.sodium) {
      try {
        await window.sodium.ready
        if (window.sodium.ready) {
          console.log('✅ Libsodium ready!')
          return window.sodium
        }
      } catch (error) {
        console.warn(`Sodium ready failed on attempt ${attempt}:`, error)
      }
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  throw new Error('❌ Failed to initialize libsodium after ' + maxAttempts + ' attempts')
}

export const hashPIN = (pin, sodium) => {
  if (!sodium) throw new Error('Sodium not initialized')
  
  console.log('🔐 Hashing PIN...')
  
  const salt = new Uint8Array([
    0x73, 0x65, 0x63, 0x75, 0x72, 0x65, 0x63, 0x68,
    0x61, 0x74, 0x73, 0x61, 0x6c, 0x74, 0x76, 0x31
  ])
  
  try {
    return sodium.crypto_pwhash(
      32, // output length
      pin,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
      sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID
    )
  } catch (error) {
    console.error('❌ PIN hashing failed:', error)
    throw error
  }
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