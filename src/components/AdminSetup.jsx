import { useState, useEffect } from 'react'
import { hashPIN, generateRandomNickname } from '../utils/crypto'
import './Screen.css'

function AdminSetup({ sodium, onAdminCreated, showToast }) {
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set random nickname on load
    setNickname(generateRandomNickname())
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (loading) return
    
    console.log('Creating admin account...')
    console.log('Sodium available:', !!sodium)
    
    // Validate
    if (!nickname.trim()) {
      showToast('Enter a nickname', 'error')
      return
    }
    
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      showToast('PIN must be 4-6 digits', 'error')
      return
    }
    
    if (!sodium) {
      showToast('Encryption not ready. Please refresh.', 'error')
      console.error('Sodium not available')
      return
    }
    
    setLoading(true)
    
    try {
      console.log('Hashing PIN with sodium...')
      
      // Create admin account
      const derived = hashPIN(pin, sodium)
      const hashedPIN = sodium.to_hex(derived)
      
      console.log('PIN hashed successfully, length:', hashedPIN.length)
      
      // Save admin data
      localStorage.setItem('userPIN', hashedPIN)
      localStorage.setItem('userNickname', nickname.trim())
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('adminAccountCreated', 'true')
      
      console.log('Admin data saved to localStorage')
      
      // Return user data
      const userData = {
        nickname: nickname.trim(),
        isAdmin: true,
        pin: pin // Keep for session
      }
      
      console.log('Admin account created successfully!')
      showToast('Admin account created!', 'success')
      
      onAdminCreated(userData)
      
    } catch (error) {
      console.error('Failed to create admin account:', error)
      showToast('Failed to create account: ' + error.message, 'error')
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
          <h1>🔒 Secure Chat</h1>
          <p>Create administrator account</p>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="nickname">Display Name</label>
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
                title="Generate random name"
              >
                🎲
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="pin">PIN (4-6 digits)</label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              minLength={4}
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="Enter PIN"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn primary"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="info-box">
          <p>Administrator privileges:</p>
          <ul>
            <li>Create invitation links for new users</li>
            <li>Manage contact lists</li>
            <li>Full system access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminSetup