import './Chat.css'

function Chat({ user, sodium, onLogout, showToast }) {
  
  const handleCreateInvite = () => {
    if (!user.isAdmin) {
      showToast('Only administrators can create invitations', 'error')
      return
    }
    
    // Generate a secure invite link with connection info
    const inviteData = {
      nickname: user.nickname,
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(2, 15),
      adminInvite: true
    }
    
    // Create invite URL
    const inviteParams = btoa(JSON.stringify(inviteData))
    const inviteUrl = `${window.location.origin}?invite=${inviteParams}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('Magic link copied to clipboard!', 'success')
    }).catch(() => {
      // Fallback: show the link in a prompt
      prompt('Copy this magic link:', inviteUrl)
    })
  }
  
  const handleAddContact = () => {
    showToast('Contact management coming soon', 'info')
  }

  return (
    <div className="chat-app">
      {/* Header */}
      <header className="app-header">
        <div className="user-info">
          <span className="user-display">
            {user.nickname} {user.isAdmin && '👑'}
          </span>
          <button className="btn secondary small" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Contacts</h3>
            <div className="actions">
              {user.isAdmin && (
                <button 
                  className="btn-icon" 
                  title="Create Magic Link"
                  onClick={handleCreateInvite}
                >
                  📧
                </button>
              )}
              <button 
                className="btn-icon" 
                title="Add Contact"
                onClick={handleAddContact}
              >
                ➕
              </button>
            </div>
          </div>
          <div className="contacts">
            <div className="empty-state">
              <p>No contacts yet</p>
              {user.isAdmin ? (
                <>
                  <p>📧 Create magic links to invite users</p>
                  <p>➕ Manage all participants</p>
                </>
              ) : (
                <>
                  <p>Wait for contacts to be added</p>
                  {user.invitedBy && <p>Invited by: {user.invitedBy}</p>}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="chat">
          <div className="chat-messages">
            <div className="welcome">
              <h3>🔒 Secure Chat</h3>
              <p>End-to-end encrypted messaging</p>
              <p>Select a contact to start chatting</p>
              
              {user.isAdmin ? (
                <div className="admin-info">
                  <p><strong>👑 Admin Features:</strong></p>
                  <ul>
                    <li>📧 Create magic links for new users</li>
                    <li>👥 Manage all chat participants</li>
                    <li>🔒 Full access to all features</li>
                    <li>🛡️ System administration</li>
                  </ul>
                </div>
              ) : (
                <div className="user-info-box">
                  <p><strong>🔒 Your Status:</strong></p>
                  <ul>
                    <li>✅ Securely connected to chat</li>
                    <li>🔐 All messages encrypted locally</li>
                    <li>🚫 No registration without invitation</li>
                    {user.invitedBy && <li>📧 Invited by: {user.invitedBy}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Chat