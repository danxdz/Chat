import { useState, useEffect } from 'react'

function App() {
  const [currentView, setCurrentView] = useState('loading')
  const [sodium, setSodium] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    try {
      // Wait for libsodium to load and create sodium wrapper
      let attempts = 0
      while (!window.libsodium && !window.sodium && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      let sodium = window.sodium || window.libsodium
      if (!sodium) {
        setError('Sodium library not loaded after 5 seconds')
        return
      }

      // If we have libsodium, wait for it to be ready
      if (sodium.ready) {
        await sodium.ready
      }
      
      // Create a simple wrapper if needed
      if (!sodium.randombytes_buf && sodium.randomBytes) {
        sodium.randombytes_buf = sodium.randomBytes
      }
      
      setSodium(sodium)

      // Check if user is logged in
      const savedUser = localStorage.getItem('currentUser')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
        setCurrentView('chat')
      } else {
        // Check if this is an invitation
        const urlParams = new URLSearchParams(window.location.search)
        const invite = urlParams.get('invite')
        
        if (invite) {
          setCurrentView('register')
        } else {
          setCurrentView('login')
        }
      }
    } catch (err) {
      setError('Failed to initialize: ' + err.message)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('currentUser', JSON.stringify(userData))
    setCurrentView('chat')
  }

  const handleRegister = (userData) => {
    setUser(userData)
    localStorage.setItem('currentUser', JSON.stringify(userData))
    setCurrentView('chat')
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('currentUser')
    setCurrentView('login')
  }

  if (currentView === 'loading') {
    return (
      <div className="screen">
        <div className="form">
          <h1>Loading...</h1>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    )
  }

  if (currentView === 'login') {
    return <LoginScreen onLogin={handleLogin} sodium={sodium} />
  }

  if (currentView === 'register') {
    return <RegisterScreen onRegister={handleRegister} sodium={sodium} />
  }

  if (currentView === 'chat') {
    return <ChatScreen user={user} onLogout={handleLogout} />
  }

  return null
}

function LoginScreen({ onLogin, sodium }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get saved user data
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      
      if (users.length === 0) {
        setError('No users found. You need an invitation to register.')
        setLoading(false)
        return
      }

      // Simple PIN check (in real app, use proper hashing)
      const user = users.find(u => u.pin === pin)
      
      if (!user) {
        setError('Invalid PIN')
        setLoading(false)
        return
      }

      onLogin(user)
    } catch (err) {
      setError('Login failed: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <form className="form" onSubmit={handleSubmit}>
        <h1>🔒 Login</h1>
        
        <div className="input-group">
          <label>PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter your PIN"
            required
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && <div className="error">{error}</div>}
      </form>
    </div>
  )
}

function RegisterScreen({ onRegister, sodium }) {
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!nickname.trim()) {
        setError('Nickname is required')
        setLoading(false)
        return
      }

      if (pin.length < 4) {
        setError('PIN must be at least 4 digits')
        setLoading(false)
        return
      }

      // Save user
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      const newUser = {
        id: Date.now(),
        nickname: nickname.trim(),
        pin: pin // In real app, hash this
      }

      users.push(newUser)
      localStorage.setItem('users', JSON.stringify(users))

      onRegister(newUser)
    } catch (err) {
      setError('Registration failed: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <form className="form" onSubmit={handleSubmit}>
        <h1>🎉 Register</h1>
        
        <div className="input-group">
          <label>Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            required
          />
        </div>

        <div className="input-group">
          <label>PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Create a PIN"
            required
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        {error && <div className="error">{error}</div>}
      </form>
    </div>
  )
}

function ChatScreen({ user, onLogout }) {
  const [inviteLink, setInviteLink] = useState('')

  const generateInvite = () => {
    const invite = btoa(JSON.stringify({ from: user.nickname, timestamp: Date.now() }))
    const link = `${window.location.origin}?invite=${invite}`
    setInviteLink(link)
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink)
    alert('Invite link copied!')
  }

  return (
    <div className="app">
      <div style={{ padding: '1rem', background: '#2d2d2d', borderBottom: '1px solid #555' }}>
        <span>Welcome, {user.nickname}!</span>
        <button onClick={onLogout} style={{ float: 'right', background: '#ff6b6b' }} className="btn">
          Logout
        </button>
      </div>
      
      <div style={{ padding: '2rem' }}>
        <h2>Chat Interface</h2>
        <p>Chat functionality will be implemented here.</p>
        
        <div style={{ marginTop: '2rem' }}>
          <button onClick={generateInvite} className="btn">
            Generate Invite Link
          </button>
          
          {inviteLink && (
            <div style={{ marginTop: '1rem' }}>
              <p>Share this link to invite others:</p>
              <div style={{ 
                background: '#333', 
                padding: '1rem', 
                borderRadius: '4px', 
                marginTop: '0.5rem',
                wordBreak: 'break-all'
              }}>
                {inviteLink}
              </div>
              <button onClick={copyInvite} className="btn" style={{ marginTop: '0.5rem' }}>
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App// Fresh deployment Sat Aug  9 06:04:14 PM UTC 2025
