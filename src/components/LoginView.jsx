import { useState } from 'react'

export default function LoginView({ onLogin, onCreateAdmin, allUsers }) {
  const [loginNickname, setLoginNickname] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
          <button
            type="button"
            onClick={handleCreateAdmin}
            className="btn"
            style={{ marginTop: '10px' }}
            disabled={isLoading}
          >
            Create Admin Account
          </button>
        )}
        
        <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#888' }}>
          {allUsers && allUsers.length > 0 && (
            <p>Users: {allUsers.length}</p>
          )}
        </div>
      </form>
    </div>
  )
}