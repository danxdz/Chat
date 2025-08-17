import DB_KEYS from '../config/database.js';

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => isDev && console.warn(...args)
};

/**
 * Process invite acceptance - single source of truth
 */
export const processInviteAcceptance = async (gun, inviteToken, acceptorId, acceptorNickname) => {
  try {
    logger.log('🔄 Processing invite acceptance:', { acceptorId, acceptorNickname });
    
    // Decode invite data
    const inviteData = JSON.parse(atob(inviteToken));
    const { id: inviteId, fromId: inviterId } = inviteData;
    
    if (!inviteId || !inviterId || !acceptorId) {
      throw new Error('Missing required IDs for invite processing');
    }
    
    // 1. Update invite status in Gun.js
    const inviteUpdate = {
      id: inviteId,
      fromId: inviterId,
      status: 'accepted',
      used: true,
      acceptedBy: acceptorId,
      acceptedNickname: acceptorNickname,
      acceptedAt: Date.now(),
      usedAt: Date.now()
    };
    
    // Update in the main invites database
    await gun.get(DB_KEYS.INVITES).get(inviteId).put(inviteUpdate);
    logger.log('✅ Updated invite in main database:', inviteId);
    
    // Update in user's invite list
    await gun.get(DB_KEYS.USER_INVITES).get(inviterId).get(inviteId).put(inviteUpdate);
    logger.log('✅ Updated invite in user invites:', inviterId);
    
    // 2. Create mutual friendship in Gun.js
    // Add acceptor to inviter's friends
    await gun.get(DB_KEYS.USERS).get(inviterId).get('friends').get(acceptorId).put({
      id: acceptorId,
      nickname: acceptorNickname,
      addedAt: Date.now(),
      via: 'invite'
    });
    
    // Add inviter to acceptor's friends
    const inviterData = await new Promise(resolve => {
      gun.get(DB_KEYS.USERS).get(inviterId).once(data => resolve(data || {}));
    });
    
    await gun.get(DB_KEYS.USERS).get(acceptorId).get('friends').get(inviterId).put({
      id: inviterId,
      nickname: inviterData.nickname || 'Friend',
      addedAt: Date.now(),
      via: 'invite'
    });
    
    logger.log('✅ Created mutual friendship:', inviterId, '<->', acceptorId);
    
    // 3. Store friendship in dedicated friendships node for easy querying
    const friendshipId = [inviterId, acceptorId].sort().join('_');
    await gun.get(DB_KEYS.FRIENDSHIPS).get(friendshipId).put({
      users: [inviterId, acceptorId],
      createdAt: Date.now(),
      via: 'invite',
      inviteId: inviteId
    });
    
    logger.log('✅ Stored friendship record:', friendshipId);
    
    return true;
  } catch (error) {
    logger.error('❌ Failed to process invite acceptance:', error);
    throw error;
  }
};

/**
 * Get all friends for a user from Gun.js
 */
export const getFriendsFromGun = async (gun, userId) => {
  if (!gun || !userId) return [];
  
  try {
    return new Promise((resolve) => {
      const friends = [];
      const processed = new Set();
      
      const timeout = setTimeout(() => {
        logger.log(`📋 Found ${friends.length} friends for user`);
        resolve(friends);
      }, 2000);
      
      // Get friends from user's friends list
      gun.get(DB_KEYS.USERS).get(userId).get('friends').map().once((friend, friendId) => {
        if (friend && friendId && !processed.has(friendId)) {
          processed.add(friendId);
          
          // Get additional friend data
          gun.get(DB_KEYS.USERS).get(friendId).once((userData) => {
            friends.push({
              id: friendId,
              nickname: friend.nickname || userData?.nickname || 'Friend',
              addedAt: friend.addedAt,
              via: friend.via,
              ...userData
            });
          });
        }
      });
    });
  } catch (error) {
    logger.error('Failed to get friends from Gun:', error);
    return [];
  }
};

/**
 * Get pending invites for a user from Gun.js
 */
export const getPendingInvitesFromGun = async (gun, userId) => {
  if (!gun || !userId) return [];
  
  try {
    return new Promise((resolve) => {
      const invites = [];
      const processed = new Set();
      
      const timeout = setTimeout(() => {
        logger.log(`📋 Found ${invites.length} pending invites`);
        resolve(invites);
      }, 2000);
      
      // Get from user invites
      gun.get(DB_KEYS.USER_INVITES).get(userId).map().once((invite, inviteId) => {
        if (invite && inviteId && !processed.has(inviteId)) {
          processed.add(inviteId);
          
          const isPending = invite.status !== 'accepted' && invite.status !== 'used';
          const isExpired = invite.expiresAt && invite.expiresAt < Date.now();
          
          if (isPending && !isExpired) {
            invites.push({
              id: inviteId,
              ...invite,
              status: 'pending'
            });
          } else if (invite.status === 'accepted' || invite.status === 'used') {
            invites.push({
              id: inviteId,
              ...invite,
              status: 'accepted'
            });
          }
        }
      });
    });
  } catch (error) {
    logger.error('Failed to get pending invites:', error);
    return [];
  }
};

/**
 * Monitor invite status changes in real-time
 */
export const monitorInviteChanges = (gun, userId, callback) => {
  if (!gun || !userId || !callback) return () => {};
  
  // Monitor user's invites
  const unsubscribe = gun.get(DB_KEYS.USER_INVITES).get(userId).map().on((invite, inviteId) => {
    if (invite && inviteId) {
      callback({
        type: invite.status === 'accepted' ? 'accepted' : 'updated',
        invite: {
          id: inviteId,
          ...invite
        }
      });
    }
  });
  
  return unsubscribe;
};

/**
 * Monitor friends list changes in real-time
 */
export const monitorFriendsChanges = (gun, userId, callback) => {
  if (!gun || !userId || !callback) return () => {};
  
  const unsubscribe = gun.get(DB_KEYS.USERS).get(userId).get('friends').map().on((friend, friendId) => {
    if (friend && friendId) {
      // Get full friend data
      gun.get(DB_KEYS.USERS).get(friendId).once((userData) => {
        callback({
          type: 'friend_added',
          friend: {
            id: friendId,
            nickname: friend.nickname || userData?.nickname || 'Friend',
            ...friend,
            ...userData
          }
        });
      });
    }
  });
  
  return unsubscribe;
};

/**
 * Create a new invite
 */
export const createInvite = async (gun, userId, userNickname) => {
  try {
    const inviteId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    const inviteData = {
      id: inviteId,
      fromId: userId,
      fromNick: userNickname,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      status: 'pending',
      used: false
    };
    
    // Store in main invites database
    await gun.get(DB_KEYS.INVITES).get(inviteId).put(inviteData);
    
    // Store in user's invites
    await gun.get(DB_KEYS.USER_INVITES).get(userId).get(inviteId).put(inviteData);
    
    // Create invite token
    const inviteToken = btoa(JSON.stringify({
      id: inviteId,
      fromId: userId,
      fromNick: userNickname,
      exp: expiresAt
    }));
    
    logger.log('✅ Created invite:', inviteId);
    
    return {
      ...inviteData,
      token: inviteToken,
      inviteUrl: `${window.location.origin}${window.location.pathname}#invite=${inviteToken}`
    };
  } catch (error) {
    logger.error('Failed to create invite:', error);
    throw error;
  }
};

export default {
  processInviteAcceptance,
  getFriendsFromGun,
  getPendingInvitesFromGun,
  monitorInviteChanges,
  monitorFriendsChanges,
  createInvite
};