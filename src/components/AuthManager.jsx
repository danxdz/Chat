import { useState } from 'react'
import logger from '../utils/logger'

export default function AuthManager({ 
  onLogin, 
  onRegister,
  error,
  allUsers = []
}) {
  const [currentView, setCurrentView] = useState('login')
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [localError, setLocalError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setLocalError('Please enter a nickname')
      return
    }
    if (!pin) {
      setLocalError('Please enter your PIN')
      return
    }
    onLogin(nickname.trim(), pin)
  }

  const handleRegister = (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setLocalError('Please enter a nickname')
      return
    }
    if (nickname.trim().length < 2) {
      setLocalError('Nickname must be at least 2 characters')
      return
    }
    if (!pin || pin.length < 4) {
      setLocalError('PIN must be at least 4 characters')
      return
    }
    if (pin !== confirmPin) {
      setLocalError('PINs do not match')
      return
    }
    onRegister(nickname.trim(), pin)
  }

  const displayError = localError || error

  if (currentView === 'register') {
    return (
      <div className="screen">
        <form onSubmit={handleRegister} className="form">
          <h1>🚀 Create Account</h1>
          <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
            Join the decentralized chat network
          </p>
          
          <input
            type="text"
            placeholder="Choose a nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setLocalError('')
            }}
            maxLength={20}
            autoFocus
          />
          
          <input
            type="password"
            placeholder="Create a PIN (min 4 characters)"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setLocalError('')
            }}
          />
          
          <input
            type="password"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(e) => {
              setConfirmPin(e.target.value)
              setLocalError('')
            }}
          />
          
          {displayError && <div className="error">{displayError}</div>}
          
          <button type="submit" className="btn">
            Create Account
          </button>
          
          <button 
            type="button" 
            onClick={() => {
              setCurrentView('login')
              setLocalError('')
            }}
            className="btn"
            style={{ background: '#555', marginTop: '0.5rem' }}
          >
            Back to Login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="screen">
      <form onSubmit={handleLogin} className="form">
        <h1>🔐 Secure P2P Chat</h1>
        <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
          Decentralized • Encrypted • Private
        </p>
        
        {allUsers.length > 0 && (
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '0.5rem', 
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.8rem'
          }}>
            💡 {allUsers.length} user(s) registered locally
          </div>
        )}
        
        <input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setLocalError('')
          }}
          maxLength={20}
          autoFocus
        />
        
        <input
          type="password"
          placeholder="Enter your PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setLocalError('')
          }}
        />
        
        {displayError && <div className="error">{displayError}</div>}
        
        <button type="submit" className="btn">
          Login
        </button>
        
        <button 
          type="button" 
          onClick={() => {
            setCurrentView('register')
            setLocalError('')
          }}
          className="btn"
          style={{ background: '#28a745', marginTop: '0.5rem' }}
        >
          Create New Account
        </button>
      </form>
    </div>
  )
}