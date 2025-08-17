import { useState, useEffect } from 'react'

export default function LoginView({ onLogin, onCreateAdmin, allUsers }) {
  const [loginNickname, setLoginNickname] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [hasInvite, setHasInvite] = useState(false)
  
  useEffect(() => {
    // Check if there's an invite in the URL
    const hash = window.location.hash
    if (hash.startsWith('#invite=')) {
      setHasInvite(true)
    }
  }, [])

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
    if (confirm('This will clear all local data. Continue?')) {
      try {
        localStorage.clear()
        sessionStorage.clear()
        window.location.reload()
      } catch (error) {
        alert('Failed to reset: ' + error.message)
      }
    }
  }

  const noUsers = !allUsers || allUsers.length === 0

  return (
    <div className="screen">
      <form className="form" onSubmit={handleSubmit}>
        <h1>🔐 P2P Chat</h1>
        <p className="subtitle">Secure Decentralized Messaging</p>
        
        {hasInvite && (
          <div style={{
            background: '#4CAF50',
            color: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
              📨 You have an invite!
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn"
              style={{ 
                background: 'white',
                color: '#4CAF50',
                fontWeight: 'bold'
              }}
            >
              Go to Registration →
            </button>
          </div>
        )}
        
        {loginError && (
          <div className="error-message" style={{
            background: '#ff4444',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '15px',
            fontSize: '0.9em'
          }}>
            {loginError}
          </div>
        )}
        
        {/* Quick Start for New Users */}
        {noUsers && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.95em' }}>
              First time? Start here:
            </p>
            <button
              type="button"
              onClick={handleCreateAdmin}
              className="btn"
              style={{ 
                width: '100%',
                background: 'white',
                color: '#764ba2',
                fontWeight: 'bold'
              }}
              disabled={isLoading}
            >
              🚀 Create Admin Account
            </button>
            <p style={{ 
              margin: '10px 0 0 0', 
              fontSize: '0.85em',
              opacity: 0.9
            }}>
              Username: Admin | Password: admin123
            </p>
          </div>
        )}
        
        <input
          type="text"
          placeholder="Nickname"
          value={loginNickname}
          onChange={(e) => setLoginNickname(e.target.value)}
          disabled={isLoading}
        />
        
        <input
          type="password"
          placeholder="Password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
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
        
        {/* Quick Actions */}
        <div style={{ 
          marginTop: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          {!noUsers && (
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              className="btn"
              style={{ 
                flex: 1,
                background: 'rgba(255,255,255,0.1)',
                fontSize: '0.9em'
              }}
              disabled={isLoading}
            >
              👤 Admin
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="btn"
            style={{ 
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              fontSize: '0.9em'
            }}
          >
            ❓ Help
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="btn"
            style={{ 
              flex: 1,
              background: 'rgba(220,53,69,0.2)',
              fontSize: '0.9em'
            }}
          >
            🔄 Reset
          </button>
        </div>
        
        {/* Help Section */}
        {showHelp && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            fontSize: '0.85em',
            lineHeight: '1.6'
          }}>
            <strong>Quick Help:</strong><br/>
            • Default admin: Admin / admin123<br/>
            • Reset clears local cache only<br/>
            • Users exist on P2P network<br/>
            • Create admin if first time
          </div>
        )}
        
        {/* Status */}
        <div style={{ 
          marginTop: '20px', 
          fontSize: '0.85em', 
          color: '#888',
          textAlign: 'center'
        }}>
          {allUsers && allUsers.length > 0 && (
            <span>{allUsers.length} users registered</span>
          )}
        </div>
      </form>
    </div>
  )
}