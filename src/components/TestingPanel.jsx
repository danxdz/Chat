export default function TestingPanel({ 
  isVisible, 
  user,
  contacts,
  messages,
  gun,
  initStatus,
  chatError,
  testLogs,
  onClose,
  onRunTests, 
  onSendTestMessage,
  onSendCrossDeviceTest,
  onTestMultiUser,
  onTestPrivateMsg,
  onTestBasicGun,
  onClearCurrentClient, 
  onClearAllClients, 
  onResetApp,
  onForceReload,
  onClearGunJS
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
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        margin: '1rem'
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>🧪 App Testing Suite</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button onClick={onRunTests} className="btn" style={{ 
            background: '#0066cc', 
            flex: 1, 
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🔍 Run All Tests
          </button>
          <button onClick={onSendTestMessage} className="btn" style={{ 
            background: '#28a745', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            📡 Send Test Message
          </button>
          <button onClick={onSendCrossDeviceTest} className="btn" style={{ 
            background: '#ffc107', 
            color: '#000', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🚀 Cross-Device Test
          </button>
          <button onClick={onTestMultiUser} className="btn" style={{ 
            background: '#9c27b0', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            👥 Multi-User Test
          </button>
          <button onClick={onTestPrivateMsg} className="btn" style={{ 
            background: '#e91e63', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🔒 Private Msg Test
          </button>
          <button onClick={onTestBasicGun} className="btn" style={{ 
            background: '#dc3545', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🔍 Test Basic Gun.js
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button onClick={onClearCurrentClient} className="btn" style={{ 
            background: '#ff6b6b', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🧹 Clear Current User Data
          </button>
          <button onClick={onClearAllClients} className="btn" style={{ 
            background: '#dc3545', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            💥 Clear ALL Data
          </button>
          <button onClick={onResetApp} className="btn" style={{ 
            background: '#0066cc', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🔄 Reset App to Fresh Start
          </button>
        </div>

        {/* Additional Dev Tools */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button onClick={onClearGunJS} className="btn" style={{ 
            background: '#ff6b35', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            🔫 Clear Gun.js Data
          </button>
          <button onClick={onForceReload} className="btn" style={{ 
            background: '#28a745', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            ↻ Force Reload Page
          </button>
          <button onClick={() => {
            alert(`Deploy Info:
            - Last Build: ${new Date().toLocaleString()}
            - User Agent: ${navigator.userAgent.substring(0, 50)}...
            - Location: ${window.location.href}
            - Local Storage Items: ${Object.keys(localStorage).length}
            - Messages in State: ${messages.length}
            - Gun.js Status: ${gun ? 'Connected' : 'Not Connected'}
            `)
          }} className="btn" style={{ 
            background: '#6f42c1', 
            color: '#fff', 
            flex: 1,
            minWidth: window.innerWidth < 480 ? '100%' : 'auto',
            fontSize: '0.9rem',
            padding: '0.6rem'
          }}>
            ℹ️ Debug Info
          </button>
        </div>

        {testLogs.length > 0 && (
          <div style={{
            background: '#1a1a1a',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            maxHeight: '300px',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            {testLogs.map((log, index) => (
              <div key={index} style={{ marginBottom: '0.25rem' }}>
                {log}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>📊 Current Status:</h3>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
            <div>👤 User: {user.nickname}</div>
            <div>📋 Contacts: {contacts.length}</div>
            <div>💬 Messages: {messages.length}</div>
            <div>🔫 Gun.js: {gun ? '🟢 Connected' : '🔴 Not Connected'}</div>
            <div>🔐 Encryption: {window.Gun && window.Gun.SEA ? '🟢 Available' : '🔴 Not Available'}</div>
            <div>⚡ Status: {initStatus}</div>
            {chatError && <div style={{ color: '#ff6b6b' }}>⚠️ Error: {chatError}</div>}
          </div>
        </div>

        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          background: 'rgba(255, 193, 7, 0.1)', 
          borderRadius: '4px',
          border: '1px solid rgba(255, 193, 7, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#ffc107' }}>ℹ️ P2P Message Info:</h3>
          <div style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#e0e0e0' }}>
            <div>🔐 <strong>Encryption:</strong> Messages are now encrypted using Gun SEA</div>
            <div>📡 <strong>P2P Network:</strong> Messages persist on Gun.js peer network</div>
            <div>🗑️ <strong>Clearing:</strong> Cannot fully clear P2P data (by design)</div>
            <div>🌐 <strong>Decentralized:</strong> Data exists on multiple peers globally</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={onClose} 
            className="btn" 
            style={{ background: '#666', flex: 1 }}
          >
            Close
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="btn" 
            style={{ background: '#dc3545', flex: 1 }}
          >
            🔄 Restart App
          </button>
        </div>
      </div>
    </div>
  )
}