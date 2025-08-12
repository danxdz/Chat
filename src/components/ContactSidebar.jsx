export default function ContactSidebar({ 
  contacts, 
  activeContact, 
  connectionStatus, 
  lastSeen,
  onlineUsers,
  pendingInvites = [],
  onContactSelect
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
  console.log('ContactSidebar - onlineUsers Map:', onlineUsers)
  const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, userData]) => ({
    id,
    nickname: userData.nickname,
    lastSeen: userData.lastSeen,
    isOnline: true
  }))
  console.log('ContactSidebar - onlineUsersList:', onlineUsersList)



  return (
    <div className="sidebar">
      {/* IRC-style online users list */}
      <div className="online-users-header">
        <div className="online-indicator"></div>
        <h3>Online Users ({onlineUsersList.length})</h3>
      </div>
      
      {/* General Chat Button */}
      <button
        onClick={() => onContactSelect(null)}
        className={`general-chat-button ${!activeContact ? 'active' : ''}`}
      >
        <span>🌐</span>
        <span>General Chat</span>
        <span className="online-count">
          {onlineUsersList.length} online
        </span>
      </button>

      {/* IRC-style Online Users List */}
      <div className="online-users-list">
        {onlineUsersList.map(user => (
          <div
            key={user.id}
            className="online-user-item"
          >
            <div className="online-indicator"></div>
            <div className="user-info">
              <div className="nickname">{user.nickname}</div>
              <div className="status">online • {formatLastSeen(user.lastSeen)}</div>
            </div>
          </div>
        ))}
        
        {onlineUsersList.length === 0 && (
          <div className="no-users-online">
            <div>👥</div>
            <div>No users online</div>
            <div>
              Users will appear here when they join
            </div>
          </div>
        )}
      </div>
    </div>
  )
}