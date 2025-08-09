import { useState, useEffect } from 'react'
import { initSodium } from './utils/crypto'
import UserSetup from './components/UserSetup'
import Login from './components/Login'
import Chat from './components/Chat'
import Toast from './components/Toast'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('loading') // loading, userSetup, login, chat
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
      console.log('Sodium instance received:', !!sodiumInstance)
      setSodium(sodiumInstance)
      
      // Check if user account exists (only flag in plaintext)
      const userExists = localStorage.getItem('hasAccount') === 'true'
      
      if (!userExists) {
        console.log('🔧 No user exists - showing user setup')
        setCurrentView('userSetup')
      } else {
        console.log('✅ User exists - showing login')
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

  const handleUserCreated = (userData) => {
    setUser(userData)
    setCurrentView('chat')
    showToast(`Welcome ${userData.nickname}!`, 'success')
  }

  const handleLogin = (userData) => {
    setUser(userData)
    setCurrentView('chat')
    showToast(`Welcome back ${userData.nickname}!`, 'success')
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
      {currentView === 'userSetup' && (
        <UserSetup 
          sodium={sodium}
          onUserCreated={handleUserCreated}
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