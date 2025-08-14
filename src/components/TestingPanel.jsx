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
                <h4 style={{ color: '#9C27B0', marginBottom: '10px' }}>👑 Admin Panel</h4>
                
                {(() => {
                  // Use real Gun.js data from props
                  const allUsersData = allUsers || []
                  const pendingInvitesData = pendingInvites || []
                  const friendsData = friends || []
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
                      <div style={{ marginBottom: '10px' }}>
                        <strong>📊 Total Users:</strong> {allUsersData.length}
                        <span style={{ marginLeft: '10px', color: '#4CAF50' }}>
                          🟢 Online: {onlineUsersSet.size}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <strong>🌳 Complete User Tree with Friends:</strong>
                        {allUsersData.length > 0 ? (
                          <div className="users-list-container">
                            {allUsersData.map((userData, i) => {
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
                                <div key={i} style={{ 
                                  marginLeft: '10px', 
                                  marginTop: '8px',
                                  padding: '8px',
                                  background: isCurrentUser ? 'rgba(156, 39, 176, 0.1)' : 'transparent',
                                  borderRadius: '4px',
                                  border: isCurrentUser ? '1px solid #9C27B0' : '1px solid transparent',
                                  position: 'relative'
                                }}>
                                  <div style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}>
                                    <div style={{ 
                                      color: isAdmin ? '#FFD700' : '#4CAF50',
                                      fontWeight: isCurrentUser ? 'bold' : 'normal'
                                    }}>
                                      {isAdmin ? '👑' : '👤'} {userData.nickname || 'Unknown'} 
                                      {isCurrentUser && ' (You)'}
                                      {onlineUsersSet.has(userData.id) ? ' 🟢' : ' ⚫'}
                                      {isAdmin && ' [ADMIN]'}
                                    </div>
                                    
                                    {!isAdmin && !isCurrentUser && (
                                      <button
                                        onClick={() => setUserToDelete({ id: userData.id, nickname: userData.nickname })}
                                        style={{
                                          background: 'rgba(244, 67, 54, 0.2)',
                                          border: '1px solid #f44336',
                                          color: '#f44336',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Show user details */}
                                  <div style={{ marginLeft: '20px', fontSize: '10px', color: '#888', marginTop: '2px' }}>
                                    ID: {userData.id?.substring(0, 8)}...
                                    {userData.createdAt && ` | Joined: ${new Date(userData.createdAt).toLocaleDateString()}`}
                                  </div>
                                  
                                  {/* Show who invited this user */}
                                  {userData.invitedBy && (
                                    <div style={{ marginLeft: '20px', color: '#9C27B0', fontSize: '10px', marginTop: '2px' }}>
                                      └─ 📨 Invited by: {allUsersData.find(u => u.id === userData.invitedBy)?.nickname || userData.invitedBy.substring(0, 8)}
                                    </div>
                                  )}
                                  
                                  {/* Show friends for ALL users */}
                                  {userFriends.length > 0 && (
                                    <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                                      <span style={{ color: '#FFA726', fontSize: '11px' }}>Friends ({userFriends.length}):</span>
                                      {userFriends.map((friend, j) => (
                                        <div key={j} style={{ marginLeft: '10px', color: '#888', fontSize: '11px' }}>
                                          └─ 🤝 {friend.nickname} {friend.isOnline ? '🟢' : '⚫'}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* If no friends */}
                                  {userFriends.length === 0 && (
                                    <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                                      <span style={{ color: '#666', fontSize: '11px' }}>No friends yet</span>
                                    </div>
                                  )}
                                  
                                  {/* Show users this person invited */}
                                  {(() => {
                                    const invitedUsers = allUsersData.filter(u => u.invitedBy === userData.id);
                                    if (invitedUsers.length > 0) {
                                      return (
                                        <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                                          <span style={{ color: '#4CAF50', fontSize: '11px' }}>Invited ({invitedUsers.length}):</span>
                                          {invitedUsers.map((invitedUser, k) => (
                                            <div key={k} style={{ marginLeft: '10px', color: '#4CAF50', fontSize: '11px' }}>
                                              └─ ✅ {invitedUser.nickname}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ marginLeft: '10px', marginTop: '5px', color: '#666' }}>
                            No users registered yet
                          </div>
                        )}
                      </div>
                      
                      <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                        <strong>📨 Pending Invites ({pendingInvitesData.length}):</strong>
                        {pendingInvitesData.length > 0 ? (
                          pendingInvitesData.map((invite, i) => (
                            <div key={i} style={{ 
                              marginLeft: '10px', 
                              marginTop: '5px', 
                              padding: '5px',
                              background: 'rgba(255, 167, 38, 0.1)',
                              borderRadius: '4px',
                              fontSize: '11px', 
                              color: '#FFA726' 
                            }}>
                              <div>🎫 Token: {invite.token?.substring(0, 12)}...</div>
                              <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                                Created: {new Date(invite.createdAt).toLocaleString()}
                              </div>
                              <div style={{ fontSize: '10px', color: '#888' }}>
                                Expires: {new Date(invite.expiresAt).toLocaleString()}
                              </div>
                              <div style={{ fontSize: '10px', color: invite.status === 'used' ? '#4CAF50' : '#FFA726' }}>
                                Status: {invite.status || 'pending'} {invite.status === 'used' && '✅'}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ marginLeft: '10px', marginTop: '5px', fontSize: '11px', color: '#666' }}>
                            No pending invites
                          </div>
                        )}
                      </div>
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