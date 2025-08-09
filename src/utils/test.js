// Test all imports to see what's broken
console.log('🔧 Testing imports...')

try {
  console.log('1. Testing crypto import...')
  import('./crypto.js').then(crypto => {
    console.log('✅ Crypto imported:', Object.keys(crypto))
  }).catch(err => {
    console.error('❌ Crypto import failed:', err.message)
  })
} catch (error) {
  console.error('❌ Crypto import error:', error.message)
}

try {
  console.log('2. Testing storage import...')
  import('./storage.js').then(storage => {
    console.log('✅ Storage imported:', Object.keys(storage))
  }).catch(err => {
    console.error('❌ Storage import failed:', err.message)
  })
} catch (error) {
  console.error('❌ Storage import error:', error.message)
}

try {
  console.log('3. Testing startup import...')
  import('./startup.js').then(startup => {
    console.log('✅ Startup imported:', Object.keys(startup))
  }).catch(err => {
    console.error('❌ Startup import failed:', err.message)
  })
} catch (error) {
  console.error('❌ Startup import error:', error.message)
}

try {
  console.log('4. Testing magicLinks import...')
  import('./magicLinks.js').then(magicLinks => {
    console.log('✅ MagicLinks imported:', Object.keys(magicLinks))
  }).catch(err => {
    console.error('❌ MagicLinks import failed:', err.message)
  })
} catch (error) {
  console.error('❌ MagicLinks import error:', error.message)
}

console.log('✅ Test module loaded successfully')