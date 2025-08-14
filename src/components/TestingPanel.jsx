import React from 'react'
import Modal from './Modal'

export default function TestingPanel({ 
  isVisible, 
  user,
  gun,
  allUsers,
  friends,
  onlineUsers,
  pendingInvites,
  initStatus,
  onClose,
  onSendTestMessage,
  onClearCurrentClient, 
  onClearAllClients, 
  onForceReload,
  onLogout,
  isDev
}) {
  const [showOnlineUsers, setShowOnlineUsers] = React.useState(false)
  const [onlineUsersData, setOnlineUsersData] = React.useState([])
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)
  const [clearType, setClearType] = React.useState(null)
  const [userToDelete, setUserToDelete] = React.useState(null)
  
  if (!isVisible) return null

  const loadOnlineUsers = async () => {
    if (!gun) {
      console.error('Gun.js not connected')
      return
    }
    
    const users = []
    await new Promise((resolve) => {
      let timeout = setTimeout(resolve, 2000)
      gun.get('user_presence').map().once((data, key) => {
        if (data && data.nickname && data.timestamp) {
          const isOnline = Date.now() - data.timestamp < 60000
          users.push({
            userId: key,
            nickname: data.nickname,
            status: isOnline ? 'online' : 'offline',
            lastSeen: new Date(data.timestamp).toLocaleTimeString()
          })
        }
        clearTimeout(timeout)
        timeout = setTimeout(resolve, 500)
      })
    })
    
    setOnlineUsersData(users)
    setShowOnlineUsers(true)
  }

  const handleClearData = async (type) => {
    if (type === 'current') {
      // Clear current user data
      if (user) {
        // Clear from Gun.js
        if (gun) {
          // Clear user's messages
          await gun.get('chat_messages').map().once((msg, id) => {
            if (msg && (msg.fromId === user.id || msg.toId === user.id)) {
              gun.get('chat_messages').get(id).put(null)
            }
          })
          
          // Clear user's presence
          await gun.get('user_presence').get(user.id).put(null)
        }
        
        // Clear local storage for this user
        sessionStorage.clear()
        localStorage.removeItem(`contacts_${user.id}`)
        localStorage.removeItem(`friends_${user.id}`)
        
        // Logout
        onLogout()
      }
    } else if (type === 'messages') {
      // Clear only messages
      if (gun) {
        await gun.get('chat_messages').put(null)
        await gun.get('general_chat').put({ initialized: true })
      }
      window.location.reload()
    } else if (type === 'all') {
      // Clear all data
      if (gun) {
        // Clear all Gun.js data
        await gun.get('chat_messages').put(null)
        await gun.get('user_presence').put(null)
        await gun.get('chat_users').put(null)
        await gun.get('chat_users_by_nick').put(null)
        await gun.get('user_invites').put(null)
        await gun.get('secure_invites').put(null)
        await gun.get('general_chat').put({ initialized: true })
      }
      
      // Clear all local storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Force reload
      window.location.reload()
    } else if (type === 'all-users') {
      // Clear all users except admin
      if (gun) {
        const usersToDelete = allUsers.filter(u => u.id !== 'bootstrap_admin')
        
        for (const userData of usersToDelete) {
          // Remove user from Gun.js
          await gun.get('chat_users').get(userData.id).put(null)
          if (userData.nickname) {
            await gun.get('chat_users_by_nick').get(userData.nickname.toLowerCase()).put(null)
          }
          
          // Remove user's presence
          await gun.get('user_presence').get(userData.id).put(null)
          
          // Remove user's invites
          await gun.get('user_invites').get(userData.id).put(null)
        }
        
        // Clear all messages
        await gun.get('chat_messages').put(null)
        await gun.get('general_chat').put({ initialized: true })
        
        // Clear admin's friends list
        await gun.get('chat_users').get('bootstrap_admin').get('friends').put(null)
        
        console.log(`✅ Deleted ${usersToDelete.length} users`)
        
        // Reload to refresh the UI
        window.location.reload()
      }
      setShowClearConfirm(false)
      setClearType(null)
    }
  }

  const handleDeleteUser = async (userId, nickname) => {
    if (!gun || !userId) return
    
    try {
      // Remove user from Gun.js
      await gun.get('chat_users').get(userId).put(null)
      await gun.get('chat_users_by_nick').get(nickname.toLowerCase()).put(null)
      
      // Remove user's messages
      await gun.get('chat_messages').map().once((msg, id) => {
        if (msg && (msg.fromId === userId || msg.toId === userId)) {
          gun.get('chat_messages').get(id).put(null)
        }
      })
      
      // Remove user's presence
      await gun.get('user_presence').get(userId).put(null)
      
      // Remove user from all friends lists
      for (const otherUser of allUsers) {
        if (otherUser.id !== userId) {
          await gun.get('chat_users').get(otherUser.id).get('friends').get(userId).put(null)
        }
      }
      
      // Remove user's invites
      await gun.get('user_invites').get(userId).put(null)
      
      console.log(`✅ Deleted user: ${nickname}`)
      
      // Reload to refresh the UI
      window.location.reload()
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user: ' + error.message)
    }
    
    setUserToDelete(null)
  }

  const handleDeleteAllUsers = async () => {
    if (!gun) return
    
    try {
      const usersToDelete = allUsers.filter(u => u.id !== 'bootstrap_admin')
      
      for (const userData of usersToDelete) {
        // Remove user from Gun.js
        await gun.get('chat_users').get(userData.id).put(null)
        if (userData.nickname) {
          await gun.get('chat_users_by_nick').get(userData.nickname.toLowerCase()).put(null)
        }
        
        // Remove user's presence
        await gun.get('user_presence').get(userData.id).put(null)
        
        // Remove user's invites
        await gun.get('user_invites').get(userData.id).put(null)
      }
      
      // Clear all messages
      await gun.get('chat_messages').put(null)
      await gun.get('general_chat').put({ initialized: true })
      
      // Clear admin's friends list
      await gun.get('chat_users').get('bootstrap_admin').get('friends').put(null)
      
      console.log(`✅ Deleted ${usersToDelete.length} users`)
      
      // Reload to refresh the UI
      window.location.reload()
    } catch (error) {
      console.error('Failed to delete all users:', error)
      alert('Failed to delete all users: ' + error.message)
    }
    
    setShowClearConfirm(false)
    setClearType(null)
  }

  return (
    <>
      <div className="testing-panel-fullscreen">
        <div className="testing-header">
          <h2>🛠️ Testing Panel</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <div className="testing-content-grid">
          {/* Left Column - Status & Actions */}
          <div className="testing-sidebar">
            {/* Status Info */}
            <div className="status-section">
              <h3>📊 Status</h3>
              <div className="status-item">
                <span>User:</span> <span>{user?.nickname || 'Not logged in'}</span>
              </div>
              <div className="status-item">
                <span>ID:</span> <span>{user?.id?.substring(0, 8) || 'N/A'}...</span>
              </div>
              <div className="status-item">
                <span>Role:</span> <span>{user?.id === 'bootstrap_admin' ? '👑 Admin' : '👤 User'}</span>
              </div>
              <div className="status-item">
                <span>Gun.js:</span> <span>{gun ? '✅ Connected' : '❌ Not connected'}</span>
              </div>
              <div className="status-item">
                <span>Total Users:</span> <span>{allUsers?.length || 0}</span>
              </div>
              <div className="status-item">
                <span>Online:</span> <span>{onlineUsers?.size || 0}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="actions-section">
              <h3>🚀 Quick Actions</h3>
              
              <button 
                onClick={loadOnlineUsers}
                className="test-btn info"
              >
                👥 View Online Users
              </button>
              
              <button 
                onClick={onSendTestMessage}
                className="test-btn primary"
              >
                📤 Send Test Message
              </button>
              
              <button 
                onClick={() => {
                  setClearType('messages')
                  setShowClearConfirm(true)
                }}
                className="test-btn warning"
              >
                🗑️ Clear All Messages
              </button>
              
              <button 
                onClick={() => {
                  setClearType('current')
                  setShowClearConfirm(true)
                }}
                className="test-btn warning"
              >
                🧹 Clear My Data & Logout
              </button>
              
              {user?.id === 'bootstrap_admin' && (
                <>
                  <button 
                    onClick={() => {
                      setClearType('all-users')
                      setShowClearConfirm(true)
                    }}
                    className="test-btn danger"
                  >
                    👥💣 Delete All Users (Keep Admin)
                  </button>
                  
                  <button 
                    onClick={() => {
                      setClearType('all')
                      setShowClearConfirm(true)
                    }}
                    className="test-btn danger"
                  >
                    💣 Factory Reset (Delete Everything)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Admin Panel */}
          {user && user.id === 'bootstrap_admin' && (
            <div className="admin-section-fullscreen">
              <h3>👑 Admin Control Panel</h3>
              
              <div className="admin-panel-fullscreen">
                {(() => {
                  // Use real Gun.js data from props
                  const allUsersData = allUsers || []
                  const pendingInvitesData = pendingInvites || []
                  const onlineUsersSet = onlineUsers || new Set()
                  
                  // Create a function to load friends for any user
                  const [allUsersFriends, setAllUsersFriends] = React.useState({})
                  
                  React.useEffect(() => {
                    const loadAllFriends = async () => {
                      if (!gun || allUsersData.length === 0) return
                      
                      const friendsMap = {}
                      for (const userData of allUsersData) {
                        try {
                          const friendIds = await new Promise((resolve) => {
                            const timeout = setTimeout(() => resolve([]), 1000)
                            const friends = []
                            
                            gun.get('chat_users').get(userData.id).get('friends').map().once((value, key) => {
                              if (value === true && key !== '_') {
                                friends.push(key)
                              }
                            })
                            
                            gun.get('chat_users').get(userData.id).get('friends').once((data) => {
                              clearTimeout(timeout)
                              if (data && typeof data === 'object') {
                                const ids = Object.keys(data).filter(k => k !== '_' && data[k] === true)
                                resolve(ids.length > 0 ? ids : friends)
                              } else {
                                resolve(friends)
                              }
                            })
                          })
                          
                          friendsMap[userData.id] = friendIds
                        } catch (error) {
                          console.error(`Failed to load friends for ${userData.nickname}:`, error)
                          friendsMap[userData.id] = []
                        }
                      }
                      setAllUsersFriends(friendsMap)
                    }
                    
                    loadAllFriends()
                  }, [allUsersData, gun])
                  
                  return (
                    <>
                      <div className="admin-stats">
                        <div className="stat-item">
                          <span className="stat-label">Total Users:</span>
                          <span className="stat-value">{allUsersData.length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Online Now:</span>
                          <span className="stat-value">{onlineUsersSet.size}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Pending Invites:</span>
                          <span className="stat-value">{pendingInvitesData.length}</span>
                        </div>
                      </div>
                      
                      <div className="users-tree">
                        <h4>👥 All Registered Users</h4>
                        {allUsersData.length > 0 ? (
                          allUsersData.map((userData, i) => {
                            // Get this user's friends
                            const userFriendIds = allUsersFriends[userData.id] || []
                            const userFriends = userFriendIds.map(friendId => {
                              const friendData = allUsersData.find(u => u.id === friendId)
                              return friendData ? {
                                id: friendId,
                                nickname: friendData.nickname || 'Unknown',
                                isOnline: onlineUsersSet.has(friendId)
                              } : null
                            }).filter(Boolean)
                            
                            const isAdmin = userData.id === 'bootstrap_admin'
                            const isCurrentUser = userData.id === user.id
                            
                            return (
                              <div key={i} className={`user-card ${isCurrentUser ? 'current' : ''} ${isAdmin ? 'admin' : ''}`}>
                                <div className="user-header">
                                  <div className="user-main">
                                    <span className="user-icon">
                                      {isAdmin ? '👑' : '👤'}
                                    </span>
                                    <span className="user-nickname">
                                      {userData.nickname || 'Unknown'}
                                      {isCurrentUser && ' (You)'}
                                    </span>
                                    <span className={`user-status ${onlineUsersSet.has(userData.id) ? 'online' : 'offline'}`}>
                                      {onlineUsersSet.has(userData.id) ? '🟢' : '⚫'}
                                    </span>
                                  </div>
                                  {!isAdmin && !isCurrentUser && (
                                    <button
                                      onClick={() => setUserToDelete({ id: userData.id, nickname: userData.nickname })}
                                      className="delete-user-btn"
                                      title="Delete this user"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                                
                                <div className="user-details">
                                  <div className="detail-item">
                                    <span className="detail-label">ID:</span>
                                    <span className="detail-value">{userData.id?.substring(0, 8)}...</span>
                                  </div>
                                  {userData.createdAt && (
                                    <div className="detail-item">
                                      <span className="detail-label">Joined:</span>
                                      <span className="detail-value">{new Date(userData.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {userData.invitedBy && (
                                  <div className="user-invited-by">
                                    📨 Invited by: {allUsersData.find(u => u.id === userData.invitedBy)?.nickname || userData.invitedBy.substring(0, 8)}
                                  </div>
                                )}
                                
                                {userFriends.length > 0 && (
                                  <div className="user-friends">
                                    <span className="friends-label">Friends ({userFriends.length}):</span>
                                    <div className="friends-list">
                                      {userFriends.map((friend, j) => (
                                        <span key={j} className="friend-item">
                                          🤝 {friend.nickname} {friend.isOnline ? '🟢' : '⚫'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {(() => {
                                  const invitedUsers = allUsersData.filter(u => u.invitedBy === userData.id);
                                  if (invitedUsers.length > 0) {
                                    return (
                                      <div className="user-invited">
                                        <span className="invited-label">Invited ({invitedUsers.length}):</span>
                                        <div className="invited-list">
                                          {invitedUsers.map((invitedUser, k) => (
                                            <span key={k} className="invited-item">
                                              ✅ {invitedUser.nickname}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-users">No users registered yet</div>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Online Users Modal */}
      <Modal
        isOpen={showOnlineUsers}
        onClose={() => setShowOnlineUsers(false)}
        title="Online Users"
        size="medium"
      >
        <div className="online-users-modal">
          {onlineUsersData.length > 0 ? (
            <div className="users-list">
              {onlineUsersData.map((user, i) => (
                <div key={i} className="user-item">
                  <div className={`status-indicator ${user.status}`}>
                    {user.status === 'online' ? '🟢' : '🔴'}
                  </div>
                  <div className="user-info">
                    <div className="user-nickname">{user.nickname}</div>
                    <div className="user-id">ID: {user.userId.substring(0, 12)}...</div>
                    <div className="user-lastseen">Last seen: {user.lastSeen}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-users">
              <p>No online users found</p>
              <p className="hint">Make sure users are announcing their presence</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <Modal
          isOpen={showClearConfirm}
          onClose={() => {
            setShowClearConfirm(false)
            setClearType(null)
          }}
          title={
            clearType === 'current' ? 'Clear Current User Data' : 
            clearType === 'messages' ? 'Clear All Messages' :
            clearType === 'all-users' ? 'Delete All Users' :
            'Clear All Data'
          }
          size="small"
        >
          <div className="confirm-modal">
            <p className="warning-text">
              {clearType === 'current' 
                ? '⚠️ This will clear all data for your current user session.'
                : clearType === 'messages'
                ? '⚠️ This will delete all chat messages but keep users.'
                : clearType === 'all-users'
                ? '⚠️ This will DELETE ALL USERS except the admin account!'
                : '⚠️ This will DELETE EVERYTHING and reset the app completely!'}
            </p>
            <p>
              {clearType === 'all-users' 
                ? `${allUsers?.filter(u => u.id !== 'bootstrap_admin').length || 0} users will be deleted.`
                : 'Are you sure you want to continue?'}
            </p>
            <div className="modal-buttons">
              <button 
                onClick={() => {
                  if (clearType === 'all-users') {
                    handleClearData('all-users')
                  } else {
                    handleClearData(clearType)
                  }
                }}
                className="btn-danger"
              >
                {clearType === 'all-users' ? 'Delete All Users' : 'Yes, Clear Data'}
              </button>
              <button 
                onClick={() => {
                  setShowClearConfirm(false)
                  setClearType(null)
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          title={`Delete User: ${userToDelete.nickname}`}
          size="small"
        >
          <div className="confirm-modal">
            <p className="warning-text">
              ⚠️ Are you absolutely sure you want to delete user <strong>{userToDelete.nickname}</strong>?
            </p>
            <p>This action cannot be undone. All data related to this user will be permanently removed.</p>
            <div className="modal-buttons">
              <button 
                onClick={() => handleDeleteUser(userToDelete.id, userToDelete.nickname)}
                className="btn-danger"
              >
                Yes, Delete User
              </button>
              <button 
                onClick={() => setUserToDelete(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}