import { useState, useEffect } from 'react'
import { hashPIN, generateRandomNickname } from '../utils/crypto'
import './Screen.css'

function AdminSetup({ sodium, onAdminCreated, showToast }) {
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set random hacker nickname on load
    setNickname(generateRandomNickname())
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (loading) return
    
    console.log('🔥 CREATING ADMIN ACCOUNT...')
    console.log('Sodium available:', !!sodium)
    console.log('Nickname:', nickname)
    console.log('PIN length:', pin.length)
    
    // Validate
    if (!nickname.trim()) {
      showToast('❌ Please enter a nickname', 'error')
      return
    }
    
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      showToast('❌ PIN must be 4-6 digits', 'error')
      return
    }
    
    if (!sodium) {
      showToast('❌ Encryption not ready. Please refresh.', 'error')
      console.error('Sodium not available')
      return
    }
    
    setLoading(true)
    
    try {
      console.log('🔐 Hashing PIN with sodium...')
      
      // Create admin account
      const derived = hashPIN(pin, sodium)
      const hashedPIN = sodium.to_hex(derived)
      
      console.log('✅ PIN hashed successfully')
      console.log('Hashed PIN length:', hashedPIN.length)
      
      // Save admin data
      localStorage.setItem('userPIN', hashedPIN)
      localStorage.setItem('userNickname', nickname.trim())
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('adminAccountCreated', 'true')
      
      console.log('💾 Admin data saved to localStorage')
      console.log('localStorage check:', {
        userPIN: localStorage.getItem('userPIN') ? 'exists' : 'missing',
        userNickname: localStorage.getItem('userNickname'),
        isAdmin: localStorage.getItem('isAdmin'),
        adminAccountCreated: localStorage.getItem('adminAccountCreated')
      })
      
      // Return user data
      const userData = {
        nickname: nickname.trim(),
        isAdmin: true,
        pin: pin // Keep for session
      }
      
      console.log('🎉 ADMIN ACCOUNT CREATED SUCCESSFULLY!')
      showToast('🎉 Admin account created!', 'success')
      
      onAdminCreated(userData)
      
    } catch (error) {
      console.error('❌ Failed to create admin account:', error)
      showToast('❌ Failed to create account: ' + error.message, 'error')
      setLoading(false)
    }
  }

  const generateNewNickname = () => {
    setNickname(generateRandomNickname())
  }

  return (
    <div className="screen">
      <div className="container">
        <div className="header">
          <h1 className="terminal-glow">🔒 SECURE CHAT</h1>
          <p>ADMIN INITIALIZATION PROTOCOL</p>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="nickname">OPERATOR CALLSIGN</label>
            <div className="nickname-input">
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                required
              />
              <button
                type="button"
                className="btn secondary small"
                onClick={generateNewNickname}
                title="Generate random callsign"
              >
                🎲
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="pin">ACCESS CODE (4-6 DIGITS)</label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              minLength={4}
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn primary"
            disabled={loading}
          >
            {loading ? '⚡ INITIALIZING...' : '🚀 CREATE ADMIN'}
          </button>
        </form>
        
        <div className="info-box">
          <p>⚡ ADMIN PRIVILEGES:</p>
          <ul>
            <li>Generate secure invitation links</li>
            <li>Manage all system contacts</li>
            <li>Full access to encrypted channels</li>
            <li>System administration rights</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminSetup