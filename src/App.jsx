import { useState, useEffect } from 'react'
import { initSodium } from './utils/crypto'
import { generateStartupMagicLink, hasAnyUsers } from './utils/startup'
import Login from './components/Login'
import InviteSetup from './components/InviteSetup'
import Chat from './components/Chat'
import Toast from './components/Toast'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('loading') // loading, login, inviteSetup, chat
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [sodium, setSodium] = useState(null)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      console.log('🔧 Initializing simplified app...')
      const sodiumInstance = await initSodium()
      console.log('Sodium instance received:', !!sodiumInstance)
      setSodium(sodiumInstance)
      
      // Generate startup magic link if needed
      await generateStartupMagicLink()
      
      // Check URL for invitation magic link
      const urlParams = new URLSearchParams(window.location.search)
      const inviteToken = urlParams.get('invite')
      
      if (inviteToken) {
        console.log('🎊 Magic link detected')
        setCurrentView('inviteSetup')
        return
      }
      
      // Check if any users exist
      if (hasAnyUsers()) {
        console.log('✅ Users exist - showing login')
        setCurrentView('login')
      } else {
        console.log('ℹ️ No users yet - need to use magic link')
        setCurrentView('waiting')
      }
      
    } catch (error) {
      console.error('Failed to initialize app:', error)
      showToast('Failed to initialize app', 'error')
    }
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    setCurrentView('chat')
    showToast(`Welcome back ${userData.nickname}!`, 'success')
  }

  const handleInviteComplete = (userData) => {
    setUser(userData)
    setCurrentView('chat')
    showToast(`Welcome ${userData.nickname}!`, 'success')
  }

  const handleLogout = () => {
    setUser(null)
    setCurrentView('login')
    showToast('Logged out', 'info')
  }

  if (currentView === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🔒 Secure Chat</h1>
          <p>Initializing encryption...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (currentView === 'waiting') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🔒 Secure Chat</h1>
          <p>No users registered yet</p>
          <div className="info-box">
            <p><strong>🔗 How to join:</strong></p>
            <ul>
              <li>Click the <strong>🛠️ DEV</strong> button (top-right)</li>
              <li>Copy the <strong>🎫 Magic Link</strong></li>
              <li>Open that link to create your account</li>
              <li>Or share it with others to invite them</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {currentView === 'login' && (
        <Login 
          sodium={sodium}
          onLogin={handleLogin}
          showToast={showToast}
        />
      )}
      
      {currentView === 'inviteSetup' && (
        <InviteSetup 
          sodium={sodium}
          onComplete={handleInviteComplete}
          showToast={showToast}
        />
      )}
      
      {currentView === 'chat' && user && (
        <Chat 
          user={user}
          sodium={sodium}
          onLogout={handleLogout}
          showToast={showToast}
        />
      )}
      
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App