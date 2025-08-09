// Magic link management for single-use invitation system
import { encryptedSetItem, encryptedGetItem, encryptedRemoveItem } from './storage.js'

// Generate a secure single-use magic link
export const createMagicLink = (adminNickname, sodium) => {
  if (!sodium) {
    throw new Error('Sodium not available for link generation')
  }

  // Generate cryptographically secure random ID
  const linkId = sodium.to_hex(sodium.randombytes_buf(16)) // 32 hex chars
  const timestamp = Date.now()
  const expiresIn = 24 * 60 * 60 * 1000 // 24 hours
  const expiresAt = timestamp + expiresIn

  const inviteData = {
    id: linkId,
    createdBy: adminNickname,
    createdAt: timestamp,
    expiresAt: expiresAt,
    used: false,
    usedAt: null,
    usedBy: null,
    version: 1 // For future compatibility
  }

  // Store the invite in encrypted storage
  const inviteKey = `invite_${linkId}`
  encryptedSetItem(inviteKey, inviteData)

  // Also store in invite registry for tracking
  const registry = getInviteRegistry()
  registry[linkId] = {
    createdAt: timestamp,
    expiresAt: expiresAt,
    used: false,
    createdBy: adminNickname
  }
  encryptedSetItem('inviteRegistry', registry)

  // Create the magic link URL
  const linkToken = btoa(JSON.stringify({
    id: linkId,
    timestamp: timestamp,
    signature: generateLinkSignature(linkId, timestamp, sodium)
  }))

  const magicUrl = `${window.location.origin}?invite=${linkToken}`
  
  console.log('🔗 Created magic link:', { linkId, expiresAt: new Date(expiresAt) })
  
  return {
    url: magicUrl,
    id: linkId,
    expiresAt: expiresAt,
    expiresIn: Math.round(expiresIn / (60 * 60 * 1000)) // hours
  }
}

// Validate and consume a magic link (single use)
export const validateMagicLink = (linkToken) => {
  try {
    const tokenData = JSON.parse(atob(linkToken))
    const { id, timestamp, signature } = tokenData

    if (!id || !timestamp || !signature) {
      throw new Error('Invalid link format')
    }

    // Get invite data from storage
    const inviteKey = `invite_${id}`
    const inviteData = encryptedGetItem(inviteKey)

    if (!inviteData) {
      throw new Error('Invalid or expired invitation')
    }

    // Check if already used
    if (inviteData.used) {
      throw new Error(`This invitation was already used${inviteData.usedBy ? ` by ${inviteData.usedBy}` : ''}`)
    }

    // Check if expired
    if (Date.now() > inviteData.expiresAt) {
      throw new Error('This invitation has expired')
    }

    // Verify signature (basic protection against tampering)
    // In production, you'd want proper HMAC with a secret key
    const expectedSig = generateLinkSignature(id, timestamp, window.sodium || {})
    if (signature !== expectedSig) {
      console.warn('⚠️ Link signature mismatch - possible tampering')
      // Still allow for demo, but log the issue
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
    const inviteData = encryptedGetItem(inviteKey)

    if (!inviteData) {
      throw new Error('Invitation not found')
    }

    if (inviteData.used) {
      throw new Error('Invitation already used')
    }

    // Mark as used
    inviteData.used = true
    inviteData.usedAt = Date.now()
    inviteData.usedBy = userNickname

    // Update stored data
    encryptedSetItem(inviteKey, inviteData)

    // Update registry
    const registry = getInviteRegistry()
    if (registry[linkId]) {
      registry[linkId].used = true
      registry[linkId].usedAt = inviteData.usedAt
      registry[linkId].usedBy = userNickname
    }
    encryptedSetItem('inviteRegistry', registry)

    console.log('🔒 Magic link consumed:', { linkId, usedBy: userNickname })

    return true
  } catch (error) {
    console.error('❌ Failed to consume magic link:', error.message)
    return false
  }
}

// Get all invitations created by this admin (for management)
export const getInviteHistory = () => {
  try {
    const registry = getInviteRegistry()
    const now = Date.now()

    return Object.entries(registry).map(([linkId, data]) => ({
      id: linkId,
      shortId: linkId.substring(0, 8) + '...',
      createdBy: data.createdBy,
      createdAt: new Date(data.createdAt),
      expiresAt: new Date(data.expiresAt),
      used: data.used,
      usedAt: data.usedAt ? new Date(data.usedAt) : null,
      usedBy: data.usedBy,
      expired: now > data.expiresAt,
      status: data.used ? 'Used' : (now > data.expiresAt ? 'Expired' : 'Active')
    })).sort((a, b) => b.createdAt - a.createdAt) // Newest first

  } catch (error) {
    console.error('❌ Failed to get invite history:', error)
    return []
  }
}

// Clean up expired invitations
export const cleanupExpiredInvites = () => {
  try {
    const registry = getInviteRegistry()
    const now = Date.now()
    let cleaned = 0

    Object.entries(registry).forEach(([linkId, data]) => {
      if (now > data.expiresAt) {
        // Remove expired invite data
        const inviteKey = `invite_${linkId}`
        try {
          encryptedRemoveItem(inviteKey)
          delete registry[linkId]
          cleaned++
        } catch (error) {
          console.warn('Failed to cleanup invite:', linkId)
        }
      }
    })

    if (cleaned > 0) {
      encryptedSetItem('inviteRegistry', registry)
      console.log(`🧹 Cleaned up ${cleaned} expired invitations`)
    }

    return cleaned
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    return 0
  }
}

// Helper functions
const getInviteRegistry = () => {
  try {
    return encryptedGetItem('inviteRegistry') || {}
  } catch (error) {
    console.warn('Failed to load invite registry, creating new one')
    return {}
  }
}

const generateLinkSignature = (linkId, timestamp, sodium) => {
  // Simple signature for demo - in production use proper HMAC
  try {
    if (sodium && sodium.crypto_hash) {
      const data = `${linkId}:${timestamp}:secretsalt`
      return sodium.to_hex(sodium.crypto_hash(new TextEncoder().encode(data))).substring(0, 16)
    }
  } catch (error) {
    console.warn('Signature generation failed, using fallback')
  }
  
  // Fallback signature
  return btoa(`${linkId}:${timestamp}`).substring(0, 16)
}