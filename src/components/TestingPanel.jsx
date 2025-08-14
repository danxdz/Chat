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
      // Clear ALL messages and notifications completely
      if (gun) {
// [REMOVED CONSOLE LOG]
        // Clear all messages from chat_messages
        await new Promise((resolve) => {
          let cleared = 0
          const timeout = setTimeout(() => {
// [REMOVED CONSOLE LOG]
            resolve()
          }, 2000)
          
          gun.get('chat_messages').map().once((msg, id) => {
            if (msg) {
              gun.get('chat_messages').get(id).put(null)
              cleared++
            }
          })
        })
        
        // Clear general chat
        await gun.get('general_chat').put(null)
        await gun.get('general_chat').put({ initialized: true, cleared: Date.now() })
        
        // Clear all private message channels
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 1000)
          gun.get('private_messages').map().once((channel, id) => {
            if (channel) {
              gun.get('private_messages').get(id).put(null)
            }
          })
        })
        
        // Clear all notifications
        await gun.get('notifications').put(null)
        await gun.get('message_notifications').put(null)
        await gun.get('unread_messages').put(null)
        
        // Clear message delivery status
        await gun.get('message_delivery').put(null)
        await gun.get('message_status').put(null)
        
        // Clear any message-related data
        await gun.get('typing_indicators').put(null)
        await gun.get('message_reactions').put(null)
// [REMOVED CONSOLE LOG]
      }
      
      // Clear ALL local notification storage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('message') || 
          key.includes('notification') || 
          key.includes('unread') ||
          key.includes('delivery') ||
          key.includes('chat')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear session storage too
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (
          key.includes('message') || 
          key.includes('notification') || 
          key.includes('delivery')
        )) {
          sessionKeysToRemove.push(key)
        }
      }
      
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
// [REMOVED CONSOLE LOG]
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 500)
      
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
        await gun.get('notifications').put(null)
        await gun.get('message_delivery').put(null)
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
        
        // Clear all messages and notifications
        await gun.get('chat_messages').put(null)
        await gun.get('notifications').put(null)
        await gun.get('message_delivery').put(null)
        await gun.get('general_chat').put({ initialized: true })
        
        // Clear admin's friends list
        await gun.get('chat_users').get('bootstrap_admin').get('friends').put(null)
// [REMOVED CONSOLE LOG]
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
      console.log(`🗑️ Starting deletion of user: ${nickname} (${userId})`)
      
      // Remove user from Gun.js
      await gun.get('chat_users').get(userId).put(null)
      
      // Remove nickname mapping
      if (nickname) {
        await gun.get('chat_users_by_nick').get(nickname.toLowerCase()).put(null)
      }
      
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
// [REMOVED CONSOLE LOG]
      // Close modal and reload
      setUserToDelete(null)
      
      // Small delay to ensure Gun.js operations complete
      setTimeout(() => {
        window.location.reload()
      }, 500)
      
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      alert(`Failed to delete user: ${error.message}`)
    }
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
// [REMOVED CONSOLE LOG]
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
        
        <div className="testing-content">
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

          {/* Admin Panel - Only show for bootstrap user */}
          {user && user.id === 'bootstrap_admin' && (
            <>
              <div className="admin-panel-container">
                <h4 style={{ color: '#9C27B0', marginBottom: '10px', fontSize: '16px' }}>
                  👑 Admin Panel 
                  <span style={{ 
                    fontSize: '10px', 
                    marginLeft: '10px', 
                    background: 'rgba(76, 175, 80, 0.2)', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    color: '#4CAF50'
                  }}>
                    v2.1 Fixed
                  </span>
                </h4>
                
                {(() => {
                  // Use real Gun.js data from props
                  const allUsersData = allUsers || []
                  const pendingInvitesData = pendingInvites || []
                  const onlineUsersSet = onlineUsers || new Set()
                  
                  // Create a function to load friends for any user
                  const [allUsersFriends, setAllUsersFriends] = React.useState({})
                  const [expandedUsers, setExpandedUsers] = React.useState(new Set())
                  
                  const toggleUserExpanded = (userId) => {
                    setExpandedUsers(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(userId)) {
                        newSet.delete(userId)
                      } else {
                        newSet.add(userId)
                      }
                      return newSet
                    })
                  }
                  
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
                      {/* Stats Bar */}
                      <div className="admin-stats-bar">
                        <div className="stat-item">
                          <span className="stat-value">{allUsersData.length}</span>
                          <span className="stat-label">Users</span>
                        </div>
                        <div className="stat-item online">
                          <span className="stat-value">{onlineUsersSet.size}</span>
                          <span className="stat-label">Online</span>
                        </div>
                        <div className="stat-item pending">
                          <span className="stat-value">{pendingInvitesData.length}</span>
                          <span className="stat-label">Invites</span>
                        </div>
                      </div>
                      
                      {/* Users List - Simple & Compact */}
                      <div className="admin-users-section">
                        <h5 className="section-title">Users</h5>
                        {allUsersData.length > 0 ? (
                          <div className="simple-users-list">
                            {allUsersData.map((userData, i) => {
                              const userFriendIds = allUsersFriends[userData.id] || []
                              const isAdmin = userData.id === 'bootstrap_admin'
                              const isCurrentUser = userData.id === user.id
                              const isOnline = onlineUsersSet.has(userData.id)
                              const inviter = userData.invitedBy ? 
                                allUsersData.find(u => u.id === userData.invitedBy) : null
                              const isExpanded = expandedUsers.has(userData.id)
                              const hasFriends = userFriendIds.length > 0
                              
                              return (
                                <div key={i}>
                                <div className={`user-row ${isCurrentUser ? 'current' : ''} ${isOnline ? 'online' : 'offline'} ${isExpanded ? 'expanded' : ''}`}
                                     onClick={() => hasFriends && window.innerWidth <= 380 && toggleUserExpanded(userData.id)}
                                     style={{ cursor: hasFriends && window.innerWidth <= 380 ? 'pointer' : 'default' }}>
                                  <div className="user-main">
                                    <span className="user-status">{isOnline ? '🟢' : '⚫'}</span>
                                    <span className="user-icon">{isAdmin ? '👑' : '👤'}</span>
                                    <span className="user-nick">{userData.nickname || 'Unknown'}</span>
                                    {isCurrentUser && <span className="badge you">YOU</span>}
                                    {isAdmin && <span className="badge admin">ADMIN</span>}
                                  </div>
                                  <div className="user-details">
                                    <span className="detail-item">
                                      <span className="label">ID:</span> {userData.id?.substring(0, 6)}...
                                    </span>
                                    {userFriendIds.length > 0 && (
                                      <span className="detail-item friends" title={`Friends: ${userFriendIds.map(fId => {
                                        const friend = allUsersData.find(u => u.id === fId);
                                        return friend?.nickname || fId.substring(0, 6);
                                      }).join(', ')}`}>
                                        🤝 {userFriendIds.length} {window.innerWidth > 380 && userFriendIds.length === 1 ? 'friend' : window.innerWidth > 380 ? 'friends' : ''}
                                      </span>
                                    )}
                                    {inviter && window.innerWidth > 380 && (
                                      <span className="detail-item">
                                        <span className="label">by:</span> {inviter.nickname}
                                      </span>
                                    )}
                                  </div>
                                  {!isAdmin && !isCurrentUser && (
                                    <button
                                      onClick={() => {
// [REMOVED CONSOLE LOG]
                                        setUserToDelete({ id: userData.id, nickname: userData.nickname })
                                      }}
                                      className="user-delete-btn"
                                      title={`Delete user ${userData.nickname}`}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                                {isExpanded && hasFriends && window.innerWidth <= 380 && (
                                  <div className="user-friends-expanded">
                                    <div className="friends-title">Friends ({userFriendIds.length}):</div>
                                    <div className="friends-list-compact">
                                      {userFriendIds.map(friendId => {
                                        const friend = allUsersData.find(u => u.id === friendId)
                                        const friendOnline = onlineUsersSet.has(friendId)
                                        return friend ? (
                                          <div key={friendId} className="friend-item-compact">
                                            <span className="friend-status">{friendOnline ? '🟢' : '⚫'}</span>
                                            <span className="friend-name">{friend.nickname}</span>
                                          </div>
                                        ) : null
                                      })}
                                    </div>
                                  </div>
                                )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="no-data">No users registered yet</div>
                        )}
                      </div>
                      
                      {/* Pending Invites - Compact */}
                      {pendingInvitesData.length > 0 && (
                        <div className="admin-invites-section">
                          <h5 className="section-title">Pending Invites ({pendingInvitesData.length})</h5>
                          <div className="invites-list">
                            {pendingInvitesData.map((invite, i) => (
                              <div key={i} className="invite-item">
                                <span className="invite-token">🎫 {invite.token?.substring(0, 8)}...</span>
                                <span className="invite-expire">Exp: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                                <span className={`invite-status ${invite.status}`}>
                                  {invite.status || 'pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </>
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