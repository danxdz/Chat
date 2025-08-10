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
      flexDirection: 'column',
      height: window.innerWidth < 768 ? 'calc(100vh - 180px)' : 'auto'
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
          displayMessages.map(message => (
            <div key={message.id} className="message-bubble" style={{ 
              marginBottom: '0.5rem',
              padding: '0.5rem',
              background: message.fromId === user.id ? '#0066cc' : '#444',
              borderRadius: '8px',
              maxWidth: '85%',
              marginLeft: message.fromId === user.id ? 'auto' : '0',
              marginRight: message.fromId === user.id ? '0' : 'auto',
              fontSize: '0.9rem'
            }}>
              <div className="message-header" style={{ fontSize: '0.7rem', color: '#ccc', marginBottom: '0.25rem' }}>
                {message.from} • {new Date(message.timestamp).toLocaleTimeString()}
                {message.type === 'private' && <span style={{ color: '#ffc107' }}> [Private]</span>}
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
              <div>{message.text}</div>
            </div>
          ))
        )}
      </div>

      {/* Minimalist Message Input */}
      <form onSubmit={onSendMessage} style={{ 
        padding: '1rem', 
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '0.8rem',
        alignItems: 'flex-end',
        position: 'sticky',
        bottom: 0,
        zIndex: 100
      }}>
        <textarea
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
            padding: '1rem 1.2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '400',
            minHeight: '48px',
            maxHeight: '120px',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.4',
            overflowY: 'auto',
            transition: 'all 0.3s ease',
            letterSpacing: '0.3px'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            e.target.style.background = 'rgba(255, 255, 255, 0.08)'
            e.target.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            e.target.style.background = 'rgba(255, 255, 255, 0.05)'
            e.target.style.boxShadow = 'none'
          }}
          onInput={(e) => {
            // Auto-resize textarea
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button 
          type="submit" 
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            fontSize: '16px',
            fontWeight: '500',
            minHeight: '48px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.15)'
            e.target.style.transform = 'translateY(-1px)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}