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
    // Store in user's pending invites list
    await gun.get('user_invites').get(userId).get(inviteData.inviteId).put({
      id: inviteData.inviteId,
      createdAt: Date.now(),
      expiresAt: inviteData.expiresAt,
      used: false,
      inviteUrl: inviteData.inviteUrl
    });
    
    logger.log('✅ Pending invite stored for user:', userId);
    return true;
  } catch (error) {
    logger.error('Failed to store pending invite:', error);
    return false;
  }
};

/**
 * Get all pending invites for a user
 */
export const getPendingInvites = async (gun, userId) => {
  if (!gun || !userId) return [];
  
  try {
    return new Promise((resolve) => {
      const invites = [];
      const timeout = setTimeout(() => {
        logger.log(`Found ${invites.length} pending invites`);
        resolve(invites);
      }, 2000);
      
      gun.get('user_invites').get(userId).map().once((invite, id) => {
        if (invite && !invite.used && invite.expiresAt > Date.now()) {
          invites.push({
            id: id,
            ...invite
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
export const markInviteAsUsed = async (gun, inviterId, inviteId, acceptedBy) => {
  if (!gun || !inviterId || !inviteId) return false;
  
  try {
    // Update the invite status
    await gun.get('user_invites').get(inviterId).get(inviteId).put({
      used: true,
      usedAt: Date.now(),
      acceptedBy: acceptedBy
    });
    
    logger.log('✅ Invite marked as used:', inviteId);
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
        resolve(invites);
      }, 2000);
      
      gun.get('user_invites').get(userId).map().once((invite, id) => {
        if (invite && invite.used && invite.acceptedBy) {
          invites.push({
            id: id,
            ...invite
          });
        }
      });
    });
  } catch (error) {
    logger.error('Failed to get accepted invites:', error);
    return [];
  }
};

export default {
  storePendingInvite,
  getPendingInvites,
  markInviteAsUsed,
  getAcceptedInvites
};