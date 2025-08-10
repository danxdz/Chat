import { useState } from 'react'

export default function Header({ 
  user, 
  allUsers, 
  activeContact, 
  initStatus, 
  onShowInvite, 
  onShowTests, 
  onLogout, 
  onSwitchUser 
}) {
  const [showUserSwitcher, setShowUserSwitcher] = useState(false)

  const handleSwitchUser = (targetUser) => {
    onSwitchUser(targetUser)
    setShowUserSwitcher(false)
  }

  const createTestUsers = () => {
    window.createTestUsers()
    setShowUserSwitcher(false)
    setTimeout(() => window.location.reload(), 100)
  }

  return (
    <div className="header" style={{ 
      padding: '0.5rem 1rem', 
      background: '#2d2d2d', 
      borderBottom: '1px solid #555',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '0.5rem',
      minHeight: '60px'
    }}>
      {/* Left side - User info and status */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        flex: '1', 
        minWidth: '200px',
        maxWidth: 'calc(100% - 220px)'
      }}>
        <div style={{ position: 'relative' }}>
          <button
            className="user-button"
            onClick={() => setShowUserSwitcher(!showUserSwitcher)}
            style={{
              background: '#444',
              border: 'none',
              color: 'white',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap'
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
                  onClick={() => handleSwitchUser(u)}
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
                  onClick={createTestUsers}
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
        
        <div style={{ flex: 1, fontSize: '0.8rem', overflow: 'hidden' }}>
          <div style={{ color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeContact ? `Chat with ${activeContact.nickname}` : 'General Chat'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>
            Status: {initStatus}
          </div>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="action-buttons" style={{ 
        display: 'flex', 
        gap: '0.4rem', 
        alignItems: 'center',
        flexShrink: 0,
        minWidth: 'auto'
      }}>
        <button 
          onClick={onShowInvite} 
          className="btn" 
          style={{ 
            background: '#0066cc', 
            border: 'none',
            color: 'white',
            padding: '0.5rem 0.7rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            minHeight: '36px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          title="Generate invite link"
        >
          📤 <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Invite</span>
        </button>
        
        <button 
          onClick={onShowTests}
          className="btn" 
          style={{ 
            background: '#28a745', 
            border: 'none',
            color: 'white',
            padding: '0.5rem 0.7rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            minHeight: '36px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          title="Run tests and diagnostics"
        >
          🧪 <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Tests</span>
        </button>
        
        <button 
          onClick={onLogout} 
          className="btn" 
          style={{ 
            background: '#dc3545', 
            border: 'none',
            color: 'white',
            padding: '0.5rem 0.7rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            minHeight: '36px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
          title="Logout and return to registration"
        >
          🚪 <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Logout</span>
        </button>
      </div>
    </div>
  )
}