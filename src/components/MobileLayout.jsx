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
      {/* Tab navigation for both mobile and PC */}
      <div className="mobile-view-tabs">
        <button 
          className={`tab-button ${mobileView === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileView('chat')}
        >
          💬 Chat
        </button>
        <button 
          className={`tab-button ${mobileView === 'users' ? 'active' : ''}`}
          onClick={() => setMobileView('users')}
        >
          🟢 Online ({onlineUsers.size})
        </button>
        <button 
          className={`tab-button ${mobileView === 'friends' ? 'active' : ''}`}
          onClick={() => setMobileView('friends')}
        >
          👥 Friends ({friends.length})
        </button>
      </div>
      
      {/* Swipe indicator dots */}
      <div className="mobile-view-indicator">
        <div className="dots">
          <span className={`dot ${mobileView === 'chat' ? 'active' : ''}`}></span>
          <span className={`dot ${mobileView === 'users' ? 'active' : ''}`}></span>
          <span className={`dot ${mobileView === 'friends' ? 'active' : ''}`}></span>
        </div>
        <div className="swipe-hint">Swipe or tap tabs to navigate</div>
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
        
        <div className={`mobile-view-panel ${mobileView === 'users' ? 'active' : ''}`}>
          <ContactSidebar
            contacts={friends}
            activeContact={activeContact}
            connectionStatus={connectionStatus}
            lastSeen={lastSeen}
            onlineUsers={onlineUsers}
            pendingInvites={pendingInvites}
            onContactSelect={(contact) => {
              onContactSelect(contact)
              setMobileView('chat')
            }}
            onAddContact={onShowInvite}
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
            onAddFriend={onShowInvite}
          />
        </div>
      </div>
    </div>
  )
}