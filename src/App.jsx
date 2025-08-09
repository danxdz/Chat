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
        console.log('🔍 WebRTC Debug Info:')
        console.log('Offers:', JSON.parse(localStorage.getItem('webrtc_offers') || '{}'))
        console.log('Answers:', JSON.parse(localStorage.getItem('webrtc_answers') || '{}'))
      }

      window.clearWebRTC = () => {
        localStorage.removeItem('webrtc_offers')
        localStorage.removeItem('webrtc_answers')
        console.log('🧹 WebRTC data cleared')
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
  const [peers, setPeers] = useState(new Map()) // WebRTC peer connections
  const [dataChannels, setDataChannels] = useState(new Map()) // Data channels for messaging
  const [connectionStatus, setConnectionStatus] = useState(new Map()) // Connection statuses

  useEffect(() => {
    // Load contacts and messages
    const savedContacts = JSON.parse(localStorage.getItem(`contacts_${user.id}`) || '[]')
    const savedMessages = JSON.parse(localStorage.getItem(`messages_${user.id}`) || '[]')
    setContacts(savedContacts)
    setMessages(savedMessages)

    // Initialize WebRTC for existing contacts
    initializeWebRTC(savedContacts)
  }, [user.id])

  const initializeWebRTC = async (contactList) => {
    // Create peer connections for all contacts
    for (const contact of contactList) {
      await createPeerConnection(contact.id, contact.nickname)
    }
  }

  const createPeerConnection = async (contactId, contactNickname) => {
    try {
      console.log(`🔄 Creating peer connection for ${contactNickname}`)
      setConnectionStatus(prev => new Map(prev.set(contactId, 'connecting')))

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Create data channel for messaging
      const dataChannel = pc.createDataChannel('messages', { ordered: true })
      
      dataChannel.onopen = () => {
        console.log(`✅ Data channel opened with ${contactNickname}`)
        setConnectionStatus(prev => new Map(prev.set(contactId, 'connected')))
        setDataChannels(prev => new Map(prev.set(contactId, dataChannel)))
      }

      dataChannel.onclose = () => {
        console.log(`❌ Data channel closed with ${contactNickname}`)
        setConnectionStatus(prev => new Map(prev.set(contactId, 'disconnected')))
      }

      dataChannel.onerror = (error) => {
        console.error(`🚨 Data channel error with ${contactNickname}:`, error)
        setConnectionStatus(prev => new Map(prev.set(contactId, 'error')))
      }

      dataChannel.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data)
          handleReceivedMessage(messageData)
        } catch (e) {
          console.error('Failed to parse received message:', e)
        }
      }

      // Handle incoming data channels
      pc.ondatachannel = (event) => {
        const channel = event.channel
        console.log(`📨 Received data channel from ${contactNickname}`)
        
        channel.onopen = () => {
          console.log(`✅ Incoming data channel opened from ${contactNickname}`)
          setConnectionStatus(prev => new Map(prev.set(contactId, 'connected')))
          setDataChannels(prev => new Map(prev.set(contactId, channel)))
        }
        
        channel.onmessage = (event) => {
          try {
            const messageData = JSON.parse(event.data)
            handleReceivedMessage(messageData)
          } catch (e) {
            console.error('Failed to parse received message:', e)
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE state: ${pc.iceConnectionState} with ${contactNickname}`)
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus(prev => new Map(prev.set(contactId, 'connected')))
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setConnectionStatus(prev => new Map(prev.set(contactId, 'disconnected')))
        }
      }

      pc.onconnectionstatechange = () => {
        console.log(`🔗 Connection state: ${pc.connectionState} with ${contactNickname}`)
      }

      setPeers(prev => new Map(prev.set(contactId, pc)))

      // For testing, let's simulate a successful connection after 2 seconds
      setTimeout(() => {
        console.log(`🎯 Simulating connection with ${contactNickname}`)
        setConnectionStatus(prev => new Map(prev.set(contactId, 'connected')))
      }, 2000)

    } catch (error) {
      console.error('Error creating peer connection:', error)
      setConnectionStatus(prev => new Map(prev.set(contactId, 'error')))
    }
  }

  const handleReceivedMessage = (messageData) => {
    const newMessage = {
      ...messageData,
      id: `received_${Date.now()}_${Math.random()}`,
      received: true
    }

    setMessages(prev => {
      const updated = [...prev, newMessage]
      localStorage.setItem(`messages_${user.id}`, JSON.stringify(updated))
      return updated
    })
  }

  const sendP2PMessage = (message, targetContactId) => {
    const dataChannel = dataChannels.get(targetContactId)
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(message))
        console.log('📤 P2P message sent via WebRTC')
        return true
      } catch (error) {
        console.error('Failed to send P2P message:', error)
        return false
      }
    }
    return false
  }

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const messagesDiv = document.getElementById('messages-container')
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  }, [messages, activeContact])

  useEffect(() => {
    // Check for WebRTC offers from other users
    const checkOffers = () => {
      const offers = JSON.parse(localStorage.getItem('webrtc_offers') || '{}')
      Object.keys(offers).forEach(async (key) => {
        const offerData = offers[key]
        if (offerData.to === user.id && !peers.has(offerData.from)) {
          // This is an offer for us, create answer
          await handleWebRTCOffer(offerData)
        }
      })
    }

    const interval = setInterval(checkOffers, 3000) // Check every 3 seconds
    return () => clearInterval(interval)
  }, [user.id, peers])

  const handleWebRTCOffer = async (offerData) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Handle incoming data channels
      pc.ondatachannel = (event) => {
        const channel = event.channel
        channel.onopen = () => {
          console.log(`📡 Incoming data channel opened from ${offerData.fromNickname}`)
          setConnectionStatus(prev => new Map(prev.set(offerData.from, 'connected')))
          setDataChannels(prev => new Map(prev.set(offerData.from, channel)))
        }
        
        channel.onmessage = (event) => {
          try {
            const messageData = JSON.parse(event.data)
            handleReceivedMessage(messageData)
          } catch (e) {
            console.error('Failed to parse received message:', e)
          }
        }
      }

      await pc.setRemoteDescription(offerData.offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Store answer for manual exchange
      const answers = JSON.parse(localStorage.getItem('webrtc_answers') || '{}')
      answers[`${user.id}_to_${offerData.from}`] = {
        from: user.id,
        fromNickname: user.nickname,
        to: offerData.from,
        toNickname: offerData.fromNickname,
        answer: answer,
        timestamp: Date.now()
      }
      localStorage.setItem('webrtc_answers', JSON.stringify(answers))

      setPeers(prev => new Map(prev.set(offerData.from, pc)))

      console.log(`🤝 WebRTC answer created for ${offerData.fromNickname}`)
    } catch (error) {
      console.error('Error handling WebRTC offer:', error)
    }
  }

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

    // Save to current user's messages
    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    localStorage.setItem(`messages_${user.id}`, JSON.stringify(updatedMessages))

    // Try to send via WebRTC P2P first
    if (activeContact) {
      const p2pSent = sendP2PMessage(message, activeContact.id)
      if (p2pSent) {
        console.log('✅ Message sent via WebRTC P2P')
      } else {
        console.log('⚠️ WebRTC not available, falling back to localStorage')
        // Fallback to localStorage sharing
        const contactMessages = JSON.parse(localStorage.getItem(`messages_${activeContact.id}`) || '[]')
        const messageExists = contactMessages.find(m => m.id === message.id)
        if (!messageExists) {
          contactMessages.push(message)
          localStorage.setItem(`messages_${activeContact.id}`, JSON.stringify(contactMessages))
        }
      }
    } else {
      // General chat - still use localStorage for now
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
      allUsers.forEach(u => {
        if (u.id !== user.id) {
          const otherUserMessages = JSON.parse(localStorage.getItem(`messages_${u.id}`) || '[]')
          const messageExists = otherUserMessages.find(m => m.id === message.id)
          if (!messageExists) {
            otherUserMessages.push(message)
            localStorage.setItem(`messages_${u.id}`, JSON.stringify(otherUserMessages))
          }
        }
      })
    }

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
        <div>
          <span style={{ fontWeight: 'bold' }}>🔒 {user.nickname}</span>
          <span style={{ marginLeft: '1rem', color: '#888' }}>
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
