// Gun.js Authentication Service - Cross-platform user management
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost'

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => isDev && console.warn(...args),
  info: (...args) => isDev && console.info(...args),
  debug: (...args) => isDev && console.debug(...args)
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
    // Check if nickname already exists
    const existingUser = await checkUserExists(gun, nickname)
    if (existingUser) {
      throw new Error('Nickname already taken')
    }
    
    // Create user identity
    const identity = await window.Gun.SEA.pair()
    const hashedPassword = await window.Gun.SEA.work(password, null, null, {name: 'SHA-256'})
    
    const newUser = {
      id: identity.pub,
      nickname: nickname,
      passwordHash: hashedPassword,
      privateKey: identity.priv,
      publicKey: identity.pub,
      createdAt: Date.now(),
      invitedBy: inviteData?.fromId || null,
      inviterNickname: inviteData?.fromNick || null,
      friends: inviteData?.fromId ? [inviteData.fromId] : []
    }
    
    // Store user in Gun.js
    await gun.get('chat_users').get(identity.pub).put({
      nickname: nickname,
      passwordHash: hashedPassword,
      publicKey: identity.pub,
      createdAt: Date.now(),
      invitedBy: inviteData?.fromId || null,
      friends: inviteData?.fromId ? [inviteData.fromId] : []
    })
    
    // Also store by nickname for easy lookup
    await gun.get('chat_users_by_nick').get(nickname.toLowerCase()).put({
      userId: identity.pub,
      nickname: nickname
    })
    
    // If invited, add mutual friendship
    if (inviteData?.fromId) {
      await addMutualFriendsGun(gun, inviteData.fromId, identity.pub)
    }
    
    logger.log('✅ User created in Gun.js:', nickname)
    
    // Store private key locally for this session
    sessionStorage.setItem('userPrivateKey', identity.priv)
    
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
    // Find user by nickname
    const userRef = await checkUserExists(gun, nickname)
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
    
    // Verify password
    const hashedPassword = await window.Gun.SEA.work(password, null, null, {name: 'SHA-256'})
    if (userData.passwordHash !== hashedPassword) {
      throw new Error('Invalid password')
    }
    
    // Reconstruct user object
    const user = {
      id: userRef.userId,
      nickname: userData.nickname,
      passwordHash: userData.passwordHash,
      publicKey: userData.publicKey || userRef.userId,
      createdAt: userData.createdAt,
      invitedBy: userData.invitedBy,
      friends: userData.friends || []
    }
    
    // Try to recover private key from previous session
    const storedPrivateKey = sessionStorage.getItem('userPrivateKey')
    if (storedPrivateKey) {
      user.privateKey = storedPrivateKey
    }
    
    logger.log('✅ User logged in from Gun.js:', nickname)
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
    let timeout
    
    // Use .map().on() to get all users - this syncs from peers
    gun.get('chat_users').map().on((userData, userId) => {
      if (userData && userData.nickname && userId !== 'initialized' && !seenUsers.has(userId)) {
        seenUsers.add(userId)
        users.push({
          id: userId,
          nickname: userData.nickname,
          createdAt: userData.createdAt,
          friends: userData.friends || [],
          passwordHash: userData.passwordHash  // Include for login
        })
        
        // Reset timeout on each user found
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          logger.log(`📊 Found ${users.length} users in Gun.js`)
          resolve(users)
        }, 500)
      }
    })
    
    // Initial timeout if no users found
    timeout = setTimeout(() => {
      logger.log('📊 No users found in Gun.js')
      resolve(users) // Return empty array or whatever we found
    }, 2000)
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
 * Add mutual friends in Gun.js
 */
export const addMutualFriendsGun = async (gun, userId1, userId2) => {
  try {
    // Get both users
    const user1Data = await new Promise((resolve) => {
      gun.get('chat_users').get(userId1).once((data) => resolve(data))
      setTimeout(() => resolve(null), 1000)
    })
    
    const user2Data = await new Promise((resolve) => {
      gun.get('chat_users').get(userId2).once((data) => resolve(data))
      setTimeout(() => resolve(null), 1000)
    })
    
    if (!user1Data || !user2Data) {
      throw new Error('One or both users not found')
    }
    
    // Update friends arrays
    const user1Friends = user1Data.friends || []
    const user2Friends = user2Data.friends || []
    
    if (!user1Friends.includes(userId2)) {
      user1Friends.push(userId2)
      await gun.get('chat_users').get(userId1).get('friends').put(user1Friends)
    }
    
    if (!user2Friends.includes(userId1)) {
      user2Friends.push(userId1)
      await gun.get('chat_users').get(userId2).get('friends').put(user2Friends)
    }
    
    logger.log('✅ Mutual friends added in Gun.js')
    return true
    
  } catch (error) {
    logger.error('Failed to add mutual friends in Gun.js:', error)
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
  addMutualFriendsGun,
  migrateUsersToGun,
  clearGunDatabase
}