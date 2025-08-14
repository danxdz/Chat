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
                  
                  return (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>📊 Total Users:</strong> {allUsersData.length}
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <strong>🌳 User Connections:</strong>
                        {allUsersData.map((userData, i) => (
                          <div key={i} style={{ marginLeft: '10px', marginTop: '5px' }}>
                            <div style={{ color: '#4CAF50' }}>
                              👤 {userData.nickname || 'Unknown'} 
                              {userData.id === user.id && ' (You)'}
                              {onlineUsers.has(userData.id) && ' 🟢'}
                            </div>
                            {/* Show friends for current user */}
                            {userData.id === user.id && friendsData.length > 0 ? (
                              friendsData.map((friend, j) => (
                                <div key={j} style={{ marginLeft: '20px', color: '#888' }}>
                                  └─ 🤝 {friend.nickname} {friend.status === 'online' ? '🟢' : '⚫'}
                                </div>
                              ))
                            ) : userData.id === user.id ? (
                              <div style={{ marginLeft: '20px', color: '#666' }}>
                                └─ No friends yet
                              </div>
                            ) : null}
                            {/* Show invited by info */}
                            {userData.invitedBy && (
                              <div style={{ marginLeft: '20px', color: '#9C27B0', fontSize: '10px' }}>
                                └─ Invited by: {allUsersData.find(u => u.id === userData.invitedBy)?.nickname || userData.invitedBy.substring(0, 8)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ marginTop: '10px' }}>
                        <strong>📨 Pending Invites ({pendingInvitesData.length}):</strong>
                        {pendingInvitesData.length > 0 ? (
                          pendingInvitesData.map((invite, i) => (
                            <div key={i} style={{ marginLeft: '10px', marginTop: '5px', fontSize: '11px', color: '#FFA726' }}>
                              • Token: {invite.token.substring(0, 12)}...
                              <br />
                              • Created: {new Date(invite.createdAt).toLocaleString()}
                              <br />
                              • Expires: {new Date(invite.expiresAt).toLocaleString()}
                              <br />
                              • Status: {invite.status || 'pending'}
                            </div>
                          ))
                        ) : (
                          <div style={{ marginLeft: '10px', marginTop: '5px', fontSize: '11px', color: '#666' }}>
                            No pending invites
                          </div>
                        )}
                      </div>
                      
                      {/* Add accepted invites section */}
                      <div style={{ marginTop: '10px' }}>
                        <strong>✅ Accepted Invites:</strong>
                        {allUsersData.filter(u => u.invitedBy === user.id).map((invitedUser, i) => (
                          <div key={i} style={{ marginLeft: '10px', marginTop: '5px', fontSize: '11px', color: '#4CAF50' }}>
                            • {invitedUser.nickname} joined {invitedUser.createdAt ? new Date(invitedUser.createdAt).toLocaleDateString() : 'recently'}
                          </div>
                        ))}
                      </div>
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