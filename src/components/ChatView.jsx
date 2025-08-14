import { useState } from 'react'
import Header from './Header'
import ContactSidebar from './ContactSidebar'
import ChatArea from './ChatArea'
import TestingPanel from './TestingPanel'
import SecureInviteModal from './SecureInviteModal'
import MobileLayout from './MobileLayout'
import DebugNotifications from './DebugNotifications'

function ChatView({ 
  user,
  gun,
  messages,
  displayMessages,
  friends,
  acceptedInvites = [],
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
  

  
  const isMobile = true // Force mobile for now
  
  return (
    <div className="app" style={{ background: '#0a0a0a' }}>
      <DebugNotifications debugNotifications={debugNotifications} isDev={isDev} />
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
            acceptedInvites={acceptedInvites}
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
        allUsers={allUsers}
        friends={friends}
        onlineUsers={onlineUsers}
        pendingInvites={pendingInvites}
        initStatus={initStatus}
        onClose={() => setShowTests(false)}
        onSendTestMessage={onSendTestMessage}
        onClearCurrentClient={onClearCurrentClient}
        onClearAllClients={onClearAllClients}
        onForceReload={onForceReload}
        onLogout={onLogout}
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