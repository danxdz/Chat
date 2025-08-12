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
            <button 
              onClick={() => {
                // Get all users and show connections
                const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
                const pendingInvites = JSON.parse(localStorage.getItem('pendingInvites') || '[]')
                
                console.log('=== ADMIN PANEL ===')
                console.log('📊 Total Users:', allUsers.length)
                console.log('👥 All Users:', allUsers)
                
                // Show user tree
                console.log('\n🌳 FRIENDSHIP TREE:')
                allUsers.forEach(user => {
                  console.log(`\n👤 ${user.nickname} (${user.id.slice(0, 8)}...)`)
                  if (user.friends && user.friends.length > 0) {
                    user.friends.forEach(friendId => {
                      const friend = allUsers.find(u => u.id === friendId)
                      console.log(`  └─ 🤝 ${friend ? friend.nickname : 'Unknown'} (${friendId.slice(0, 8)}...)`)
                    })
                  } else {
                    console.log('  └─ No friends')
                  }
                })
                
                console.log('\n📨 Pending Invites:', pendingInvites.length)
                pendingInvites.forEach(invite => {
                  console.log(`  - Invite ${invite.id?.slice(-6)} from ${invite.fromNick}`)
                })
                
                alert('Admin data logged to console! Press F12 to view.')
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
              👑 Admin Panel (Console)
            </button>
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