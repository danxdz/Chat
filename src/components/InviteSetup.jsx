import { useState, useEffect } from 'react'
import { hashPIN, generateRandomNickname } from '../utils/crypto'
import { initStorage, encryptedSetItem } from '../utils/storage'
import { validateMagicLink, consumeMagicLink } from '../utils/magicLinks'
import './Screen.css'

function InviteSetup({ sodium, onComplete, showToast }) {
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [validationResult, setValidationResult] = useState(null)

  useEffect(() => {
    // Set random nickname on load
    setNickname(generateRandomNickname())
    
    // Validate magic link from URL
    const urlParams = new URLSearchParams(window.location.search)
    const inviteToken = urlParams.get('invite')
    
    if (inviteToken) {
      console.log('📧 Validating magic link...')
      
      const result = validateMagicLink(inviteToken)
      setValidationResult(result)
      
      if (result.valid) {
        setInviteData(result.inviteData)
        console.log('✅ Magic link is valid:', result.inviteData)
        showToast('Valid invitation found!', 'success')
      } else {
        console.error('❌ Magic link validation failed:', result.error)
        showToast(`Invalid invitation: ${result.error}`, 'error')
      }
    } else {
      setValidationResult({ valid: false, error: 'No invitation token in URL' })
      showToast('No invitation found in URL', 'error')
    }
  }, [showToast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (loading) return
    
    if (!validationResult?.valid || !inviteData) {
      showToast('Invalid or expired invitation', 'error')
      return
    }
    
    console.log('Creating invited user account...')
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
      
      // Consume the magic link (mark as used)
      const consumed = consumeMagicLink(validationResult.linkId, nickname.trim())
      
      if (!consumed) {
        throw new Error('Failed to consume magic link - may already be used')
      }
      
      console.log('🔒 Magic link consumed successfully')
      
      // Save user data encrypted
      encryptedSetItem('userPIN', hashedPIN)
      encryptedSetItem('userNickname', nickname.trim())
      encryptedSetItem('userAccountCreated', true)
      encryptedSetItem('invitedBy', inviteData.createdBy)
      encryptedSetItem('inviteToken', inviteData.id)
      encryptedSetItem('inviteUsedAt', Date.now())
      
      console.log('💾 User data saved encrypted')
      
      // Return user data
      const userData = {
        nickname: nickname.trim(),
        invitedBy: inviteData.createdBy,
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

  if (!validationResult) {
    return (
      <div className="screen">
        <div className="container">
          <div className="header">
            <h1>🔄 Validating Invitation</h1>
            <p>Checking magic link...</p>
          </div>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (!validationResult.valid) {
    return (
      <div className="screen">
        <div className="container">
          <div className="header">
            <h1>❌ Invalid Invitation</h1>
            <p>{validationResult.error}</p>
          </div>
          <div className="form">
            <div className="info-box error">
              <p>🚫 Common Issues:</p>
              <ul>
                <li>This invitation may have already been used</li>
                <li>The invitation may have expired</li>
                <li>The link may have been corrupted</li>
                <li>You may need a fresh invitation link</li>
              </ul>
            </div>
            <button 
              className="btn primary"
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
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