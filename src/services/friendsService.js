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
      
      const friends = [];
      let hasData = false;
      
      // Use .map().once() to get all friends
      gun.get('chat_users').get(userId).get('friends').map().once((friendData, friendId) => {
        if (friendData && friendId && friendId !== '_') {
          hasData = true;
          friends.push(friendId);
          logger.log(`Found friend ${friendId} for user ${userId}`);
        }
      });
      
      // Also check with a direct .once() in case the data structure is different
      gun.get('chat_users').get(userId).get('friends').once((friendsData) => {
        clearTimeout(timeout);
        
        if (!hasData && friendsData) {
          // Handle if friends is stored as an object
          if (typeof friendsData === 'object' && !Array.isArray(friendsData)) {
            const friendIds = Object.keys(friendsData).filter(key => 
              key !== '_' && friendsData[key] === true
            );
            logger.log('✅ Friends loaded from Gun.js (object):', friendIds);
            resolve(friendIds);
          } 
          // Handle if friends is stored as an array (legacy)
          else if (Array.isArray(friendsData)) {
            logger.log('✅ Friends loaded from Gun.js (array):', friendsData);
            resolve(friendsData);
          } else {
            logger.log('No friends found for user:', userId);
            resolve([]);
          }
        } else if (hasData) {
          logger.log('✅ Friends loaded from Gun.js (map):', friends);
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
    // Store friends as an object for better Gun.js compatibility
    // Each friend ID is a key with value true
    
    // Add userId2 to userId1's friends
    await gun.get('chat_users').get(userId1).get('friends').get(userId2).put(true);
    logger.log(`Added ${userId2} to ${userId1}'s friends`);
    
    // Add userId1 to userId2's friends  
    await gun.get('chat_users').get(userId2).get('friends').get(userId1).put(true);
    logger.log(`Added ${userId1} to ${userId2}'s friends`);
    
    logger.log('✅ Mutual friendship established');
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
    // Remove by setting to null
    await gun.get('chat_users').get(userId1).get('friends').get(userId2).put(null);
    await gun.get('chat_users').get(userId2).get('friends').get(userId1).put(null);
    
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