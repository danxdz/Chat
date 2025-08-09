// Generate one magic link at startup for initial access
let startupMagicLink = null

export const generateStartupMagicLink = async () => {
  try {
    // Check if we already have a startup link
    const existing = localStorage.getItem('startupMagicLink')
    if (existing) {
      console.log('🔗 Using existing startup magic link')
      startupMagicLink = existing
      return existing
    }

    console.log('🚀 Generating first-time magic link...')
    
    // Generate simple random ID without crypto
    const linkId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15)
    const timestamp = Date.now()
    const expiresIn = 365 * 24 * 60 * 60 * 1000 // 1 year (never expires really)
    const expiresAt = timestamp + expiresIn

    const inviteData = {
      id: linkId,
      createdBy: 'System',
      createdAt: timestamp,
      expiresAt: expiresAt,
      used: false,
      usedAt: null,
      usedBy: null,
      isStartupLink: true,
      version: 1
    }

    // Store the invite data
    localStorage.setItem(`invite_${linkId}`, JSON.stringify(inviteData))
    
    // Create the magic link URL
    const linkToken = btoa(JSON.stringify({
      id: linkId,
      timestamp: timestamp,
      signature: generateSimpleSignature(linkId, timestamp)
    }))

    const magicUrl = `${window.location.origin}?invite=${linkToken}`
    
    // Store for dev menu access
    localStorage.setItem('startupMagicLink', magicUrl)
    startupMagicLink = magicUrl
    
    console.log('✅ Startup magic link generated:', linkId)
    
    return magicUrl
    
  } catch (error) {
    console.error('❌ Failed to generate startup magic link:', error)
    return null
  }
}

export const getStartupMagicLink = () => {
  if (startupMagicLink) return startupMagicLink
  return localStorage.getItem('startupMagicLink')
}

export const hasAnyUsers = () => {
  // Check if anyone has used any invite link
  const keys = Object.keys(localStorage)
  return keys.some(key => key.startsWith('encrypted_userNickname'))
}

const generateSimpleSignature = (linkId, timestamp) => {
  // Simple signature for demo
  return btoa(`${linkId}:${timestamp}`).substring(0, 16)
}