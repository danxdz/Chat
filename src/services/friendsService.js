/**
 * Friends Service - Manages friendships in Gun.js
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => isDev && console.warn(...args)
};

/**
 * Get user's friends list from Gun.js
 */
export const getFriendsFromGun = async (gun, userId) => {
  if (!gun || !userId) return [];
  
  try {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn('Timeout getting friends for user:', userId);
        resolve([]);
      }, 3000);
      
      gun.get('chat_users').get(userId).get('friends').once((friends) => {
        clearTimeout(timeout);
        if (friends && Array.isArray(friends)) {
          logger.log('✅ Friends loaded from Gun.js:', friends);
          resolve(friends);
        } else {
          logger.log('No friends found for user:', userId);
          resolve([]);
        }
      });
    });
  } catch (error) {
    logger.error('Failed to get friends from Gun.js:', error);
    return [];
  }
};

/**
 * Add mutual friendship in Gun.js
 */
export const addMutualFriendship = async (gun, userId1, userId2) => {
  if (!gun || !userId1 || !userId2) {
    logger.error('Invalid parameters for addMutualFriendship');
    return false;
  }
  
  try {
    // Get current friends lists
    const [user1Friends, user2Friends] = await Promise.all([
      getFriendsFromGun(gun, userId1),
      getFriendsFromGun(gun, userId2)
    ]);
    
    // Add each user to the other's friends list if not already there
    let updated = false;
    
    if (!user1Friends.includes(userId2)) {
      const updatedFriends1 = [...user1Friends, userId2];
      await gun.get('chat_users').get(userId1).get('friends').put(updatedFriends1);
      logger.log(`Added ${userId2} to ${userId1}'s friends`);
      updated = true;
    }
    
    if (!user2Friends.includes(userId1)) {
      const updatedFriends2 = [...user2Friends, userId1];
      await gun.get('chat_users').get(userId2).get('friends').put(updatedFriends2);
      logger.log(`Added ${userId1} to ${userId2}'s friends`);
      updated = true;
    }
    
    if (updated) {
      logger.log('✅ Mutual friendship established');
    } else {
      logger.log('ℹ️ Users were already friends');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to add mutual friendship:', error);
    return false;
  }
};

/**
 * Remove friendship in Gun.js
 */
export const removeFriendship = async (gun, userId1, userId2) => {
  if (!gun || !userId1 || !userId2) return false;
  
  try {
    // Get current friends lists
    const [user1Friends, user2Friends] = await Promise.all([
      getFriendsFromGun(gun, userId1),
      getFriendsFromGun(gun, userId2)
    ]);
    
    // Remove each user from the other's friends list
    const updatedFriends1 = user1Friends.filter(id => id !== userId2);
    const updatedFriends2 = user2Friends.filter(id => id !== userId1);
    
    await Promise.all([
      gun.get('chat_users').get(userId1).get('friends').put(updatedFriends1),
      gun.get('chat_users').get(userId2).get('friends').put(updatedFriends2)
    ]);
    
    logger.log('✅ Friendship removed');
    return true;
  } catch (error) {
    logger.error('Failed to remove friendship:', error);
    return false;
  }
};

/**
 * Get detailed friends list with user data
 */
export const getFriendsWithDetails = async (gun, userId, allUsers) => {
  if (!gun || !userId) return [];
  
  try {
    const friendIds = await getFriendsFromGun(gun, userId);
    
    if (!friendIds || friendIds.length === 0) {
      return [];
    }
    
    // Map friend IDs to user details
    const friendsWithDetails = await Promise.all(
      friendIds.map(async (friendId) => {
        // Try to get from allUsers first (faster)
        let friendData = allUsers?.find(u => u.id === friendId);
        
        // If not in allUsers, fetch from Gun.js
        if (!friendData) {
          friendData = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 1000);
            
            gun.get('chat_users').get(friendId).once((data) => {
              clearTimeout(timeout);
              if (data) {
                resolve({
                  id: friendId,
                  nickname: data.nickname || 'Unknown',
                  publicKey: data.publicKey || friendId,
                  createdAt: data.createdAt
                });
              } else {
                resolve(null);
              }
            });
          });
        }
        
        return friendData ? {
          id: friendId,
          nickname: friendData.nickname || 'Unknown',
          publicKey: friendData.publicKey || friendId,
          status: 'offline', // Will be updated by presence system
          addedAt: friendData.createdAt
        } : null;
      })
    );
    
    // Filter out nulls and return
    const validFriends = friendsWithDetails.filter(Boolean);
    logger.log(`✅ Loaded ${validFriends.length} friends with details`);
    return validFriends;
  } catch (error) {
    logger.error('Failed to get friends with details:', error);
    return [];
  }
};

export default {
  getFriendsFromGun,
  addMutualFriendship,
  removeFriendship,
  getFriendsWithDetails
};