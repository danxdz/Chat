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
    } else if (type === 'all') {
      // Clear all data
      if (gun) {
        // Clear all Gun.js data
        await gun.get('chat_messages').put(null)
        await gun.get('user_presence').put(null)
        await gun.get('general_chat').put({ initialized: true })
      }
      
      // Clear all local storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Force reload
      window.location.reload()
    }
    
    setShowClearConfirm(false)
    setClearType(null)
  }

  return (
    <>
      <div className="testing-panel">
        <div className="testing-header">
          <h2>🛠️ Testing Panel</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <div className="testing-content">
          {/* Status Info */}
          <div className="status-section">
            <h3>📊 Status</h3>
            <div className="status-item">
              <span>User:</span> {user?.nickname || 'Not logged in'}
            </div>
            <div className="status-item">
              <span>ID:</span> {user?.id?.substring(0, 8) || 'N/A'}...
            </div>
            <div className="status-item">
              <span>Init Status:</span> {initStatus}
            </div>
            <div className="status-item">
              <span>Gun.js:</span> {gun ? '✅ Connected' : '❌ Not connected'}
            </div>
          </div>

          {/* Test Actions */}
          <div className="actions-section">
            <h3>🧪 Test Actions</h3>
            
            <button 
              onClick={onSendTestMessage}
              className="test-btn primary"
            >
              📤 Send Test Message
            </button>
            
            <button 
              onClick={loadOnlineUsers}
              className="test-btn info"
            >
              👥 Show Online Users
            </button>
            
            <button 
              onClick={() => {
                setClearType('current')
                setShowClearConfirm(true)
              }}
              className="test-btn warning"
            >
              🧹 Clear Current User Data
            </button>
            
            <button 
              onClick={() => {
                setClearType('all')
                setShowClearConfirm(true)
              }}
              className="test-btn danger"
            >
              💣 Clear All Data
            </button>
            
            <button 
              onClick={onForceReload}
              className="test-btn secondary"
            >
              🔄 Force Reload
            </button>
          </div>

          {/* Simple Dev Tools */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Clear Data Button */}
            <button 
              onClick={() => {
                if (confirm('Clear all data and restart? This will delete everything!')) {
                  // Clear all localStorage
                  localStorage.clear()
                  sessionStorage.clear()
                  // Reload the page
                  window.location.reload()
                }
              }}
              style={{
                padding: '15px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🗑️ Clear LocalStorage & Restart
            </button>
            
            {/* Clear Messages Only */}
            <button 
              onClick={async () => {
                if (confirm('⚠️ Clear all messages?\n\nThis will delete all chat messages but keep users and friendships.')) {
                  try {
                    const { clearMessagesOnly } = await import('../services/gunAuthService.js')
                    await clearMessagesOnly(gun)
                    alert('✅ Messages cleared! Reloading...')
                    setTimeout(() => window.location.reload(), 500)
                  } catch (error) {
                    alert(`❌ Failed to clear messages: ${error.message}`)
                  }
                }
              }}
              style={{
                padding: '15px',
                background: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '10px'
              }}
            >
              🗑️ Clear Messages Only
            </button>
            
            {/* Clear Gun.js Database */}
            <button 
              onClick={async () => {
                if (confirm('⚠️ COMPLETE RESET - ARE YOU SURE?\n\nThis will delete EVERYTHING:\n• All Gun.js P2P data\n• All localStorage data\n• All users & passwords\n• All messages & chats\n• All friendships\n\nThe app will restart completely fresh!')) {
                  try {
                    const { clearGunDatabase } = await import('../services/gunAuthService.js')
                    await clearGunDatabase(gun)
                    alert('✅ Complete reset successful! Restarting...')
                    setTimeout(() => window.location.reload(), 1000)
                  } catch (error) {
                    alert(`❌ Failed to reset: ${error.message}`)
                  }
                }
              }}
              style={{
                padding: '15px',
                background: '#9c27b0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '10px'
              }}
            >
              💥 Complete Reset (Clear Everything)
            </button>
            
            {/* Restart App Button */}
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '15px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🔄 Restart App
            </button>
            

            
            {/* Fix Private Key Issue */}
            {!user?.privateKey && (
              <button 
                onClick={() => {
                  alert('⚠️ Private key missing!\n\nTo fix this:\n1. Click OK\n2. Logout\n3. Login again\n\nThis will generate a new private key for creating invites.')
                  setTimeout(() => {
                    if (onLogout) onLogout()
                  }, 1000)
                }}
                style={{
                  padding: '15px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '10px',
                  animation: 'pulse 2s infinite'
                }}
              >
                🔧 FIX: Missing Private Key - Click to Logout
              </button>
            )}
            
            {/* Test Message Sending */}
            <button 
              onClick={async () => {
                if (!onSendTestMessage) {
                  alert('Test message function not available')
                  return
                }
                const testMessages = [
                  'Test message ' + Date.now(),
                  '🚀 Testing Gun.js P2P messaging',
                  'Hello from ' + user.nickname,
                  '✅ Message test successful!'
                ]
                const randomMsg = testMessages[Math.floor(Math.random() * testMessages.length)]
                await onSendTestMessage(randomMsg)
                alert('Test message sent: ' + randomMsg)
              }}
              style={{
                padding: '15px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '10px'
              }}
            >
              📤 Send Test Message
            </button>
            

            
            {/* Test Connection */}
            <button 
              onClick={async () => {
                if (!gun) {
                  alert('❌ Gun.js NOT connected!')
                  return
                }
                
                const testKey = 'test_' + Date.now()
                const testData = { test: true, timestamp: Date.now(), user: user.nickname }
                
                try {
                  // Write test data
                  await gun.get('connection_test').get(testKey).put(testData)
                  
                  // Read it back
                  const result = await new Promise((resolve) => {
                    let timeout = setTimeout(() => resolve(null), 3000)
                    gun.get('connection_test').get(testKey).once((data) => {
                      clearTimeout(timeout)
                      resolve(data)
                    })
                  })
                  
                  if (result) {
                    alert('✅ Gun.js connection WORKING!\n\nTest data written and read successfully.')
                  } else {
                    alert('⚠️ Gun.js connection SLOW\n\nData write succeeded but read timed out.')
                  }
                  
                  // Clean up test data
                  gun.get('connection_test').get(testKey).put(null)
                } catch (error) {
                  alert('❌ Connection test FAILED: ' + error.message)
                }
              }}
              style={{
                padding: '15px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '10px'
              }}
            >
              🔌 Test Gun.js Connection
            </button>
            
            {/* Show Online Users */}
            <button 
              onClick={async () => {
                if (!gun) {
                  alert('Gun.js not connected')
                  return
                }
                
                const onlineUsers = new Map()
                await new Promise((resolve) => {
                  let timeout = setTimeout(resolve, 2000)
                  // Use user_presence instead of presence
                  gun.get('user_presence').map().once((data, key) => {
                    if (data && data.nickname && data.timestamp) {
                      const isOnline = Date.now() - data.timestamp < 60000 // 60 seconds
                      onlineUsers.set(key, {
                        userId: key,
                        nickname: data.nickname,
                        status: isOnline ? '🟢 Online' : '🔴 Offline',
                        lastSeen: new Date(data.timestamp).toLocaleTimeString()
                      })
                    }
                    clearTimeout(timeout)
                    timeout = setTimeout(resolve, 500)
                  })
                })
                
                if (onlineUsers.size > 0) {
                  alert('Online Users:\n\n' + Array.from(onlineUsers.entries()).map(([key, user]) => 
                    `${user.status} ${user.nickname}\nID: ${user.userId.substring(0, 8)}...\nLast seen: ${user.lastSeen}`
                  ).join('\n\n'))
                } else {
                  alert('No users online data found in Gun.js.\nMake sure users are announcing their presence.')
                }
              }}
              style={{
                padding: '15px',
                background: '#00BCD4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                marginTop: '10px'
              }}
            >
              👥 Show Online Users
            </button>
            
            {/* Admin Panel - Only show for bootstrap user */}
            {user && user.id === 'bootstrap_admin' && (
              <>
                <div style={{
                  padding: '10px',
                  background: 'linear-gradient(135deg, #2a0845 0%, #1a0530 100%)',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  fontSize: '12px',
                  color: '#ddd',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
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
                              
                              return (
                                <div key={i} style={{ 
                                  marginLeft: '10px', 
                                  marginTop: '8px',
                                  padding: '8px',
                                  background: userData.id === user.id ? 'rgba(156, 39, 176, 0.1)' : 'transparent',
                                  borderRadius: '4px',
                                  border: userData.id === user.id ? '1px solid #9C27B0' : 'none'
                                }}>
                                  <div style={{ 
                                    color: userData.id === 'bootstrap_admin' ? '#FFD700' : '#4CAF50',
                                    fontWeight: userData.id === user.id ? 'bold' : 'normal'
                                  }}>
                                    {userData.id === 'bootstrap_admin' ? '👑' : '👤'} {userData.nickname || 'Unknown'} 
                                    {userData.id === user.id && ' (You)'}
                                    {onlineUsersSet.has(userData.id) ? ' 🟢' : ' ⚫'}
                                    {userData.id === 'bootstrap_admin' && ' [ADMIN]'}
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
                            })
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
                        
                        {/* Debug: Show online users data */}
                        {isDev && (
                          <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                            <strong>🔍 Debug - Online Users:</strong>
                            <div style={{ fontSize: '10px', color: '#888', marginTop: '5px' }}>
                              Set size: {onlineUsersSet.size}
                              {onlineUsersSet.size > 0 && (
                                <div>
                                  IDs: {Array.from(onlineUsersSet).map(id => id.substring(0, 8)).join(', ')}
                                </div>
                              )}
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
          title={clearType === 'current' ? 'Clear Current User Data' : 'Clear All Data'}
          size="small"
        >
          <div className="confirm-modal">
            <p className="warning-text">
              {clearType === 'current' 
                ? '⚠️ This will clear all data for your current user session.'
                : '⚠️ This will DELETE EVERYTHING and reset the app completely!'}
            </p>
            <p>Are you sure you want to continue?</p>
            <div className="modal-buttons">
              <button 
                onClick={() => handleClearData(clearType)}
                className="btn-danger"
              >
                Yes, Clear Data
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
    </>
  )
}