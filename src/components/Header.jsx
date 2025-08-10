import { useState, useEffect } from 'react'

export default function Header({ 
  user, 
  activeContact, 
  initStatus,
  connectedPeers,
  connectionStatus,
  onShowInvite, 
  onShowTests, 
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
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '0.4rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#4CAF50',
            flexShrink: 0 
          }}></div>
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: '500',
            color: '#ffffff'
          }}>
            {user.nickname}
          </span>
        </div>
        
        <div style={{ flex: 1, fontSize: '0.8rem', overflow: 'hidden' }}>
          <div style={{ color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeContact ? `Chat with ${activeContact.nickname}` : 'General Chat'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Status: {initStatus}</span>
            {connectedPeers > 0 && (
              <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                🟢 {connectedPeers} peers
              </span>
            )}
            {activeContact && (
              <span style={{ 
                color: connectionStatus.get(activeContact.id) === 'connected' ? '#4CAF50' : '#666',
                fontSize: '0.6rem'
              }}>
                {connectionStatus.get(activeContact.id) === 'connected' ? '● online' : '○ offline'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Minimalist actions */}
      <div className="action-buttons" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        alignItems: 'center',
        flexShrink: 0,
        position: 'relative'
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