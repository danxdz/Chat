export default function FriendsPanel({ 
  friends = [], 
  pendingInvites = [], 
  onlineUsers = new Set(),
  onSelectFriend = () => {},
  onSendInvite = () => {}
}) {
  return (
    <div className="friends-panel" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem',
      background: '#1a1a1a',
      overflow: 'auto'
    }}>
      <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>👥 Friends & Invites</h2>
      
      {/* Pending Invites Section */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="pending-invites-section">
          <h4>📨 Pending Invites ({pendingInvites.length})</h4>
          {pendingInvites.map(invite => (
            <div key={invite.id} className="pending-invite-item">
              <span className="invite-status">⏳</span>
              <div className="invite-info">
                <div className="invite-id">Invite #{invite.id.slice(-6)}</div>
                <div className="invite-time">
                  {new Date(invite.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Friends List */}
      <div className="friends-list-section">
        <h4>👨‍👩‍👧‍👦 My Friends ({friends ? friends.length : 0})</h4>
        {!friends || friends.length === 0 ? (
          <div className="no-friends">
            <p>No friends added yet</p>
            <p style={{ fontSize: '0.85rem', color: '#999' }}>
              Send an invite to add friends
            </p>
          </div>
        ) : (
          friends.map(friend => (
            <div 
              key={friend.id} 
              className="friend-item"
              onClick={() => onSelectFriend && onSelectFriend(friend.nickname)}
              style={{ cursor: 'pointer' }}
            >
              <span className="friend-avatar">👤</span>
              <span className="friend-name">{friend.nickname || 'Unknown'}</span>
              {onlineUsers && onlineUsers.has && onlineUsers.has(friend.id) && (
                <span className="online-indicator">🟢</span>
              )}
            </div>
          ))
        )}
      </div>
      
      <button 
        className="btn add-friend-btn"
        onClick={onSendInvite}
        style={{ marginTop: '1rem' }}
      >
        📨 Send New Invite
      </button>
    </div>
  )
}