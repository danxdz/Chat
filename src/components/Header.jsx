import { useState, useEffect } from 'react'

export default function Header({ 
  user, 
  activeContact, 
  initStatus,
  onlineUsers,
  totalUsers,
  connectionStatus,
  onShowInvite, 
  onShowTests, 
  onChangeNickname,
  onLogout
}) {
  const [showDevMenu, setShowDevMenu] = useState(false)

  // Close dev menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDevMenu && !event.target.closest('.action-buttons')) {
        setShowDevMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDevMenu])

  return (
    <div className="header" style={{ 
      padding: '0.8rem 1rem', 
      background: 'rgba(0, 0, 0, 0.9)', 
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      minHeight: '60px',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000
    }}>
      {/* Left side - Simplified user info */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        flex: '1',
        minWidth: 0 // Allow flex item to shrink
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.8rem',
          background: 'rgba(255, 255, 255, 0.08)',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: '#4CAF50',
            flexShrink: 0,
            boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)'
          }}></div>
          <span style={{ 
            fontSize: '1rem', 
            fontWeight: '600',
            color: '#ffffff',
            whiteSpace: 'nowrap'
          }}>
            {user.nickname}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0,
          flex: 1
        }}>
          <div style={{ 
            color: '#ffffff', 
            fontSize: '0.9rem',
            fontWeight: '500',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {activeContact ? `💬 ${activeContact.nickname}` : '🌐 General Chat'}
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: 'rgba(255, 255, 255, 0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.8rem' 
          }}>
            <span>{initStatus}</span>
            <span style={{ color: '#4CAF50' }}>
              👥 {onlineUsers}/{totalUsers} online
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Minimalist actions */}
      <div className="action-buttons" style={{ 
        display: 'flex', 
        gap: '0.8rem', 
        alignItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}>
        <button 
          onClick={onShowInvite} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.8rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1.2rem',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          title="Create secure invite"
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.15)'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          📤
        </button>
        
        <button 
          onClick={() => setShowDevMenu(!showDevMenu)}
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.8rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1.2rem',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          title="Developer menu"
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.15)'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          ⚙️
        </button>
        
        {showDevMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            zIndex: 1002,
            minWidth: '160px',
            marginTop: '0.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => {
                onShowTests()
                setShowDevMenu(false)
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              🧪 Run Tests
            </button>
            
            <button
              onClick={() => {
                onChangeNickname()
                setShowDevMenu(false)
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              ✏️ Change Nickname
            </button>
            
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 1rem' }}></div>
            
            <button
              onClick={() => {
                onLogout()
                setShowDevMenu(false)
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ff6b6b',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 107, 107, 0.1)'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}