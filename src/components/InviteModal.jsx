import { useState } from 'react'

export default function InviteModal({ 
  isVisible, 
  inviteLink, 
  onClose, 
  onGenerateInvite, 
  onCopyInvite 
}) {
  const [copied, setCopied] = useState(false)
  
  if (!isVisible) return null

  const handleCopy = () => {
    onCopyInvite()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        padding: '2rem',
        borderRadius: '8px',
        width: '95%',
        maxWidth: '500px',
        margin: '1rem'
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>🔗 Share Invite Link</h2>
        
        {!inviteLink ? (
          <button onClick={onGenerateInvite} className="btn" style={{ width: '100%' }}>
            Generate Magic Link
          </button>
        ) : (
          <div>
            <p>Share this link with friends to invite them to chat:</p>
            <div style={{
              background: '#333',
              padding: '1rem',
              borderRadius: '4px',
              marginTop: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              wordBreak: 'break-all'
            }}>
              {inviteLink}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleCopy} 
                className="btn" 
                style={{ 
                  background: copied ? '#28a745' : '#0066cc',
                  flex: '1'
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <button 
                onClick={onClose} 
                className="btn" 
                style={{ 
                  background: '#666',
                  flex: '1'
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