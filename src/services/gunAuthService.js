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
      let subscription
      let timeout
      let resolved = false
      
      // Use .on() to sync from peers
      subscription = gun.get('chat_users_by_nick').get(nickname.toLowerCase()).on((data) => {
        if (!resolved && data && data.userId) {
          resolved = true
          if (subscription && subscription.off) {
            subscription.off()
          }
          clearTimeout(timeout)
          resolve(data)
        }
      })
      
      // Timeout after 3 seconds
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          if (subscription && subscription.off) {
            subscription.off()
          }
          resolve(null)
        }
      }, 3000)
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
    
    // Get full user data (sync from peers)
    const userData = await new Promise((resolve) => {
      let subscription
      let timeout
      let resolved = false
      
      subscription = gun.get('chat_users').get(userRef.userId).on((data) => {
        if (!resolved && data && data.nickname) {
          resolved = true
          if (subscription && subscription.off) {
            subscription.off()
          }
          clearTimeout(timeout)
          resolve(data)
        }
      })
      
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          if (subscription && subscription.off) {
            subscription.off()
          }
          resolve(null)
        }
      }, 3000)
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
    let subscription
    
    // Use .on() to sync from peers, not just local cache
    subscription = gun.get('chat_users').map().on((userData, userId) => {
      if (userData && userData.nickname && userId !== 'initialized' && !seenUsers.has(userId)) {
        seenUsers.add(userId)
        users.push({
          id: userId,
          nickname: userData.nickname,
          createdAt: userData.createdAt,
          friends: userData.friends || [],
          passwordHash: userData.passwordHash  // Include for login
        })
      }
      
      // Reset timeout on each user found
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        // Unsubscribe after getting all users
        if (subscription && subscription.off) {
          subscription.off()
        }
        logger.log(`📊 Found ${users.length} users in Gun.js (synced from peers)`)
        resolve(users)
      }, 1000)  // Wait a bit longer for sync
    })
    
    // Initial timeout if no users found
    timeout = setTimeout(() => {
      if (subscription && subscription.off) {
        subscription.off()
      }
      logger.log('📊 No users found in Gun.js after peer sync')
      resolve([])
    }, 3000)  // Give more time for initial sync
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
 * Clear all Gun.js data (reset database)
 */
export const clearGunDatabase = async (gun) => {
  try {
    logger.log('🗑️ Clearing Gun.js database...')
    
    // Clear users
    await gun.get('chat_users').put(null)
    await gun.get('chat_users_by_nick').put(null)
    
    // Clear messages
    await gun.get('general_chat').put(null)
    await gun.get('chat_messages').put(null)
    
    // Clear invites
    await gun.get('secure_invites').put(null)
    
    // Clear presence/online data
    await gun.get('user_presence').put(null)
    await gun.get('online_users').put(null)
    
    // Clear friendships
    await gun.get('friendships').put(null)
    
    // Re-initialize the users system
    gun.get('chat_users').put({ initialized: true })
    
    logger.log('✅ Gun.js database cleared!')
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