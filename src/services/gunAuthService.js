// Gun.js Authentication Service - Cross-platform user management
import { logger } from '../utils/logger'
import { addMutualFriendship } from './friendsService'

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost'

/**
 * Decrypt private key when needed for operations
 * @param {object} user - User object with encrypted private key
 * @returns {Promise<string|null>} - Decrypted private key or null
 */
export const decryptPrivateKey = async (user) => {
  if (!user?.encryptedPrivateKey || !user?._sessionPassword) {
    logger.warn('Cannot decrypt private key - missing encrypted key or session password')
    return null
  }
  
  try {
    const privateKey = await window.Gun.SEA.decrypt(user.encryptedPrivateKey, user._sessionPassword)
    return privateKey
  } catch (error) {
    logger.error('Failed to decrypt private key:', error)
    return null
  }
}

/**
 * Initialize Gun.js user system
 */
export const initGunUsers = (gun) => {
  if (!gun) {
    logger.error('Gun.js instance required for initGunUsers')
    return false
  }
  
  try {
    // Create users node if it doesn't exist
    gun.get('chat_users').put({ initialized: true })
    logger.log('🔫 Gun.js users system initialized')
    return true
  } catch (error) {
    logger.error('Failed to initialize Gun.js users:', error)
    return false
  }
}

/**
 * Create a new user account in Gun.js
 */
export const createGunUser = async (gun, nickname, password, inviteData = null) => {
  if (!gun || !window.Gun?.SEA) {
    throw new Error('Gun.js with SEA not available')
  }
  
  try {
    // Import security utilities
    const { generateSalt, hashPasswordWithSalt, sanitizeNickname } = await import('../utils/security')
    
    // Sanitize nickname
    const cleanNickname = sanitizeNickname(nickname)
    
    // Check if nickname already exists
    const existingUser = await checkUserExists(gun, cleanNickname)
    if (existingUser) {
      throw new Error('Nickname already taken')
    }
    
    // Create user identity
    const identity = await window.Gun.SEA.pair()
    
    // Generate cryptographically secure salt
    const salt = generateSalt()
    
    // Use PBKDF2 with salt for better security
    const hashedPassword = await hashPasswordWithSalt(password, salt)
    
    // Encrypt the private key for storage
    const encryptedPrivateKey = await window.Gun.SEA.encrypt(identity.priv, password)
  
    const newUser = {
      id: identity.pub,
      nickname: cleanNickname,
      passwordHash: hashedPassword,
      passwordSalt: salt,  // Store salt for login verification
      // SECURITY FIX: Never include plain private key in returned object
      // privateKey will be decrypted only when needed
      publicKey: identity.pub,
      createdAt: Date.now(),
      invitedBy: inviteData?.fromId || null,
      inviterNickname: inviteData?.fromNick || null,
      friends: inviteData?.fromId ? [inviteData.fromId] : []
    }
  
  // Store user in Gun.js (with encrypted private key)
  await gun.get('chat_users').get(identity.pub).put({
    nickname: cleanNickname,
    passwordHash: hashedPassword,
    passwordSalt: salt,
    publicKey: identity.pub,
    encryptedPrivateKey: encryptedPrivateKey,
    createdAt: Date.now(),
    invitedBy: inviteData?.fromId || null,
    friends: inviteData?.fromId ? [inviteData.fromId] : []
  })
    
    // Also store by nickname for easy lookup
    await gun.get('chat_users_by_nick').get(cleanNickname.toLowerCase()).put({
      userId: identity.pub,
      nickname: cleanNickname
    })
    
    // If invited, add mutual friendship
    if (inviteData?.fromId) {
      const friendshipAdded = await addMutualFriendship(gun, inviteData.fromId, identity.pub)
      if (friendshipAdded) {
        logger.log('✅ Mutual friendship established with inviter')
      } else {
        logger.warn('⚠️ Failed to establish mutual friendship with inviter')
      }
    }
    
    logger.log('✅ User created in Gun.js:', cleanNickname)
    
    // SECURITY: Return user with encrypted private key for session storage
    // Private key will be decrypted only when needed for operations
    newUser.encryptedPrivateKey = encryptedPrivateKey
    
    return newUser
    
  } catch (error) {
    logger.error('Failed to create Gun.js user:', error)
    throw error
  }
}

/**
 * Check if user exists in Gun.js
 */
export const checkUserExists = async (gun, nickname) => {
  if (!gun) {
    logger.warn('Gun instance not provided to checkUserExists')
    return null
  }
  
  return new Promise((resolve) => {
    try {
      let timeout
      let resolved = false
      
      // Use .once() first for quick check, then .on() for sync
      gun.get('chat_users_by_nick').get(nickname.toLowerCase()).once((data) => {
        if (!resolved && data && data.userId) {
          resolved = true
          clearTimeout(timeout)
          resolve(data)
        }
      })
      
      // Also subscribe for updates in case data arrives later
      gun.get('chat_users_by_nick').get(nickname.toLowerCase()).on((data) => {
        if (!resolved && data && data.userId) {
          resolved = true
          clearTimeout(timeout)
          resolve(data)
        }
      })
      
      // Timeout after 2 seconds
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          resolve(null)
        }
      }, 2000)
    } catch (error) {
      logger.error('Error in checkUserExists:', error)
      resolve(null)
    }
  })
}

/**
 * Login user from Gun.js
 */
export const loginGunUser = async (gun, nickname, password) => {
  if (!gun || !window.Gun?.SEA) {
    throw new Error('Gun.js with SEA not available')
  }
  
  try {
    // Import security utilities
    const { hashPasswordWithSalt, sanitizeNickname } = await import('../utils/security')
    
    // Sanitize nickname
    const cleanNickname = sanitizeNickname(nickname)
    
    // Find user by nickname
    const userRef = await checkUserExists(gun, cleanNickname)
    if (!userRef) {
      throw new Error('User not found')
    }
    
    // Get full user data (try once first, then sync from peers)
    const userData = await new Promise((resolve) => {
      let timeout
      let resolved = false
      
      // Try .once() first for quick response
      gun.get('chat_users').get(userRef.userId).once((data) => {
        if (!resolved && data && data.nickname) {
          resolved = true
          clearTimeout(timeout)
          resolve(data)
        }
      })
      
      // Also use .on() to sync from peers if needed
      gun.get('chat_users').get(userRef.userId).on((data) => {
        if (!resolved && data && data.nickname) {
          resolved = true
          clearTimeout(timeout)
          resolve(data)
        }
      })
      
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          resolve(null)
        }
      }, 2000)
    })
    
    if (!userData) {
      throw new Error('User data not found')
    }
    
    // Verify password with salt
    let hashedPassword
    if (userData.passwordSalt) {
      // Use proper PBKDF2 with salt
      hashedPassword = await hashPasswordWithSalt(password, userData.passwordSalt)
    } else {
      // Old method for backward compatibility (will be phased out)
      hashedPassword = await window.Gun.SEA.work(password, null, null, {name: 'SHA-256'})
    }
    
    if (userData.passwordHash !== hashedPassword) {
      throw new Error('Invalid password')
    }
    
    // Reconstruct user object (without exposing sensitive data)
    const user = {
      id: userRef.userId,
      nickname: userData.nickname,
      // SECURITY: Don't include password hash in user object
      publicKey: userData.publicKey || userRef.userId,
      createdAt: userData.createdAt,
      invitedBy: userData.invitedBy,
      friends: userData.friends || []
    }
    
    // Store encrypted private key for session (will decrypt when needed)
    if (userData.encryptedPrivateKey) {
      user.encryptedPrivateKey = userData.encryptedPrivateKey
      // Store password temporarily in memory for this session only
      // This allows decryption when needed for operations
      user._sessionPassword = password // Prefixed with _ to indicate internal use
      logger.log('✅ Encrypted private key stored for session')
    } else {
      logger.warn('⚠️ No encrypted private key found for user')
    }
    
    logger.log('✅ User logged in from Gun.js:', cleanNickname)
    return user
    
  } catch (error) {
    logger.error('Failed to login from Gun.js:', error)
    throw error
  }
}

/**
 * Get all users from Gun.js
 */
export const getAllGunUsers = async (gun) => {
  if (!gun) {
    logger.warn('Gun.js instance not provided to getAllGunUsers')
    return []
  }
  
  return new Promise((resolve) => {
    const users = []
    const seenUsers = new Set()
    let subscription = null
    
    // Set a maximum wait time
    const maxTimeout = setTimeout(() => {
      if (subscription) subscription.off()
      logger.log(`✅ Loaded ${users.length} users from Gun.js (final)`)
      resolve(users)
    }, 3000)
    
    // Use .map().on() to get all users - keep subscription for real-time updates
    subscription = gun.get('chat_users').map().on((userData, userId) => {
      if (userData && userData.nickname && userId !== 'initialized' && !seenUsers.has(userId)) {
        seenUsers.add(userId)
        users.push({
          id: userId,
          nickname: userData.nickname,
          publicKey: userData.publicKey || userId,
          createdAt: userData.createdAt,
          friends: userData.friends || [],
          passwordHash: userData.passwordHash,
          invitedBy: userData.invitedBy,
          privateKey: userData.privateKey // Include if available for session
        })
        logger.debug(`Found user: ${userData.nickname}`)
      }
    })
    
    // Give it a moment to collect initial batch, then resolve
    setTimeout(() => {
      if (users.length > 0) {
        clearTimeout(maxTimeout)
        if (subscription) subscription.off()
        logger.log(`✅ Loaded ${users.length} users from Gun.js`)
        resolve(users)
      }
    }, 1500)
  })
}

/**
 * Update user in Gun.js
 */
export const updateGunUser = async (gun, userId, updates) => {
  try {
    await gun.get('chat_users').get(userId).put(updates)
    
    // If nickname changed, update the nickname index
    if (updates.nickname) {
      const oldData = await new Promise((resolve) => {
        gun.get('chat_users').get(userId).once((data) => resolve(data))
        setTimeout(() => resolve(null), 1000)
      })
      
      if (oldData && oldData.nickname !== updates.nickname) {
        // Remove old nickname reference
        await gun.get('chat_users_by_nick').get(oldData.nickname.toLowerCase()).put(null)
        // Add new nickname reference
        await gun.get('chat_users_by_nick').get(updates.nickname.toLowerCase()).put({
          userId: userId,
          nickname: updates.nickname
        })
      }
    }
    
    logger.log('✅ User updated in Gun.js')
    return true
  } catch (error) {
    logger.error('Failed to update user in Gun.js:', error)
    return false
  }
}

/**
 * Migrate existing localStorage users to Gun.js
 */
export const migrateUsersToGun = async (gun) => {
  if (!gun) {
    logger.warn('Gun instance not provided to migrateUsersToGun')
    return 0
  }
  
  try {
    const localUsers = JSON.parse(localStorage.getItem('users') || '[]')
    
    if (localUsers.length === 0) {
      logger.log('No users to migrate')
      return 0
    }
    
    logger.log(`🔄 Migrating ${localUsers.length} users to Gun.js...`)
    
    for (const user of localUsers) {
      // Check if user already exists in Gun.js
      const exists = await checkUserExists(gun, user.nickname)
      if (exists) {
        logger.log(`User ${user.nickname} already exists in Gun.js, skipping`)
        continue
      }
      
      // Store user in Gun.js
      await gun.get('chat_users').get(user.id).put({
        nickname: user.nickname,
        passwordHash: user.passwordHash,
        publicKey: user.publicKey || user.id,
        createdAt: user.createdAt || Date.now(),
        invitedBy: user.invitedBy || null,
        friends: user.friends || []
      })
      
      // Store nickname reference
      await gun.get('chat_users_by_nick').get(user.nickname.toLowerCase()).put({
        userId: user.id,
        nickname: user.nickname
      })
      
      logger.log(`✅ Migrated user: ${user.nickname}`)
    }
    
    logger.log(`✅ Migration complete! ${localUsers.length} users migrated to Gun.js`)
    return localUsers.length
    
  } catch (error) {
    logger.error('Migration failed:', error)
    throw error
  }
}

/**
 * Clear only messages from Gun.js
 */
export const clearMessagesOnly = async (gun) => {
  try {
    logger.log('🗑️ Clearing all messages...')
    
    // Get all messages and delete them one by one
    let count = 0
    
    // Clear general chat
    await new Promise((resolve) => {
      let timeout = setTimeout(resolve, 2000)
      
      gun.get('general_chat').map().on(function(msg, key) {
        if (msg && key && typeof msg === 'object' && msg.text) {
          // Use 'this' context to unset the message
          this.put(null)
          count++
          clearTimeout(timeout)
          timeout = setTimeout(resolve, 500)
        }
      })
    })
    
    logger.log(`✅ Cleared ${count} messages`)
    
    // Overwrite nodes with empty data
    await gun.get('general_chat').put({ cleared: true, timestamp: Date.now() })
    
    // Clear localStorage messages
    localStorage.removeItem('messages')
    
    return true
  } catch (error) {
    logger.error('Failed to clear messages:', error)
    throw error
  }
}

/**
 * Clear all Gun.js data (reset database)
 */
export const clearGunDatabase = async (gun) => {
  try {
    logger.log('🗑️ Starting AGGRESSIVE Gun.js database cleanup...')
    
    // First get all users to clear them individually
    const users = await getAllGunUsers(gun)
    logger.log(`Found ${users.length} users to clear`)
    
    // Clear each user individually
    for (const user of users) {
      await gun.get('chat_users').get(user.id).put(null)
      if (user.nickname) {
        await gun.get('chat_users_by_nick').get(user.nickname.toLowerCase()).put(null)
      }
    }
    
    // AGGRESSIVE MESSAGE CLEARING
    logger.log('💥 AGGRESSIVE message clearing started...')
    
    // Method 1: Clear general chat by mapping and nulling each message
    const clearedMessages = new Set()
    await new Promise((resolve) => {
      let timeout = setTimeout(() => {
        logger.log(`Method 1: Cleared ${clearedMessages.size} messages`)
        resolve()
      }, 3000)
      
      gun.get('general_chat').map().on((msg, key) => {
        if (msg && key && !clearedMessages.has(key)) {
          clearedMessages.add(key)
          // Multiple attempts to ensure deletion
          gun.get('general_chat').get(key).put(null)
          gun.get('general_chat').get(key).put(undefined)
          gun.get('general_chat').unset(key)
        }
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          logger.log(`Method 1: Cleared ${clearedMessages.size} messages`)
          resolve()
        }, 1000)
      })
    })
    
    // Method 2: Overwrite the entire general_chat node
    await gun.get('general_chat').put(null)
    await gun.get('general_chat').put({})
    await gun.get('general_chat').put({ cleared: true, at: Date.now() })
    
    // Method 3: Clear all possible message nodes
    const messageNodes = [
      'general_chat',
      'messages', 
      'chat_messages',
      'chat',
      'msgs'
    ]
    
    for (const node of messageNodes) {
      await gun.get(node).put(null)
      await gun.get(node).put({})
    }
    
    // Clear private message channels
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const channelName = `private_${[users[i].id, users[j].id].sort().join('_')}`
        await gun.get(channelName).put(null)
        await gun.get(channelName).put({})
      }
    }
    
    // Clear all root nodes
    await gun.get('chat_users').put(null)
    await gun.get('chat_users_by_nick').put(null)
    await gun.get('general_chat').put(null)
    await gun.get('chat_messages').put(null)
    await gun.get('messages').put(null)
    await gun.get('secure_invites').put(null)
    await gun.get('invites').put(null)
    await gun.get('user_presence').put(null)
    await gun.get('online_users').put(null)
    await gun.get('presence').put(null)
    await gun.get('friendships').put(null)
    
    // Clear localStorage too for complete reset
    localStorage.clear()
    sessionStorage.clear()
    
    // Wait for Gun.js to sync deletions
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Force clear by overwriting with empty objects
    const emptyData = { cleared: true, timestamp: Date.now() }
    await gun.get('general_chat').put(emptyData)
    await gun.get('messages').put(emptyData)
    await gun.get('chat_messages').put(emptyData)
    
    // Wait a bit more for sync
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Re-initialize empty nodes
    await gun.get('chat_users').put({ initialized: Date.now() })
    await gun.get('chat_users_by_nick').put({ initialized: Date.now() })
    await gun.get('messages').put({ initialized: Date.now() })
    await gun.get('general_chat').put({ initialized: Date.now() })
    
    logger.log('✅ Gun.js database and localStorage completely cleared!')
    return true
  } catch (error) {
    logger.error('Failed to clear Gun.js database:', error)
    throw error
  }
}

export default {
  initGunUsers,
  createGunUser,
  checkUserExists,
  loginGunUser,
  getAllGunUsers,
  updateGunUser,
  migrateUsersToGun,
  clearGunDatabase
}