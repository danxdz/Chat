import { useState } from 'react'
import './Chat.css'

function Chat({ user, sodium, onLogout, showToast }) {
  const [showUserInfo, setShowUserInfo] = useState(false)
  
  const handleAddContact = () => {
    showToast('Contact management coming soon', 'info')
  }

  const handleShowUserInfo = () => {
    setShowUserInfo(true)
  }

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="chat-app">
      {/* Header */}
      <header className="app-header">
        <div className="user-info">
          <span className="user-display" onClick={handleShowUserInfo} style={{ cursor: 'pointer' }}>
            {user.nickname} 👤
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
              <p>💬 Start chatting with others</p>
              <p>🔗 Share magic links to invite people</p>
              <p>🔒 All messages end-to-end encrypted</p>
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
              
              <div className="user-info-box">
                <p><strong>🔒 Your Status:</strong></p>
                <ul>
                  <li>✅ Securely connected to chat</li>
                  <li>🔐 All messages encrypted locally</li>
                  <li>🎫 Use magic links to invite others</li>
                  <li>👥 Equal access for all users</li>
                  {user.invitedBy && <li>📧 Invited by: {user.invitedBy}</li>}
                </ul>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ color: '#888', fontSize: '14px' }}>
                  Click the <strong>🛠️ DEV</strong> button to get magic links for inviting others
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* User Info Modal */}
      {showUserInfo && (
        <div className="modal-overlay" onClick={() => setShowUserInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 User Information</h3>
              <button 
                className="btn-close"
                onClick={() => setShowUserInfo(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                <div className="detail-row">
                  <span>Nickname:</span>
                  <span>{user.nickname}</span>
                </div>
                {user.invitedBy && (
                  <div className="detail-row">
                    <span>Invited by:</span>
                    <span>{user.invitedBy}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span>Account type:</span>
                  <span>Standard User</span>
                </div>
                <div className="detail-row">
                  <span>Encryption:</span>
                  <span>✅ PIN-based local encryption</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span>🔒 Secure session active</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn secondary"
                onClick={() => setShowUserInfo(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat