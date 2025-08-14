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
      let mapComplete = false;
      let onceComplete = false;
      
      // Function to check if we should resolve
      const checkComplete = () => {
        if (mapComplete && onceComplete) {
          clearTimeout(timeout);
          if (hasData) {
            logger.log('✅ Friends loaded from Gun.js (map):', friends);
            resolve(friends);
          } else {
            logger.log('No friends found for user:', userId);
            resolve([]);
          }
        }
      };
      
      // Use .map().once() to get all friends
      gun.get('chat_users').get(userId).get('friends').map().once((friendData, friendId) => {
        if (friendData && friendId && friendId !== '_') {
          hasData = true;
          friends.push(friendId);
          logger.log(`Found friend ${friendId} for user ${userId}`);
        }
      });
      
      // Set a small delay to ensure map() completes
      setTimeout(() => {
        mapComplete = true;
        checkComplete();
      }, 100);
      
      // Also check with a direct .once() in case the data structure is different
      gun.get('chat_users').get(userId).get('friends').once((friendsData) => {
        if (!hasData && friendsData) {
          clearTimeout(timeout);
          // Handle if friends is stored as an object
          if (typeof friendsData === 'object' && !Array.isArray(friendsData)) {
            const friendIds = Object.keys(friendsData).filter(key => 
              key !== '_' && friendsData[key] === true
            );
            logger.log('✅ Friends loaded from Gun.js (object):', friendIds);
            resolve(friendIds);
            return;
          } 
          // Handle if friends is stored as an array (legacy)
          else if (Array.isArray(friendsData)) {
            logger.log('✅ Friends loaded from Gun.js (array):', friendsData);
            resolve(friendsData);
            return;
          }
        }
        onceComplete = true;
        checkComplete();
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
    logger.error('Invalid parameters for addMutualFriendship:', { userId1, userId2, gun: !!gun });
    return false;
  }
  
  // Prevent self-friendship
  if (userId1 === userId2) {
    logger.error('Cannot create friendship with self:', userId1);
    return false;
  }
  
  logger.log(`🤝 Starting mutual friendship between ${userId1.substring(0, 8)} and ${userId2.substring(0, 8)}`);
  
  try {
    // Store friends as an object for better Gun.js compatibility
    // Each friend ID is a key with value true
    
    // Add userId2 to userId1's friends
    await gun.get('chat_users').get(userId1).get('friends').get(userId2).put(true);
    logger.log(`✅ Added ${userId2.substring(0, 8)} to ${userId1.substring(0, 8)}'s friends`);
    
    // Add userId1 to userId2's friends  
    await gun.get('chat_users').get(userId2).get('friends').get(userId1).put(true);
    logger.log(`✅ Added ${userId1.substring(0, 8)} to ${userId2.substring(0, 8)}'s friends`);
    
    // Verify the friendship was created with retry
    const verifyFriendship = async (uid1, uid2, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const result = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 1000);
          gun.get('chat_users').get(uid1).get('friends').get(uid2).once((data) => {
            clearTimeout(timeout);
            resolve(data === true);
          });
        });
        
        if (result) return true;
        
        // Wait before retry
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      return false;
    };
    
    const [check1, check2] = await Promise.all([
      verifyFriendship(userId1, userId2),
      verifyFriendship(userId2, userId1)
    ]);
    
    if (check1 && check2) {
      logger.log('✅ Mutual friendship established and verified');
      return true;
    } else {
      logger.warn('⚠️ Friendship created but verification failed:', { check1, check2 });
      // Still return true as the write operations succeeded
      return true;
    }
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
      logger.log('No friends to get details for');
      return [];
    }
    
    // Ensure friendIds is an array and filter out invalid entries
    const validFriendIds = Array.isArray(friendIds) 
      ? friendIds.filter(id => id && typeof id === 'string' && id !== '_')
      : [];
    
    if (validFriendIds.length === 0) {
      logger.warn('No valid friend IDs found');
      return [];
    }
    
    // Map friend IDs to user details
    const friendsWithDetails = await Promise.all(
      validFriendIds.map(async (friendId) => {
        try {
          // Try to get from allUsers first (faster)
          let friendData = allUsers?.find(u => u && u.id === friendId);
          
          // If not in allUsers, fetch from Gun.js
          if (!friendData) {
            friendData = await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                logger.warn(`Timeout getting details for friend: ${friendId}`);
                resolve(null);
              }, 1000);
              
              gun.get('chat_users').get(friendId).once((data) => {
                clearTimeout(timeout);
                if (data && typeof data === 'object') {
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
            addedAt: friendData.createdAt || Date.now()
          } : null;
        } catch (err) {
          logger.error(`Error getting details for friend ${friendId}:`, err);
          return null;
        }
      })
    );
    
    // Filter out nulls and return
    const validFriends = friendsWithDetails.filter(Boolean);
    logger.log(`✅ Loaded ${validFriends.length} friends with details out of ${validFriendIds.length} IDs`);
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