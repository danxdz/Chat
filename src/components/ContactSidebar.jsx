import React from 'react'

export default function ContactSidebar({ 
  contacts, 
  activeContact, 
  connectionStatus, 
  lastSeen,
  onlineUsers,
  pendingInvites = [],
  acceptedInvites = [],
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

  // Get online users count
  const onlineCount = onlineUsers ? onlineUsers.size : 0

  // Update contacts with real-time online status
  const contactsWithStatus = contacts.map(contact => ({
    ...contact,
    isOnline: onlineUsers && onlineUsers.has(contact.id),
    lastSeen: lastSeen && lastSeen.get(contact.id)
  }))

  // Sort contacts: online first, then alphabetically
  const sortedContacts = [...contactsWithStatus].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return a.nickname.localeCompare(b.nickname)
  })

  // Combine accepted invites with friends for display
  const acceptedInviteIds = new Set(acceptedInvites.map(inv => inv.friendId))
  const friendsFromInvites = acceptedInvites.filter(inv => 
    !sortedContacts.some(c => c.id === inv.friendId)
  )

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h3>Chats</h3>
        <div className="online-indicator-text">
          {onlineCount} online
        </div>
      </div>
      
      {/* General Chat Button */}
      <button
        onClick={() => onContactSelect(null)}
        className={`chat-item ${!activeContact ? 'active' : ''}`}
      >
        <div className="chat-item-avatar">🌐</div>
        <div className="chat-item-info">
          <div className="chat-item-name">General Chat</div>
          <div className="chat-item-status">Public room • {onlineCount} online</div>
        </div>
      </button>

      {/* Divider */}
      <div className="sidebar-divider">
        <span>Direct Messages ({sortedContacts.length + friendsFromInvites.length})</span>
      </div>

      {/* Friends/Contacts List */}
      <div className="contacts-list">
        {sortedContacts.length > 0 || friendsFromInvites.length > 0 ? (
          <>
            {/* Show regular friends */}
            {sortedContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => onContactSelect(contact)}
                className={`chat-item ${activeContact?.id === contact.id ? 'active' : ''}`}
              >
                <div className="chat-item-avatar">
                  {contact.isOnline ? '🟢' : '⚫'}
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-name">
                    {contact.nickname}
                    {acceptedInviteIds.has(contact.id) && (
                      <span className="new-friend-badge">NEW</span>
                    )}
                  </div>
                  <div className="chat-item-status">
                    {contact.isOnline ? 'Online' : `Last seen ${formatLastSeen(contact.lastSeen)}`}
                  </div>
                </div>
                {/* Unread indicator (for future use) */}
                {contact.unreadCount > 0 && (
                  <div className="unread-badge">{contact.unreadCount}</div>
                )}
              </button>
            ))}
            
            {/* Show friends from accepted invites not in contacts yet */}
            {friendsFromInvites.map(invite => {
              const isOnline = onlineUsers && onlineUsers.has(invite.friendId)
              const friendLastSeen = lastSeen && lastSeen.get(invite.friendId)
              
              return (
                <button
                  key={invite.friendId}
                  onClick={() => onContactSelect({
                    id: invite.friendId,
                    nickname: invite.friendNickname || 'Friend',
                    isOnline: isOnline
                  })}
                  className={`chat-item ${activeContact?.id === invite.friendId ? 'active' : ''}`}
                >
                  <div className="chat-item-avatar">
                    {isOnline ? '🟢' : '⚫'}
                  </div>
                  <div className="chat-item-info">
                    <div className="chat-item-name">
                      {invite.friendNickname || 'Friend'}
                      <span className="new-friend-badge">NEW</span>
                    </div>
                    <div className="chat-item-status">
                      {isOnline ? 'Just joined!' : `Joined ${formatLastSeen(invite.usedAt)}`}
                    </div>
                  </div>
                </button>
              )
            })}
          </>
        ) : (
          <div className="no-contacts">
            <p>No friends yet</p>
            <p className="hint">Ask admin for an invite link to add friends</p>
          </div>
        )}
      </div>

      {/* Pending Invites Section */}
      {pendingInvites && pendingInvites.length > 0 && (
        <>
          <div className="sidebar-divider">
            <span>Pending Invites ({pendingInvites.length})</span>
          </div>
          <div className="pending-invites-list">
            {pendingInvites.map((invite, i) => (
              <div key={invite.id || i} className="pending-invite-item">
                <div className="invite-icon">📨</div>
                <div className="invite-info">
                  <div className="invite-token">
                    {invite.token?.substring(0, 8)}...
                  </div>
                  <div className="invite-status">
                    Waiting • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Connection Status */}
      <div className="sidebar-footer">
        <div className={`connection-status ${connectionStatus}`}>
          <div className="status-dot"></div>
          <span>{connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>
    </div>
  )
}