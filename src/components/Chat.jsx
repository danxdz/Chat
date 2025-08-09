import { useState } from 'react'
import { createMagicLink, getInviteHistory, cleanupExpiredInvites } from '../utils/magicLinks'
import './Chat.css'

function Chat({ user, sodium, onLogout, showToast }) {
  const [showInviteHistory, setShowInviteHistory] = useState(false)
  const [inviteHistory, setInviteHistory] = useState([])
  
  const handleCreateInvite = () => {
    if (!user.isAdmin) {
      showToast('Only administrators can create invitations', 'error')
      return
    }
    
    try {
      console.log('🔗 Creating single-use magic link...')
      
      // Create secure single-use magic link
      const magicLink = createMagicLink(user.nickname, sodium)
      
      // Copy to clipboard
      navigator.clipboard.writeText(magicLink.url).then(() => {
        showToast(`✅ Single-use magic link created! Expires in ${magicLink.expiresIn} hours`, 'success')
      }).catch(() => {
        // Fallback: show the link in a prompt
        prompt('Copy this single-use magic link (expires in 24h):', magicLink.url)
        showToast('Magic link created - check the popup to copy', 'info')
      })
      
      console.log('✅ Magic link created:', {
        id: magicLink.id,
        expires: new Date(magicLink.expiresAt)
      })
      
    } catch (error) {
      console.error('❌ Failed to create magic link:', error)
      showToast('Failed to create magic link: ' + error.message, 'error')
    }
  }
  
  const handleViewInvites = () => {
    if (!user.isAdmin) {
      showToast('Only administrators can view invitations', 'error')
      return
    }
    
    try {
      // Clean up expired invites first
      const cleaned = cleanupExpiredInvites()
      if (cleaned > 0) {
        showToast(`Cleaned up ${cleaned} expired invitations`, 'info')
      }
      
      // Get current invite history
      const history = getInviteHistory()
      setInviteHistory(history)
      setShowInviteHistory(true)
      
      console.log('📊 Loaded invite history:', history.length, 'invitations')
      
    } catch (error) {
      console.error('❌ Failed to load invite history:', error)
      showToast('Failed to load invite history', 'error')
    }
  }
  
  const handleAddContact = () => {
    showToast('Contact management coming soon', 'info')
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
                <>
                  <button 
                    className="btn-icon" 
                    title="Create Single-Use Magic Link"
                    onClick={handleCreateInvite}
                  >
                    📧
                  </button>
                  <button 
                    className="btn-icon" 
                    title="View Invitation History"
                    onClick={handleViewInvites}
                  >
                    📊
                  </button>
                </>
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
                  <p>📧 Create single-use magic links</p>
                  <p>📊 Track invitation usage</p>
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
                    <li>📧 Create single-use magic links (24h expiry)</li>
                    <li>📊 Track invitation usage and status</li>
                    <li>👥 Manage all chat participants</li>
                    <li>🛡️ Full system administration</li>
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

      {/* Invite History Modal */}
      {showInviteHistory && (
        <div className="modal-overlay" onClick={() => setShowInviteHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Invitation History</h3>
              <button 
                className="btn-close"
                onClick={() => setShowInviteHistory(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {inviteHistory.length === 0 ? (
                <div className="empty-state">
                  <p>No invitations created yet</p>
                  <p>Create your first magic link!</p>
                </div>
              ) : (
                <div className="invite-list">
                  {inviteHistory.map((invite) => (
                    <div key={invite.id} className={`invite-item ${invite.status.toLowerCase()}`}>
                      <div className="invite-header">
                        <span className="invite-id">{invite.shortId}</span>
                        <span className={`invite-status ${invite.status.toLowerCase()}`}>
                          {invite.status}
                        </span>
                      </div>
                      <div className="invite-details">
                        <div className="invite-row">
                          <span>Created:</span>
                          <span>{formatDateTime(invite.createdAt)}</span>
                        </div>
                        <div className="invite-row">
                          <span>Expires:</span>
                          <span>{formatDateTime(invite.expiresAt)}</span>
                        </div>
                        {invite.used && (
                          <>
                            <div className="invite-row">
                              <span>Used by:</span>
                              <span>{invite.usedBy}</span>
                            </div>
                            <div className="invite-row">
                              <span>Used at:</span>
                              <span>{formatDateTime(invite.usedAt)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn secondary"
                onClick={() => setShowInviteHistory(false)}
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