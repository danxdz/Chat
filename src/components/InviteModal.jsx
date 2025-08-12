import { useState, useRef, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function InviteModal({ 
  isVisible, 
  inviteLink, 
  onClose, 
  onGenerateInvite, 
  onCopyInvite 
}) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef(null)
  
  // Auto-generate invite link when modal opens
  useEffect(() => {
    if (isVisible && !inviteLink) {
      onGenerateInvite()
    }
  }, [isVisible])
  
  if (!isVisible) return null

  const handleCopy = () => {
    onCopyInvite()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    const svg = qrRef.current.querySelector('svg')
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      
      const downloadLink = document.createElement('a')
      downloadLink.download = 'chat-invite-qr.png'
      downloadLink.href = pngFile
      downloadLink.click()
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
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
        padding: window.innerWidth < 400 ? '1rem' : '2rem',
        borderRadius: '8px',
        width: '95%',
        maxWidth: window.innerWidth < 400 ? '320px' : '500px',
        maxHeight: window.innerWidth < 400 ? '80vh' : 'auto',
        overflowY: 'auto',
        margin: '1rem'
      }}>
        <h2 style={{ 
          margin: '0 0 1rem 0',
          fontSize: window.innerWidth < 400 ? '1.2rem' : '1.5rem'
        }}>🔗 Share Invite</h2>
        
        {!inviteLink ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            <p>Generating invite link...</p>
          </div>
        ) : (
          <div>
            <p style={{ 
              marginBottom: '1rem',
              fontSize: window.innerWidth < 400 ? '0.85rem' : '1rem'
            }}>Share with friends:</p>
            
            {/* QR Code Section */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: window.innerWidth < 400 ? '0.75rem' : '1.5rem',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              {/* QR Code */}
              <div style={{
                background: 'white',
                padding: window.innerWidth < 400 ? '0.75rem' : '1rem',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 'fit-content'
              }}>
                <div ref={qrRef}>
                  <QRCodeSVG 
                    value={inviteLink} 
                    size={window.innerWidth < 400 ? 120 : 200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p style={{ 
                  margin: '0.3rem 0 0 0', 
                  fontSize: window.innerWidth < 400 ? '0.7rem' : '0.85rem', 
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Scan to Join
                </p>
                <button
                  onClick={downloadQR}
                  style={{
                    marginTop: '0.3rem',
                    padding: window.innerWidth < 400 ? '0.2rem 0.6rem' : '0.3rem 0.8rem',
                    fontSize: window.innerWidth < 400 ? '0.7rem' : '0.75rem',
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  💾 Save
                </button>
              </div>

              {/* OR Divider for mobile */}
              {window.innerWidth < 600 && (
                <div style={{ 
                  color: '#999', 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  — OR —
                </div>
              )}

              {/* Link Section */}
              <div style={{ flex: '1', width: '100%' }}>
                <div style={{
                  background: '#333',
                  padding: '1rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  maxHeight: '100px',
                  overflowY: 'auto'
                }}>
                  {inviteLink.length > 60 
                    ? inviteLink.substring(0, 30) + '...' + inviteLink.substring(inviteLink.length - 25)
                    : inviteLink}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#999',
                  marginTop: '0.5rem',
                  textAlign: 'center'
                }}>
                  Link will be copied in full
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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