export default function ChatArea({ 
  chatError, 
  messages, 
  displayMessages, 
  user, 
  activeContact, 
  newMessage, 
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
              <div className="message-header" style={{ 
                fontSize: '0.7rem', 
                color: '#ccc', 
                marginBottom: '0.25rem' 
              }}>
                {message.from} • {new Date(message.timestamp).toLocaleTimeString()}
                {message.type === 'private' && (
                  <span style={{ color: '#ffc107' }}> [Private]</span>
                )}
              </div>
              <div>{message.text}</div>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={onSendMessage} className="message-input-container" style={{ 
        padding: '0.5rem', 
        background: '#2d2d2d',
        borderTop: '1px solid #555',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'stretch'
      }}>
        <input
          type="text"
          className="message-input"
          value={newMessage}
          onChange={onMessageChange}
          placeholder={`Message ${activeContact?.nickname || 'everyone'}...`}
          style={{
            flex: 1,
            padding: '0.7rem',
            border: '1px solid #555',
            borderRadius: '4px',
            background: '#333',
            color: 'white',
            fontSize: '16px', // Prevent zoom on iOS
            minHeight: '44px' // Touch-friendly height
          }}
        />
        <button 
          type="submit" 
          className="btn send-button"
          style={{ 
            background: '#0066cc', 
            padding: '0.7rem 1rem',
            width: 'auto',
            margin: 0,
            fontSize: '0.9rem',
            minHeight: '44px'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}