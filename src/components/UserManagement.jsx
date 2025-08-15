import { useState, useEffect } from 'react';
import { getAllGunUsers } from '../services/gunAuthService';
import { getFriendsFromGun, removeFriendship } from '../services/friendsService';
import { logger } from '../utils/logger';

const UserManagement = ({ gun, currentUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFriends, setUserFriends] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load all users and their friends
  useEffect(() => {
    loadUsers();
  }, [gun]);

  const loadUsers = async () => {
    if (!gun) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all users from Gun.js
      const allUsers = await getAllGunUsers(gun);
      logger.log('Loaded users:', allUsers);
      setUsers(allUsers);
      
      // Load friends for each user
      const friendsData = {};
      for (const user of allUsers) {
        try {
          const friends = await getFriendsFromGun(gun, user.id);
          friendsData[user.id] = friends;
        } catch (err) {
          logger.error(`Failed to load friends for ${user.id}:`, err);
          friendsData[user.id] = [];
        }
      }
      setUserFriends(friendsData);
      
    } catch (err) {
      logger.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!gun || !userId) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      // Don't allow deleting the current user
      if (userId === currentUser?.id) {
        setError("You cannot delete your own account while logged in.");
        setConfirmDelete(null);
        return;
      }
      
      // Don't allow deleting admin users
      const userToDelete = users.find(u => u.id === userId);
      if (userToDelete?.isAdmin || userToDelete?.nickname?.toLowerCase() === 'admin') {
        setError("Admin users cannot be deleted.");
        setConfirmDelete(null);
        return;
      }
      
      logger.log('Deleting user:', userId);
      
      // Remove user from Gun.js
      await gun.get('chat_users').get(userId).put(null);
      
      // Remove user from nickname index
      if (userToDelete?.nickname) {
        await gun.get('chat_users_by_nick').get(userToDelete.nickname.toLowerCase()).put(null);
      }
      
      // Remove all friendships
      const friends = userFriends[userId] || [];
      for (const friendId of friends) {
        await removeFriendship(gun, userId, friendId);
      }
      
      // Remove user's messages
      await gun.get('chat_messages').get(userId).put(null);
      
      // Remove from local storage if exists
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const filteredUsers = localUsers.filter(u => u.id !== userId);
      localStorage.setItem('users', JSON.stringify(filteredUsers));
      
      setSuccess(`User "${userToDelete?.nickname}" has been deleted successfully.`);
      setConfirmDelete(null);
      setSelectedUser(null);
      
      // Reload users
      await loadUsers();
      
    } catch (err) {
      logger.error('Failed to delete user:', err);
      setError('Failed to delete user. Please try again.');
    }
  };

  const getFriendNicknames = (userId) => {
    const friends = userFriends[userId] || [];
    return friends.map(friendId => {
      const friend = users.find(u => u.id === friendId);
      return friend?.nickname || friendId.substring(0, 8);
    });
  };

  const filteredUsers = users.filter(user => 
    user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    // Short format for mobile
    if (isMobile) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      });
    }
    return date.toLocaleString();
  };

  // Mobile-optimized styles
  const mobileStyles = {
    container: {
      padding: '10px',
      height: '100vh',
      overflowY: 'auto'
    },
    modal: {
      borderRadius: '0',
      height: '100vh',
      maxHeight: '100vh',
      margin: 0
    },
    header: {
      padding: '12px 10px',
      fontSize: '18px'
    },
    searchBar: {
      padding: '10px'
    },
    userCard: {
      padding: '10px',
      fontSize: '14px'
    },
    userName: {
      fontSize: '15px'
    },
    userDetail: {
      fontSize: '12px'
    },
    badge: {
      padding: '1px 5px',
      fontSize: '10px'
    },
    button: {
      padding: '5px 8px',
      fontSize: '12px'
    }
  };

  const desktopStyles = {
    container: {
      padding: '20px'
    },
    modal: {
      borderRadius: '12px',
      maxHeight: '90vh'
    },
    header: {
      padding: '20px'
    },
    searchBar: {
      padding: '15px 20px'
    },
    userCard: {
      padding: '15px'
    },
    userName: {
      fontSize: '16px'
    },
    userDetail: {
      fontSize: '13px'
    },
    badge: {
      padding: '2px 8px',
      fontSize: '12px'
    },
    button: {
      padding: '6px 12px',
      fontSize: '13px'
    }
  };

  const styles = isMobile ? mobileStyles : desktopStyles;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: isMobile ? '0' : '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: styles.modal.borderRadius,
        width: '100%',
        maxWidth: isMobile ? '100%' : '900px',
        height: isMobile ? '100vh' : 'auto',
        maxHeight: styles.modal.maxHeight,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: styles.modal.margin
      }}>
        {/* Header */}
        <div style={{
          padding: styles.header.padding,
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#333',
            fontSize: isMobile ? '18px' : '24px'
          }}>
            👥 Users ({users.length})
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ 
          padding: styles.searchBar.padding, 
          borderBottom: '1px solid #eee',
          flexShrink: 0
        }}>
          <input
            type="text"
            placeholder="🔍 Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: isMobile ? '8px 10px' : '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div style={{
            margin: isMobile ? '10px' : '15px 20px',
            flexShrink: 0
          }}>
            {error && (
              <div style={{
                padding: isMobile ? '8px' : '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '8px',
                color: '#c00',
                fontSize: isMobile ? '12px' : '14px'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            {success && (
              <div style={{
                padding: isMobile ? '8px' : '12px',
                background: '#efe',
                border: '1px solid #cfc',
                borderRadius: '8px',
                color: '#060',
                fontSize: isMobile ? '12px' : '14px'
              }}>
                ✅ {success}
              </div>
            )}
          </div>
        )}

        {/* User List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: styles.container.padding,
          WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
        }}>
          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#666',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#666',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isMobile ? '8px' : '10px' 
            }}>
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: styles.userCard.padding,
                    background: selectedUser?.id === user.id ? '#f0f8ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedUser(user.id === selectedUser?.id ? null : user)}
                >
                  {/* Compact View */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <div style={{ 
                      flex: 1,
                      minWidth: 0 // Allow text truncation
                    }}>
                      {/* Name and badges */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? '5px' : '10px',
                        marginBottom: '5px',
                        flexWrap: 'wrap'
                      }}>
                        <strong style={{ 
                          fontSize: styles.userName.fontSize, 
                          color: '#333',
                          wordBreak: 'break-word'
                        }}>
                          {user.nickname}
                        </strong>
                        {user.isAdmin && (
                          <span style={{
                            background: '#764ba2',
                            color: 'white',
                            padding: styles.badge.padding,
                            borderRadius: '12px',
                            fontSize: styles.badge.fontSize,
                            whiteSpace: 'nowrap'
                          }}>
                            ADMIN
                          </span>
                        )}
                        {user.id === currentUser?.id && (
                          <span style={{
                            background: '#28a745',
                            color: 'white',
                            padding: styles.badge.padding,
                            borderRadius: '12px',
                            fontSize: styles.badge.fontSize,
                            whiteSpace: 'nowrap'
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      
                      {/* Basic info */}
                      <div style={{ 
                        fontSize: styles.userDetail.fontSize, 
                        color: '#666',
                        lineHeight: '1.4'
                      }}>
                        <div>Friends: {userFriends[user.id]?.length || 0}</div>
                        <div>Created: {formatDate(user.createdAt)}</div>
                        {!isMobile && user.invitedBy && (
                          <div>
                            Invited by: {users.find(u => u.id === user.invitedBy)?.nickname || 'Unknown'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '5px' : '10px',
                      alignItems: 'flex-end'
                    }}>
                      {confirmDelete === user.id ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUser(user.id);
                            }}
                            style={{
                              padding: styles.button.padding,
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: styles.button.fontSize,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(null);
                            }}
                            style={{
                              padding: styles.button.padding,
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: styles.button.fontSize,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {isMobile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user.id === selectedUser?.id ? null : user);
                              }}
                              style={{
                                padding: styles.button.padding,
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: styles.button.fontSize
                              }}
                            >
                              {selectedUser?.id === user.id ? '▲' : '▼'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(user.id);
                              setError(null);
                              setSuccess(null);
                            }}
                            disabled={user.id === currentUser?.id || user.isAdmin}
                            style={{
                              padding: styles.button.padding,
                              background: user.id === currentUser?.id || user.isAdmin ? '#ccc' : '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: user.id === currentUser?.id || user.isAdmin ? 'not-allowed' : 'pointer',
                              fontSize: styles.button.fontSize,
                              opacity: user.id === currentUser?.id || user.isAdmin ? 0.5 : 1
                            }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {selectedUser?.id === user.id && (
                    <div style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid #eee'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#555',
                        fontSize: isMobile ? '14px' : '16px'
                      }}>
                        Details
                      </h4>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', 
                        gap: '5px', 
                        fontSize: styles.userDetail.fontSize
                      }}>
                        {isMobile ? (
                          // Mobile: Stacked layout
                          <>
                            <div>
                              <strong>ID:</strong>
                              <div style={{ 
                                wordBreak: 'break-all', 
                                fontFamily: 'monospace',
                                fontSize: '10px',
                                color: '#666',
                                marginTop: '2px'
                              }}>
                                {user.id}
                              </div>
                            </div>
                            
                            {user.invitedBy && (
                              <div style={{ marginTop: '5px' }}>
                                <strong>Invited by:</strong> {users.find(u => u.id === user.invitedBy)?.nickname || 'Unknown'}
                              </div>
                            )}
                            
                            <div style={{ marginTop: '5px' }}>
                              <strong>Has Password:</strong> {user.passwordHash ? 'Yes' : 'No'}
                            </div>
                          </>
                        ) : (
                          // Desktop: Grid layout
                          <>
                            <strong>User ID:</strong>
                            <span style={{ 
                              wordBreak: 'break-all', 
                              fontFamily: 'monospace', 
                              fontSize: '11px' 
                            }}>
                              {user.id}
                            </span>
                            
                            <strong>Public Key:</strong>
                            <span style={{ 
                              wordBreak: 'break-all', 
                              fontFamily: 'monospace', 
                              fontSize: '11px' 
                            }}>
                              {user.publicKey || 'N/A'}
                            </span>
                            
                            <strong>Has Password:</strong>
                            <span>{user.passwordHash ? 'Yes' : 'No'}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Friends List */}
                      {userFriends[user.id]?.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            color: '#555',
                            fontSize: isMobile ? '14px' : '16px'
                          }}>
                            Friends ({userFriends[user.id].length})
                          </h4>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '5px' 
                          }}>
                            {userFriends[user.id].map(friendId => {
                              const friend = users.find(u => u.id === friendId);
                              return (
                                <div
                                  key={friendId}
                                  style={{
                                    padding: isMobile ? '3px 8px' : '5px 10px',
                                    background: '#f0f0f0',
                                    borderRadius: '15px',
                                    fontSize: isMobile ? '11px' : '12px',
                                    border: '1px solid #ddd'
                                  }}
                                >
                                  {friend?.nickname || friendId.substring(0, 8)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '10px' : '15px 20px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa',
          flexShrink: 0
        }}>
          <div style={{ 
            fontSize: isMobile ? '11px' : '13px', 
            color: '#666' 
          }}>
            {filteredUsers.length} of {users.length} users
          </div>
          <button
            onClick={loadUsers}
            style={{
              padding: isMobile ? '6px 12px' : '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '13px' : '14px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;