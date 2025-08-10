export default function TestingPanel({ 
  isVisible, 
  onClose, 
  onRunTests, 
  onClearCurrentClient, 
  onClearAllClients, 
  onResetApp 
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
        background: '#222',
        padding: '1.5rem',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid #444'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>🧪 Testing & Debug Panel</h3>
        
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* Functionality Tests */}
          <div style={{ background: '#333', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50', fontSize: '0.9rem' }}>
              📊 Functionality Tests
            </h4>
            <button 
              onClick={onRunTests}
              style={{
                background: '#28a745',
                border: 'none',
                color: 'white',
                padding: '0.7rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                width: '100%'
              }}
            >
              🏃‍♂️ Run All Tests
            </button>
            <p style={{ fontSize: '0.7rem', color: '#888', margin: '0.5rem 0 0 0' }}>
              Tests Gun.js connectivity, message sending, contact management, and P2P functionality
            </p>
          </div>

          {/* Data Management */}
          <div style={{ background: '#333', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ff9800', fontSize: '0.9rem' }}>
              🗄️ Data Management
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <button 
                onClick={onClearCurrentClient}
                style={{
                  background: '#ff9800',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                🧹 Clear Current User Data
              </button>
              
              <button 
                onClick={onClearAllClients}
                style={{
                  background: '#f44336',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                💥 Clear All Users Data
              </button>
              
              <button 
                onClick={onResetApp}
                style={{
                  background: '#9c27b0',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                🔄 Complete App Reset
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#888', margin: '0.5rem 0 0 0' }}>
              ⚠️ Warning: These actions will clear localStorage data. Gun.js network data persists.
            </p>
          </div>

          {/* Debug Tools */}
          <div style={{ background: '#333', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#2196F3', fontSize: '0.9rem' }}>
              🔍 Debug Tools
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <button 
                onClick={() => window.debugGunJS && window.debugGunJS()}
                style={{
                  background: '#2196F3',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                🔧 Debug Gun.js
              </button>
              
              <button 
                onClick={() => {
                  console.log('📱 CURRENT STATE DEBUG:')
                  console.log('- Users:', JSON.parse(localStorage.getItem('users') || '[]'))
                  console.log('- Current User:', JSON.parse(localStorage.getItem('currentUser') || 'null'))
                  console.log('- LocalStorage keys:', Object.keys(localStorage))
                  alert('Debug info logged to console')
                }}
                style={{
                  background: '#607d8b',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                📱 Debug App State
              </button>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button 
            onClick={onClose}
            style={{
              background: '#666',
              border: 'none',
              color: 'white',
              padding: '0.6rem 1.2rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}