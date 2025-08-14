import { useState, useEffect, Component } from 'react'
import LoginView from './components/LoginView'
import NeedInviteView from './components/NeedInviteView'
import ChatView from './components/ChatView'
import { 
  verifySecureInvite, 
  markInviteUsed, 
  changeNickname, 
  getFriendsList 
} from './utils/secureAuth'

import {
  initGunUsers,
  createGunUser,
  loginGunUser,
  getAllGunUsers,
  updateGunUser,
  migrateUsersToGun
} from './services/gunAuthService'

import gunPeers from './config/gunPeers'
import { initWebRTC, sendWebRTCMessage, connectToPeer } from './services/webrtcService'

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
  const [showSecureInviteModal, setShowSecureInviteModal] = useState(false)
  const [friends, setFriends] = useState([])
  const [debugNotifications, setDebugNotifications] = useState([])
  const [showTests, setShowTests] = useState(false)
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



  // Initialize sodium and check URL for invite
  const initializeApp = async () => {
    try {
      if (window.sodium) {
        await window.sodium.ready
        setSodium(window.sodium)
        logger.log('✅ Sodium ready for cryptography')
      }

      // Initialize Gun.js FIRST (needed for user auth)
      let gunInstance = null;
      try {
        console.log('🔧 Starting Gun.js initialization...')
        gunInstance = await initializeGunJS()
        console.log('🔧 Gun instance returned:', gunInstance ? 'Valid' : 'Null')
      } catch (gunError) {
        console.error('🔴 Gun.js initialization failed:', gunError)
        console.error('Stack:', gunError.stack)
      }
      
      // Wait a moment for Gun.js to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Load users from Gun.js instead of localStorage
      if (gunInstance) {
        try {
          console.log('🔧 Attempting to load users from Gun.js...')
          const gunUsers = await getAllGunUsers(gunInstance)
          setAllUsers(gunUsers)
          console.log('📊 Loaded users from Gun.js:', gunUsers.length)
        } catch (loadError) {
          console.error('🔴 Failed to load Gun.js users:', loadError)
          console.error('Stack:', loadError.stack)
          // Fallback to localStorage
          const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
          setAllUsers(existingUsers)
        }
      } else {
        // Fallback to localStorage if Gun.js failed
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        setAllUsers(existingUsers)
        console.log('⚠️ Gun.js not available, using localStorage:', existingUsers.length)
      }
      
      // Check for saved session (Remember Me) - try sessionStorage first for private mode
      let savedSession = sessionStorage.getItem('savedSession') || localStorage.getItem('savedSession')
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession)
          
          // First try to find user in Gun.js
          let savedUser = null
          if (gunInstance) {
            try {
              const gunUsers = await getAllGunUsers(gunInstance)
              savedUser = gunUsers.find(u => u.id === session.id)
            } catch (e) {
              console.error('Failed to find user in Gun.js:', e)
            }
          }
          
          // Fallback to localStorage
          if (!savedUser) {
            const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
            savedUser = existingUsers.find(u => u.id === session.id)
          }
          
          if (savedUser) {
            // Restore private key from session if available
            if (session.privateKey) {
              savedUser.privateKey = session.privateKey
              console.log('🔑 Restored private key from session')
            } else {
              // Generate a new key for this session if missing
              console.log('⚠️ No private key in session, generating one now...')
              if (window.Gun && window.Gun.SEA) {
                try {
                  const pair = await window.Gun.SEA.pair()
                  savedUser.privateKey = pair.priv
                  console.log('✅ Generated new private key for session')
                } catch (e) {
                  console.error('❌ Failed to generate private key:', e)
                }
              }
            }
            
            setUser(savedUser)
            setCurrentView('chat')
            console.log('✅ Auto-logged in as:', savedUser.nickname)
            // Announce presence for auto-login
            setTimeout(() => {
              if (window.gun) {
                announcePresence('join', savedUser)
              }
            }, 1000)
            return
          } else {
            // Session invalid, clear it
            sessionStorage.removeItem('savedSession')
            localStorage.removeItem('savedSession')
          }
        } catch (e) {
          sessionStorage.removeItem('savedSession')
          localStorage.removeItem('savedSession')
        }
      }
      
      // Check if user was auto-logged in from registration
      const currentUser = localStorage.getItem('currentUser')
      console.log('🔍 Checking for currentUser in localStorage:', currentUser ? 'Found' : 'Not found')
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser)
          console.log('📋 Auto-login user data:', {
            nickname: userData.nickname,
            id: userData.id?.substring(0, 8),
            hasPrivateKey: !!userData.privateKey,
            hasFriends: !!userData.friends
          })
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

      // Always show login page - users can create admin from there
      setCurrentView('login')
      console.log('📱 Starting at login page')
    } catch (error) {
      logger.error('❌ App initialization failed:', error)
      setChatError('Failed to initialize app: ' + error.message)
      setCurrentView('error')
    }
  }

  // Initialize Gun.js (always, not just when user is logged in)
  const initializeGunJS = async () => {
    try {
      setInitStatus('Connecting to P2P network...')
      
      // Wait for Gun.js to be available
      let attempts = 0
      while (!window.Gun && attempts < 10) {
        console.log('Waiting for Gun.js to load...')
        await new Promise(resolve => setTimeout(resolve, 500))
        attempts++
      }
      
      if (!window.Gun) {
        throw new Error('Gun.js library not loaded after 5 seconds')
      }

      logger.log('🌐 Initializing Gun.js with peers:', gunPeers)
      
      const gunInstance = window.Gun({
        peers: gunPeers,
        localStorage: true,  // Enable local caching
        radisk: true,       // Enable radix storage
        file: false,
        uuid: () => {       // Custom UUID to ensure consistency
          return 'chat_' + Math.random().toString(36).substring(2, 15)
        }
      })

      // Test Gun.js connectivity and wait for sync
      const testKey = 'gun_init_test_' + Date.now()
      await gunInstance.get(testKey).put({ test: true, timestamp: Date.now() })
      
      // Wait for Gun.js to sync with peers
      await new Promise((resolve) => {
        let resolved = false
        gunInstance.get(testKey).once((data) => {
          if (data && !resolved) {
            resolved = true
            logger.log('✅ Gun.js connectivity test successful')
            setInitStatus('Connected to P2P network')
            resolve()
          }
        })
        
        // Timeout after 2 seconds
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            logger.log('⚠️ Gun.js connectivity test timed out - continuing anyway')
            setInitStatus('Connected to P2P network (limited)')
            resolve()
          }
        }, 2000)
      })

      setGun(gunInstance)
      
      // Initialize Gun.js user system
      try {
        initGunUsers(gunInstance)
      } catch (error) {
        console.error('Error initializing Gun users:', error)
      }
      
      // Auto-migrate localStorage users to Gun.js if any exist
      try {
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]')
        if (localUsers.length > 0 && gunInstance) {
          console.log('🔄 Auto-migrating localStorage users to Gun.js...')
          await migrateUsersToGun(gunInstance)
          console.log('✅ Migration complete!')
        }
      } catch (error) {
        console.error('Error migrating users:', error)
      }
      
      // Store gun instance globally for register.html
      window.gun = gunInstance
      
      // Monitor peer connections
      const peerMonitorInterval = setInterval(() => {
        if (gunInstance && gunInstance._.opt && gunInstance._.opt.peers) {
          const peerCount = Object.keys(gunInstance._.opt.peers).length
          setConnectedPeers(peerCount)
        }
      }, 5000)

            // Return the gun instance for use in initialization
      return gunInstance

    } catch (error) {
      logger.error('❌ Gun.js initialization failed:', error)
      setInitStatus('P2P connection failed')
      setChatError('Failed to connect to P2P network: ' + error.message)
      return null // Return null if initialization fails
    }
  }

  // Load user data when user changes
  useEffect(() => {
    if (!user) return

    const loadUserData = async () => {
      try {
        // Load contacts
        const savedContacts = JSON.parse(localStorage.getItem(`contacts_${user.id}`) || '[]')
        setContacts(savedContacts)
        
        // Load friends from Gun.js
        let friendsList = []
        if (gun && user.friends && user.friends.length > 0) {
          // Get all users from Gun.js to find friends
          try {
            const gunUsers = await getAllGunUsers(gun)
            friendsList = getFriendsList(user, gunUsers)
            console.log('👥 Friends loaded from Gun.js:', friendsList)
          } catch (e) {
            console.error('Failed to load friends from Gun.js:', e)
          }
        }
        setFriends(friendsList)
        console.log('📊 User data:', { 
          userId: user.id, 
          userFriends: user.friends,
          friendsListCount: friendsList.length 
        })
        
        // Load and monitor pending invites
        const savedInvites = JSON.parse(localStorage.getItem('pendingInvites') || '[]')
        setPendingInvites(savedInvites)
        console.log('📋 Pending invites loaded:', savedInvites)
        
        // Monitor invites in Gun.js for real-time updates
        if (gun && user) {
          gun.get('secure_invites').map().on((invite, key) => {
            if (invite && invite.fromId === user.id && invite.status === 'pending') {
              setPendingInvites(prev => {
                const exists = prev.some(inv => inv.id === invite.id)
                if (!exists) {
                  const updated = [...prev, invite]
                  localStorage.setItem('pendingInvites', JSON.stringify(updated))
                  return updated
                }
                return prev
              })
            }
          })
          
          // Also monitor for accepted invites to update status
          gun.get('secure_invites').map().on(async (invite, key) => {
            if (invite && invite.fromId === user.id && invite.status === 'accepted') {
              setPendingInvites(prev => {
                const updated = prev.map(inv => 
                  inv.id === invite.id 
                    ? { ...inv, status: 'accepted', acceptedBy: invite.acceptedBy, acceptedAt: invite.acceptedAt }
                    : inv
                )
                localStorage.setItem('pendingInvites', JSON.stringify(updated))
                return updated
              })
              
              // Add friend if accepted - reload friends list
              if (invite.acceptedBy) {
                // Reload friends from Gun.js
                const existingUsers = await getAllGunUsers(gun)
                setAllUsers(existingUsers)
                const userFriends = getFriendsList(user, existingUsers)
                setFriends(userFriends)
                console.log('🔄 Friends reloaded after invite accepted')
              }
            }
          })
        }
      
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
    }
    
    loadUserData()
  }, [user])

  // Gun.js message listeners
  useEffect(() => {
    if (!gun || !user) return

    logger.log('🔧 Setting up Gun.js listeners for general and private chats...')
    
    // Listen for friend updates
          gun.get('friendships').get(user.id).map().on(async (data, key) => {
        if (data && data.status === 'friends') {
          console.log('🤝 New friend detected:', key)
          // Reload friends list from Gun.js
          if (gun) {
            try {
              const gunUsers = await getAllGunUsers(gun)
              const currentUser = gunUsers.find(u => u.id === user.id)
              if (currentUser) {
                const friendsList = getFriendsList(currentUser, gunUsers)
                setFriends(friendsList)
              }
            } catch (e) {
              console.error('Failed to reload friends from Gun.js:', e)
            }
          }
        }
      })

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

    // Listen to private chats for current user with all friends
    if (user?.id && friends) {
      // Set up listeners for all friends
      friends.forEach(friend => {
        const privateChannel = `private_${[user.id, friend.id].sort().join('_')}`
        logger.log('👥 Setting up private channel listener for friend:', friend.nickname, privateChannel)
        
        gun.get(privateChannel).map().on((data, key) => {
          logger.log('📨 PRIVATE CHAT from', friend.nickname, '- RAW DATA:', JSON.stringify(data, null, 2))
          handleIncomingMessage(data, key, 'private')
        })
      })
      
      // Also set up for contacts (backward compatibility)
      contacts.forEach(contact => {
        const privateChannel = `private_${[user.id, contact.id].sort().join('_')}`
        logger.log('👥 Setting up private channel listener for contact:', privateChannel)
        
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
      if (data && data.nickname && data.isOnline === true) {
        setOnlineUsers(prev => {
          const updated = new Map(prev)
          updated.set(userId, data)
          console.log('✅ User online:', data.nickname, '- Total:', updated.size)
          
          // Debug: log all online users
          console.log('📋 All online users:', Array.from(updated.entries()).map(([id, u]) => u.nickname))
          return updated
        })
      } else if (data && data.isOnline === false) {
        // User explicitly went offline
        setOnlineUsers(prev => {
          const updated = new Map(prev)
          updated.delete(userId)
          console.log('❌ User went offline:', data.nickname, '- Total:', updated.size)
          return updated
        })
      }
    })
    
    // Listen for friendships updates
    if (user) {
      gun.get('friendships').get(user.id).map().on((friendData, friendId) => {
        if (friendData && friendData.friendNick) {
          console.log('👥 New friendship detected:', friendData)
          setFriends(prev => {
            // Check if friend already exists
            if (prev.find(f => f.id === friendId)) return prev
            
            const newFriend = {
              id: friendId,
              nickname: friendData.friendNick,
              addedAt: friendData.addedAt
            }
            console.log('➕ Adding friend:', newFriend)
            return [...prev, newFriend]
          })
        }
      })
    }

    logger.log('✅ Gun.js listeners ready for general, private chats, and presence')
  }, [gun, user?.id, contacts, friends])

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
        from: nickname,
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

  // Handle login from LoginView component
  const handleLogin = async (nickname, password, rememberMe = true) => {
    return login(nickname, password, rememberMe)
  }

  // Handle admin account creation
  const handleCreateAdmin = async () => {
    try {
      // Check if admin already exists in Gun.js first
      let adminExists = false
      
      if (gun) {
        try {
          const gunUsers = await getAllGunUsers(gun)
          adminExists = gunUsers.some(u => u.nickname.toLowerCase() === 'admin')
          console.log('🔍 Checking Gun.js for admin:', adminExists ? 'Found' : 'Not found')
        } catch (e) {
          console.log('Could not check Gun.js for admin:', e)
        }
      }
      
      // Fallback to localStorage check
      if (!adminExists) {
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        adminExists = existingUsers.some(u => u.nickname.toLowerCase() === 'admin')
        console.log('🔍 Checking localStorage for admin:', adminExists ? 'Found' : 'Not found')
      }
      
      if (adminExists) {
        alert('Admin user already exists! Please login.')
        return { success: false, error: 'Admin already exists' }
      }
      
      // Create admin account in Gun.js
      const adminUser = await createGunUser(gun, 'Admin', 'admin123', null)
      console.log('👤 Admin user created in Gun.js:', adminUser)
      
      // Update allUsers state
      setAllUsers(prev => [...prev, adminUser])
      
      // Also save to localStorage for fallback
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      existingUsers.push(adminUser)
      localStorage.setItem('users', JSON.stringify(existingUsers))
      
      // Auto-login as admin
      setUser(adminUser)
      setCurrentView('chat')
      
      alert('✅ Admin account created successfully!\nUsername: Admin\nPassword: admin123')
      return { success: true }
    } catch (error) {
      console.error('Failed to create admin:', error)
      alert('Failed to create admin account: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  const login = async (nickname, password, rememberMe = true) => {
    if (!nickname.trim() || !password.trim()) {
      return { success: false, error: 'Nickname and password are required' }
    }

    try {
      console.log('🎯 Trying to login as:', nickname)

      // Try Gun.js first (works in private mode)
      let user = null;
      let loginSource = null;
      
      if (gun) {
        try {
          user = await loginGunUser(gun, nickname, password)
          loginSource = 'Gun.js'
          console.log('🔐 Logged in user from Gun.js:', { 
            id: user.id, 
            nickname: user.nickname, 
            friends: user.friends,
            friendsCount: user.friends ? user.friends.length : 0,
            hasPrivateKey: !!user.privateKey
          })
        } catch (gunError) {
          console.log('⚠️ Gun.js login failed:', gunError.message)
        }
      }
      
      // Only try localStorage if Gun.js failed and localStorage has data
      if (!user) {
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        if (existingUsers.length > 0) {
          try {
            const { ircLogin } = await import('./utils/secureAuth')
            user = await ircLogin(nickname, password)
            loginSource = 'localStorage'
            console.log('🔐 Logged in user from localStorage')
            
            // Migrate this user to Gun.js for next time
            if (gun && user) {
              try {
                await createGunUser(gun, user.nickname, password, null)
                console.log('✅ User migrated to Gun.js')
              } catch (e) {
                console.log('Could not migrate user to Gun.js:', e.message)
              }
            }
          } catch (localError) {
            console.log('localStorage login also failed:', localError.message)
          }
        }
      }
      
      if (!user) {
        return { success: false, error: 'Invalid nickname or password' }
      }
      
      // ALWAYS ensure user has a private key for invites
      if (!user.privateKey) {
        console.log('⚠️ User missing private key, generating one...')
        if (window.Gun && window.Gun.SEA) {
          try {
            const pair = await window.Gun.SEA.pair()
            user.privateKey = pair.priv
            console.log('✅ Generated private key for user')
          } catch (e) {
            console.error('❌ Failed to generate private key:', e)
          }
        }
      }
      
      setUser(user)
      console.log('📱 User state updated with privateKey:', !!user.privateKey)
      
      // Initialize WebRTC for P2P messaging
      if (gun && user.id && user.nickname) {
        const webrtc = initWebRTC(gun, user.id, user.nickname)
        console.log('🎥 WebRTC initialized for P2P messaging')
        
        // Listen for WebRTC messages
        webrtc.onMessage((message, fromUserId) => {
          console.log('📨 Received WebRTC message from:', fromUserId.substring(0, 8))
          setMessages(prev => [...prev, message])
        })
      }
      
      // Save session data
      const sessionData = JSON.stringify({
        nickname: user.nickname,
        id: user.id,
        timestamp: Date.now(),
        // Store private key temporarily in session (will be lost on browser close)
        privateKey: user.privateKey
      })
      
      // Always save to sessionStorage for current session (works in private mode)
      sessionStorage.setItem('savedSession', sessionData)
      
      // Save to localStorage if remember me is checked (without private key for security)
      if (rememberMe) {
        const persistData = JSON.stringify({
          nickname: user.nickname,
          id: user.id,
          timestamp: Date.now()
        })
        localStorage.setItem('savedSession', persistData)
      }
      
      // Load user's friends from Gun.js
      if (gun) {
        try {
          const gunUsers = await getAllGunUsers(gun)
          setAllUsers(gunUsers) // Update allUsers state
          const userFriends = getFriendsList(user, gunUsers)
          setFriends(userFriends)
        } catch (e) {
          console.error('Failed to load users/friends from Gun.js:', e)
        }
      }
      
      // Announce presence after successful login
      setTimeout(() => {
        if (gun) {
          announcePresence('join', user)
        }
      }, 500)
      
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
        updated.set(user.id, { 
          nickname: user.nickname, 
          lastSeen: Date.now(),
          isOnline: true 
        })
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
      
      setCurrentView('chat')
      return { success: true }
    } catch (error) {
      logger.error('❌ Login failed:', error)
      return { success: false, error: error.message }
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
        
        // Ensure admin has private key
        if (!existingAdmin.privateKey && window.Gun && window.Gun.SEA) {
          const pair = await window.Gun.SEA.pair()
          existingAdmin.privateKey = pair.priv
          console.log('✅ Generated private key for existing admin')
        }
        
        setUser(existingAdmin)
        setCurrentView('chat')
        alert('✅ Admin user already exists! Logged in successfully.')
        return
      }
      
      // Create admin in Gun.js
      const bootstrapUser = await createGunUser(gun, 'Admin', 'admin123', null)
      console.log('👤 Bootstrap admin created in Gun.js:', bootstrapUser)
      
      // Update allUsers state
      const gunUsers = await getAllGunUsers(gun)
      setAllUsers(gunUsers)
      
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
        
        // Update pending invites where this user accepted
        const pendingInvites = JSON.parse(localStorage.getItem('pendingInvites') || '[]')
        let invitesUpdated = false
        pendingInvites.forEach(invite => {
          if (invite.acceptedBy === user.id) {
            invite.acceptedNickname = newNickname.trim()
            invitesUpdated = true
          }
        })
        if (invitesUpdated) {
          localStorage.setItem('pendingInvites', JSON.stringify(pendingInvites))
          setPendingInvites(pendingInvites)
          console.log('✅ Updated invites with new nickname')
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
    
    // Clear both session storages
    sessionStorage.removeItem('savedSession')
    localStorage.removeItem('savedSession')
    
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
      console.log(`📡 Announcing presence: ${action} for ${currentUser.nickname}`, presenceData)
      // Use put instead of set for proper updates
      await gun.get('user_presence').get(currentUser.id).put(presenceData)
      
      // Also update the online_users node for better tracking
      if (action === 'join' || action === 'heartbeat') {
        const onlineData = {
          nickname: currentUser.nickname,
          lastSeen: Date.now(),
          isOnline: true
        }
        await gun.get('online_users').get(currentUser.id).put(onlineData)
        console.log('✅ Updated online_users:', currentUser.nickname, onlineData)
      } else if (action === 'leave') {
        await gun.get('online_users').get(currentUser.id).put({
          nickname: currentUser.nickname,
          lastSeen: Date.now(),
          isOnline: false
        })
        console.log('👋 User marked offline:', currentUser.nickname)
      }
      
      console.log(`✅ Presence announced successfully for ${currentUser.nickname}`)
    } catch (error) {
      console.error('❌ Failed to announce presence:', error)
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

      // For private messages, try WebRTC first, then fallback to Gun.js
      if (activeContact) {
        logger.log('🎥 Attempting WebRTC P2P message to:', activeContact.nickname)
        
        // Try WebRTC first for true P2P
        const webrtcSuccess = await sendWebRTCMessage(activeContact.id, messageToSend)
        
        if (webrtcSuccess) {
          logger.log('✅ Message sent via WebRTC P2P!')
        } else {
          logger.log('⚠️ WebRTC failed, falling back to Gun.js...')
          // Fallback to Gun.js channel
          const channelName = `private_${[user.id, activeContact.id].sort().join('_')}`
          const gunSuccess = await sendP2PMessage(messageToSend, channelName)
          
          if (gunSuccess) {
            logger.log('✅ Message sent via Gun.js fallback')
          } else {
            logger.log('❌ Both WebRTC and Gun.js failed')
          }
        }
      } else {
        // General chat always uses Gun.js
        const channelName = 'general_chat'
        logger.log('📡 Using Gun.js for general chat')
        
        const p2pSuccess = await sendP2PMessage(messageToSend, channelName)
        
        if (p2pSuccess) {
          logger.log('✅ General message sent via Gun.js')
        } else {
          logger.log('❌ Failed to send general message')
        }
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
  const sendTestMessage = (customMessage) => {
    if (!user || !gun) {
      alert('Please login first to send test messages')
      return
    }
    
    const testMsg = customMessage || `Test message from ${user.nickname} at ${new Date().toLocaleTimeString()}`
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

  // Gun.js is now initialized in initializeApp, not here
  // This effect is no longer needed since Gun.js starts immediately

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
                
                // Add mutual friends - new user and inviter
                if (inviteData.fromId) {
                  // Add inviter to new user's friends
                  if (!newUser.friends) newUser.friends = []
                  if (!newUser.friends.includes(inviteData.fromId)) {
                    newUser.friends.push(inviteData.fromId)
                  }
                  
                  // Add new user to inviter's friends
                  const inviterIndex = existingUsers.findIndex(u => u.id === inviteData.fromId)
                  if (inviterIndex !== -1) {
                    if (!existingUsers[inviterIndex].friends) {
                      existingUsers[inviterIndex].friends = []
                    }
                    if (!existingUsers[inviterIndex].friends.includes(newUser.id)) {
                      existingUsers[inviterIndex].friends.push(newUser.id)
                    }
                    console.log('✅ Added mutual friendship:', inviteData.fromNick, '<->', nickname)
                  }
                }
                
                const updatedUsers = [...existingUsers, newUser]
                setAllUsers(updatedUsers)
                localStorage.setItem('users', JSON.stringify(updatedUsers))
                
                // Mark invite as used and remove from pending
                await markInviteUsed(inviteData.id)
                
                // Update pending invite to show who accepted
                const pendingInvites = JSON.parse(localStorage.getItem('pendingInvites') || '[]')
                const inviteIndex = pendingInvites.findIndex(inv => inv.id === inviteData.id)
                if (inviteIndex !== -1) {
                  pendingInvites[inviteIndex].status = 'accepted'
                  pendingInvites[inviteIndex].acceptedBy = newUser.id
                  pendingInvites[inviteIndex].acceptedNickname = nickname
                  pendingInvites[inviteIndex].acceptedAt = Date.now()
                  localStorage.setItem('pendingInvites', JSON.stringify(pendingInvites))
                  console.log('✅ Invite updated with accepter info:', nickname)
                }
                
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
      <div className="app">
        <LoginView 
          onLogin={handleLogin}
          onCreateAdmin={handleCreateAdmin}
          allUsers={allUsers}
        />
      </div>
    )
  }

  if (currentView === 'login-old') {
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
            const rememberMe = e.target.rememberMe.checked
            if (nickname && password) {
              const success = await login(nickname, password, rememberMe)
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
              style={{ marginBottom: '1rem' }}
            />
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}>
              <input
                name="rememberMe"
                type="checkbox"
                defaultChecked
                style={{ cursor: 'pointer' }}
              />
              Remember me
            </label>
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
      <div className="app">
        <NeedInviteView onCreateAdmin={handleCreateAdmin} />
      </div>
    )
  }

  if (currentView === 'needInvite-old') {
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

  if (currentView === 'chat') {
    return (
      <ChatView
        user={user}
        gun={gun}
        messages={messages}
        displayMessages={displayMessages}
        friends={friends}
        onlineUsers={onlineUsers}
        allUsers={allUsers}
        pendingInvites={pendingInvites}
        activeContact={activeContact}
        newMessage={newMessage}
        chatError={chatError}
        messageDeliveryStatus={messageDeliveryStatus}
        connectionStatus={connectionStatus}
        lastSeen={lastSeen}
        initStatus={initStatus}
        debugNotifications={debugNotifications}
        isDev={isDev}
        onMessageChange={(e) => setNewMessage(e.target.value)}
        onSendMessage={sendMessage}
        onContactSelect={setActiveContact}
        onNicknameChange={handleNicknameChange}
        onLogout={logout}
        onInviteCreated={(newInvite) => {
          setPendingInvites(prev => {
            const updated = [...prev, newInvite]
            // Save to localStorage
            localStorage.setItem('pendingInvites', JSON.stringify(updated))
            return updated
          })
        }}
        onSendTestMessage={sendTestMessage}
        onClearCurrentClient={clearCurrentClientData}
        onClearAllClients={clearAllClientsData}
        onForceReload={forceReload}
      />
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
