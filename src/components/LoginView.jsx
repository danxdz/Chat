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
      setIsLoading(false)
    }
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
        
        {allUsers && allUsers.length === 0 && (
          <div style={{ marginTop: '20px' }}>
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
              <strong>Admin Credentials:</strong><br/>
              Username: <code style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '3px' }}>Admin</code><br/>
              Password: <code style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '3px' }}>admin123</code>
            </div>
          </div>
        )}
        
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
                <strong>Can't login?</strong><br/>
                1. Click "Reset App" above<br/>
                2. Click "Create Admin Account"<br/>
                3. Login with Admin / admin123<br/>
                <br/>
                <strong>No users showing?</strong><br/>
                The app may need initialization. Click reset and start fresh.
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