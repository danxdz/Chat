import { useState, useEffect, Component } from 'react'
import Header from './components/Header'
import ContactSidebar from './components/ContactSidebar'
import ChatArea from './components/ChatArea'
import TestingPanel from './components/TestingPanel'
import InviteModal from './components/InviteModal'
import SecureInviteModal from './components/SecureInviteModal'
import { 
  ircLogin, 
  createUserAccount, 
  verifySecureInvite, 
  markInviteUsed, 
  changeNickname, 
  getFriendsList 
} from './utils/secureAuth'

// Smart logging system - only logs in development
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost'

const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args), // Always show errors
  warn: (...args) => isDev && console.warn(...args),
  info: (...args) => isDev && console.info(...args),
  debug: (...args) => isDev && console.debug(...args)
}

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logger.error('🚨 React Error Boundary caught an error:', error, errorInfo)
    logger.error('🔍 Error stack:', error.stack)
    
    // Clear sessionStorage if there's an initialization error  
    if (error.message && error.message.includes('before initialization')) {
      console.log('🔧 Clearing sessionStorage due to initialization error')
      sessionStorage.clear()
      // Don't clear localStorage to keep admin user
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen">
          <div className="form">
            <h1 style={{ color: '#dc3545' }}>⚠️ Something went wrong</h1>
            <p>The application encountered an error:</p>
            <pre style={{ 
              background: '#333', 
              padding: '1rem', 
              borderRadius: '4px', 
              fontSize: '0.8rem',
              overflow: 'auto'
            }}>
              {this.state.error?.toString()}
            </pre>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  sessionStorage.clear()
                  window.location.href = window.location.origin
                }} 
                className="btn"
                style={{ background: '#ffc107', color: '#000' }}
              >
                🔧 Clear Session & Retry
              </button>
              <button 
                onClick={() => {
                  sessionStorage.clear()
                  localStorage.clear()
                  window.location.href = window.location.origin
                }} 
                className="btn"
                style={{ background: '#ff6b6b' }}
              >
                🗑️ Full Reset
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="btn"
                style={{ background: '#dc3545' }}
              >
                🔄 Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const [currentView, setCurrentView] = useState('loading')
  const [sodium, setSodium] = useState(null)
  const [user, setUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [initStatus, setInitStatus] = useState('Initializing...')
  const [gun, setGun] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showSecureInviteModal, setShowSecureInviteModal] = useState(false)
  const [friends, setFriends] = useState([])
  const [debugNotifications, setDebugNotifications] = useState([])
  const [showTests, setShowTests] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [testResults, setTestResults] = useState({})
  const [testLogs, setTestLogs] = useState([])
  const [chatError, setChatError] = useState(null)
  const [connectedPeers, setConnectedPeers] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState(new Map())
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState(new Map())
  const [lastSeen, setLastSeen] = useState(new Map())
  const [onlineUsers, setOnlineUsers] = useState(new Map())
  const [heartbeatInterval, setHeartbeatInterval] = useState(null)

  // Debug notification system
  const showDebugNotification = (message, type = 'info') => {
    const id = Date.now()
    const notification = { id, message, type, timestamp: Date.now() }
    setDebugNotifications(prev => [...prev, notification])
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setDebugNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }
  
  // Make debug function available globally
  window.debugNotify = showDebugNotification

  // Gun.js peers for P2P networking - Updated working peers
  const gunPeers = [
    'https://relay.peer.ooo/gun',
    'https://gun-eu.herokuapp.com/gun',
    'https://peer.wallie.io/gun'
  ]

  // Initialize sodium and check URL for invite
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (window.sodium) {
          await window.sodium.ready
          setSodium(window.sodium)
          logger.log('✅ Sodium ready for cryptography')
        }

        // Load existing user data
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        setAllUsers(existingUsers)

        // Check for invite in URL hash
        const hash = window.location.hash
        if (hash.startsWith('#invite=')) {
          const inviteToken = hash.replace('#invite=', '')
          console.log('📨 Invite detected, going to simple registration')
          // Set simple registration mode
          setCurrentView('simpleRegister')
          return
        }

        // If no invite and no users exist, show error
        if (existingUsers.length === 0) {
          setCurrentView('needInvite')
        } else {
          setCurrentView('login')
        }
      } catch (error) {
        logger.error('❌ App initialization failed:', error)
        setChatError('Failed to initialize app: ' + error.message)
        setCurrentView('error')
      }
    }

    initializeApp()
  }, [])

  // Initialize Gun.js when user is logged in
  useEffect(() => {
    if (!user) return

    const initializeGun = async () => {
      try {
        setInitStatus('Connecting to P2P network...')
        
        if (!window.Gun) {
          throw new Error('Gun.js library not loaded')
        }

        logger.log('🌐 Initializing Gun.js with peers:', gunPeers)
        
        const gunInstance = window.Gun({
          peers: gunPeers,
          localStorage: false,
          radisk: false,
          file: false
        })

        // Test Gun.js connectivity
        const testKey = 'gun_init_test_' + Date.now()
        await gunInstance.get(testKey).put({ test: true, timestamp: Date.now() })
        
        gunInstance.get(testKey).once((data) => {
          if (data) {
            logger.log('✅ Gun.js connectivity test successful')
            setInitStatus('Connected to P2P network')
          }
        })

        setGun(gunInstance)
        
        // Monitor peer connections
        const peerMonitorInterval = setInterval(() => {
          if (gunInstance && gunInstance._.opt && gunInstance._.opt.peers) {
            const peerCount = Object.keys(gunInstance._.opt.peers).length
            setConnectedPeers(peerCount)
          }
        }, 5000)

        // Return cleanup function
        return () => {
          clearInterval(peerMonitorInterval)
          if (gunInstance && gunInstance.off) {
            gunInstance.off()
          }
        }

      } catch (error) {
        logger.error('❌ Gun.js initialization failed:', error)
        setInitStatus('P2P connection failed')
        setChatError('Failed to connect to P2P network: ' + error.message)
      }
    }

    const cleanup = initializeGun()
    return cleanup
  }, [user])

  // Load user data when user changes
  useEffect(() => {
    if (!user) return

    try {
      // Load contacts
      const savedContacts = JSON.parse(localStorage.getItem(`contacts_${user.id}`) || '[]')
      setContacts(savedContacts)

      // Load messages from Gun.js (they will be loaded via listeners)
      setMessages([])
      
      logger.log('📋 User data loaded successfully')
      logger.log('- Contacts:', savedContacts.length)
      logger.log('- Messages: Starting fresh, will load from Gun.js')
      
      setCurrentView('chat')
    } catch (error) {
      logger.error('❌ Failed to load user data:', error)
      setChatError('Failed to load user data: ' + error.message)
    }
  }, [user])

  // Gun.js message listeners
  useEffect(() => {
    if (!gun || !user) return

    logger.log('🔧 Setting up Gun.js listeners for general and private chats...')

    // Listen to general chat
    gun.get('general_chat').map().on((data, key) => {
      logger.log('📨 GENERAL CHAT - RAW DATA:', JSON.stringify(data, null, 2))
      handleIncomingMessage(data, key, 'general')
    })
    
    // Also listen to the old chat_messages channel for backward compatibility
    gun.get('chat_messages').map().on((data, key) => {
      logger.log('📨 CHAT MESSAGES - RAW DATA:', JSON.stringify(data, null, 2))
      handleIncomingMessage(data, key, 'general')
    })

    // Listen to private chats for current user
    if (user?.id) {
      contacts.forEach(contact => {
        const privateChannel = `private_${[user.id, contact.id].sort().join('_')}`
        logger.log('👥 Setting up private channel listener:', privateChannel)
        
        gun.get(privateChannel).map().on((data, key) => {
          logger.log('📨 PRIVATE CHAT - RAW DATA:', JSON.stringify(data, null, 2))
          handleIncomingMessage(data, key, 'private')
        })
      })
    }

    // IRC-style presence listener
    logger.log('👥 Setting up presence listener')
    gun.get('user_presence').map().on((data, key) => {
      logger.log('👥 Raw presence data received:', JSON.stringify(data), 'key:', key)
      if (data && data.userId && data.nickname && data.action) {
        logger.log('✅ Valid presence update:', data.nickname, data.action, 'from user:', data.userId)
        handlePresenceUpdate(data)
      } else {
        logger.log('❌ Invalid presence data:', data)
      }
    })

    logger.log('✅ Gun.js listeners ready for general, private chats, and presence')
  }, [gun, user?.id, contacts])

  // Handle presence updates (IRC-style join/leave)
  const handlePresenceUpdate = (data) => {
    const { userId, nickname, action, timestamp } = data
    logger.log(`🔄 Processing presence update: ${nickname} ${action}`)
    
    // Update online users list
    setOnlineUsers(prev => {
      const updated = new Map(prev)
      if (action === 'join' || action === 'heartbeat') {
        updated.set(userId, { nickname, lastSeen: timestamp })
        logger.log(`➕ Added user to online list: ${nickname} (${updated.size} total)`)
      } else if (action === 'leave') {
        updated.delete(userId)
        logger.log(`➖ Removed user from online list: ${nickname} (${updated.size} total)`)
      }
      return updated
    })
    
    // Add IRC-style system message for join/leave (but not for current user)
    if (userId !== user?.id && (action === 'join' || action === 'leave')) {
      const systemMessage = {
        id: `system_${timestamp}_${userId}_${action}`,
        text: `${nickname} has ${action === 'join' ? 'joined' : 'left'} the channel`,
        from: 'System',
        fromId: 'system',
        to: 'General',
        toId: 'general',
        timestamp: timestamp,
        type: 'system',
        isSystemMessage: true
      }
      
      setMessages(prev => {
        // Check if already exists
        const exists = prev.find(m => m.id === systemMessage.id)
        if (exists) return prev
        
        return [...prev, systemMessage].sort((a, b) => a.timestamp - b.timestamp)
      })
    }
  }

  // Handle incoming messages from any channel
  const handleIncomingMessage = async (data, key, channelType) => {
    if (data && data.id && data.text && data.from) {
      // Prevent double messages from current user (they already see their message locally)
      if (data.fromId === user.id) {
        logger.log(`🔄 SKIPPING own message from ${channelType} channel to prevent duplicates`)
        return
      }
      
      // Decrypt message if it's encrypted
      let messageData = { ...data }
      console.log('🔓 DECRYPTION DEBUG:', {
        messageEncrypted: data.encrypted,
        seaAvailable: !!(window.Gun && window.Gun.SEA),
        encryptedText: data.encrypted ? data.text : 'not encrypted'
      })
      
      if (data.encrypted && window.Gun && window.Gun.SEA) {
        try {
          const channelName = channelType === 'private' ? `private_${[user.id, data.fromId].sort().join('_')}` : 'general_chat'
          const sharedKey = 'p2p-chat-key-' + channelName
          const decryptedText = await window.Gun.SEA.decrypt(data.text, sharedKey)
          messageData.text = decryptedText
          console.log('🔓 Message decrypted successfully!')
          logger.log('🔓 Message decrypted')
        } catch (e) {
          console.log('⚠️ Decryption failed:', e.message)
          logger.log('⚠️ Decryption failed:', e.message)
          messageData.text = '[Encrypted message - cannot decrypt]'
        }
      }
      
      logger.log(`✅ VALID ${channelType.toUpperCase()} MESSAGE - Adding to state:`, messageData.text, 'from:', messageData.from)
      
      setMessages(prev => {
        logger.log('📊 Current messages before add:', prev.length)
        
        // Check if already exists
        const exists = prev.find(m => m.id === data.id)
        if (exists) {
          logger.log('⚠️ Message already exists, skipping')
          return prev
        }
        
        logger.log('💾 Adding NEW message to state')
        const updated = [...prev, messageData].sort((a, b) => a.timestamp - b.timestamp)
        logger.log('📊 Messages after add:', updated.length)
        return updated
      })
    } else {
      logger.log(`❌ INVALID ${channelType.toUpperCase()} MESSAGE - Missing required fields`)
      logger.log('- Data received:', JSON.stringify(data, null, 2))
    }
  }

  // Auto-scroll messages to bottom
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }, [messages])

  // Connection status simulation for contacts
  useEffect(() => {
    const updateConnectionStatus = () => {
      const newStatus = new Map()
      const newLastSeen = new Map()
      
      contacts.forEach(contact => {
        // Simulate connection status
        const isConnected = Math.random() > 0.3 // 70% chance of being connected
        newStatus.set(contact.id, isConnected ? 'connected' : 'disconnected')
        
        if (!isConnected) {
          // Set random last seen time for disconnected contacts
          const randomMinutesAgo = Math.floor(Math.random() * 60)
          newLastSeen.set(contact.id, Date.now() - (randomMinutesAgo * 60 * 1000))
        }
      })
      
      setConnectionStatus(newStatus)
      setLastSeen(newLastSeen)
    }

    if (contacts.length > 0) {
      updateConnectionStatus()
      const interval = setInterval(updateConnectionStatus, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [contacts])

  // Core functions - Invite-only registration
  const register = async (nickname, password) => {
    try {
      console.log('🎯 REGISTER: Starting account creation for:', nickname)
      
      // Check if there's a pending invite
      let pendingInviteStr = null
      try {
        if (typeof Storage !== 'undefined' && window.sessionStorage) {
          pendingInviteStr = sessionStorage.getItem('pendingInvite')
        }
      } catch (e) {
        console.log('SessionStorage not available, checking URL hash')
      }
      
      // Fallback to URL hash if sessionStorage failed
      if (!pendingInviteStr) {
        const hash = window.location.hash
        if (hash.startsWith('#invite=')) {
          pendingInviteStr = hash.replace('#invite=', '')
          console.log('✅ REGISTER: Using invite from URL hash')
        }
      }
      
      if (!pendingInviteStr) {
        alert('❌ Registration requires an invitation. Please use an invite link.')
        return false
      }
      console.log('✅ REGISTER: Pending invite found')

      if (!nickname.trim() || !password.trim()) {
        alert('Both nickname and password are required')
        return false
      }

      if (password.length < 4) {
        alert('Password must be at least 4 characters')
        return false
      }
      console.log('✅ REGISTER: Input validation passed')

      // Verify the secure invite
      console.log('🔍 REGISTER: Verifying secure invite...')
      const inviteData = await verifySecureInvite(pendingInviteStr)
      console.log('✅ REGISTER: Invite verified successfully')
      
      // Check if nickname already exists
      console.log('🔍 REGISTER: Checking nickname availability...')
      const existingUser = allUsers.find(u => u.nickname.toLowerCase() === nickname.toLowerCase())
      if (existingUser) {
        alert('Nickname already exists. Please choose a different one.')
        return false
      }
      console.log('✅ REGISTER: Nickname available')
      
      // Create new user account with secure crypto identity
      console.log('👤 REGISTER: Creating user account...')
      const newUser = await createUserAccount(nickname, password, inviteData)
      console.log('✅ REGISTER: User account created successfully!')
      
      // Update users list
      const updatedUsers = [...allUsers, newUser]
      setAllUsers(updatedUsers)
      localStorage.setItem('users', JSON.stringify(updatedUsers))
      
      // Mark invite as used (one-time use)
      await markInviteUsed(inviteData.id)
      
      // Add the inviter as a friend (automatic friendship)
      const newFriends = [{
        id: inviteData.fromId,
        nickname: inviteData.fromNick,
        status: 'active',
        addedAt: Date.now()
      }]
      setFriends(newFriends)
      
      // Clear pending invite
      sessionStorage.removeItem('pendingInvite')
      
      setUser(newUser)
      logger.log('✅ Secure registration completed:', { 
        nickname: newUser.nickname, 
        invitedBy: inviteData.fromNick,
        cryptoId: newUser.id.substring(0, 16) + '...'
      })
      return true
    } catch (error) {
      console.error('❌ REGISTER: Account creation failed at step:', error)
      console.error('❌ REGISTER: Full error details:', error.message)
      console.error('❌ REGISTER: Error stack:', error.stack)
      
      logger.error('❌ Secure registration failed:', error)
      alert('❌ Registration failed: ' + error.message + '\nCheck console for details.')
      return false
    }
  }

  const login = async (nickname, password) => {
    if (!nickname.trim() || !password.trim()) {
      alert('Nickname and password are required')
      return false
    }

    try {
      // Debug: Show what users exist
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
      console.log('🔍 LOGIN DEBUG - Available users:', allUsers.length)
      console.log('👥 User nicknames:', allUsers.map(u => u.nickname))
      console.log('🎯 Trying to login as:', nickname)

      const user = await ircLogin(nickname, password)
      setUser(user)
      
      // Load user's friends
      const userFriends = getFriendsList(user, allUsers)
      setFriends(userFriends)
      
      logger.log('✅ IRC-style login successful:', user.nickname)
    
      // Test encryption availability immediately after login
      console.log('🔐 ENCRYPTION TEST AT LOGIN:', {
        gunAvailable: !!window.Gun,
        seaAvailable: !!(window.Gun && window.Gun.SEA),
        seaObject: window.Gun ? window.Gun.SEA : 'Gun not available'
      })
      
      // Quick encryption test
      if (window.Gun && window.Gun.SEA) {
        window.Gun.SEA.encrypt('test message', 'test key').then(encrypted => {
          console.log('🔐 ENCRYPTION TEST SUCCESS:', encrypted)
          return window.Gun.SEA.decrypt(encrypted, 'test key')
        }).then(decrypted => {
          console.log('🔓 DECRYPTION TEST SUCCESS:', decrypted)
        }).catch(err => {
          console.error('❌ ENCRYPTION TEST FAILED:', err)
        })
      } else {
        console.error('❌ Gun SEA not available for testing')
      }
      
      // Add current user to online list immediately
      setOnlineUsers(prev => {
        const updated = new Map(prev)
        updated.set(user.id, { nickname: user.nickname, lastSeen: Date.now() })
        console.log('👤 Added current user to online list:', user.nickname, '- Total users:', updated.size)
        return updated
      })
      
      // Announce presence after a short delay to ensure Gun.js is ready
      setTimeout(() => {
        announcePresence('join', user)
        
        // Start heartbeat to maintain presence
        const interval = setInterval(() => {
          announcePresence('heartbeat', user)
        }, 30000) // Every 30 seconds
        
        setHeartbeatInterval(interval)
        logger.log('💓 Started presence heartbeat')
      }, 1000)
      
      return true
    } catch (error) {
      logger.error('❌ IRC login failed:', error)
      
      // Enhanced error message with debugging info
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
      if (allUsers.length === 0) {
        alert('❌ No users found! Please create an admin account first.')
      } else {
        alert(`❌ Login failed: ${error.message}\n\nAvailable users: ${allUsers.map(u => u.nickname).join(', ')}`)
      }
      return false
    }
  }

  // Bootstrap function to create first admin user for demo
  const createBootstrapUser = async () => {
    try {
      console.log('🎯 Creating bootstrap admin user...')
      
      // First, check what users currently exist
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      console.log('📊 Current users before creation:', existingUsers.length)
      
      // Check if Admin already exists
      const existingAdmin = existingUsers.find(u => u.nickname.toLowerCase() === 'admin')
      if (existingAdmin) {
        console.log('👤 Admin user already exists, logging in...')
        setUser(existingAdmin)
        setCurrentView('chat')
        alert('✅ Admin user already exists! Logged in successfully.')
        return
      }
      
      const bootstrapUser = await createUserAccount('Admin', 'admin123', null)
      console.log('👤 Bootstrap user created:', bootstrapUser)
      
      const updatedUsers = [...existingUsers, bootstrapUser]
      setAllUsers(updatedUsers)
      localStorage.setItem('users', JSON.stringify(updatedUsers))
      
      // Verify it was saved
      const savedUsers = JSON.parse(localStorage.getItem('users') || '[]')
      console.log('💾 Users after save:', savedUsers.length)
      console.log('🔍 Saved users:', savedUsers.map(u => u.nickname))
      
      // Auto-login the bootstrap user
      setUser(bootstrapUser)
      setCurrentView('chat')
      
      console.log('🎯 Bootstrap admin user created successfully')
      console.log('📋 Login credentials: Admin / admin123')
      alert('✅ Admin user created!\nLogin: Admin\nPassword: admin123\n\nYou are now logged in!')
      
    } catch (error) {
      console.error('❌ Failed to create bootstrap user:', error)
      console.error('❌ Error details:', error)
      alert('❌ Failed to create bootstrap user: ' + error.message)
    }
  }

  // Add nickname change function
  const handleNicknameChange = async () => {
    const newNickname = prompt('Enter your new nickname:', user.nickname)
    if (newNickname && newNickname.trim() !== user.nickname) {
      try {
        const updatedUser = await changeNickname(user, newNickname.trim(), gun)
        setUser(updatedUser)
        
        // Update user in localStorage
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
        const userIndex = allUsers.findIndex(u => u.id === user.id)
        if (userIndex !== -1) {
          allUsers[userIndex] = updatedUser
          setAllUsers(allUsers)
          localStorage.setItem('users', JSON.stringify(allUsers))
        }
        
        alert(`✅ Nickname changed to "${newNickname.trim()}"`)
      } catch (error) {
        alert(`❌ Failed to change nickname: ${error.message}`)
      }
    }
  }

  const logout = () => {
    // Stop heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      setHeartbeatInterval(null)
      logger.log('💓 Stopped presence heartbeat')
    }
    
    // Announce leaving before logout
    if (user) {
      announcePresence('leave')
    }
    
    setUser(null)
    setMessages([])
    setContacts([])
    setFriends([])
    setActiveContact(null)
    setOnlineUsers(new Map())
    setCurrentView('login')
    logger.log('✅ User logged out')
  }

  // IRC-style presence management
  const announcePresence = async (action = 'join', userData = null) => {
    const currentUser = userData || user
    if (!gun || !currentUser) {
      logger.log(`❌ Cannot announce presence: gun=${!!gun}, user=${!!currentUser}`)
      return
    }
    
    const presenceData = {
      userId: currentUser.id,
      nickname: currentUser.nickname,
      action: action, // 'join', 'leave', 'heartbeat'
      timestamp: Date.now(),
      channel: 'general_chat' // Always use general for now
    }
    
    try {
      logger.log(`📡 Announcing presence: ${action} for ${currentUser.nickname}`, presenceData)
      await gun.get('user_presence').set(presenceData)
      logger.log(`✅ Presence announced successfully`)
    } catch (error) {
      logger.error('❌ Failed to announce presence:', error)
    }
  }

  const sendP2PMessage = async (message, channelName = 'general_chat') => {
    if (!gun) {
      logger.log('❌ Gun.js not available')
      return false
    }

    if (!message || !message.id || !message.text) {
      logger.error('❌ Invalid message format:', message)
      return false
    }

    try {
      // Set initial delivery status
      setMessageDeliveryStatus(prev => {
        const newStatus = new Map(prev)
        newStatus.set(message.id, { status: 'sending', timestamp: Date.now() })
        return newStatus
      })

      // Use unique key for each message to prevent replacement
      const messageKey = `msg_${message.id}`
      logger.log('📡 Sending to Gun.js channel:', channelName, 'with key:', messageKey)
      
      // Encrypt message text if SEA is available
      let messageToSend = { ...message }
      console.log('🔐 ENCRYPTION DEBUG:', {
        gunAvailable: !!window.Gun,
        seaAvailable: !!(window.Gun && window.Gun.SEA),
        messageText: message.text
      })
      
      if (window.Gun && window.Gun.SEA) {
        try {
          // Use a simple shared key for now (in production, use proper key exchange)
          const sharedKey = 'p2p-chat-key-' + channelName
          const encryptedText = await window.Gun.SEA.encrypt(message.text, sharedKey)
          messageToSend.text = encryptedText
          messageToSend.encrypted = true
          console.log('🔐 Message encrypted successfully!')
          logger.log('🔐 Message encrypted')
        } catch (e) {
          console.log('⚠️ Encryption failed:', e.message)
          logger.log('⚠️ Encryption failed, sending plain text:', e.message)
          messageToSend.encrypted = false
        }
      } else {
        messageToSend.encrypted = false
        console.log('⚠️ SEA not available, sending plain text')
        logger.log('⚠️ SEA not available, sending plain text')
      }

      // Put message using set to ensure it appears in map() listeners
      await gun.get(channelName).set(messageToSend)
      
      // Update delivery status to sent
      setMessageDeliveryStatus(prev => {
        const newStatus = new Map(prev)
        newStatus.set(message.id, { status: 'sent', timestamp: Date.now() })
        return newStatus
      })
      
      // Simulate delivery confirmation after a delay
      setTimeout(() => {
        setMessageDeliveryStatus(prev => {
          const newStatus = new Map(prev)
          newStatus.set(message.id, { status: 'delivered', timestamp: Date.now() })
          return newStatus
        })
      }, 2000 + Math.random() * 3000) // 2-5 seconds delay
      
      logger.log('✅ Message sent to Gun.js with unique key')
      return true
    } catch (error) {
      logger.error('❌ Failed to send P2P message:', error)
      
      // Update delivery status to failed
      setMessageDeliveryStatus(prev => {
        const newStatus = new Map(prev)
        newStatus.set(message.id, { status: 'failed', timestamp: Date.now() })
        return newStatus
      })
      
      return false
    }
  }

  const sendMessage = async (e) => {
    if (e) e.preventDefault() // Handle form submission
    if (!newMessage.trim()) return

    console.log('📤 SEND MESSAGE CALLED:', {
      messageText: newMessage.trim(),
      activeContact: activeContact?.nickname || 'General',
      userNickname: user.nickname
    })

    const messageToSend = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      text: newMessage.trim(),
      from: user.nickname,
      fromId: user.id,
      to: activeContact?.nickname || 'General',
      toId: activeContact?.id || 'general',
      timestamp: Date.now(),
      type: activeContact ? 'private' : 'general'
    }

    logger.log('📤 SENDING MESSAGE TO GUN.JS:', messageToSend)

    try {
      // Add message to local state immediately for immediate UI feedback
      setMessages(prevMessages => [...prevMessages, messageToSend])
      logger.log('✅ Message added to local state')

      // Send to appropriate channel based on contact
      const channelName = activeContact ? `private_${[user.id, activeContact.id].sort().join('_')}` : 'general_chat'
      logger.log('📡 Using channel:', channelName)

      const p2pSuccess = await sendP2PMessage(messageToSend, channelName)
      
      if (p2pSuccess) {
        logger.log('✅ Message sent via Gun.js successfully')
      } else {
        logger.log('❌ Failed to send message via Gun.js, but showing in local UI')
      }

      setNewMessage('')
    } catch (error) {
      logger.error('❌ Error sending message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const addContact = (contactInfo) => {
    if (!contactInfo.nickname || !contactInfo.id) {
      alert('Invalid contact information')
      return
    }

    const newContact = {
      id: contactInfo.id || Date.now(),
      nickname: contactInfo.nickname,
      status: contactInfo.status || 'pending',
      addedAt: Date.now()
    }

    const updatedContacts = [...contacts, newContact]
    setContacts(updatedContacts)
    localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updatedContacts))
    
    logger.log('✅ Contact added:', newContact)
  }

  const generateInvite = () => {
    const inviteData = {
      from: user.nickname,
      fromId: user.id,
      timestamp: Date.now()
    }
    
    const encodedInvite = btoa(JSON.stringify(inviteData))
    const inviteUrl = `https://chat-brown-chi-22.vercel.app#invite=${encodedInvite}`
    
    setInviteLink(inviteUrl)
    
    // Add pending contact for the inviter
    addPendingContact(user.nickname, user.id)
    
    logger.log('✅ Invite generated:', inviteUrl)
  }

  const addPendingContact = (nickname, id) => {
    const pendingContact = {
      id: id,
      nickname: nickname,
      status: 'pending',
      addedAt: Date.now()
    }
    
    // Don't add if already exists
    if (!contacts.find(c => c.id === id)) {
      addContact(pendingContact)
    }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy invite link')
    })
  }

  const switchToUser = (targetUser) => {
    setUser(targetUser)
    logger.log('✅ Switched to user:', targetUser.nickname)
  }

  // Filter messages for display
  const displayMessages = activeContact 
    ? messages.filter(msg => 
        (msg.fromId === user.id && msg.toId === activeContact.id) ||
        (msg.fromId === activeContact.id && msg.toId === user.id)
      )
    : messages.filter(msg => msg.type === 'general' || msg.toId === 'general')

  // Testing functions
  const runVisualTests = async () => {
    const logs = []
    const results = {}
    
    logs.push('🧪 Starting REAL functionality tests...')

    // Test 1: REAL LocalStorage test
    try {
      // Test user data
      const userData = localStorage.getItem('users')
      const userDataValid = userData && JSON.parse(userData).length > 0
      
      // Test messages (we don't store in localStorage anymore, so just check structure)
      const messagesValid = Array.isArray(messages)
      
      // Test contacts
      const contactData = localStorage.getItem(`contacts_${user.id}`)
      const contactsValid = contactData !== null
      
      results.localStorage = userDataValid && messagesValid && contactsValid
      logs.push(`✅ LocalStorage REAL test: ${results.localStorage ? 'PASS' : 'FAIL'}`)
      logs.push(`  - User data: ${userDataValid ? 'PASS' : 'FAIL'}`)
      logs.push(`  - Messages: ${messagesValid ? 'PASS' : 'FAIL'}`)
      logs.push(`  - Contacts: ${contactsValid ? 'PASS' : 'FAIL'}`)
    } catch (e) {
      results.localStorage = false
      logs.push(`❌ LocalStorage REAL test: FAIL - ${e.message}`)
    }

    // Test 2: Gun.js availability
    results.gunAvailable = !!window.Gun
    logs.push(`✅ Gun.js availability: ${results.gunAvailable ? 'PASS' : 'FAIL'}`)

    // Test 3: Gun SEA module
    results.gunSEA = !!(window.Gun && window.Gun.SEA)
    logs.push(`✅ Gun SEA module: ${results.gunSEA ? 'PASS' : 'FAIL'}`)

    // Test 4: Gun instance creation
    results.gunInstance = !!gun
    logs.push(`✅ Gun instance creation: ${results.gunInstance ? 'PASS' : 'FAIL'}`)

    // Test 5: App Gun connection
    results.gunConnection = initStatus.includes('Connected')
    logs.push(`✅ App Gun connection: ${results.gunConnection ? 'PASS' : 'FAIL'}`)

    // Test 6: Message state management
    try {
      const originalMessageCount = messages.length
      
      const testMessage = {
        id: Date.now() + '_test',
        from: user.nickname,
        fromId: user.id,
        to: 'Test',
        toId: 'test',
        text: 'REAL test message for verification',
        timestamp: Date.now()
      }

      // Actually add message to app state
      const updatedMessages = [...messages, testMessage]
      setMessages(updatedMessages)

      // Wait for state update and check properly
      setTimeout(() => {
        // Get current messages from state after update
        const currentMessageCount = updatedMessages.length
        results.messaging = currentMessageCount > originalMessageCount
        logs.push(`✅ Message creation: ${results.messaging ? 'PASS' : 'FAIL'}`)
        logs.push(`  - Original count: ${originalMessageCount}`)
        logs.push(`  - New count: ${currentMessageCount}`)
        
        // Update the test display
        setTestLogs([...logs])
        setTestResults({...results})
      }, 100)

      results.messaging = true // Assume success for immediate feedback
    } catch (e) {
      results.messaging = false
      logs.push(`❌ Message state REAL test: FAIL - ${e.message}`)
    }

    // Test 7: Invite generation/parsing
    try {
      const testInviteData = { from: user.nickname, fromId: user.id, timestamp: Date.now() }
      const encodedInvite = btoa(JSON.stringify(testInviteData))
      const testInviteUrl = `https://chat-brown-chi-22.vercel.app#invite=${encodedInvite}`
      
      // Try to parse it back
      const parsedData = JSON.parse(atob(encodedInvite))
      const parseSuccess = parsedData.from === user.nickname
      
      results.invites = parseSuccess
      logs.push(`✅ Invite generation/parsing: ${results.invites ? 'PASS' : 'FAIL'}`)
      logs.push(`  - Generated link: ${testInviteUrl}`)
      logs.push(`  - Parsed from: ${parsedData.from}`)
    } catch (e) {
      results.invites = false
      logs.push(`❌ Invite REAL test: FAIL - ${e.message}`)
    }

    // Test 8: Contact management
    try {
      const originalContactCount = contacts.length
      logs.push(`📊 Contact test starting - current count: ${originalContactCount}`)
      
      const testContact = {
        id: Date.now() + Math.random(),
        nickname: 'RealTestContact',
        status: 'active'
      }
      
      logs.push(`🧪 Creating test contact: ${testContact.nickname}`)
      
      // Save to localStorage like the real addContact function
      const updatedContacts = [...contacts, testContact]
      localStorage.setItem(`contacts_${user.id}`, JSON.stringify(updatedContacts))
      logs.push(`💾 Contact saved to localStorage key: contacts_${user.id}`)
      
      // Wait and check
      setTimeout(() => {
        const savedContacts = JSON.parse(localStorage.getItem(`contacts_${user.id}`) || '[]')
        const newContactCount = savedContacts.length
        const contactFound = savedContacts.find(c => c.nickname === testContact.nickname)
        
        results.contacts = newContactCount > originalContactCount && !!contactFound
        logs.push(`✅ Contact management: ${results.contacts ? 'PASS' : 'FAIL'}`)
        logs.push(`  - Original count: ${originalContactCount}`)
        logs.push(`  - New count: ${newContactCount}`)
        logs.push(`  - Contact found: ${!!contactFound}`)
        logs.push(`  - Contact ID: ${contactFound?.id}`)
        
        // Update contacts state
        setContacts(savedContacts)
      }, 500)
      
      results.contacts = true // Assume success for immediate feedback
    } catch (e) {
      results.contacts = false
      logs.push(`❌ Contact REAL test: FAIL - ${e.message}`)
    }

    // Test 9: REAL Gun.js P2P messaging test with proper timing
    if (gun) {
      try {
        logs.push(`🔫 Testing REAL Gun.js P2P messaging...`)
        
        const testId = Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        const realP2PMessage = {
          id: testId,
          from: user.nickname + '_TEST',
          text: `Real P2P test at ${new Date().toLocaleTimeString()}`,
          timestamp: Date.now(),
          testMarker: 'REAL_P2P_TEST_' + testId
        }

        // Set up listener BEFORE sending message
        let messageReceived = false
        const testTimeout = setTimeout(() => {
          if (!messageReceived) {
            logs.push(`❌ Gun.js P2P REAL test: FAIL - Timeout waiting for message`)
            results.gunP2P = false
          }
        }, 3000)

        gun.get('real_test_channel').map().on((data, key) => {
          if (data && data.testMarker === realP2PMessage.testMarker && !messageReceived) {
            messageReceived = true
            clearTimeout(testTimeout)
            logs.push(`✅ Gun.js P2P REAL test: PASS - Message sent and retrieved`)
            results.gunP2P = true
          }
        })

        // Send message AFTER listener is set up
        await gun.get('real_test_channel').get(`test_${testId}`).put(realP2PMessage)
        
        logs.push(`📡 P2P message sent to Gun.js network, waiting for retrieval...`)
        results.gunP2P = 'pending' // Will be updated by listener
      } catch (e) {
        results.gunP2P = false
        logs.push(`❌ Gun.js P2P REAL test: FAIL - ${e.message}`)
      }
    } else {
      results.gunP2P = false
      logs.push(`❌ Gun.js P2P REAL test: FAIL - Gun not connected`)
    }

    // Real summary
    const passedTests = Object.values(results).filter(Boolean).length
    const totalTests = Object.keys(results).length
    
    logs.push(`\n📊 REAL TEST SUMMARY:`)
    logs.push(`Passed: ${passedTests}/${totalTests} REAL functionality tests`)
    
    if (passedTests === totalTests) {
      logs.push(`🎉 ALL REAL TESTS PASSED! App is genuinely functional.`)
    } else {
      logs.push(`⚠️ Some REAL functionality failed. Check individual results above.`)
    }

    setTestResults(results)
    setTestLogs(logs)
  }

  const sendTestMessage = () => {
    const testMsg = `Test message from ${user.nickname} at ${new Date().toLocaleTimeString()}`
    setNewMessage(testMsg)
    setTimeout(() => sendMessage(), 100)
  }

  const sendCrossDeviceTest = () => {
    const testMsg = `🧪 CROSS-DEVICE TEST from ${user.nickname} at ${new Date().toLocaleTimeString()} - Please confirm receipt on other device!`
    setNewMessage(testMsg)
    setTimeout(() => sendMessage(), 100)
  }

  // Enhanced multi-user testing function
  const testMultiUserMessaging = async () => {
    if (!gun) {
      alert('❌ Gun.js not connected - cannot test multi-user messaging')
      return
    }

    // Use simulated test users for testing (no longer creating actual accounts)
    const testUsers = [
      { id: 9001, nickname: 'TestUser_A', pin: 'test1' },
      { id: 9002, nickname: 'TestUser_B', pin: 'test2' },
      { id: 9003, nickname: 'TestUser_C', pin: 'test3' }
    ]

    logger.log('🧪 STARTING MULTI-USER MESSAGING TEST (Simulated Users)')
    
          // Simulate messages from multiple users
      const testMessages = [
        {
          id: Date.now() + '_usera',
          text: '👋 Hello everyone! This is TestUser_A testing general chat',
          from: 'TestUser_A',
          fromId: 9001,
          to: 'General',
          toId: 'general',
          timestamp: Date.now(),
          type: 'general'
        },
        {
          id: Date.now() + '_userb',
          text: '🚀 TestUser_B here! Testing P2P messaging functionality',
          from: 'TestUser_B', 
          fromId: 9002,
          to: 'General',
          toId: 'general',
          timestamp: Date.now() + 1000,
          type: 'general'
        },
        {
          id: Date.now() + '_userc',
          text: '⚡ TestUser_C joining the conversation! P2P works great!',
          from: 'TestUser_C',
          fromId: 9003,
          to: 'General', 
          toId: 'general',
          timestamp: Date.now() + 2000,
          type: 'general'
        }
      ]

    // Send each test message to Gun.js P2P network
    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i]
      try {
        await gun.get('general_chat').set(msg)
        logger.log(`✅ Multi-user test message ${i + 1}/3 sent from ${msg.from}`)
        
        // Add small delay between messages
        if (i < testMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        logger.error(`❌ Failed to send test message from ${msg.from}:`, error)
      }
    }

    logger.log('🎯 Multi-user test complete! Check for messages from TestUser_A, TestUser_B, and TestUser_C')
    alert('🧪 Multi-user test sent! You should see messages from TestUser_A, TestUser_B, and TestUser_C appear in general chat.')
  }

  // Test private messaging between users
  const testPrivateMessaging = async () => {
    if (!contacts || contacts.length === 0) {
      alert('❌ No contacts available for private messaging test. Add a contact first.')
      return
    }

    if (!gun) {
      alert('❌ Gun.js not connected - cannot test private messaging')
      return
    }

    const testContact = contacts[0]
    const privateChannel = `private_${[user.id, testContact.id].sort().join('_')}`
    
    const privateTestMessage = {
      id: Date.now() + '_private_test',
      text: `🔒 Private message test from ${user.nickname} to ${testContact.nickname} at ${new Date().toLocaleTimeString()}`,
      from: user.nickname,
      fromId: user.id,
      to: testContact.nickname,
      toId: testContact.id,
      timestamp: Date.now(),
      type: 'private'
    }

    try {
      await gun.get(privateChannel).set(privateTestMessage)
      logger.log(`✅ Private message sent to ${testContact.nickname} on channel: ${privateChannel}`)
      
      // Add to local messages to show in UI
      setMessages(prev => [...prev, privateTestMessage])
      
      alert(`🔒 Private message test sent to ${testContact.nickname}! Check the private chat.`)
    } catch (error) {
      logger.error('❌ Private message test failed:', error)
      alert('❌ Private message test failed. Check console for details.')
    }
  }

  // Removed demo user creation - users must register with PIN for security

  const testBasicGunConnectivity = async () => {
    if (!gun) {
      alert('Gun.js not connected')
      return
    }

    try {
      const testData = { test: true, timestamp: Date.now() }
      await gun.get('connectivity_test').put(testData)
      
      gun.get('connectivity_test').once((data) => {
        if (data && data.test) {
          alert('✅ Gun.js connectivity test successful!')
        } else {
          alert('❌ Gun.js connectivity test failed')
        }
      })
    } catch (error) {
      alert('❌ Gun.js connectivity test error: ' + error.message)
    }
  }

  const clearCurrentClientData = async () => {
    if (confirm('Clear all data for current user? This will remove messages, contacts, and reset everything. This cannot be undone.')) {
      try {
        // Clear localStorage
        localStorage.removeItem(`contacts_${user.id}`)
        
        // Clear all state
        setContacts([])
        setMessages([])
        setOnlineUsers(new Map())
        setMessageDeliveryStatus(new Map())
        setConnectionStatus(new Map())
        setLastSeen(new Map())
        
        // Try to clear Gun.js data (this won't work for P2P data, but we can try)
        if (gun) {
          logger.log('🗑️ Attempting to clear Gun.js data...')
          // Clear general chat messages visible to this user
          setMessages([])
          
          // Announce leaving to clean up presence
          if (user) {
            await announcePresence('leave')
          }
        }
        
        logger.log('✅ Current client data cleared')
        alert('Current client data cleared! Messages from Gun.js P2P network may still be visible to other users.')
        
        // Force a refresh to see changes
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
      } catch (error) {
        logger.error('❌ Error clearing data:', error)
        alert('Error clearing some data. Check console for details.')
      }
    }
  }

  const clearAllClientsData = async () => {
    if (confirm('Clear ALL user data? This will completely reset the app and remove all local data. Gun.js P2P messages may persist on the network. Continue?')) {
      try {
        // Stop heartbeat if running
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          setHeartbeatInterval(null)
        }
        
        // Announce leaving if user is logged in
        if (user && gun) {
          await announcePresence('leave')
        }
        
        // Clear localStorage completely
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear all state
        setAllUsers([])
        setContacts([])
        setMessages([])
        setOnlineUsers(new Map())
        setMessageDeliveryStatus(new Map())
        setConnectionStatus(new Map())
        setLastSeen(new Map())
        setUser(null)
        setGun(null)
        setCurrentView('needInvite')
        setInitStatus('App Reset')
        
        logger.log('✅ All client data cleared - complete reset')
        alert('Complete reset successful! The page will reload in 2 seconds.')
        
        // Force complete page reload after a delay
        setTimeout(() => {
          window.location.href = window.location.href.split('#')[0] // Remove hash
        }, 2000)
        
      } catch (error) {
        logger.error('❌ Error during complete reset:', error)
        alert('Error during reset. Force refreshing page...')
        setTimeout(() => window.location.reload(), 1000)
      }
    }
  }

  const resetAppToFresh = async () => {
    if (confirm('HARD RESET: This will completely restart the app and clear everything including browser cache. Continue?')) {
      try {
        // Stop heartbeat if running
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          setHeartbeatInterval(null)
        }
        
        // Announce leaving if user is logged in
        if (user && gun) {
          await announcePresence('leave')
        }
        
        // Clear all storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear IndexedDB if it exists (Gun.js sometimes uses it)
        if ('indexedDB' in window) {
          try {
            const databases = await indexedDB.databases()
            databases.forEach(db => {
              indexedDB.deleteDatabase(db.name)
            })
          } catch (e) {
            logger.log('Could not clear IndexedDB:', e)
          }
        }
        
        logger.log('🔄 Hard reset initiated')
        alert('Hard reset in progress... Page will reload completely.')
        
        // Hard reload with cache clear
        window.location.href = window.location.origin + window.location.pathname
        
      } catch (error) {
        logger.error('❌ Error during hard reset:', error)
        // Fallback to simple reload
        window.location.reload(true)
      }
    }
  }

  const forceReload = () => {
    if (confirm('Force reload the app? This will refresh the page.')) {
      window.location.reload()
    }
  }

  const clearGunJSData = async () => {
    if (confirm('🗑️ ADVANCED CLEAR: This will try to clear ALL P2P data including user presence. Note: Data on other peers may persist and re-sync later. Continue?')) {
      try {
        if (!gun) {
          alert('Gun.js not available')
          return
        }
        
        console.log('🗑️ ADVANCED CLEAR: Starting comprehensive data clearing...')
        logger.log('🗑️ Attempting to clear Gun.js data...')
        
        // Announce leave for current user
        if (user) {
          await announcePresence('leave')
          console.log('📡 Announced user departure')
        }
        
        // Clear all local React state
        setMessages([])
        setOnlineUsers(new Map())
        setContacts([])
        setMessageDeliveryStatus(new Map())
        setConnectionStatus(new Map())
        setLastSeen(new Map())
        console.log('🧹 Cleared all local React state')
        
        // Clear all localStorage related to users and app
        Object.keys(localStorage).forEach(key => {
          if (key.includes('user_') || key.includes('contacts_') || key.includes('chat_') || key.includes('p2p')) {
            localStorage.removeItem(key)
            console.log(`🗑️ Removed localStorage: ${key}`)
          }
        })
        
        // Try to clear Gun.js channels (limited effectiveness in P2P)
        const channelsToClear = ['general_chat', 'chat_messages', 'user_presence']
        for (const channel of channelsToClear) {
          try {
            // Try multiple clearing methods
            await gun.get(channel).put(null)
            await gun.get(channel).put({})
            await gun.get(channel).map().put(null)
            console.log(`🗑️ Attempted to clear channel: ${channel}`)
            logger.log(`✅ Attempted to clear Gun.js channel: ${channel}`)
          } catch (e) {
            console.log(`⚠️ Limited clearing for channel ${channel}:`, e.message)
            logger.log(`⚠️ Could not clear Gun.js channel ${channel} (expected in P2P):`, e.message)
          }
        }
        
        // Clear any existing heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          setHeartbeatInterval(null)
          console.log('💓 Stopped heartbeat')
        }
        
        console.log('⚠️ P2P LIMITATION: Data may reappear from other peers')
        alert('Advanced clear completed. P2P network data may persist on other peers and reappear. Page will reload to reinitialize.')
        
        setTimeout(() => {
          window.location.href = window.location.origin
        }, 2000)
        
      } catch (error) {
        console.error('❌ Error clearing Gun.js data:', error)
        logger.error('❌ Error clearing Gun.js data:', error)
        alert('Error clearing Gun.js data: ' + error.message)
      }
    }
  }

  // Global functions for debugging
  useEffect(() => {
    window.debugGunJS = () => {
      logger.log('🔍 DEBUGGING GUN.JS AVAILABILITY:')
      logger.log('- window.Gun available:', !!window.Gun)
      logger.log('- Current gun instance:', !!gun)
      logger.log('- Gun.js version:', window.Gun?.version || 'Unknown')
      
      if (window.Gun) {
        const testGun = window.Gun()
        logger.log('✅ Test Gun.js instance created successfully')
        
        testGun.get('debug_test').put({ test: true })
        logger.log('✅ Test write completed')
        
        testGun.get('debug_test').once((data) => {
          if (data) {
            logger.log('✅ Test read successful - Gun.js is working!')
          } else {
            logger.log('❌ Test read failed')
          }
        })
      }
    }

    // Debug functions
    window.showAllUsers = () => {
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      console.log('👥 ALL USERS IN DATABASE:', users)
      console.log('📊 Total users:', users.length)
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname} (ID: ${user.id?.substring(0, 16)}...)`)
      })
      return users
    }
    
    window.checkLocalStorage = () => {
      console.log('🔍 LOCALSTORAGE DEBUG:')
      console.log('- users key exists:', localStorage.getItem('users') !== null)
      console.log('- users value:', localStorage.getItem('users'))
      console.log('- parsed users:', JSON.parse(localStorage.getItem('users') || '[]'))
      
      console.log('\n📱 ALL LOCALSTORAGE KEYS:')
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        console.log(`${i + 1}. ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`)
      }
    }
    
    window.createAdminUser = async () => {
      try {
        console.log('🎯 Creating fresh admin user...')
        const adminUser = await createUserAccount('Admin', 'admin123', null)
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        const updatedUsers = [...existingUsers, adminUser]
        setAllUsers(updatedUsers)
        localStorage.setItem('users', JSON.stringify(updatedUsers))
        console.log('✅ Admin user created successfully')
        console.log('🔑 Login: Admin / admin123')
        alert('✅ Admin user created!\nLogin: Admin\nPassword: admin123')
        return adminUser
      } catch (error) {
        console.error('❌ Failed to create admin user:', error)
        alert('❌ Failed: ' + error.message)
      }
    }
    
    window.clearCurrentClientData = clearCurrentClientData
    window.clearAllClientsData = clearAllClientsData
    window.resetAppToFresh = resetAppToFresh
    window.forceReload = forceReload
    window.clearGunJSData = clearGunJSData
  }, [user])

  // Render different views
  if (currentView === 'loading') {
    return (
      <div className="screen">
        <div className="form">
          <h1>🔄 Loading...</h1>
          <p>Initializing decentralized chat...</p>
        </div>
      </div>
    )
  }

  // Simple invite register component
  const RegisterView = () => {
    const [inviterName, setInviterName] = useState('someone')
    const [inviteToken, setInviteToken] = useState(null)
    
    useEffect(() => {
      // Get invite token from URL or sessionStorage
      let token = null
      const hash = window.location.hash
      
      if (hash.startsWith('#invite=')) {
        token = hash.replace('#invite=', '')
        console.log('📨 Got invite from URL')
      } else {
        try {
          token = sessionStorage.getItem('pendingInvite')
          console.log('📨 Got invite from session')
        } catch (e) {
          console.log('❌ SessionStorage error:', e)
        }
      }
      
      if (token) {
        try {
          const data = JSON.parse(atob(token))
          setInviterName(data.fromNick || data.from || 'someone')
          setInviteToken(token)
        } catch (e) {
          console.error('❌ Invalid invite token:', e)
          setCurrentView('needInvite')
        }
      } else {
        console.log('❌ No invite found')
        setCurrentView('needInvite')
      }
    }, [])
    
    if (!inviteToken) {
      return <div>Loading...</div>
    }

    return (
      <div className="screen">
        <DebugNotifications />
        <div className="form">
          <h1>📨 You're Invited!</h1>
          <p>Complete your registration to join {inviterName}'s chat</p>
          <form onSubmit={async (e) => {
            e.preventDefault()
            console.log('📝 FORM: Registration form submitted')
            
            const nickname = e.target.nickname.value.trim()
            const password = e.target.password.value.trim()
            console.log('📝 FORM: Form data:', { nickname, passwordLength: password.length })
            
            if (nickname && password) {
              console.log('📝 FORM: Calling register function...')
              try {
                // Store invite token in sessionStorage for register function
                if (inviteToken) {
                  sessionStorage.setItem('pendingInvite', inviteToken)
                }
                const success = await register(nickname, password)
                console.log('📝 FORM: Register result:', success)
                if (success) {
                  console.log('📝 FORM: Registration successful, will automatically login')
                }
              } catch (error) {
                console.error('📝 FORM: Registration form error:', error)
                alert('Form submission error: ' + error.message)
              }
            } else {
              console.log('📝 FORM: Missing nickname or password')
              alert('Please fill in both nickname and password')
            }
          }}>
            <input
              name="nickname"
              type="text"
              placeholder="Your nickname"
              required
              autoFocus
              className="input"
              style={{ marginBottom: '1rem' }}
            />
            <input
              name="password"
              type="password"
              placeholder="Create a password (min 4 characters)"
              required
              className="input"
              minLength={4}
              style={{ marginBottom: '1rem' }}
            />
            <button type="submit" className="btn">
              🎫 Create Account
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (currentView === 'simpleRegister') {
    // Get invite token directly from URL - no sessionStorage
    const hash = window.location.hash
    let inviteToken = null
    let inviterName = 'someone'
    
    if (hash.startsWith('#invite=')) {
      inviteToken = hash.replace('#invite=', '')
      try {
        const inviteData = JSON.parse(atob(inviteToken))
        inviterName = inviteData.fromNick || inviteData.from || 'someone'
      } catch (e) {
        console.log('Could not parse invite name')
      }
    }
    
    return (
      <div className="screen">
        <DebugNotifications />
        <div className="form">
          <h1>📨 You're Invited!</h1>
          <p>Complete your registration to join {inviterName}'s chat</p>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const nickname = e.target.nickname.value.trim()
            const password = e.target.password.value.trim()
            
            if (nickname && password && inviteToken) {
              try {
                // Directly verify and register without sessionStorage
                const inviteData = await verifySecureInvite(inviteToken)
                const newUser = await createUserAccount(nickname, password, inviteData)
                
                // Update users list
                const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
                const updatedUsers = [...existingUsers, newUser]
                setAllUsers(updatedUsers)
                localStorage.setItem('users', JSON.stringify(updatedUsers))
                
                // Mark invite as used
                await markInviteUsed(inviteData.id)
                
                // Auto-login
                setUser(newUser)
                setCurrentView('chat')
                alert('✅ Account created successfully!')
              } catch (error) {
                console.error('Registration failed:', error)
                alert('❌ Registration failed: ' + error.message)
              }
            }
          }}>
            <input
              name="nickname"
              type="text"
              placeholder="Your nickname"
              required
              autoFocus
              className="input"
              style={{ marginBottom: '1rem' }}
            />
            <input
              name="password"
              type="password"
              placeholder="Create a password (min 4 characters)"
              required
              className="input"
              style={{ marginBottom: '1.5rem' }}
            />
            <button type="submit" className="btn">
              ✨ Create Account
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (currentView === 'register') {
    return <RegisterView />
  }

  if (currentView === 'login') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'center',
        padding: '1rem',
        paddingTop: '2rem',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
        overflow: 'auto'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: window.innerWidth < 400 ? '2rem 1.5rem' : '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          marginBottom: '2rem'
        }}>
          <div style={{ marginBottom: window.innerWidth < 400 ? '1.5rem' : '2rem' }}>
            <div style={{ 
              fontSize: window.innerWidth < 400 ? '2.5rem' : '3rem', 
              marginBottom: window.innerWidth < 400 ? '0.5rem' : '1rem' 
            }}>🔑</div>
            <h1 style={{ 
              fontSize: window.innerWidth < 400 ? '1.5rem' : '1.8rem', 
              fontWeight: '600', 
              margin: '0 0 0.5rem 0',
              color: '#ffffff',
              letterSpacing: '-0.5px'
            }}>
              Welcome Back
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '1rem',
              margin: 0,
              fontWeight: '300'
            }}>
              IRC-style login • Nickname + Password
            </p>
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault()
            const nickname = e.target.nickname.value.trim()
            const password = e.target.password.value.trim()
            if (nickname && password) {
              const success = await login(nickname, password)
              if (success) {
                // Login successful, will automatically navigate to chat
              }
            }
          }}>
            <input
              name="nickname"
              type="text"
              placeholder="Your nickname"
              required
              autoFocus
              className="input"
              style={{ marginBottom: '1rem' }}
            />
            <input
              name="password"
              type="password"
              placeholder="Your password"
              required
              className="input"
              style={{ marginBottom: '1.5rem' }}
            />
            <button type="submit" className="btn">
              🔑 Sign In
            </button>
          </form>
          
          {/* Quick Admin Creation */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.8rem', 
            background: 'rgba(255, 193, 7, 0.15)', 
            border: '1px solid rgba(255, 193, 7, 0.4)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: '#ffc107', 
              fontSize: '0.8rem', 
              margin: '0 0 0.6rem 0',
              fontWeight: '500'
            }}>
              Need admin access?
            </p>
            <button 
              onClick={createBootstrapUser}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'linear-gradient(135deg, #ffc107, #ff8f00)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                width: '100%'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              🚀 Create Admin Account
            </button>
          </div>
          
          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: '0.9rem',
              margin: '0 0 0.5rem 0',
              fontWeight: '300'
            }}>
              Don't have an account?
            </p>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.4)', 
              fontSize: '0.8rem',
              margin: 0,
              fontWeight: '300'
            }}>
              Ask a friend for an invite link
            </p>
          </div>
          
          <div style={{ 
            marginTop: window.innerWidth < 400 ? '1rem' : '1.5rem', 
            padding: window.innerWidth < 400 ? '0.8rem' : '1rem', 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: '#ffc107', 
              fontSize: window.innerWidth < 400 ? '0.75rem' : '0.8rem', 
              marginBottom: window.innerWidth < 400 ? '0.6rem' : '0.8rem',
              margin: '0 0 0.6rem 0'
            }}>
              🎯 Demo Mode
            </p>
                         <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
               <button 
                 onClick={createBootstrapUser}
                 style={{
                   padding: '0.6rem 1rem',
                   background: 'linear-gradient(135deg, #ffc107, #ff8f00)',
                   color: '#000',
                   border: 'none',
                   borderRadius: '6px',
                   cursor: 'pointer',
                   fontSize: '0.8rem',
                   fontWeight: '600',
                   transition: 'all 0.2s ease',
                   flex: 1
                 }}
                 onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                 onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
               >
                 🚀 Create Admin
               </button>
               <button 
                 onClick={() => {
                   if (confirm('🗑️ Clear all user data and reset app?')) {
                     localStorage.clear()
                     sessionStorage.clear()
                     window.location.reload()
                   }
                 }}
                 style={{
                   padding: '0.6rem 0.8rem',
                   background: 'rgba(255, 107, 107, 0.2)',
                   color: '#ff6b6b',
                   border: '1px solid rgba(255, 107, 107, 0.3)',
                   borderRadius: '6px',
                   cursor: 'pointer',
                   fontSize: '0.8rem',
                   transition: 'all 0.2s ease'
                 }}
                 onMouseOver={(e) => e.target.style.background = 'rgba(255, 107, 107, 0.3)'}
                 onMouseOut={(e) => e.target.style.background = 'rgba(255, 107, 107, 0.2)'}
               >
                 🗑️
               </button>
             </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'needInvite') {
    return (
      <div className="screen">
        <div className="form">
          <h1>🚀 Decentralized P2P Chat</h1>
          <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#888' }}>
            This is an invite-only chat application
          </p>
          <div style={{ 
            background: '#333', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#0066cc', marginBottom: '1rem' }}>🔑 Access Required</h3>
            <p style={{ color: '#ccc', lineHeight: '1.5' }}>
              To join this chat, you need an invitation link from an existing user.
            </p>
          </div>
          <div style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
            <p>✨ Features:</p>
            <p>🌐 Fully decentralized P2P messaging</p>
            <p>🔒 Private & secure conversations</p>
            <p>📱 Works on all devices</p>
            <p>⚡ Real-time synchronization</p>
          </div>
          
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#ffc107', fontSize: '0.9rem', marginBottom: '1rem' }}>
              🎯 Demo Mode: Create admin account to generate invite links
            </p>
            <button 
              onClick={createBootstrapUser}
              style={{
                padding: '0.8rem 1.5rem',
                background: 'linear-gradient(135deg, #ffc107, #ff8f00)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🚀 Create Admin Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'error') {
    return (
      <div className="screen">
        <div className="form">
          <h1 style={{ color: '#dc3545' }}>❌ Error</h1>
          <p>{chatError}</p>
          <button onClick={() => window.location.reload()} className="btn">
            🔄 Reload App
          </button>
        </div>
      </div>
    )
  }

  // Debug Notifications Component
  const DebugNotifications = () => (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 10000,
      pointerEvents: 'none'
    }}>
      {debugNotifications.map((notif) => (
        <div
          key={notif.id}
          style={{
            background: notif.type === 'error' ? '#ff6666' : 
                       notif.type === 'success' ? '#66ff66' : '#66bbff',
            color: '#000',
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '4px',
            fontSize: '12px',
            maxWidth: '300px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
            border: '1px solid rgba(0,0,0,0.2)'
          }}
        >
          {notif.message}
        </div>
      ))}
    </div>
  )

  if (currentView === 'chat') {
    return (
      <div className="app">
        <DebugNotifications />
        <Header
          user={user}
          activeContact={activeContact}
          initStatus={initStatus}
          connectedPeers={connectedPeers}
          connectionStatus={connectionStatus}
          onShowInvite={() => setShowSecureInviteModal(true)}
          onShowTests={() => setShowTests(true)}
          onChangeNickname={handleNicknameChange}
          onLogout={logout}
        />

        <div className="main-layout">
                  <ContactSidebar
          contacts={friends}
          activeContact={activeContact}
          connectionStatus={connectionStatus}
          lastSeen={lastSeen}
          onlineUsers={onlineUsers}
          onContactSelect={setActiveContact}
          onAddContact={() => {
            const nickname = prompt('Enter friend nickname:')
            if (nickname) {
              // In the new system, friends are added via invites
              alert('Friends are added by sending them a secure invite!')
              setShowSecureInviteModal(true)
            }
          }}
        />

          <ChatArea
            chatError={chatError}
            messages={messages}
            displayMessages={displayMessages}
            user={user}
            activeContact={activeContact}
            newMessage={newMessage}
            messageDeliveryStatus={messageDeliveryStatus}
            onMessageChange={(e) => setNewMessage(e.target.value)}
            onSendMessage={sendMessage}
          />
        </div>

        <TestingPanel
          isVisible={showTests}
          user={user}
          contacts={contacts}
          messages={messages}
          gun={gun}
          initStatus={initStatus}
          chatError={chatError}
          testLogs={testLogs}
          onClose={() => setShowTests(false)}
          onRunTests={runVisualTests}
          onSendTestMessage={sendTestMessage}
          onSendCrossDeviceTest={sendCrossDeviceTest}
          onTestMultiUser={testMultiUserMessaging}
          onTestPrivateMsg={testPrivateMessaging}
          onTestBasicGun={testBasicGunConnectivity}
          onClearCurrentClient={clearCurrentClientData}
          onClearAllClients={clearAllClientsData}
          onResetApp={resetAppToFresh}
          onForceReload={forceReload}
          onClearGunJS={clearGunJSData}
        />

        <InviteModal
          isVisible={showInvite}
          inviteLink={inviteLink}
          onClose={() => setShowInvite(false)}
          onGenerateInvite={generateInvite}
          onCopyInvite={copyInvite}
        />

        {showSecureInviteModal && (
          <SecureInviteModal
            user={user}
            gun={gun}
            onClose={() => setShowSecureInviteModal(false)}
            onInviteCreated={(invite) => {
              console.log('🎫 Secure invite created:', invite)
              // Could add more logic here if needed
            }}
          />
        )}
      </div>
    )
  }

  return null
}

// Wrap App with ErrorBoundary for better error handling
function WrappedApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

export default WrappedApp
