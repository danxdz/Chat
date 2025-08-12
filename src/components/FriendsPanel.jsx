export default function FriendsPanel({ 
  friends, 
  pendingInvites, 
  onlineUsers,
  onSelectFriend,
  onSendInvite 
}) {
  return (
    <div className="friends-panel">
      <h3>👥 Friends & Contacts</h3>
      
      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
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
        <h4>👨‍👩‍👧‍👦 My Friends ({friends.length})</h4>
        {friends.length === 0 ? (
          <div className="no-friends">
            <p>No friends added yet</p>
            <button 
              className="btn"
              onClick={onSendInvite}
            >
              Send Invite
            </button>
          </div>
        ) : (
          friends.map(friend => (
            <div 
              key={friend.id} 
              className="friend-item"
              onClick={() => onSelectFriend(friend.nickname)}
            >
              <span className="friend-avatar">👤</span>
              <span className="friend-name">{friend.nickname}</span>
              {onlineUsers.has(friend.id) && (
                <span className="online-indicator">🟢</span>
              )}
            </div>
          ))
        )}
      </div>
      
      <button 
        className="btn add-friend-btn"
        onClick={onSendInvite}
      >
        📨 Send Invite
      </button>
    </div>
  )
}