import { useState, useEffect } from 'react'
import { hashPIN, generateRandomNickname } from '../utils/crypto'
import { initStorage, encryptedSetItem } from '../utils/storage'
import './Screen.css'

function UserSetup({ sodium, onUserCreated, showToast }) {
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
      
      // Create user account - handle both sync and async hashPIN
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
        console.error('hashPIN error:', error)
        showToast('Failed to hash PIN: ' + error.message, 'error')
        setLoading(false)
        return
      }
      
      console.log('✅ PIN hashed successfully')
      console.log('Hashed PIN length:', hashedPIN?.length || 'undefined')
      
      if (!hashedPIN) {
        throw new Error('PIN hashing returned empty result')
      }
      
      // Initialize encrypted storage with the user's PIN
      initStorage(sodium, pin)
      
      // Save user data encrypted
      encryptedSetItem('userPIN', hashedPIN)
      encryptedSetItem('userNickname', nickname.trim())
      encryptedSetItem('userAccountCreated', true)
      
      // Only store account existence flag in plaintext for initial check
      localStorage.setItem('hasAccount', 'true')
      
      console.log('💾 User data saved encrypted')
      
      // Return user data
      const userData = {
        nickname: nickname.trim(),
        pin: pin // Keep for session
      }
      
      console.log('🎉 USER ACCOUNT CREATED SUCCESSFULLY!')
      showToast('Account created!', 'success')
      
      onUserCreated(userData)
      
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
          <h1>🔒 Secure Chat</h1>
          <p>Create your account</p>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="nickname">Nickname</label>
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
              placeholder="••••••"
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
          <p>🔒 Security Features:</p>
          <ul>
            <li>End-to-end encrypted messaging</li>
            <li>Encrypted local storage</li>
            <li>No data stored on servers</li>
            <li>Direct peer-to-peer connections</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UserSetup