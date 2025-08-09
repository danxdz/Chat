import { useState, useEffect } from 'react'
import { initSodium } from './utils/crypto'
import AdminSetup from './components/AdminSetup'
import Login from './components/Login'
import InviteSetup from './components/InviteSetup'
import Chat from './components/Chat'
import Toast from './components/Toast'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('loading') // loading, adminSetup, login, inviteSetup, chat
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [sodium, setSodium] = useState(null)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      console.log('🔧 Initializing app...')
      
      // Initialize libsodium
      const sodiumInstance = await initSodium()
      setSodium(sodiumInstance)
      
      // Check URL for invitation
      const urlParams = new URLSearchParams(window.location.search)
      const inviteToken = urlParams.get('invite')
      
      if (inviteToken) {
        console.log('🎊 Magic link detected')
        setCurrentView('inviteSetup')
        return
      }
      
      // Check if admin account exists
      const adminExists = localStorage.getItem('adminAccountCreated') === 'true'
      
      if (!adminExists) {
        console.log('🔧 No admin exists - showing admin creation')
        setCurrentView('adminSetup')
      } else {
        console.log('✅ Admin exists - showing login')
        setCurrentView('login')
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

  const handleAdminCreated = (userData) => {
    setUser(userData)
    setCurrentView('chat')
    showToast(`Welcome ${userData.nickname}!`, 'success')
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

  return (
    <div className="app">
      {currentView === 'adminSetup' && (
        <AdminSetup 
          sodium={sodium}
          onAdminCreated={handleAdminCreated}
          showToast={showToast}
        />
      )}
      
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