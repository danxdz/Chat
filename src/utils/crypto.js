export const initSodium = async (maxAttempts = 10) => {
  console.log('🔧 Initializing libsodium...')
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}/${maxAttempts}`)
    
    if (window.sodium && window.sodium.ready) {
      console.log('✅ Libsodium ready!')
      return window.sodium
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error('Failed to initialize libsodium')
}

export const hashPIN = (pin, sodium) => {
  if (!sodium) throw new Error('Sodium not initialized')
  
  const salt = new Uint8Array([
    0x73, 0x65, 0x63, 0x75, 0x72, 0x65, 0x63, 0x68,
    0x61, 0x74, 0x73, 0x61, 0x6c, 0x74, 0x76, 0x31
  ])
  
  return sodium.crypto_pwhash(
    32, // output length
    pin,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
    sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID
  )
}

export const generateRandomNickname = () => {
  const adjectives = [
    'Swift', 'Bright', 'Cool', 'Smart', 'Quick', 'Bold', 'Calm', 'Dark',
    'Fast', 'Kind', 'Wild', 'Wise', 'Pure', 'Safe', 'True', 'Zen'
  ]
  
  const nouns = [
    'Fox', 'Wolf', 'Bear', 'Eagle', 'Lion', 'Tiger', 'Owl', 'Hawk',
    'Cat', 'Dog', 'Bird', 'Fish', 'Star', 'Moon', 'Sun', 'Sky'
  ]
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 99) + 1
  
  return `${adj}${noun}${num}`
}