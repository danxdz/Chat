import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createSecureInvite } from '../utils/secureAuth'

const SecureInviteModal = ({ user, gun, onClose, onInviteCreated }) => {
  const [expirationChoice, setExpirationChoice] = useState('1h')
  const [isCreating, setIsCreating] = useState(false)
  const [createdInvite, setCreatedInvite] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const qrRef = useRef(null)

  const expirationOptions = [
    { value: '60s', label: '60 seconds', icon: '⚡' },
    { value: '5m', label: '5 minutes', icon: '🕐' },
    { value: '1h', label: '1 hour', icon: '⏰' },
    { value: '1day', label: '1 day', icon: '📅' }
  ]

  const handleCreateInvite = async () => {
    setIsCreating(true)
    setError('')
    
    try {
      const invite = await createSecureInvite(user, expirationChoice)
      setCreatedInvite(invite)
      
      // Store pending invite in Gun.js for the inviter
      if (gun && user) {
        const { storePendingInvite } = await import('../services/inviteService')
        await storePendingInvite(gun, user.id, invite)
      }
      
      if (onInviteCreated) {
        onInviteCreated(invite)
      }
      
    } catch (err) {
      setError(err.message)
      console.error('Failed to create secure invite:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  if (createdInvite) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}>
        <div style={{
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: window.innerWidth < 400 ? '1rem' : '2rem',
          maxWidth: window.innerWidth < 400 ? '95vw' : '500px',
          width: '100%',
          color: '#fff',
          maxHeight: window.innerWidth < 400 ? '90vh' : 'auto',
          overflow: 'auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: window.innerWidth < 400 ? '1rem' : '1.5rem' }}>
            <div style={{ 
              fontSize: window.innerWidth < 400 ? '2rem' : '3rem', 
              marginBottom: window.innerWidth < 400 ? '0.3rem' : '0.5rem' 
            }}>🎫</div>
            <h2 style={{ 
              margin: '0 0 0.5rem 0', 
              color: '#4CAF50',
              fontSize: window.innerWidth < 400 ? '1.2rem' : '1.5rem'
            }}>Secure Invite Created!</h2>
            <p style={{ 
              margin: 0, 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: window.innerWidth < 400 ? '0.8rem' : '0.9rem',
              lineHeight: '1.3'
            }}>
              Cryptographically signed • Expires in {expirationChoice} • One-time use
            </p>
          </div>

          {/* QR Code and Link Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem',
            alignItems: 'center'
          }}>
            {/* QR Code */}
            <div style={{
              background: 'white',
              padding: window.innerWidth < 400 ? '0.75rem' : '1rem',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div ref={qrRef}>
                <QRCodeSVG 
                  value={createdInvite.inviteUrl} 
                  size={window.innerWidth < 400 ? 120 : 150}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p style={{ 
                margin: '0.3rem 0 0 0', 
                fontSize: '0.7rem', 
                color: '#333',
                fontWeight: '500'
              }}>
                Scan to Join
              </p>
            </div>

            {/* Link Display */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.8rem',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '100%'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.3rem' }}>
                Secure Invite URL:
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.5rem',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontFamily: 'monospace',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {createdInvite.inviteUrl.length > 50 
                  ? '...' + createdInvite.inviteUrl.substring(createdInvite.inviteUrl.length - 45)
                  : createdInvite.inviteUrl}
              </div>
            </div>
          </div>

          {createdInvite && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.8rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.8rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)' }}>Expires At</div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                {new Date(createdInvite.expiresAt).toLocaleString()}
              </div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.8rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)' }}>Invite ID</div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                {createdInvite.inviteId.substring(0, 8)}...
              </div>
            </div>
          </div>
          )}

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              onClick={() => copyToClipboard(createdInvite.inviteUrl)}
              style={{
                flex: 1,
                padding: '0.8rem 1.5rem',
                background: copied ? 'linear-gradient(135deg, #28a745, #218838)' : 'linear-gradient(135deg, #4CAF50, #45a049)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.8rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              ✅ Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: window.innerWidth < 400 ? '1rem' : '2rem',
        maxWidth: window.innerWidth < 400 ? '95vw' : '400px',
        width: '100%',
        color: '#fff',
        maxHeight: window.innerWidth < 400 ? '90vh' : 'auto',
        overflow: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: window.innerWidth < 400 ? '1rem' : '1.5rem' }}>
          <div style={{ 
            fontSize: window.innerWidth < 400 ? '2rem' : '3rem', 
            marginBottom: window.innerWidth < 400 ? '0.3rem' : '0.5rem' 
          }}>🔐</div>
          <h2 style={{ 
            margin: '0 0 0.5rem 0',
            fontSize: window.innerWidth < 400 ? '1.2rem' : '1.5rem'
          }}>Create Secure Invite</h2>
          <p style={{ 
            margin: 0, 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: window.innerWidth < 400 ? '0.8rem' : '0.9rem',
            lineHeight: '1.3'
          }}>
            Cryptographically signed • One-time use • Choose expiration
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '0.9rem', 
            fontWeight: '600', 
            marginBottom: '0.8rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            ⏰ Expiration Time:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.8rem'
          }}>
            {expirationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setExpirationChoice(option.value)}
                style={{
                  padding: '0.8rem',
                  background: expirationChoice === option.value 
                    ? 'linear-gradient(135deg, #0066cc, #0052a3)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  border: expirationChoice === option.value 
                    ? '1px solid #0066cc' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (expirationChoice !== option.value) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                onMouseOut={(e) => {
                  if (expirationChoice !== option.value) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
              >
                <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>
                  {option.icon}
                </div>
                <div style={{ fontWeight: '600' }}>
                  {option.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '0.8rem',
            marginBottom: '1.5rem',
            color: '#ff6b6b',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.8rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateInvite}
            disabled={isCreating}
            style={{
              flex: 1,
              padding: '0.8rem 1.5rem',
              background: isCreating 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!isCreating) {
                e.target.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseOut={(e) => {
              if (!isCreating) {
                e.target.style.transform = 'translateY(0)'
              }
            }}
          >
            {isCreating ? '⏳ Creating...' : '🎫 Create Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SecureInviteModal