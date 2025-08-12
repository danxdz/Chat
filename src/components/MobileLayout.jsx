import { useState } from 'react'
import ChatArea from './ChatArea'
import ContactSidebar from './ContactSidebar'
import FriendsPanel from './FriendsPanel'

export default function MobileLayout({
  user,
  messages,
  displayMessages,
  friends,
  onlineUsers,
  pendingInvites,
  activeContact,
  newMessage,
  chatError,
  messageDeliveryStatus,
  connectionStatus,
  lastSeen,
  onMessageChange,
  onSendMessage,
  onContactSelect,
  onShowInvite
}) {
  const [mobileView, setMobileView] = useState('chat')
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      if (mobileView === 'chat') setMobileView('users')
      else if (mobileView === 'users') setMobileView('friends')
    }
    if (isRightSwipe) {
      if (mobileView === 'friends') setMobileView('users')
      else if (mobileView === 'users') setMobileView('chat')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#111'
    }}>
      {/* BIG VISIBLE TABS */}
      <div style={{
        display: 'flex',
        height: '60px',
        background: '#222',
        borderBottom: '3px solid #4CAF50'
      }}>
        <button 
          className={`tab-button ${mobileView === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileView('chat')}
          style={{
            flex: 1,
            background: mobileView === 'chat' ? '#1a1a1a' : 'transparent',
            border: 'none',
            color: mobileView === 'chat' ? '#4CAF50' : '#888',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '10px'
          }}
        >
          💬 Chat
        </button>
        <button 
          className={`tab-button ${mobileView === 'friends' ? 'active' : ''}`}
          onClick={() => setMobileView('friends')}
          style={{
            flex: 1,
            background: mobileView === 'friends' ? '#1a1a1a' : 'transparent',
            border: 'none',
            color: mobileView === 'friends' ? '#4CAF50' : '#888',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '10px',
            position: 'relative'
          }}
        >
          👥 Friends 
          {pendingInvites && pendingInvites.length > 0 && (
            <span style={{
              background: '#ff4444',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '12px',
              marginLeft: '5px'
            }}>
              {pendingInvites.length}
            </span>
          )}
        </button>
      </div>
      
      {/* CONTENT AREA - SUPER VISIBLE */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#1a1a1a'
      }}>
        {/* CHAT VIEW */}
        {mobileView === 'chat' && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* MESSAGES */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '10px',
              background: '#0a0a0a'
            }}>
              <div style={{ color: '#4CAF50', fontSize: '18px', marginBottom: '10px' }}>
                💬 CHAT MESSAGES
              </div>
              {displayMessages.map((msg, i) => (
                <div key={i} style={{
                  background: '#222',
                  padding: '8px',
                  marginBottom: '5px',
                  borderRadius: '5px',
                  color: 'white'
                }}>
                  <strong>{msg.from}:</strong> {msg.text}
                </div>
              ))}
            </div>
            
            {/* BIG VISIBLE MESSAGE INPUT */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              padding: '10px',
              background: '#333',
              borderTop: '3px solid #4CAF50',
              gap: '10px'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={onMessageChange}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '15px',
                  fontSize: '18px',
                  background: '#111',
                  border: '2px solid #4CAF50',
                  color: 'white',
                  borderRadius: '5px'
                }}
              />
              <button
                onClick={onSendMessage}
                style={{
                  padding: '15px 30px',
                  fontSize: '18px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                SEND
              </button>
            </div>
          </div>
        )}
        

        <div className={`mobile-view-panel ${mobileView === 'friends' ? 'active' : ''}`}>
          <FriendsPanel
            friends={friends}
            pendingInvites={pendingInvites}
            onlineUsers={onlineUsers}
            onSelectFriend={(friendName) => {
              onContactSelect(friendName)
              setMobileView('chat')
            }}
            onSendInvite={onShowInvite}
          />
        </div>
      </div>
    </div>
  )
}