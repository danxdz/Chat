export default function TestingPanel({ 
  isVisible, 
  user,
  gun,
  initStatus,
  onClose,
  onSendTestMessage,
  onClearCurrentClient, 
  onClearAllClients, 
  onForceReload
}) {
  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#2d2d2d',
        padding: window.innerWidth < 480 ? '1rem' : '2rem',
        borderRadius: '8px',
        width: '95%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        margin: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>🛠️ Dev Tools</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ✕
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
                gun.get('presence').map().once((data, key) => {
                  if (data && data.nickname && data.timestamp) {
                    const isOnline = Date.now() - data.timestamp < 30000 // 30 seconds
                    onlineUsers.set(key, {
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
                  `${user.status} ${user.nickname} (last: ${user.lastSeen})`
                ).join('\n'))
              } else {
                alert('No users online data found')
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
                color: '#ddd'
              }}>
                <h4 style={{ color: '#9C27B0', marginBottom: '10px' }}>👑 Admin Panel</h4>
                
                {(() => {
                  // Use real Gun.js data from props
                  const allUsersData = allUsers || []
                  const pendingInvitesData = pendingInvites || []
                  const friendsData = friends || []
                  const onlineUsersSet = onlineUsers || new Set()
                  
                  return (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>📊 Total Users:</strong> {allUsersData.length}
                        <span style={{ marginLeft: '10px', color: '#4CAF50' }}>
                          🟢 Online: {onlineUsersSet.size}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <strong>🌳 Complete User Tree:</strong>
                        {allUsersData.length > 0 ? (
                          allUsersData.map((userData, i) => {
                            // Get this user's friends from Gun.js data
                            const userFriends = userData.id === user.id 
                              ? friendsData 
                              : [];
                            
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
                                
                                {/* Show friends for this user (only if it's the current user or we have the data) */}
                                {userData.id === user.id && userFriends.length > 0 && (
                                  <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                                    <span style={{ color: '#FFA726', fontSize: '11px' }}>Friends ({userFriends.length}):</span>
                                    {userFriends.map((friend, j) => (
                                      <div key={j} style={{ marginLeft: '10px', color: '#888', fontSize: '11px' }}>
                                        └─ 🤝 {friend.nickname} {friend.status === 'online' ? '🟢' : '⚫'}
                                      </div>
                                    ))}
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
          
          {/* Status Info */}
          <div style={{
            padding: '10px',
            background: '#1a1a1a',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#888'
          }}>
            <div>👤 User: {user?.nickname || 'Not logged in'}</div>
            <div>🔗 Gun.js: {gun ? 'Connected' : 'Disconnected'}</div>
            {user?.nickname === 'Admin' && (
              <div style={{ color: '#9C27B0', marginTop: '5px' }}>👑 Admin Mode</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}