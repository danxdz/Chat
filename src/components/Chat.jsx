import './Chat.css'

function Chat({ user, sodium, onLogout, showToast }) {
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
                  title="Create Invitation"
                  onClick={() => showToast('Invitation system coming soon', 'info')}
                >
                  📧
                </button>
              )}
              <button 
                className="btn-icon" 
                title="Add Contact"
                onClick={() => showToast('Contact management coming soon', 'info')}
              >
                ➕
              </button>
            </div>
          </div>
          <div className="contacts">
            <div className="empty-state">
              <p>No contacts yet</p>
              <p>Add contacts to start chatting</p>
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
              {user.isAdmin && (
                <div className="admin-info">
                  <p><strong>Admin Features:</strong></p>
                  <ul>
                    <li>Create invitation links</li>
                    <li>Manage all contacts</li>
                    <li>System administration</li>
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