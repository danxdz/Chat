import { useState, useEffect } from 'react'
import { hashPIN, generateRandomNickname } from '../utils/crypto'
import { initStorage, encryptedSetItem } from '../utils/storage'
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
      console.log('🔐 Hashing PIN with sodium...')
      
      // Hash the PIN
      const hashedPIN = hashPIN(pin, sodium)
      
      if (!hashedPIN) {
        throw new Error('PIN hashing returned empty result')
      }
      
      console.log('✅ PIN hashed successfully')
      
      // Initialize encrypted storage with the user's PIN
      initStorage(sodium, pin)
      
      // Save admin data encrypted
      encryptedSetItem('userPIN', hashedPIN)
      encryptedSetItem('userNickname', nickname.trim())
      encryptedSetItem('isAdmin', true)
      encryptedSetItem('userAccountCreated', true)
      
      // Store admin existence flag in plaintext for initial check
      localStorage.setItem('adminAccountCreated', 'true')
      
      console.log('💾 Admin data saved encrypted')
      
      // Return user data
      const userData = {
        nickname: nickname.trim(),
        isAdmin: true,
        pin: pin // Keep for session
      }
      
      console.log('🎉 ADMIN ACCOUNT CREATED SUCCESSFULLY!')
      showToast('Admin account created!', 'success')
      
      onAdminCreated(userData)
      
    } catch (error) {
      console.error('❌ Failed to create admin account:', error)
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
            {loading ? 'Creating...' : 'Create Admin'}
          </button>
        </form>
        
        <div className="info-box">
          <p>👑 Administrator Privileges:</p>
          <ul>
            <li>Create invitation links for new users</li>
            <li>Manage all chat participants</li>
            <li>Full access to all features</li>
            <li>Encrypted data storage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminSetup