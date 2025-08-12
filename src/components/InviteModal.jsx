export default function InviteModal({ 
  isVisible, 
  inviteLink, 
  onClose, 
  onGenerateInvite, 
  onCopyInvite 
}) {
  if (!isVisible) return null

  // Truncate link for display
  const truncateLink = (link) => {
    if (!link) return ''
    if (link.length <= 40) return link
    return link.substring(0, 20) + '...' + link.substring(link.length - 15)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#2d2d2d',
        padding: window.innerWidth < 480 ? '1rem' : '2rem',
        borderRadius: '8px',
        width: '95%',
        maxWidth: '500px',
        margin: '1rem'
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>🔗 Invite Someone</h2>
        
        {!inviteLink ? (
          <button onClick={onGenerateInvite} className="btn" style={{ width: '100%' }}>
            Generate Invite Link
          </button>
        ) : (
          <div>
            <p>Share this link to invite someone:</p>
            <div style={{
              background: '#333',
              padding: '1rem',
              borderRadius: '4px',
              marginTop: '0.5rem',
              fontFamily: 'monospace',
              fontSize: window.innerWidth < 480 ? '0.8rem' : '1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {truncateLink(inviteLink)}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={onCopyInvite} 
                className="btn" 
                style={{ 
                  background: '#0066cc',
                  flex: '1',
                  minWidth: '120px'
                }}
              >
                📋 Copy Link
              </button>
              <button 
                onClick={onClose} 
                className="btn" 
                style={{ 
                  background: '#666',
                  flex: '1',
                  minWidth: '120px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}