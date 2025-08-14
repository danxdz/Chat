import { useState, useEffect } from 'react'
import DebugNotifications from './DebugNotifications'

function RegisterView({ 
  debugNotifications, 
  isDev, 
  onRegister, 
  onViewChange 
}) {
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
        onViewChange('needInvite')
      }
    } else {
      console.log('❌ No invite found')
      onViewChange('needInvite')
    }
  }, [onViewChange])
  
  if (!inviteToken) {
    return <div>Loading...</div>
  }

  return (
    <div className="screen">
      <DebugNotifications debugNotifications={debugNotifications} isDev={isDev} />
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
              // Pass invite token directly to register function
              const success = await onRegister(nickname, password, inviteToken)
              console.log('📝 FORM: Register result:', success)
              if (success) {
                console.log('📝 FORM: Registration successful, will automatically login')
              }
            } catch (error) {
              console.error('📝 FORM: Registration form error:', error)
              alert('Registration error: ' + error.message)
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

export default RegisterView