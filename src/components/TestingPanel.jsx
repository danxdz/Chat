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
            🗑️ Clear All Data & Restart
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
          
          {/* Clear Messages Only */}
          <button 
            onClick={() => {
              // Clear messages from state
              if (onClearCurrentClient) {
                onClearCurrentClient()
              }
              // Also clear from Gun.js
              if (gun) {
                gun.get('general_chat').map().once((data, key) => {
                  gun.get('general_chat').get(key).put(null)
                })
                gun.get('chat_messages').map().once((data, key) => {
                  gun.get('chat_messages').get(key).put(null)
                })
              }
              alert('Messages cleared!')
              window.location.reload()
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
              width: '100%'
            }}
          >
            💬 Clear Messages Only
          </button>
          
          {/* Admin Panel - Only for Admin user */}
          {user?.nickname === 'Admin' && (
            <>
              <button 
                onClick={() => {
                  const adminPanel = document.getElementById('admin-data-panel')
                  if (adminPanel) {
                    adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none'
                  }
                }}
                style={{
                  padding: '15px',
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                👑 Show/Hide Admin Data
              </button>
              
              {/* Debug Info - Always visible */}
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                borderRadius: '8px',
                border: '1px solid #2196F3',
                fontSize: '12px',
                color: '#fff',
                marginBottom: '15px'
              }}>
                <h4 style={{ marginBottom: '10px' }}>🔍 Debug Info - Current User</h4>
                <div><strong>Nickname:</strong> {user?.nickname}</div>
                <div><strong>User ID:</strong> {user?.id?.slice(-8) || 'N/A'}</div>
                <div><strong>Friends in user object:</strong> {user?.friends ? `${user.friends.length} friends` : 'No friends array'}</div>
                {user?.friends && user.friends.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Friend IDs:</strong>
                    {user.friends.map((fId, i) => (
                      <div key={i} style={{ marginLeft: '10px', fontSize: '11px' }}>
                        • {fId.slice(-8)}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '10px' }}>
                  <strong>Pending Invites:</strong> {JSON.parse(localStorage.getItem('pendingInvites') || '[]').length}
                </div>
                <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px' }}>
                  <strong>Data from localStorage:</strong>
                  <div style={{ fontSize: '11px', marginLeft: '10px' }}>
                    • Total Users: {JSON.parse(localStorage.getItem('users') || '[]').length}
                    • Current user in users list: {JSON.parse(localStorage.getItem('users') || '[]').find(u => u.id === user?.id) ? 'Yes ✅' : 'No ❌'}
                  </div>
                </div>
              </div>

              {/* Admin Data Panel */}
              <div id="admin-data-panel" style={{
                display: 'none',
                maxHeight: '300px',
                overflow: 'auto',
                background: '#2a2a2a',
                borderRadius: '8px',
                padding: '15px',
                fontSize: '12px',
                color: '#ddd'
              }}>
                <h4 style={{ color: '#9C27B0', marginBottom: '10px' }}>👑 Admin Panel</h4>
                
                {(() => {
                  const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
                  const pendingInvites = JSON.parse(localStorage.getItem('pendingInvites') || '[]')
                  
                  return (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>📊 Total Users:</strong> {allUsers.length}
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <strong>🌳 User Connections:</strong>
                        {allUsers.map((user, i) => (
                          <div key={i} style={{ marginLeft: '10px', marginTop: '5px' }}>
                            <div style={{ color: '#4CAF50' }}>
                              👤 {user.nickname}
                            </div>
                            {user.friends && user.friends.length > 0 ? (
                              user.friends.map((friendId, j) => {
                                const friend = allUsers.find(u => u.id === friendId)
                                return (
                                  <div key={j} style={{ marginLeft: '20px', color: '#888' }}>
                                    └─ 🤝 {friend ? friend.nickname : 'Unknown'}
                                  </div>
                                )
                              })
                            ) : (
                              <div style={{ marginLeft: '20px', color: '#666' }}>
                                └─ No friends
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ marginTop: '10px' }}>
                        <strong>📨 Invites ({pendingInvites.length}):</strong>
                        {pendingInvites.map((invite, i) => (
                          <div key={i} style={{ marginLeft: '10px', marginTop: '5px', fontSize: '11px' }}>
                            • {invite.fromNick} → {invite.acceptedNickname || 'Pending'}
                            {invite.status === 'accepted' && ' ✅'}
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