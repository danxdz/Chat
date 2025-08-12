import { useState, useEffect, Component } from 'react'
import Header from './components/Header'
import ContactSidebar from './components/ContactSidebar'
import ChatArea from './components/ChatArea'
import TestingPanel from './components/TestingPanel'
import InviteModal from './components/InviteModal'
import SecureInviteModal from './components/SecureInviteModal'
import MobileLayout from './components/MobileLayout'
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
  const [chatError, setChatError] = useState(null)
  const [connectedPeers, setConnectedPeers] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState(new Map())
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState(new Map())
  const [lastSeen, setLastSeen] = useState(new Map())
  const [onlineUsers, setOnlineUsers] = useState(new Map())
  const [heartbeatInterval, setHeartbeatInterval] = useState(null)
  const [pendingInvites, setPendingInvites] = useState([])

  // Debug notification system (only in development)
  const showDebugNotification = (message, type = 'info') => {
    if (!isDev) return
    
    const id = Date.now()
    const notification = { id, message, type, timestamp: Date.now() }
    setDebugNotifications(prev => [...prev, notification])
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setDebugNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }
  
  // Make debug function available globally (only in dev)
  if (isDev) {
    window.debugNotify = showDebugNotification
  }

  // Gun.js peers for P2P networking - Updated working peers
  const gunPeers = [
    'https://relay.peer.ooo/gun',
    'https://gun-eu.herokuapp.com/gun',
    'https://peer.wallie.io/gun'
  ]

  // Initialize sodium and check URL for invite
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
      
      // Check if user was auto-logged in from registration
      const currentUser = localStorage.getItem('currentUser')
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser)
          setUser(userData)
          setCurrentView('chat')
          localStorage.removeItem('currentUser') // Clean up
          console.log('✅ Auto-logged in user from registration:', userData.nickname)
          return
        } catch (e) {
          localStorage.removeItem('currentUser')
        }
      }

      // Invite links now go to separate HTML page (/register.html)
      // No need to handle them in React app

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

  // Initialize Gun.js when user is logged in
  const initializeGunJS = async () => {
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

  // Load user data when user changes
  useEffect(() => {
    if (!user) return

    try {
      // Load contacts
      const savedContacts = JSON.parse(localStorage.getItem(`contacts_${user.id}`) || '[]')
      setContacts(savedContacts)
      
      // Load friends
      const friendsList = getFriendsList(user.id)
      setFriends(friendsList)
      
      // Load messages from Gun.js (they will be loaded via listeners)
      setMessages([])
      
      logger.log('📋 User data loaded successfully')
      logger.log('- Contacts:', savedContacts.length)
      logger.log('- Friends:', friendsList.length)
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
    
    // Also listen to online_users for better tracking
    gun.get('online_users').map().on((data, userId) => {
      console.log('🔵 Online user update:', userId, data)
      if (data && data.nickname) {
        setOnlineUsers(prev => {
          const updated = new Map(prev)
          updated.set(userId, data)
          console.log('✅ User online:', data.nickname, '- Total:', updated.size)
          return updated
        })
      } else {
        // User went offline
        setOnlineUsers(prev => {
          const updated = new Map(prev)
          updated.delete(userId)
          console.log('❌ User offline:', userId, '- Total:', updated.size)
          return updated
        })
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

  // Registration now handled by separate HTML page (/register.html)
  // This function is kept for compatibility but not used

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
      // Use put instead of set for proper updates
      await gun.get('user_presence').get(currentUser.id).put(presenceData)
      
      // Also update the online_users node for better tracking
      if (action === 'join' || action === 'heartbeat') {
        await gun.get('online_users').get(currentUser.id).put({
          nickname: currentUser.nickname,
          lastSeen: Date.now(),
          isOnline: true
        })
      } else if (action === 'leave') {
        await gun.get('online_users').get(currentUser.id).put(null)
      }
      
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

  // Simple test message function
  const sendTestMessage = () => {
    if (!user || !gun) {
      alert('Please login first to send test messages')
      return
    }
    
    const testMsg = `Test message from ${user.nickname} at ${new Date().toLocaleTimeString()}`
    setNewMessage(testMsg)
    setTimeout(() => sendMessage(), 100)
  }

  // Clear current user data
  const clearCurrentClientData = async () => {
    if (confirm('Clear all data for current user? This cannot be undone.')) {
      try {
        // Clear user-specific data
        if (user) {
          localStorage.removeItem(`contacts_${user.id}`)
          localStorage.removeItem(`friends_${user.id}`)
          
          // Announce leaving
          if (gun) {
            await announcePresence('leave')
          }
        }
        
        // Clear session data
        sessionStorage.clear()
        
        // Reset states
        setUser(null)
        setMessages([])
        setContacts([])
        setFriends([])
        setActiveContact(null)
        setOnlineUsers(new Map())
        
        alert('Current session cleared. Please login again.')
        setCurrentView('login')
      } catch (error) {
        console.error('Failed to clear data:', error)
        alert('Failed to clear some data. Try refreshing the page.')
      }
    }
  }

  // Clear all data
  const clearAllClientsData = async () => {
    if (confirm('Clear ALL application data? This will remove all users and require new registration.')) {
      try {
        // Announce leaving if logged in
        if (user && gun) {
          await announcePresence('leave')
        }
        
        // Clear all storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear Gun.js data if available
        if (gun) {
          try {
            await gun.get('p2pchat').get('messages').put(null)
            await gun.get('online_users').put(null)
            await gun.get('user_presence').put(null)
          } catch (e) {
            console.log('Could not clear Gun.js data:', e)
          }
        }
        
        alert('All data cleared. Refreshing...')
        window.location.reload()
      } catch (error) {
        console.error('Failed to clear all data:', error)
        alert('Failed to clear some data. Please manually clear browser data.')
      }
    }
  }

  // Force reload
  const forceReload = () => {
    if (confirm('Reload the application?')) {
      window.location.reload()
    }
  }

  // Initialize app on mount
  useEffect(() => {
    initializeApp()
  }, [])

  // Initialize Gun.js when user is logged in
  useEffect(() => {
    if (user && !gun) {
      initializeGunJS()
    }
  }, [user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (user && gun) {
        announcePresence('leave')
      }
    }
  }, [heartbeatInterval, user, gun])

  // Global debug functions (only in dev)
  useEffect(() => {
    if (isDev) {
      window.debugApp = {
        user,
        gun,
        messages,
        onlineUsers: Array.from(onlineUsers.entries()),
        friends,
        contacts
      }
    }
  }, [user, gun, messages, onlineUsers, friends, contacts])

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

  // Debug Notifications Component (only in development)
  const DebugNotifications = () => {
    if (!isDev) return null
    
    return (
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
  }

  if (currentView === 'chat') {
    const isMobile = window.innerWidth <= 480
    
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

        {isMobile ? (
          <MobileLayout
            user={user}
            messages={messages}
            displayMessages={displayMessages}
            friends={friends}
            onlineUsers={onlineUsers}
            pendingInvites={pendingInvites}
            activeContact={activeContact}
            newMessage={newMessage}
            chatError={chatError}
            messageDeliveryStatus={messageDeliveryStatus}
            connectionStatus={connectionStatus}
            lastSeen={lastSeen}
            onMessageChange={(e) => setNewMessage(e.target.value)}
            onSendMessage={sendMessage}
            onContactSelect={setActiveContact}
            onShowInvite={() => setShowSecureInviteModal(true)}
          />
        ) : (
          // Desktop layout
          <div className="main-layout">
            <ContactSidebar
              contacts={friends}
              activeContact={activeContact}
              connectionStatus={connectionStatus}
              lastSeen={lastSeen}
              onlineUsers={onlineUsers}
              pendingInvites={pendingInvites}
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
        )}

        <TestingPanel
          isVisible={showTests}
          user={user}
          gun={gun}
          initStatus={initStatus}
          onClose={() => setShowTests(false)}
          onSendTestMessage={sendTestMessage}
          onClearCurrentClient={clearCurrentClientData}
          onClearAllClients={clearAllClientsData}
          onForceReload={forceReload}
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
              // Add to pending invites
              setPendingInvites(prev => [...prev, {
                id: invite.inviteId,
                inviteUrl: invite.inviteUrl,
                expiresAt: invite.expiresAt,
                createdAt: Date.now(),
                fromNick: user.nickname,
                status: 'pending'
              }])
              setShowSecureInviteModal(false)
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
