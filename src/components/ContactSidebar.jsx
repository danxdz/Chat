import logger from '../utils/logger'

export default function ContactSidebar({ 
  contacts, 
  activeContact, 
  connectionStatus, 
  lastSeen,
  onlineUsers,
  onContactSelect, 
  onAddContact 
}) {
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // Convert online users Map to array for display
  const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, userData]) => ({
    id,
    nickname: userData.nickname,
    lastSeen: userData.lastSeen,
    isOnline: true
  }))

  // Debug logging
  logger.log('👥 ContactSidebar Debug:', {
    onlineUsersMapSize: onlineUsers.size,
    onlineUsersEntries: Array.from(onlineUsers.entries()),
    onlineUsersList: onlineUsersList,
    onlineUsersListLength: onlineUsersList.length
  })

  return (
    <div className="sidebar" style={{ 
      width: window.innerWidth < 768 ? '100%' : '280px',
      height: window.innerWidth < 768 ? '120px' : 'auto',
      background: 'rgba(0, 0, 0, 0.8)', 
      backdropFilter: 'blur(10px)',
      borderRight: window.innerWidth < 768 ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
      borderBottom: window.innerWidth < 768 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      {/* IRC-style online users list */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        marginBottom: '1rem',
        padding: '0.8rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: '#4CAF50',
          boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)' 
        }}></div>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '600' }}>
          Online Users ({onlineUsersList.length})
        </h3>
      </div>
      
      {/* General Chat Button */}
      <button
        onClick={() => onContactSelect(null)}
        style={{
          width: '100%',
          padding: '0.8rem',
          background: !activeContact ? 'rgba(0, 102, 204, 0.8)' : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.9rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(5px)'
        }}
        onMouseOver={(e) => {
          if (!activeContact) return
          e.target.style.background = 'rgba(255, 255, 255, 0.1)'
        }}
        onMouseOut={(e) => {
          if (!activeContact) return
          e.target.style.background = 'rgba(255, 255, 255, 0.05)'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🌐</span>
        <span style={{ fontWeight: '600' }}>General Chat</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          {onlineUsersList.length} online
        </span>
      </button>

      {/* IRC-style Online Users List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {onlineUsersList.map(user => (
          <div
            key={user.id}
            style={{
              padding: '0.8rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: '#4CAF50',
              flexShrink: 0,
              boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)',
              animation: 'pulse 2s infinite'
            }}></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '600', 
                color: '#ffffff',
                fontSize: '0.9rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.nickname}
              </div>
              <div style={{ 
                fontSize: '0.7rem', 
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '0.2rem'
              }}>
                online • {formatLastSeen(user.lastSeen)}
                             </div>
             </div>
           </div>
        ))}
        
        {onlineUsersList.length === 0 && (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.9rem'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <div>No users online</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
              Users will appear here when they join
            </div>
          </div>
        )}
      </div>
    </div>
  )
}