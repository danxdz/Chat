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
    <div 
      className="mobile-layout"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Tab navigation - Simplified to Chat and Friends only */}
      <div className="mobile-view-tabs" style={{
        display: 'flex',
        height: '50px',
        background: 'rgba(0, 0, 0, 0.95)',
        borderBottom: '2px solid #333'
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
      
      <div className="mobile-views-container">
        <div className={`mobile-view-panel ${mobileView === 'chat' ? 'active' : ''}`}>
          <ChatArea
            chatError={chatError}
            messages={messages}
            displayMessages={displayMessages}
            user={user}
            activeContact={activeContact}
            newMessage={newMessage}
            messageDeliveryStatus={messageDeliveryStatus}
            onMessageChange={onMessageChange}
            onSendMessage={onSendMessage}
          />
        </div>
        

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