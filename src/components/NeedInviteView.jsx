export default function NeedInviteView({ onCreateAdmin }) {
  return (
    <div className="screen">
      <div className="form">
        <h1>🔐 Secure P2P Chat</h1>
        <p className="subtitle">Invite-Only Network</p>
        
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '1.5rem', 
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <p style={{ marginBottom: '1rem' }}>
            This is a private chat network. You need an invite to join.
          </p>
          <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
            Ask someone already in the network for an invite link.
          </p>
        </div>
        
        <div style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
          paddingTop: '2rem',
          marginTop: '2rem'
        }}>
          <p style={{ marginBottom: '1rem', fontSize: '0.9em', opacity: 0.7 }}>
            First time? Create the admin account:
          </p>
          <button 
            onClick={onCreateAdmin}
            className="btn btn-primary"
          >
            🛡️ Create Admin Account
          </button>
        </div>
      </div>
    </div>
  )
}