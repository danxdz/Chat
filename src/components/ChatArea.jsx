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
      height: '100%',
      position: 'relative'
    }}>
      {/* Messages Container */}
      <div 
        id="messages-container"
        className="messages-container"
        style={{ 
          flex: 1, 
          padding: '1rem 1rem 8rem 1rem', // Beautiful spacing for the new input
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #161616 100%)',
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

      {/* Beautiful Message Input */}
      <form onSubmit={onSendMessage} style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '1.5rem 1rem 1.5rem 1rem', 
        background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.95) 20%)',
        backdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end',
        zIndex: 1000,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s ease'
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
          placeholder={`💬 Message ${activeContact?.nickname || 'everyone'}...`}
          rows={1}
          style={{
            flex: 1,
            padding: '1.2rem 1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(15px)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '400',
            minHeight: '56px',
            maxHeight: '140px',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            overflowY: 'auto',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            letterSpacing: '0.2px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
            e.target.style.background = 'rgba(255, 255, 255, 0.12)'
            e.target.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.1), 0 8px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            e.target.style.background = 'rgba(255, 255, 255, 0.08)'
            e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            e.target.style.transform = 'translateY(0)'
          }}
          onInput={(e) => {
            // Auto-resize textarea with smooth animation
            e.target.style.height = 'auto';
            const newHeight = Math.min(e.target.scrollHeight, 140);
            e.target.style.height = newHeight + 'px';
          }}
        />
        <button 
          type="submit" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(56, 142, 60, 0.9) 100%)',
            backdropFilter: 'blur(15px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '1.2rem 2rem',
            fontSize: '16px',
            fontWeight: '600',
            minHeight: '56px',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 1) 0%, rgba(56, 142, 60, 1) 100%)'
            e.target.style.transform = 'translateY(-3px) scale(1.02)'
            e.target.style.boxShadow = '0 8px 40px rgba(76, 175, 80, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(56, 142, 60, 0.9) 100%)'
            e.target.style.transform = 'translateY(0) scale(1)'
            e.target.style.boxShadow = '0 4px 20px rgba(76, 175, 80, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          onMouseDown={(e) => {
            e.target.style.transform = 'translateY(-1px) scale(0.98)'
          }}
          onMouseUp={(e) => {
            e.target.style.transform = 'translateY(-3px) scale(1.02)'
          }}
        >
          <span>✈️</span>
          Send
        </button>
      </form>
    </div>
  )
}