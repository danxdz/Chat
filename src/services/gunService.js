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

// Initialize Gun.js instance
export const initializeGun = async () => {
  try {
    if (!window.Gun) {
      throw new Error('Gun.js library not loaded')
    }

    logger.log('🌐 Initializing Gun.js with peers:', gunPeers)
    
    const gunInstance = window.Gun({
      peers: gunPeers,
      localStorage: false,
      radisk: false,
      file: false
    })

    // Test Gun.js connectivity
    const testKey = 'gun_init_test_' + Date.now()
    await gunInstance.get(testKey).put({ test: true, timestamp: Date.now() })
    
    gunInstance.get(testKey).once((data) => {
      if (data) {
        logger.log('✅ Gun.js connectivity test successful')
      }
    })

    return gunInstance

  } catch (error) {
    logger.error('❌ Gun.js initialization failed:', error)
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
    inviteId,
    fromUserId: fromUser.id,
    fromNick: fromUser.nickname,
    createdAt: Date.now(),
    expiresAt,
    status: 'pending'
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