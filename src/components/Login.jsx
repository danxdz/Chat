import { useState } from 'react'
import { hashPIN } from '../utils/crypto'
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
      // Verify PIN - handle both sync and async hashPIN
      let hashedPIN
      try {
        const result = hashPIN(pin, sodium)
        // Check if result is a Promise (async fallback)
        if (result && typeof result.then === 'function') {
          hashedPIN = await result
        } else {
          hashedPIN = result
        }
      } catch (error) {
        console.error('hashPIN error during login:', error)
        showToast('Failed to verify PIN: ' + error.message, 'error')
        setLoading(false)
        return
      }
      
      const storedPIN = localStorage.getItem('userPIN')
      
      if (hashedPIN !== storedPIN) {
        showToast('Invalid PIN', 'error')
        setLoading(false)
        return
      }
      
      // Load user data
      const nickname = localStorage.getItem('userNickname')
      const isAdmin = localStorage.getItem('isAdmin') === 'true'
      
      const userData = {
        nickname,
        isAdmin,
        pin // Keep for session
      }
      
      onLogin(userData)
      
    } catch (error) {
      console.error('Login failed:', error)
      showToast('Login failed', 'error')
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