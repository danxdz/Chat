export default function InviteModal({ 
  isVisible, 
  inviteLink, 
  onClose, 
  onGenerateInvite, 
  onCopyInvite 
}) {
  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#333',
        padding: '1.5rem',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>📤 Generate Invite Link</h3>
        
        <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Create a magic link to invite someone to join the chat. 
          They can use this link to automatically connect to your P2P network.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            onClick={onGenerateInvite}
            style={{
              background: '#0066cc',
              border: 'none',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            🔗 Generate New Link
          </button>
          
          {inviteLink && (
            <button 
              onClick={onCopyInvite}
              style={{
                background: '#28a745',
                border: 'none',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              📋 Copy Link
            </button>
          )}
        </div>

        {inviteLink && (
          <div style={{
            background: '#444',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <p style={{ color: '#ccc', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              🔗 Invite Link:
            </p>
            <div style={{
              background: '#222',
              padding: '0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#4CAF50',
              wordBreak: 'break-all',
              maxHeight: '100px',
              overflowY: 'auto'
            }}>
              {inviteLink}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button 
            onClick={onClose}
            style={{
              background: '#666',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}