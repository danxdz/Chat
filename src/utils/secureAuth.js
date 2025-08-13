// 🔐 Secure Authentication System for P2P Chat
// IRC-style login + cryptographically signed invites

/**
 * Generate a permanent user ID using Gun.SEA
 */
export const generatePermanentId = async () => {
  console.log('🔑 Generating permanent ID...')
  
  if (!window.Gun || !window.Gun.SEA) {
    console.error('❌ Gun.SEA not available')
    if (window.debugNotify) window.debugNotify('❌ Gun.SEA not available', 'error')
    throw new Error('Gun.SEA not available')
  }
  
  console.log('🔧 Gun.SEA available, creating pair...')
  if (window.debugNotify) window.debugNotify('🔑 Starting Gun.SEA.pair()...', 'info')
  
  try {
    // Simple direct call - Gun.SEA.pair() should return a promise in 0.2020.520
    const identity = await window.Gun.SEA.pair()
    
    console.log('✅ Identity generated:', {
      pub: identity.pub?.substring(0, 16) + '...',
      priv: identity.priv ? 'present' : 'missing'
    })
    
    if (window.debugNotify) window.debugNotify('✅ Gun.SEA.pair() SUCCESS!', 'success')
    
    return {
      id: identity.pub, // Public key as permanent ID
      privateKey: identity.priv, // For signing invites
      publicKey: identity.pub // For verification
    }
  } catch (error) {
    console.error('❌ Failed to generate Gun.SEA pair:', error)
    if (window.debugNotify) window.debugNotify('❌ Gun.SEA.pair() FAILED: ' + error.message, 'error')
    throw error
  }
}

/**
 * Create a new user account (IRC-style)
 */
export const createUserAccount = async (nickname, password, inviteData = null) => {
  try {
    console.log('👤 Creating user account for:', nickname)
    if (window.debugNotify) window.debugNotify('👤 Creating account: ' + nickname, 'info')
    
    const identity = await generatePermanentId()
    console.log('🔑 Identity created successfully')
    if (window.debugNotify) window.debugNotify('🔑 Identity created!', 'success')
    
    // Hash password for storage (never store plain text)
    console.log('🔐 Hashing password...')
    if (window.debugNotify) window.debugNotify('🔐 Hashing password...', 'info')
    const hashedPassword = await hashPassword(password)
    console.log('🔐 Password hashed successfully')
    if (window.debugNotify) window.debugNotify('🔐 Password hashed!', 'success')
    
    const userAccount = {
      id: identity.id, // Permanent cryptographic ID
      nickname: nickname.trim(),
      passwordHash: hashedPassword,
      privateKey: identity.privateKey,
      publicKey: identity.publicKey,
      createdAt: Date.now(),
      invitedBy: inviteData?.fromId || null,
      inviterNickname: inviteData?.fromNick || null,
      friends: inviteData ? [inviteData.fromId] : [] // Auto-friend inviter
    }
    
    console.log('👤 IRC-STYLE USER CREATED:', {
      id: identity.id.substring(0, 16) + '...',
      nickname: nickname
    })
    
    if (window.debugNotify) window.debugNotify('✅ Account created!', 'success')
    return userAccount
    
  } catch (error) {
    console.error('❌ Failed to create user account:', error)
    if (window.debugNotify) window.debugNotify('❌ Account creation failed: ' + error.message, 'error')
    throw error
  }
}

/**
 * IRC-style login with nickname + password
 */
export const ircLogin = async (nickname, password) => {
  try {
    // Look for user in localStorage by nickname
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    const user = allUsers.find(u => u.nickname.toLowerCase() === nickname.toLowerCase())
    
    if (!user) {
      throw new Error('Nickname not found')
    }
    
    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      throw new Error('Invalid password')
    }
    
    console.log('🔑 IRC-STYLE LOGIN SUCCESS:', {
      id: user.id.substring(0, 16) + '...',
      nickname: user.nickname
    })
    
    // Generate session keys if Gun.SEA is available
    if (window.Gun && window.Gun.SEA) {
      try {
        const pair = await window.Gun.SEA.pair()
        user.privateKey = pair.priv
        // Keep original public key but add session private key
        console.log('Generated session private key for invites')
      } catch (e) {
        console.warn('Could not generate session keys:', e)
      }
    }
    
    return user
    
  } catch (error) {
    console.error('❌ IRC login failed:', error)
    throw error
  }
}

/**
 * Create a cryptographically signed invite with expiration
 */
export const createSecureInvite = async (user, expirationChoice = '1h') => {
  console.log('🔑 Creating invite with user:', {
    hasUser: !!user,
    hasPrivateKey: !!user?.privateKey,
    userId: user?.id?.substring(0, 8),
    nickname: user?.nickname
  })
  
  if (!user.privateKey) {
    console.error('❌ No private key in user object:', user)
    throw new Error('User private key not available. Please logout and login again.')
  }
  
  const expirationTimes = {
    '60s': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000
  }
  
  const expiration = expirationTimes[expirationChoice] || expirationTimes['1h']
  
  try {
    const inviteId = crypto.randomUUID()
    const expiresAt = Date.now() + expiration
    
    const inviteData = {
      id: inviteId,
      fromId: user.id,
      fromNick: user.nickname,
      expiresAt: expiresAt,
      used: false,
      createdAt: Date.now()
    }
    
    // Simple direct call for Gun.SEA.sign
    const signature = await window.Gun.SEA.sign(JSON.stringify(inviteData), user.privateKey)
    
    const signedInvite = {
      ...inviteData,
      signature: signature
    }
    
    // Store invite in Gun.js P2P network for verification
    if (window.gun) {
      await window.gun.get('secure_invites').get(inviteId).put(signedInvite)
    }
    
    console.log('🎫 SECURE INVITE CREATED:', {
      id: inviteId,
      fromNick: user.nickname,
      expiresIn: expirationChoice,
      expiresAt: new Date(expiresAt).toLocaleString()
    })
    
    return {
      inviteId,
      inviteUrl: `${window.location.origin}/register_gunjs.html#invite=${btoa(JSON.stringify(signedInvite))}`,
      expiresAt,
      expirationChoice
    }
    
  } catch (error) {
    console.error('❌ Failed to create secure invite:', error)
    throw error
  }
}

/**
 * Verify and use a secure invite
 */
export const verifySecureInvite = async (inviteToken) => {
  try {
    console.log('🔍 VERIFYING INVITE TOKEN:', {
      tokenLength: inviteToken.length,
      tokenStart: inviteToken.substring(0, 20) + '...',
      tokenEnd: '...' + inviteToken.substring(inviteToken.length - 20)
    })
    alert('🔍 DEBUG: Starting invite verification...')
    
    const inviteData = JSON.parse(atob(inviteToken))
    console.log('✅ Invite token decoded successfully:', {
      id: inviteData.id,
      fromNick: inviteData.fromNick,
      expiresAt: new Date(inviteData.expiresAt).toLocaleString()
    })
    
    // Check expiration
    if (Date.now() > inviteData.expiresAt) {
      throw new Error('Invite has expired')
    }
    
    // Check if already used
    if (inviteData.used) {
      throw new Error('Invite has already been used')
    }
    
    // Verify cryptographic signature
    // Reconstruct the original message that was signed (without signature field)
    const { signature, ...originalData } = inviteData
    const originalMessage = JSON.stringify(originalData)
    
    console.log('🔐 Verifying signature:', {
      messageLength: originalMessage.length,
      signatureExists: !!signature,
      fromId: inviteData.fromId
    })
    
    // Simple direct call for Gun.SEA.verify
    const signatureValid = await window.Gun.SEA.verify(signature, originalMessage, inviteData.fromId)
    
    console.log('🔐 Signature verification result:', signatureValid)
    
    if (!signatureValid) {
      alert('❌ DEBUG: Signature verification FAILED!')
      throw new Error('Invalid invite signature - possible forgery')
    }
    
    console.log('✅ SECURE INVITE VERIFIED:', {
      id: inviteData.id,
      fromNick: inviteData.fromNick,
      validUntil: new Date(inviteData.expiresAt).toLocaleString()
    })
    
    alert('✅ DEBUG: Invite verification SUCCESS!')
    return inviteData
    
  } catch (error) {
    console.error('❌ Invite verification failed:', error)
    alert('❌ DEBUG: verifySecureInvite FAILED: ' + error.message)
    throw error
  }
}

/**
 * Mark invite as used (one-time use)
 */
export const markInviteUsed = async (inviteId) => {
  try {
    if (window.gun) {
      await window.gun.get('secure_invites').get(inviteId).get('used').put(true)
    }
    console.log('🎫 Invite marked as used:', inviteId)
  } catch (error) {
    console.error('❌ Failed to mark invite as used:', error)
  }
}



/**
 * Change user nickname and notify friends
 */
export const changeNickname = async (user, newNickname, gun) => {
  const oldNickname = user.nickname
  
  try {
    // Update user's nickname
    user.nickname = newNickname.trim()
    
    // Update in localStorage
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    const userIndex = allUsers.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      allUsers[userIndex].nickname = newNickname
      localStorage.setItem('users', JSON.stringify(allUsers))
    }
    
    // Notify all friends via P2P network
    if (gun && user.friends) {
      const notification = {
        type: 'nickname_change',
        userId: user.id,
        oldNickname: oldNickname,
        newNickname: newNickname,
        timestamp: Date.now()
      }
      
      user.friends.forEach(async (friendId) => {
        try {
          await gun.get('notifications').get(friendId).set(notification)
        } catch (e) {
          console.error('Failed to notify friend:', friendId, e)
        }
      })
    }
    
    console.log('✏️ NICKNAME CHANGED:', {
      userId: user.id.substring(0, 16) + '...',
      oldNickname: oldNickname,
      newNickname: newNickname,
      friendsNotified: user.friends?.length || 0
    })
    
    return user
    
  } catch (error) {
    console.error('❌ Failed to change nickname:', error)
    throw error
  }
}

/**
 * Hash password securely
 */
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * Add mutual friends when invite is accepted
 */
export const addMutualFriends = async (inviterId, newUserId) => {
  try {
    console.log('👥 Adding mutual friends:', { inviterId, newUserId })
    
    // Get existing users
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    
    // Find both users
    const inviterIndex = users.findIndex(u => u.id === inviterId)
    const newUserIndex = users.findIndex(u => u.id === newUserId)
    
    if (inviterIndex === -1 || newUserIndex === -1) {
      console.error('Could not find users for mutual friend add')
      return false
    }
    
    // Add each other as friends
    if (!users[inviterIndex].friends) users[inviterIndex].friends = []
    if (!users[newUserIndex].friends) users[newUserIndex].friends = []
    
    if (!users[inviterIndex].friends.includes(newUserId)) {
      users[inviterIndex].friends.push(newUserId)
    }
    if (!users[newUserIndex].friends.includes(inviterId)) {
      users[newUserIndex].friends.push(inviterId)
    }
    
    // Save updated users
    localStorage.setItem('users', JSON.stringify(users))
    
    // Update Gun.js friendships
    if (window.gun) {
      await window.gun.get('friendships').get(inviterId).get(newUserId).put({
        status: 'friends',
        since: Date.now()
      })
      await window.gun.get('friendships').get(newUserId).get(inviterId).put({
        status: 'friends',
        since: Date.now()
      })
    }
    
    console.log('✅ Mutual friends added successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to add mutual friends:', error)
    return false
  }
}

/**
 * Get friend list with current nicknames
 */
export const getFriendsList = (user, allUsers) => {
  if (!user.friends) return []
  
  return user.friends.map(friendId => {
    const friend = allUsers.find(u => u.id === friendId)
    return friend ? {
      id: friendId,
      nickname: friend.nickname,
      status: 'online', // Could be enhanced with presence
      invitedAt: friend.createdAt
    } : null
  }).filter(Boolean)
}