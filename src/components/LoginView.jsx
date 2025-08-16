import { useState } from 'react'

export default function LoginView({ onLogin, onCreateAdmin, allUsers }) {
  const [loginNickname, setLoginNickname] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!loginNickname.trim() || !loginPassword.trim()) {
      setLoginError('Please enter nickname and password')
      return
    }
    
    setIsLoading(true)
    setLoginError('')
    
    const result = await onLogin(loginNickname, loginPassword, rememberMe)
    
    if (!result.success) {
      setLoginError(result.error || 'Login failed')
      setIsLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    setIsLoading(true)
    setLoginError('')
    
    const result = await onCreateAdmin()
    
    if (!result.success) {
      setLoginError(result.error || 'Failed to create admin')
      // If admin already exists, auto-fill the login form
      if (result.error && result.error.includes('already exists')) {
        setLoginNickname('Admin')
        setLoginPassword('admin123')
        setLoginError('Admin exists! Credentials filled. Click Login.')
      }
      setIsLoading(false)
    }
  }
  
  const handleQuickAdminLogin = () => {
    setLoginNickname('Admin')
    setLoginPassword('admin123')
    setLoginError('')
  }

  const handleReset = () => {
    if (confirm('This will clear all local data and reset the app. Continue?')) {
      try {
        // Clear all storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear IndexedDB if it exists
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then(databases => {
            databases.forEach(db => {
              window.indexedDB.deleteDatabase(db.name)
            })
          }).catch(() => {})
        }
        
        // Show success and reload
        alert('✅ App has been reset! Page will reload now.')
        window.location.reload()
      } catch (error) {
        alert('❌ Failed to reset: ' + error.message)
      }
    }
  }

  return (
    <div className="screen">
      <form className="form" onSubmit={handleSubmit}>
        <h1>🔐 Secure P2P Chat</h1>
        <p className="subtitle">Login to continue</p>
        
        {loginError && (
          <div className="error-message" style={{
            background: '#ff4444',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '15px'
          }}>
            {loginError}
          </div>
        )}
        
        <input
          type="text"
          placeholder="Nickname"
          value={loginNickname}
          onChange={(e) => setLoginNickname(e.target.value)}
          className="input"
          disabled={isLoading}
          autoFocus
        />
        
        <input
          type="password"
          placeholder="Password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          className="input"
          disabled={isLoading}
        />
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '15px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <span>Remember me</span>
        </label>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>
        
        {/* Admin Account Section */}
        <div style={{ marginTop: '20px' }}>
          {allUsers && allUsers.length === 0 ? (
            <>
              <button
                type="button"
                onClick={handleCreateAdmin}
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={isLoading}
              >
                🛡️ Create Admin Account
              </button>
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '8px',
                fontSize: '0.9em'
              }}>
                <strong>Admin will be created with:</strong><br/>
                Username: <code style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '3px' }}>Admin</code><br/>
                Password: <code style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '3px' }}>admin123</code>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              className="btn"
              style={{ 
                width: '100%',
                background: 'rgba(118, 75, 162, 0.3)',
                border: '1px solid rgba(118, 75, 162, 0.5)'
              }}
              disabled={isLoading}
            >
              👤 Quick Fill: Admin / admin123
            </button>
          )}
        </div>
        
        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <button
            type="button"
            onClick={() => setShowReset(!showReset)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9em',
              width: '100%'
            }}
          >
            🔧 Troubleshooting Options {showReset ? '▲' : '▼'}
          </button>
          
          {showReset && (
            <div style={{ marginTop: '15px' }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn"
                style={{ 
                  background: '#dc3545', 
                  width: '100%',
                  marginBottom: '10px'
                }}
              >
                🗑️ Reset App (Clear All Data)
              </button>
              
              <div style={{ 
                padding: '10px', 
                background: 'rgba(255,200,0,0.1)', 
                border: '1px solid rgba(255,200,0,0.3)',
                borderRadius: '8px',
                fontSize: '0.85em',
                lineHeight: '1.5'
              }}>
                <strong>⚠️ Important:</strong><br/>
                Users are stored on the P2P network (Gun.js), not just locally.<br/>
                <br/>
                <strong>Admin Account Already Exists?</strong><br/>
                • Click "Quick Fill" button above<br/>
                • Or manually enter: Admin / admin123<br/>
                <br/>
                <strong>Still Can't Login?</strong><br/>
                1. Click "Reset App" to clear local cache<br/>
                2. Try the Quick Fill button<br/>
                3. Click Login<br/>
                <br/>
                <em style={{ fontSize: '0.9em', opacity: 0.8 }}>
                  Note: Reset only clears your local data. The admin account persists on the network.
                </em>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#888', textAlign: 'center' }}>
          {allUsers && allUsers.length > 0 && (
            <p>Registered Users: {allUsers.length}</p>
          )}
        </div>
      </form>
    </div>
  )
}