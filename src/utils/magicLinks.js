// Simplified magic link management
export const validateMagicLink = (linkToken) => {
  try {
    const tokenData = JSON.parse(atob(linkToken))
    const { id, timestamp, signature } = tokenData

    if (!id || !timestamp || !signature) {
      throw new Error('Invalid link format')
    }

    // Get invite data from storage
    const inviteKey = `invite_${id}`
    const inviteDataStr = localStorage.getItem(inviteKey)
    
    if (!inviteDataStr) {
      throw new Error('Invalid or expired invitation')
    }

    const inviteData = JSON.parse(inviteDataStr)

    // Check if already used
    if (inviteData.used) {
      throw new Error(`This invitation was already used${inviteData.usedBy ? ` by ${inviteData.usedBy}` : ''}`)
    }

    // Check if expired
    if (Date.now() > inviteData.expiresAt) {
      throw new Error('This invitation has expired')
    }

    console.log('✅ Magic link validated:', { id, createdBy: inviteData.createdBy })

    return {
      valid: true,
      inviteData: inviteData,
      linkId: id
    }

  } catch (error) {
    console.error('❌ Magic link validation failed:', error.message)
    return {
      valid: false,
      error: error.message
    }
  }
}

// Mark a magic link as used (invalidates it permanently)
export const consumeMagicLink = (linkId, userNickname) => {
  try {
    const inviteKey = `invite_${linkId}`
    const inviteDataStr = localStorage.getItem(inviteKey)

    if (!inviteDataStr) {
      throw new Error('Invitation not found')
    }

    const inviteData = JSON.parse(inviteDataStr)

    if (inviteData.used) {
      throw new Error('Invitation already used')
    }

    // Mark as used
    inviteData.used = true
    inviteData.usedAt = Date.now()
    inviteData.usedBy = userNickname

    // Update stored data
    localStorage.setItem(inviteKey, JSON.stringify(inviteData))

    console.log('🔒 Magic link consumed:', { linkId, usedBy: userNickname })

    return true
  } catch (error) {
    console.error('❌ Failed to consume magic link:', error.message)
    return false
  }
}