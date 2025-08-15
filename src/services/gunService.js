// Gun.js Service - Handles all P2P communication
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost'

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => isDev && console.warn(...args),
  info: (...args) => isDev && console.info(...args),
  debug: (...args) => isDev && console.debug(...args)
}

// Gun.js peer configuration
export const gunPeers = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-matrix.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun'
]

// Initialize Gun.js with peers
export const initializeGunJS = async (peers = gunPeers) => {
  try {
    // Wait for Gun to be available
    let attempts = 0
    while (!window.Gun && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (!window.Gun) {
      throw new Error('Gun.js failed to load after 2 seconds')
    }
    
    // Initialize Gun with peers
    const gun = window.Gun(peers)
    
    // Wait for SEA to be available
    attempts = 0
    while (!window.Gun.SEA && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (!window.Gun.SEA) {
      console.error('⚠️ Gun.SEA not available, trying to load it manually')
      
      // Try to reinitialize Gun.SEA if it's not available
      if (window.SEA) {
        window.Gun.SEA = window.SEA
        console.log('✅ Gun.SEA manually attached from window.SEA')
      } else {
        console.error('❌ SEA module not found at all')
        // Continue without SEA - app will work but without encryption
      }
    }
    
    // Test SEA availability
    if (window.Gun.SEA) {
      try {
        // Quick test to ensure SEA is working
        const testPair = await window.Gun.SEA.pair()
        if (testPair && testPair.pub) {
          logger.log('✅ Gun.SEA is working properly')
        }
      } catch (e) {
        console.error('⚠️ Gun.SEA test failed:', e)
      }
    }
    
    logger.log('🔫 Gun.js initialized with peers:', peers)
    return gun
  } catch (error) {
    logger.error('Failed to initialize Gun.js:', error)
    throw error
  }
}

// Send a message through Gun.js
export const sendGunMessage = async (gun, channel, messageData) => {
  if (!gun) {
    throw new Error('Gun.js not initialized')
  }

  try {
    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const message = {
      ...messageData,
      id: messageId,
      timestamp: Date.now()
    }

    logger.log(`📤 Sending message to ${channel}:`, message)
    
    // Put message to Gun.js
    await gun.get(channel).get(messageId).put(message)
    
    return { success: true, messageId }
  } catch (error) {
    logger.error('❌ Failed to send message:', error)
    throw error
  }
}

// Announce user presence
export const announcePresence = (gun, userId, nickname, action = 'join') => {
  if (!gun) return

  const presenceData = {
    userId,
    nickname,
    action,
    timestamp: Date.now()
  }

  logger.log('📢 Announcing presence:', presenceData)
  
  // Announce to presence channel
  gun.get('user_presence').get(Date.now().toString()).put(presenceData)
  
  // Update online users list
  if (action === 'join') {
    gun.get('online_users').get(userId).put({
      nickname,
      isOnline: true,
      lastSeen: Date.now()
    })
  } else if (action === 'leave') {
    gun.get('online_users').get(userId).put({
      nickname,
      isOnline: false,
      lastSeen: Date.now()
    })
  }
}

// Create a secure invite
export const createSecureInvite = async (gun, fromUser, expiresInHours = 24) => {
  if (!gun) throw new Error('Gun.js not initialized')
  
  const inviteId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000)
  
  const inviteData = {
    id: inviteId,
    inviteId,
    fromId: fromUser.id,
    fromUserId: fromUser.id,
    fromNick: fromUser.nickname,
    createdAt: Date.now(),
    expiresAt,
    status: 'pending',
    acceptedBy: null,
    acceptedAt: null
  }
  
  // Store invite in Gun.js
  await gun.get('secure_invites').get(inviteId).put(inviteData)
  
  logger.log('🎫 Secure invite created:', inviteData)
  
  return {
    inviteId,
    inviteUrl: `${window.location.origin}/register.html?invite=${inviteId}`,
    expiresAt
  }
}

// Monitor peer connections
export const monitorPeerConnections = (gun, callback) => {
  if (!gun || !gun._.opt || !gun._.opt.peers) return null
  
  const interval = setInterval(() => {
    const peerCount = Object.keys(gun._.opt.peers).length
    callback(peerCount)
  }, 5000)
  
  return interval
}

// Clean up Gun.js instance
export const cleanupGun = (gun, peerMonitorInterval) => {
  if (peerMonitorInterval) {
    clearInterval(peerMonitorInterval)
  }
  
  if (gun && gun.off) {
    gun.off()
  }
}

export default {
  gunPeers,
  initializeGun,
  sendGunMessage,
  announcePresence,
  createSecureInvite,
  monitorPeerConnections,
  cleanupGun
}