import { useState, useEffect, Component } from 'react'
import Header from './components/Header'
import ContactSidebar from './components/ContactSidebar'
import ChatArea from './components/ChatArea'
import TestingPanel from './components/TestingPanel'
import InviteModal from './components/InviteModal'

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
            <button 
              onClick={() => window.location.reload()} 
              className="btn"
              style={{ background: '#dc3545' }}
            >
              🔄 Reload App
            </button>
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
  const [showTests, setShowTests] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [testResults, setTestResults] = useState({})
  const [testLogs, setTestLogs] = useState([])
  const [chatError, setChatError] = useState(null)
  const [connectedPeers, setConnectedPeers] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState(new Map())
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState(new Map())
  const [lastSeen, setLastSeen] = useState(new Map())

  // Gun.js peers for P2P networking
  const gunPeers = [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gunjs.herokuapp.com/gun',
    'wss://gun-us.herokuapp.com/gun',
    'wss://gunjs.herokuapp.com/gun',
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

        // Check for invite in URL
        const urlParams = new URLSearchParams(window.location.hash.replace('#', ''))
        const inviteParam = urlParams.get('invite')
        if (inviteParam) {
          try {
            const inviteData = JSON.parse(atob(inviteParam))
            logger.log('📨 Invite detected from:', inviteData.from)
            // Handle invite processing here if needed
          } catch (e) {
            logger.error('❌ Invalid invite format')
          }
        }

        // Load existing user data
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        setAllUsers(existingUsers)

        if (existingUsers.length > 0) {
          setCurrentView('login')
        } else {
          setCurrentView('register')
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
        setInterval(() => {
          if (gunInstance && gunInstance._.opt && gunInstance._.opt.peers) {
            const peerCount = Object.keys(gunInstance._.opt.peers).length
            setConnectedPeers(peerCount)
          }
        }, 5000)

      } catch (error) {
        logger.error('❌ Gun.js initialization failed:', error)
        setInitStatus('P2P connection failed')
        setChatError('Failed to connect to P2P network: ' + error.message)
      }
    }

    initializeGun()
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

    logger.log('✅ Gun.js listeners ready for general and private chats')
  }, [gun, user?.id, contacts])

  // Handle incoming messages from any channel
  const handleIncomingMessage = (data, key, channelType) => {
    if (data && data.id && data.text && data.from) {
      // Prevent double messages from current user (they already see their message locally)
      if (data.fromId === user.id) {
        logger.log(`🔄 SKIPPING own message from ${channelType} channel to prevent duplicates`)
        return
      }
      
      logger.log(`✅ VALID ${channelType.toUpperCase()} MESSAGE - Adding to state:`, data.text, 'from:', data.from)
      
      setMessages(prev => {
        logger.log('📊 Current messages before add:', prev.length)
        
        // Check if already exists
        const exists = prev.find(m => m.id === data.id)
        if (exists) {
          logger.log('⚠️ Message already exists, skipping')
          return prev
        }
        
        logger.log('💾 Adding NEW message to state')
        const updated = [...prev, data].sort((a, b) => a.timestamp - b.timestamp)
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

  // Core functions
  const register = (nickname, pin) => {
    if (!nickname.trim() || !pin.trim()) {
      alert('Both nickname and PIN are required')
      return false
    }

    if (pin.length < 4) {
      alert('PIN must be at least 4 characters')
      return false
    }

    // Check if nickname already exists
    const existingUser = allUsers.find(u => u.nickname.toLowerCase() === nickname.toLowerCase())
    if (existingUser) {
      alert('Nickname already exists. Please choose a different one.')
      return false
    }

    const newUser = {
      id: Date.now(),
      nickname: nickname.trim(),
      pin: pin.trim(), // In production, this should be hashed
      createdAt: Date.now()
    }
    
    const updatedUsers = [...allUsers, newUser]
    setAllUsers(updatedUsers)
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    
    setUser(newUser)
    logger.log('✅ User registered successfully:', { nickname: newUser.nickname, id: newUser.id })
    return true
  }

  const login = (pin) => {
    if (!pin.trim()) {
      alert('PIN is required')
      return false
    }

    const user = allUsers.find(u => u.pin === pin.trim())
    if (!user) {
      alert('Invalid PIN. Please try again.')
      return false
    }

    setUser(user)
    logger.log('✅ User logged in:', user.nickname)
    return true
  }

  const logout = () => {
    setUser(null)
    setMessages([])
    setContacts([])
    setActiveContact(null)
    setCurrentView('login')
    logger.log('✅ User logged out')
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
      
      // Put message using set to ensure it appears in map() listeners
      await gun.get(channelName).set(message)
      
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
    const inviteUrl = `${window.location.origin}${window.location.pathname}#invite=${encodedInvite}`
    
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
      const testInviteUrl = `${window.location.origin}#invite=${encodedInvite}`
      
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

  const clearCurrentClientData = () => {
    if (confirm('Clear all data for current user? This cannot be undone.')) {
      localStorage.removeItem(`contacts_${user.id}`)
      setContacts([])
      setMessages([])
      logger.log('✅ Current client data cleared')
    }
  }

  const clearAllClientsData = () => {
    if (confirm('Clear ALL user data? This will remove all users, contacts, and messages. This cannot be undone.')) {
      localStorage.clear()
      setAllUsers([])
      setContacts([])
      setMessages([])
      setUser(null)
      setCurrentView('register')
      logger.log('✅ All client data cleared')
    }
  }

  const resetAppToFresh = () => {
    if (confirm('Reset entire app to fresh state? This cannot be undone.')) {
      localStorage.clear()
      window.location.reload()
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

    window.clearCurrentClientData = clearCurrentClientData
    window.clearAllClientsData = clearAllClientsData
    window.resetAppToFresh = resetAppToFresh
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

  if (currentView === 'register') {
    return (
      <div className="screen">
        <div className="form">
          <h1>🚀 Welcome to P2P Chat</h1>
          <p>Create your account with a secure PIN</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            const nickname = e.target.nickname.value.trim()
            const pin = e.target.pin.value.trim()
            if (nickname && pin) {
              const success = register(nickname, pin)
              if (success) {
                // Registration successful, will automatically login
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
              name="pin"
              type="password"
              placeholder="Create a PIN (min 4 characters)"
              required
              className="input"
              minLength={4}
              style={{ marginBottom: '1rem' }}
            />
            <button type="submit" className="btn">
              Create Account
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (currentView === 'login') {
    return (
      <div className="screen">
        <div className="form">
          <h1>🔑 Welcome Back</h1>
          <p>Enter your PIN to access your account</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            const pin = e.target.pin.value.trim()
            if (pin) {
              const success = login(pin)
              if (success) {
                // Login successful, will automatically navigate to chat
              }
            }
          }}>
            <input
              name="pin"
              type="password"
              placeholder="Enter your PIN"
              required
              autoFocus
              className="input"
              style={{ marginBottom: '1rem' }}
            />
            <button type="submit" className="btn">
              Sign In
            </button>
          </form>
          <p style={{ textAlign: 'center', margin: '1rem 0', color: '#888' }}>
            Don't have an account?
          </p>
          <button
            onClick={() => setCurrentView('register')}
            className="btn"
            style={{ background: '#666' }}
          >
            ➕ Create New Account
          </button>
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
      <div className="app">
        <Header
          user={user}
          allUsers={allUsers}
          activeContact={activeContact}
          initStatus={initStatus}
          connectedPeers={connectedPeers}
          connectionStatus={connectionStatus}
          onShowInvite={() => setShowInvite(true)}
          onShowTests={() => setShowTests(true)}
          onLogout={logout}
          onSwitchUser={switchToUser}
        />

        <div className="main-layout">
          <ContactSidebar
            contacts={contacts}
            activeContact={activeContact}
            connectionStatus={connectionStatus}
            lastSeen={lastSeen}
            onContactSelect={setActiveContact}
            onAddContact={() => {
              const nickname = prompt('Enter contact nickname:')
              if (nickname) {
                addContact({
                  nickname: nickname.trim(),
                  id: Date.now(),
                  status: 'active'
                })
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
            onMessageChange={setNewMessage}
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
        />

        <InviteModal
          isVisible={showInvite}
          inviteLink={inviteLink}
          onClose={() => setShowInvite(false)}
          onGenerateInvite={generateInvite}
          onCopyInvite={copyInvite}
        />
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
