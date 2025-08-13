import { useState } from 'react'
import Header from './Header'
import ContactSidebar from './ContactSidebar'
import ChatArea from './ChatArea'
import TestingPanel from './TestingPanel'
import SecureInviteModal from './SecureInviteModal'
import MobileLayout from './MobileLayout'

function ChatView({ 
  user,
  gun,
  messages,
  displayMessages,
  friends,
  onlineUsers,
  allUsers,
  pendingInvites,
  activeContact,
  newMessage,
  chatError,
  messageDeliveryStatus,
  connectionStatus,
  lastSeen,
  initStatus,
  debugNotifications,
  isDev,
  onMessageChange,
  onSendMessage,
  onContactSelect,
  onNicknameChange,
  onLogout,
  onInviteCreated,
  onSendTestMessage,
  onClearCurrentClient,
  onClearAllClients,
  onForceReload
}) {
  const [showSecureInviteModal, setShowSecureInviteModal] = useState(false)
  const [showTests, setShowTests] = useState(false)
  
  // Debug notifications component (only in development)
  const DebugNotifications = () => {
    if (!isDev) return null
    
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 10000,
        pointerEvents: 'none'
      }}>
        {debugNotifications.map((notif) => (
          <div
            key={notif.id}
            style={{
              background: notif.type === 'error' ? '#ff6666' : 
                         notif.type === 'success' ? '#66ff66' : '#66bbff',
              color: '#000',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '4px',
              fontSize: '12px',
              maxWidth: '300px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              fontWeight: 'bold',
              border: '1px solid rgba(0,0,0,0.2)'
            }}
          >
            {notif.message}
          </div>
        ))}
      </div>
    )
  }
  
  const isMobile = true // Force mobile for now
  
  return (
    <div className="app" style={{ background: '#0a0a0a' }}>
      <DebugNotifications />
      <Header
        user={user}
        activeContact={activeContact}
        initStatus={initStatus}
        onlineUsers={onlineUsers.size}
        totalUsers={allUsers.length}
        connectionStatus={connectionStatus}
        onShowInvite={() => setShowSecureInviteModal(true)}
        onShowTests={() => setShowTests(true)}
        onChangeNickname={onNicknameChange}
        onLogout={onLogout}
        gun={gun}
      />

      {isMobile ? (
        <MobileLayout
          user={user}
          messages={messages}
          displayMessages={displayMessages}
          friends={friends}
          onlineUsers={onlineUsers}
          pendingInvites={pendingInvites}
          activeContact={activeContact}
          newMessage={newMessage}
          chatError={chatError}
          messageDeliveryStatus={messageDeliveryStatus}
          connectionStatus={connectionStatus}
          lastSeen={lastSeen}
          onMessageChange={onMessageChange}
          onSendMessage={onSendMessage}
          onContactSelect={onContactSelect}
          onShowInvite={() => setShowSecureInviteModal(true)}
        />
      ) : (
        // Desktop layout
        <div className="main-layout">
          <ContactSidebar
            contacts={friends}
            activeContact={activeContact}
            connectionStatus={connectionStatus}
            lastSeen={lastSeen}
            onlineUsers={onlineUsers}
            pendingInvites={pendingInvites}
            onContactSelect={onContactSelect}
          />

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
      )}

      <TestingPanel
        isVisible={showTests}
        user={user}
        gun={gun}
        initStatus={initStatus}
        onClose={() => setShowTests(false)}
        onSendTestMessage={onSendTestMessage}
        onClearCurrentClient={onClearCurrentClient}
        onClearAllClients={onClearAllClients}
        onForceReload={onForceReload}
      />

      {showSecureInviteModal && (
        <SecureInviteModal
          user={user}
          gun={gun}
          onClose={() => setShowSecureInviteModal(false)}
          onInviteCreated={(invite) => {
            console.log('🎫 Secure invite created:', invite)
            // Add to pending invites
            const newInvite = {
              id: invite.inviteId,
              inviteUrl: invite.inviteUrl,
              expiresAt: invite.expiresAt,
              createdAt: Date.now(),
              fromNick: user.nickname,
              status: 'pending'
            }
            onInviteCreated(newInvite)
            console.log('📋 Pending invites updated')
            // Don't close modal - let user see QR code and copy link
          }}
        />
      )}
    </div>
  )
}

export default ChatView