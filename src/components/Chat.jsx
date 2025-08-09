import './Chat.css'

function Chat({ user, sodium, onLogout, showToast }) {
  
  const handleCreateInvite = () => {
    // Generate a simple invite link with connection info
    const inviteData = {
      nickname: user.nickname,
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(2, 15)
    }
    
    // Create invite URL (in real app, this would be signed/encrypted)
    const inviteParams = btoa(JSON.stringify(inviteData))
    const inviteUrl = `${window.location.origin}?invite=${inviteParams}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('Invite link copied to clipboard!', 'success')
    }).catch(() => {
      // Fallback: show the link in a prompt
      prompt('Copy this invite link:', inviteUrl)
    })
  }
  
  const handleAddContact = () => {
    // Check if there's an invite in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const inviteParam = urlParams.get('invite')
    
    if (inviteParam) {
      try {
        const inviteData = JSON.parse(atob(inviteParam))
        showToast(`Adding contact: ${inviteData.nickname}`, 'info')
        // In a real app, this would establish P2P connection
      } catch (error) {
        showToast('Invalid invite link', 'error')
      }
    } else {
      showToast('Paste an invite link to add a contact', 'info')
    }
  }

  return (
    <div className="chat-app">
      {/* Header */}
      <header className="app-header">
        <div className="user-info">
          <span className="user-display">
            {user.nickname}
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
              <button 
                className="btn-icon" 
                title="Create Invite Link"
                onClick={handleCreateInvite}
              >
                📧
              </button>
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
              <p>📧 Create an invite link to share</p>
              <p>➕ Add contacts with their invite links</p>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="chat">
          <div className="chat-messages">
            <div className="welcome">
              <h3>🔒 Secure Chat</h3>
              <p>End-to-end encrypted messaging</p>
              <p>Create invite links to connect with others</p>
              <div className="features-info">
                <p><strong>How to connect:</strong></p>
                <ul>
                  <li>📧 Click the envelope to create an invite link</li>
                  <li>📋 Share the link with someone you want to chat with</li>
                  <li>➕ They click "Add Contact" to connect</li>
                  <li>🔒 All messages are end-to-end encrypted</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Chat