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

      // Generate and log magic link for first access
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      if (users.length === 0) {
        const magicToken = btoa(JSON.stringify({
          type: 'first_access',
          timestamp: Date.now(),
          admin: true
        }))
        const magicLink = `${window.location.origin}?invite=${magicToken}`
        
        console.log('🔑 MAGIC LINK FOR FIRST ACCESS:')
        console.log(magicLink)
        console.log('')
        console.log('📋 Copy this link to create the first account!')
        console.log('🎯 Or just add this to URL: ?invite=' + magicToken)
      }

      // Add dev helper to window
      window.generateMagicLink = () => {
        const magicToken = btoa(JSON.stringify({
          type: 'invitation',
          timestamp: Date.now(),
          from: 'admin'
        }))
        const magicLink = `${window.location.origin}?invite=${magicToken}`
        console.log('🔗 NEW MAGIC LINK:')
        console.log(magicLink)
        return magicLink
      }

      // Add WebRTC debugging helpers
      window.webrtcDebug = () => {
        console.log('🔍 Gun.js P2P Debug Info:')
        console.log('Gun instance:', window.Gun)
        console.log('Available peers:', window.Gun ? window.Gun._.opt.peers : 'Gun not initialized')
      }

      window.clearWebRTC = () => {
        localStorage.clear()
        if (window.Gun) {
          // Gun.js data is decentralized, but we can clear local storage
          console.log('🧹 Local data cleared, Gun.js network data persists')
        }
      }

      // Add test users creator
      window.createTestUsers = () => {
        const testUsers = [
          { id: 1001, nickname: 'Alice', pin: '1111' },
          { id: 1002, nickname: 'Bob', pin: '2222' },
          { id: 1003, nickname: 'Charlie', pin: '3333' },
          { id: 1004, nickname: 'Diana', pin: '4444' }
        ]
        
        localStorage.setItem('users', JSON.stringify(testUsers))
        
        // Add each user as contacts for others
        testUsers.forEach(user => {
          const contacts = testUsers.filter(u => u.id !== user.id)
          localStorage.setItem(`contacts_${user.id}`, JSON.stringify(contacts))
        })
        
        console.log('👥 Test users created:')
        console.log('Alice: PIN 1111')
        console.log('Bob: PIN 2222') 
        console.log('Charlie: PIN 3333')
        console.log('Diana: PIN 4444')
        console.log('All users have each other as contacts!')
        
        return testUsers
      }

      window.switchUser = (nickname) => {
        const users = JSON.parse(localStorage.getItem('users') || '[]')
        const user = users.find(u => u.nickname.toLowerCase() === nickname.toLowerCase())
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user))
          window.location.reload()
          console.log(`🔄 Switched to ${user.nickname}`)
        } else {
          console.log('❌ User not found. Available users:', users.map(u => u.nickname))
        }
      }

      // Check if user is logged in
      const savedUser = localStorage.getItem('currentUser')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
        setCurrentView('chat')
      } else {
        // Check if this is an invitation - use hash to avoid Vercel issues
        const hash = window.location.hash
        const invite = hash.includes('invite=') ? hash.split('invite=')[1] : null
        
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

      // Get invite data
      const hash = window.location.hash
      const inviteParam = hash.includes('invite=') ? hash.split('invite=')[1] : null
      let inviteData = null
      
      if (inviteParam) {
        try {
          // Restore URL-safe base64
          const restored = inviteParam
            .replace(/-/g, '+')
            .replace(/_/g, '/')
          const padded = restored + '='.repeat((4 - restored.length % 4) % 4)
          inviteData = JSON.parse(atob(padded))
        } catch (e) {
          console.log('Invalid invite format:', e)
        }
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

      // If this was an invite, automatically add the inviter as a contact
      if (inviteData && inviteData.from && inviteData.fromId) {
        const contacts = [{
          id: inviteData.fromId,
          nickname: inviteData.from,
          addedAt: Date.now()
        }]
        localStorage.setItem(`contacts_${newUser.id}`, JSON.stringify(contacts))
        
        // Also add this new user to the inviter's contacts (if we can find them)
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
        const inviter = allUsers.find(u => u.id === inviteData.fromId)
        if (inviter) {
          const inviterContacts = JSON.parse(localStorage.getItem(`contacts_${inviteData.fromId}`) || '[]')
          const existingContact = inviterContacts.find(c => c.nickname === newUser.nickname)
          if (!existingContact) {
            inviterContacts.push({
              id: newUser.id,
              nickname: newUser.nickname,
              addedAt: Date.now()
            })
            localStorage.setItem(`contacts_${inviteData.fromId}`, JSON.stringify(inviterContacts))
          }
        }
      }

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
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [showUserSwitcher, setShowUserSwitcher] = useState(false)
  const [gun, setGun] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(new Map())

  useEffect(() => {
    // Initialize Gun.js for decentralized P2P
    if (window.Gun) {
      console.log('🔫 Initializing Gun.js P2P network...')
      
      const gunInstance = Gun({
        peers: [
          'https://gun-manhattan.herokuapp.com/gun',
          'https://gun-us.herokuapp.com/gun'
        ],
        localStorage: false, // Use Gun's storage instead
        radisk: true,
        WebRTC: {
          off: false
        }
      })
      
      setGun(gunInstance)
      console.log('✅ Gun.js P2P network initialized')
    }
  }, [])

  useEffect(() => {
    if (!gun) return

    // Load contacts and messages
    const savedContacts = JSON.parse(localStorage.getItem(`contacts_${user.id}`) || '[]')
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    setContacts(savedContacts)
    setAllUsers(users)

    // Subscribe to real-time messages for this user
    gun.get(`chat_${user.id}`).map().on((messageData, messageKey) => {
      if (messageData && messageData.id && messageData.text) {
        console.log('📨 Received P2P message:', messageData)
        
        setMessages(prev => {
          // Avoid duplicates
          const exists = prev.find(m => m.id === messageData.id)
          if (exists) return prev
          
          const updated = [...prev, messageData].sort((a, b) => a.timestamp - b.timestamp)
          // Also save to localStorage as backup
          localStorage.setItem(`messages_${user.id}`, JSON.stringify(updated))
          return updated
        })
      }
    })

    // Load existing messages from localStorage
    const savedMessages = JSON.parse(localStorage.getItem(`messages_${user.id}`) || '[]')
    setMessages(savedMessages)

    // Initialize connections with contacts
    savedContacts.forEach(contact => {
      setConnectionStatus(prev => new Map(prev.set(contact.id, 'connected')))
      console.log(`🟢 Gun.js P2P connection with ${contact.nickname}`)
    })

  }, [gun, user.id])

  const sendP2PMessage = async (message) => {
    if (!gun) {
      console.log('❌ Gun.js not initialized')
      return false
    }

    try {
      // Send to specific contact's chat channel
      if (activeContact) {
        const contactChatKey = `chat_${activeContact.id}`
        await gun.get(contactChatKey).set(message)
        console.log(`📤 P2P message sent to ${activeContact.nickname} via Gun.js`)
      } else {
        // Send to general chat - broadcast to all users
        const generalChatKey = 'general_chat'
        await gun.get(generalChatKey).set(message)
        console.log('📤 P2P message sent to general chat via Gun.js')
        
        // Also send to each user's personal channel
        const users = JSON.parse(localStorage.getItem('users') || '[]')
        users.forEach(async (u) => {
          if (u.id !== user.id) {
            await gun.get(`chat_${u.id}`).set(message)
          }
        })
      }
      return true
    } catch (error) {
      console.error('❌ Failed to send P2P message:', error)
      return false
    }
  }

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const messagesDiv = document.getElementById('messages-container')
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  }, [messages, activeContact])

  const generateInvite = () => {
    // Use simple, safe encoding to avoid Vercel redirects
    const inviteData = {
      from: user.nickname, 
      fromId: user.id,
      timestamp: Date.now()
    }
    
    // Use URL-safe base64 encoding
    const invite = btoa(JSON.stringify(inviteData))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    const link = `${window.location.origin}#invite=${invite}`
    setInviteLink(link)
    setShowInvite(true)
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink)
    alert('Invite link copied!')
  }

  const switchToUser = (targetUser) => {
    localStorage.setItem('currentUser', JSON.stringify(targetUser))
    window.location.reload()
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message = {
      id: Date.now(),
      from: user.nickname,
      fromId: user.id,
      to: activeContact?.nickname || 'General',
      toId: activeContact?.id || 'general',
      text: newMessage.trim(),
      timestamp: Date.now()
    }

    // Save to current user's messages locally as backup
    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    localStorage.setItem(`messages_${user.id}`, JSON.stringify(updatedMessages))

    // Send via Gun.js P2P network
    sendP2PMessage(message)

    setNewMessage('')
  }

  const addContact = () => {
    const nickname = prompt('Enter contact nickname:')
    if (!nickname) return

    const newContact = {
      id: Date.now(),
      nickname: nickname.trim()
    }

    const updatedContacts = [...contacts, newContact]
    setContacts(updatedContacts)
    localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updatedContacts))
    
    // Set connection status for new contact
    setConnectionStatus(prev => new Map(prev.set(newContact.id, 'connected')))
  }

  const filteredMessages = activeContact 
    ? messages.filter(m => 
        (m.fromId === user.id && m.toId === activeContact.id) ||
        (m.fromId === activeContact.id && m.toId === user.id)
      )
    : messages.filter(m => m.toId === 'general')

  useEffect(() => {
    // Load messages from all users for general chat
    if (!activeContact) {
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
      let allGeneralMessages = []
      
      allUsers.forEach(u => {
        const userMessages = JSON.parse(localStorage.getItem(`messages_${u.id}`) || '[]')
        const generalMessages = userMessages.filter(m => m.toId === 'general')
        allGeneralMessages = [...allGeneralMessages, ...generalMessages]
      })
      
      // Sort by timestamp and remove duplicates
      allGeneralMessages.sort((a, b) => a.timestamp - b.timestamp)
      const uniqueMessages = allGeneralMessages.filter((msg, index, arr) => 
        index === arr.findIndex(m => m.id === msg.id)
      )
      
      setMessages(prev => {
        const combined = [...prev.filter(m => m.toId !== 'general'), ...uniqueMessages]
        return combined.sort((a, b) => a.timestamp - b.timestamp)
      })
    }
  }, [activeContact, user.id])

  return (
    <div className="app">
      {/* Header */}
      <div style={{ 
        padding: '1rem', 
        background: '#2d2d2d', 
        borderBottom: '1px solid #555',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              style={{
                background: '#444',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              👤 {user.nickname} ▼
            </button>
            
            {showUserSwitcher && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                zIndex: 1000,
                minWidth: '150px',
                marginTop: '0.25rem'
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #555', fontSize: '0.8rem', color: '#888' }}>
                  Switch User:
                </div>
                {allUsers.filter(u => u.id !== user.id).map(u => (
                  <button
                    key={u.id}
                    onClick={() => switchToUser(u)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      padding: '0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#444'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    👤 {u.nickname}
                  </button>
                ))}
                <div style={{ padding: '0.5rem', borderTop: '1px solid #555' }}>
                  <button
                    onClick={() => {
                      window.createTestUsers()
                      setShowUserSwitcher(false)
                      setTimeout(() => window.location.reload(), 100)
                    }}
                    style={{
                      width: '100%',
                      background: '#0066cc',
                      border: 'none',
                      color: 'white',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ➕ Create Test Users
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <span style={{ color: '#888' }}>
            {activeContact ? `Chat with ${activeContact.nickname}` : 'General Chat'}
          </span>
        </div>
        <div>
          <button 
            onClick={() => setShowInvite(!showInvite)} 
            className="btn" 
            style={{ marginRight: '1rem', background: '#0066cc', padding: '0.5rem 1rem' }}
          >
            📤 Invite
          </button>
          <button 
            onClick={onLogout} 
            className="btn" 
            style={{ background: '#dc3545', padding: '0.5rem 1rem' }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Sidebar */}
        <div style={{ 
          width: '250px', 
          background: '#333', 
          borderRight: '1px solid #555',
          padding: '1rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Contacts</h3>
          
          <div 
            onClick={() => setActiveContact(null)}
            style={{
              padding: '0.75rem',
              background: !activeContact ? '#0066cc' : '#444',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '0.5rem',
              color: '#fff'
            }}
          >
            💬 General Chat
          </div>

          {contacts.map(contact => {
            const status = connectionStatus.get(contact.id) || 'disconnected'
            const statusIcon = status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴'
            
            return (
              <div 
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                style={{
                  padding: '0.75rem',
                  background: activeContact?.id === contact.id ? '#0066cc' : '#444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>👤 {contact.nickname}</span>
                <span title={`WebRTC: ${status}`}>{statusIcon}</span>
              </div>
            )
          })}

          <button 
            onClick={addContact}
            className="btn"
            style={{ width: '100%', marginTop: '1rem', background: '#28a745' }}
          >
            ➕ Add Contact
          </button>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <div 
            id="messages-container"
            style={{ 
              flex: 1, 
              padding: '1rem', 
              overflowY: 'auto',
              background: '#1a1a1a'
            }}
          >
            {filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>
                No messages yet. Start the conversation!
              </div>
            ) : (
              filteredMessages.map(message => (
                <div key={message.id} style={{ 
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: message.fromId === user.id ? '#0066cc' : '#444',
                  borderRadius: '8px',
                  maxWidth: '70%',
                  marginLeft: message.fromId === user.id ? 'auto' : '0',
                  marginRight: message.fromId === user.id ? '0' : 'auto'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.25rem' }}>
                    {message.from} • {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  <div>{message.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} style={{ 
            padding: '1rem', 
            background: '#2d2d2d',
            borderTop: '1px solid #555',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${activeContact?.nickname || 'everyone'}...`}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #555',
                borderRadius: '4px',
                background: '#333',
                color: 'white',
                fontSize: '1rem'
              }}
            />
            <button 
              type="submit" 
              className="btn"
              style={{ background: '#0066cc', padding: '0.75rem 1.5rem' }}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2d2d2d',
            padding: '2rem',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h2 style={{ margin: '0 0 1rem 0' }}>🔗 Invite Someone</h2>
            
            {!inviteLink ? (
              <button onClick={generateInvite} className="btn" style={{ width: '100%' }}>
                Generate Invite Link
              </button>
            ) : (
              <div>
                <p>Share this link to invite someone:</p>
                <div style={{
                  background: '#333',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginTop: '0.5rem',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace'
                }}>
                  {inviteLink}
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={copyInvite} className="btn" style={{ background: '#0066cc' }}>
                    📋 Copy Link
                  </button>
                  <button 
                    onClick={() => setShowInvite(false)} 
                    className="btn" 
                    style={{ background: '#666' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App// Fresh deployment Sat Aug  9 06:04:14 PM UTC 2025
// Force redeploy Sat Aug  9 09:48:10 PM UTC 2025
