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

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost'
  
  // Only show in development
  if (!isDev) return null

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
        
        {/* Connection Status */}
        <div style={{
          background: '#333',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>📡 Status</h3>
          <div style={{ fontSize: '0.9rem', color: '#888' }}>
            <div>User: {user?.nickname || 'Not logged in'}</div>
            <div>Gun.js: {gun ? '✅ Connected' : '❌ Disconnected'}</div>
            <div>{initStatus}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>⚡ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={onSendTestMessage} 
              className="btn" 
              style={{ background: '#0066cc', width: '100%' }}
            >
              📤 Send Test Message
            </button>
            
            <button 
              onClick={onClearCurrentClient} 
              className="btn" 
              style={{ background: '#ffc107', color: '#000', width: '100%' }}
            >
              🧹 Clear Current Session
            </button>
            
            <button 
              onClick={onClearAllClients} 
              className="btn" 
              style={{ background: '#ff6b6b', width: '100%' }}
            >
              🗑️ Clear All Data
            </button>
            
            <button 
              onClick={onForceReload} 
              className="btn" 
              style={{ background: '#666', width: '100%' }}
            >
              🔄 Reload App
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{
          fontSize: '0.8rem',
          color: '#666',
          textAlign: 'center',
          marginTop: '1rem'
        }}>
          Dev tools are only visible in development mode
        </div>
      </div>
    </div>
  )
}