export default function ChatArea({ 
  chatError, 
  messages, 
  displayMessages, 
  user, 
  activeContact, 
  newMessage, 
  messageDeliveryStatus,
  onMessageChange, 
  onSendMessage 
}) {
  return (
    <div className="chat-area" style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Messages Container */}
      <div 
        id="messages-container"
        className="messages-container"
        style={{ 
          flex: 1, 
          padding: '0.5rem', 
          overflowY: 'auto',
          background: '#1a1a1a',
          fontSize: '0.9rem'
        }}
      >
        {/* Error Display */}
        {chatError && (
          <div style={{ 
            background: '#dc3545', 
            color: 'white', 
            padding: '0.5rem', 
            borderRadius: '4px', 
            margin: '0.5rem',
            textAlign: 'center',
            fontSize: '0.8rem'
          }}>
            ⚠️ {chatError}
            <br />
            <small>Chat functionality may be limited</small>
          </div>
        )}
        
        {/* Debug Info */}
        <div className="debug-info" style={{ 
          background: '#333', 
          padding: '0.5rem', 
          margin: '0.5rem', 
          borderRadius: '4px', 
          fontSize: '0.7rem',
          color: '#888',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>📊 Total Messages: {messages.length} | From Gun.js</span>
          <button 
            onClick={() => {
              console.log('🔍 ALL MESSAGES:', messages)
              console.log('🔍 DISPLAY MESSAGES:', displayMessages)
              alert(`Total messages: ${messages.length}\nAll from Gun.js\nCheck console for details`)
            }}
            style={{
              background: '#666',
              border: 'none',
              color: 'white',
              padding: '0.2rem 0.4rem',
              borderRadius: '3px',
              fontSize: '0.6rem',
              cursor: 'pointer'
            }}
          >
            🔍 Debug
          </button>
        </div>
        
        {/* Messages List */}
        {displayMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem', fontSize: '0.9rem' }}>
            No messages yet. Start the conversation!
            <br />
            <small style={{ fontSize: '0.7rem' }}>
              Messages will appear here from Gun.js
            </small>
          </div>
        ) : (
          displayMessages.map(message => {
            // IRC-style system messages
            if (message.isSystemMessage) {
              return (
                <div key={message.id} style={{
                  textAlign: 'center',
                  margin: '0.8rem 0',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontStyle: 'italic',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{ color: '#4CAF50' }}>*</span> {message.text} <span style={{ color: '#4CAF50' }}>*</span>
                </div>
              )
            }
            
            // Regular messages
            return (
              <div key={message.id} className="message-bubble" style={{ 
                marginBottom: '0.5rem',
                padding: '0.8rem',
                background: message.fromId === user.id ? 'rgba(0, 102, 204, 0.8)' : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                maxWidth: '85%',
                marginLeft: message.fromId === user.id ? 'auto' : '0',
                marginRight: message.fromId === user.id ? '0' : 'auto',
                fontSize: '0.9rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(5px)'
              }}>
                <div className="message-header" style={{ 
                  fontSize: '0.7rem', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  marginBottom: '0.4rem',
                  fontWeight: '500'
                }}>
                  {message.from} • {new Date(message.timestamp).toLocaleTimeString()}
                  {message.type === 'private' && <span style={{ color: '#ffc107' }}> 🔒 Private</span>}
                  {message.fromId === user.id && (
                    <span style={{ float: 'right', fontSize: '0.6rem' }}>
                      {(() => {
                        const deliveryStatus = messageDeliveryStatus.get(message.id)
                        if (!deliveryStatus) return '⏳'
                        switch (deliveryStatus.status) {
                          case 'sending': return '⏳'
                          case 'sent': return '✓'
                          case 'delivered': return '✓✓'
                          case 'failed': return '❌'
                          default: return '⏳'
                        }
                      })()}
                    </span>
                  )}
                </div>
                <div style={{ color: '#ffffff', lineHeight: '1.4' }}>{message.text}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={onSendMessage} className="message-input-container" style={{ 
        padding: '0.7rem 0.5rem', 
        background: '#2d2d2d',
        borderTop: '1px solid #555',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end'
      }}>
        <textarea
          className="message-input"
          value={newMessage}
          onChange={onMessageChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage(e);
            }
          }}
          placeholder={`Message ${activeContact?.nickname || 'everyone'}...`}
          rows={1}
          style={{
            flex: 1,
            padding: '0.8rem',
            border: '1px solid #555',
            borderRadius: '8px',
            background: '#333',
            color: 'white',
            fontSize: '16px', // Prevent zoom on iOS
            minHeight: '44px', // Touch-friendly height
            maxHeight: '120px',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.4',
            overflowY: 'auto'
          }}
          onInput={(e) => {
            // Auto-resize textarea
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button 
          type="submit" 
          className="btn send-button"
          style={{ 
            background: '#0066cc', 
            padding: '0.8rem 1rem',
            width: 'auto',
            margin: 0,
            fontSize: '0.9rem',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}