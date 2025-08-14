/**
 * Invite Service - Manages invites in Gun.js
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => isDev && console.warn(...args)
};

/**
 * Store pending invite for the inviter
 */
export const storePendingInvite = async (gun, userId, inviteData) => {
  if (!gun || !userId || !inviteData) return false;
  
  try {
    // Store in user's pending invites list with more details
    await gun.get('user_invites').get(userId).get(inviteData.inviteId).put({
      id: inviteData.inviteId,
      token: inviteData.inviteUrl?.split('#invite=')[1] || inviteData.inviteId,
      createdAt: Date.now(),
      expiresAt: inviteData.expiresAt,
      status: 'pending',
      used: false,
      inviteUrl: inviteData.inviteUrl,
      fromId: userId,
      fromNickname: null, // Will be filled when fetching
      acceptedBy: null,
      acceptedNickname: null,
      usedAt: null
    });
    
    logger.log('✅ Pending invite stored for user:', userId);
    return true;
  } catch (error) {
    logger.error('Failed to store pending invite:', error);
    return false;
  }
};

/**
 * Get all pending invites for a user with full details
 */
export const getPendingInvites = async (gun, userId) => {
  if (!gun || !userId) return [];
  
  try {
    // Get user's nickname first
    const userData = await new Promise((resolve) => {
      gun.get('chat_users').get(userId).once((data) => resolve(data));
    });
    
    const userNickname = userData?.nickname || 'Unknown';
    
    return new Promise((resolve) => {
      const invites = [];
      const timeout = setTimeout(() => {
        logger.log(`Found ${invites.length} pending invites for ${userNickname}`);
        resolve(invites);
      }, 2000);
      
      gun.get('user_invites').get(userId).map().once((invite, id) => {
        if (invite && invite.expiresAt > Date.now()) {
          invites.push({
            id: id,
            ...invite,
            fromNickname: userNickname,
            isPending: invite.status === 'pending',
            isUsed: invite.status === 'used' || invite.used === true,
            isExpired: invite.expiresAt <= Date.now()
          });
        }
      });
    });
  } catch (error) {
    logger.error('Failed to get pending invites:', error);
    return [];
  }
};

/**
 * Mark an invite as used when someone accepts it
 */
export const markInviteAsUsed = async (gun, inviterId, inviteId, acceptedBy, acceptedNickname) => {
  if (!gun || !inviterId || !inviteId) return false;
  
  try {
    // First get the existing invite data
    const existingInvite = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1000);
      gun.get('user_invites').get(inviterId).get(inviteId).once((data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
    
    if (existingInvite) {
      // Update the invite with new status while preserving other fields
      const updatedInvite = {
        ...existingInvite,
        status: 'used',
        used: true,
        usedAt: Date.now(),
        acceptedBy: acceptedBy,
        acceptedNickname: acceptedNickname || 'New User'
      };
      
      await gun.get('user_invites').get(inviterId).get(inviteId).put(updatedInvite);
      
      // Also update in a global accepted invites list for easy lookup
      await gun.get('accepted_invites').get(inviteId).put({
        inviteId: inviteId,
        inviterId: inviterId,
        acceptedBy: acceptedBy,
        acceptedNickname: acceptedNickname,
        usedAt: Date.now()
      });
      
      logger.log('✅ Invite marked as used:', inviteId, 'by', acceptedNickname);
    } else {
      // If invite doesn't exist in the new structure, just mark it as used
      await gun.get('user_invites').get(inviterId).get(inviteId).put({
        status: 'used',
        used: true,
        usedAt: Date.now(),
        acceptedBy: acceptedBy,
        acceptedNickname: acceptedNickname
      });
      logger.log('✅ Invite marked as used (minimal data):', inviteId);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to mark invite as used:', error);
    return false;
  }
};

/**
 * Get accepted invites (to see who joined through your invites)
 */
export const getAcceptedInvites = async (gun, userId) => {
  if (!gun || !userId) return [];
  
  try {
    return new Promise((resolve) => {
      const invites = [];
      const timeout = setTimeout(() => {
        logger.log(`Found ${invites.length} accepted invites`);
        resolve(invites);
      }, 2000);
      
      gun.get('user_invites').get(userId).map().once((invite, id) => {
        if (invite && (invite.status === 'used' || invite.used) && invite.acceptedBy) {
          invites.push({
            id: id,
            ...invite,
            friendNickname: invite.acceptedNickname || 'Friend',
            friendId: invite.acceptedBy
          });
        }
      });
    });
  } catch (error) {
    logger.error('Failed to get accepted invites:', error);
    return [];
  }
};

/**
 * Get all invites (pending and accepted) with friend status
 */
export const getAllInvitesWithStatus = async (gun, userId) => {
  if (!gun || !userId) return { pending: [], accepted: [] };
  
  try {
    const allInvites = await new Promise((resolve) => {
      const pending = [];
      const accepted = [];
      const timeout = setTimeout(() => {
        resolve({ pending, accepted });
      }, 2000);
      
      gun.get('user_invites').get(userId).map().once((invite, id) => {
        if (!invite) return;
        
        const inviteData = {
          id: id,
          ...invite,
          token: invite.token || invite.inviteUrl?.split('#invite=')[1] || id.substring(0, 8)
        };
        
        if (invite.status === 'used' || invite.used) {
          accepted.push({
            ...inviteData,
            friendNickname: invite.acceptedNickname || 'Friend',
            friendId: invite.acceptedBy
          });
        } else if (invite.expiresAt > Date.now()) {
          pending.push(inviteData);
        }
      });
    });
    
    logger.log(`📋 Invites for user: ${allInvites.pending.length} pending, ${allInvites.accepted.length} accepted`);
    return allInvites;
  } catch (error) {
    logger.error('Failed to get all invites:', error);
    return { pending: [], accepted: [] };
  }
};

export default {
  storePendingInvite,
  getPendingInvites,
  markInviteAsUsed,
  getAcceptedInvites,
  getAllInvitesWithStatus
};