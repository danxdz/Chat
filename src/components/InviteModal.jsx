import { useState, useRef } from 'react'
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
            <p style={{ marginBottom: '1rem' }}>Share this link with friends to invite them to chat:</p>
            
            {/* QR Code Section */}
            <div style={{
              display: 'flex',
              flexDirection: window.innerWidth < 600 ? 'column' : 'row',
              gap: '1.5rem',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              {/* QR Code */}
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: window.innerWidth < 600 ? '1' : '0 0 auto'
              }}>
                <div ref={qrRef}>
                  <QRCodeSVG 
                    value={inviteLink} 
                    size={window.innerWidth < 400 ? 150 : 200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '0.85rem', 
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Scan to Join
                </p>
                <button
                  onClick={downloadQR}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.75rem',
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  💾 Save QR
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