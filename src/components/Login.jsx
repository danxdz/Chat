import { useState } from 'react'
import { hashPIN } from '../utils/crypto'
import { initStorage, encryptedGetItem } from '../utils/storage'
import './Screen.css'

function Login({ sodium, onLogin, showToast }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (loading) return
    
    if (!pin) {
      showToast('Please enter your PIN', 'error')
      return
    }
    
    if (!sodium) {
      showToast('Encryption not ready. Please refresh.', 'error')
      return
    }
    
    setLoading(true)
    
    try {
      // Initialize storage with the PIN attempt
      initStorage(sodium, pin)
      
      // Try to decrypt and verify PIN
      const storedPIN = encryptedGetItem('userPIN')
      
      if (!storedPIN) {
        showToast('Unable to decrypt user data. Check your PIN.', 'error')
        setLoading(false)
        return
      }
      
      // Verify PIN by comparing hashes
      const hashedPIN = hashPIN(pin, sodium)
      
      if (hashedPIN !== storedPIN) {
        showToast('Invalid PIN', 'error')
        setLoading(false)
        return
      }
      
      // Load user data from encrypted storage
      const nickname = encryptedGetItem('userNickname')
      const isAdmin = encryptedGetItem('isAdmin')
      const invitedBy = encryptedGetItem('invitedBy')
      
      if (!nickname) {
        showToast('Failed to load user data', 'error')
        setLoading(false)
        return
      }
      
      const userData = {
        nickname,
        isAdmin: !!isAdmin,
        invitedBy,
        pin // Keep for session
      }
      
      console.log('✅ Login successful:', { nickname, isAdmin: !!isAdmin, invitedBy })
      
      onLogin(userData)
      
    } catch (error) {
      console.error('Login failed:', error)
      showToast('Login failed. Check your PIN.', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className="container">
        <div className="header">
          <h1>🔒 Secure Chat</h1>
          <p>Enter your PIN</p>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="pin">PIN</label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              minLength={4}
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="Enter your PIN"
              autoFocus
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn primary"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login