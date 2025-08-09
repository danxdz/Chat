import { useState, useEffect } from 'react'
import { hashPIN, generateRandomNickname } from '../utils/crypto'
import { initStorage, encryptedSetItem } from '../utils/storage'
import './Screen.css'

function InviteSetup({ sodium, onComplete, showToast }) {
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set random nickname only once on mount
    setNickname(generateRandomNickname())
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (loading) return
    
    console.log('Creating user account...')
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
      console.log('🔐 Hashing PIN with sodium...')
      
      // Hash the PIN
      const hashedPIN = hashPIN(pin, sodium)
      
      if (!hashedPIN) {
        throw new Error('PIN hashing returned empty result')
      }
      
      console.log('✅ PIN hashed successfully')
      
      // Initialize encrypted storage with the user's PIN
      initStorage(sodium, pin)
      
      console.log('🔒 Storage initialized successfully')
      
      // Save user data encrypted
      encryptedSetItem('userPIN', hashedPIN)
      encryptedSetItem('userNickname', nickname.trim())
      encryptedSetItem('userAccountCreated', true)
      encryptedSetItem('invitedBy', 'Magic Link')
      encryptedSetItem('accountCreatedAt', Date.now())
      
      console.log('💾 User data saved encrypted')
      
      // Return user data
      const userData = {
        nickname: nickname.trim(),
        invitedBy: 'Magic Link',
        pin: pin // Keep for session
      }
      
      console.log('🎉 USER ACCOUNT CREATED SUCCESSFULLY!')
      showToast('Account created successfully!', 'success')
      
      // Clear invite from URL
      window.history.replaceState({}, document.title, window.location.pathname)
      
      onComplete(userData)
      
    } catch (error) {
      console.error('❌ Failed to create user account:', error)
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
          <h1>🎉 Welcome!</h1>
          <p>Join the secure chat</p>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="nickname">Your Nickname</label>
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
                title="Generate random nickname"
              >
                🎲
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="pin">Create PIN (4-6 digits)</label>
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
            {loading ? 'Creating Account...' : 'Join Chat'}
          </button>
        </form>
        
        <div className="info-box">
          <p>🔒 Secure Account:</p>
          <ul>
            <li>Your data will be encrypted locally</li>
            <li>PIN protects your account</li>
            <li>All messages end-to-end encrypted</li>
            <li>No data stored on servers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default InviteSetup