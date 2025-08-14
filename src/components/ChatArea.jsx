import { useEffect, useRef } from 'react'

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
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
    
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100)
    
    return () => clearTimeout(timeoutId)
  }, [displayMessages, messages])
  
  return (
    <div className="chat-area" style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
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
                  margin: '1rem 2rem',
                  padding: '0.4rem 1rem',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontStyle: 'italic',
                  background: 'linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.1), transparent)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ color: '#4CAF50', fontSize: '0.9rem' }}>→</span>
                  <span>{message.content || message.text}</span>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: 'rgba(255, 255, 255, 0.3)',
                    marginLeft: '0.5rem'
                  }}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            }
            
            // Regular messages
            const isOwnMessage = message.fromId === user.id
            const messageTime = new Date(message.timestamp)
            const now = new Date()
            const isToday = messageTime.toDateString() === now.toDateString()
            const timeString = isToday 
              ? messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : `${messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            
            return (
              <div key={message.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                marginBottom: '1rem',
                padding: '0 0.5rem'
              }}>
                {/* Sender name for other users' messages */}
                {!isOwnMessage && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '0.2rem',
                    marginLeft: '0.5rem'
                  }}>
                    {message.from}
                  </div>
                )}
                
                {/* Message bubble */}
                <div className="message-bubble" style={{ 
                  padding: '0.7rem 1rem',
                  background: isOwnMessage 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: isOwnMessage 
                    ? '18px 18px 4px 18px' 
                    : '18px 18px 18px 4px',
                  maxWidth: '70%',
                  fontSize: '0.9rem',
                  boxShadow: isOwnMessage 
                    ? '0 4px 6px rgba(102, 126, 234, 0.2)' 
                    : '0 2px 4px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: isOwnMessage 
                    ? 'none' 
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  wordBreak: 'break-word'
                }}>
                  {/* Private message indicator */}
                  {message.type === 'private' && (
                    <div style={{
                      fontSize: '0.65rem',
                      color: '#ffc107',
                      marginBottom: '0.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}>
                      🔒 Private Message
                    </div>
                  )}
                  
                  {/* Encryption indicator */}
                  {message.encrypted && (
                    <div style={{
                      fontSize: '0.6rem',
                      color: '#4CAF50',
                      marginBottom: '0.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      🔐 Military-Grade Encrypted (Gun.SEA)
                    </div>
                  )}
                  
                  {/* P2P indicator */}
                  {message.webrtc && (
                    <div style={{
                      fontSize: '0.6rem',
                      color: '#2196F3',
                      marginBottom: '0.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      📡 Direct P2P (WebRTC)
                    </div>
                  )}
                  
                  {/* Message text */}
                  <div style={{ 
                    color: '#ffffff', 
                    lineHeight: '1.5'
                  }}>
                    {message.content || message.text}
                  </div>
                </div>
                
                {/* Time and status - More visible */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.3rem',
                  fontSize: '0.7rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  paddingLeft: isOwnMessage ? '0' : '0.5rem',
                  paddingRight: isOwnMessage ? '0.5rem' : '0',
                  fontWeight: '500'
                }}>
                  <span style={{ 
                    background: 'rgba(0, 0, 0, 0.2)', 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    fontSize: '0.65rem'
                  }}>
                    {timeString}
                  </span>
                  {isOwnMessage && (
                    <span style={{ fontSize: '0.8rem' }}>
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
              </div>
            )
          })
        )}
        
        {/* Scroll anchor - always scroll to this element */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={(e) => {
        e.preventDefault();
        onSendMessage(e);
      }} className="message-input-container" style={{ 
        padding: '0.5rem', 
        background: '#2d2d2d',
        borderTop: '1px solid #555',
        display: 'flex',
        gap: '0.4rem',
        alignItems: 'flex-end',
        width: '100%',
        boxSizing: 'border-box'
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
          disabled={!newMessage.trim()}
          style={{ 
            background: newMessage.trim() ? '#0066cc' : '#555', 
            padding: '0.5rem 0.7rem',
            width: 'auto',
            minWidth: '55px',
            maxWidth: '80px',
            marginRight: '0.2rem',
            fontSize: '0.85rem',
            minHeight: '42px',
            borderRadius: '8px',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            opacity: newMessage.trim() ? 1 : 0.5,
            border: 'none',
            color: 'white',
            transition: 'background 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}