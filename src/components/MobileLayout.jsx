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
  
  // Debug logging
  console.log('🔍 MobileLayout Debug:', {
    friendsCount: friends?.length || 0,
    friends: friends,
    pendingInvitesCount: pendingInvites?.length || 0,
    pendingInvites: pendingInvites,
    onlineUsersCount: onlineUsers?.size || 0
  })
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
              paddingBottom: '80px', // Space for input
              background: '#0a0a0a'
            }}>
              {/* Active Chat Indicator */}
              {activeContact && (
                <div style={{
                  background: '#1a1a1a',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  border: '1px solid #4CAF50',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#4CAF50' }}>
                    💬 Private chat with {activeContact.nickname}
                  </span>
                  <button
                    onClick={() => onContactSelect(null)}
                    style={{
                      padding: '4px 12px',
                      background: '#333',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Back to General
                  </button>
                </div>
              )}
              {!activeContact && (
                <div style={{
                  background: '#1a1a1a',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#888'
                }}>
                  📢 General Chat
                </div>
              )}
              
              {/* Filter messages based on active chat */}
              {displayMessages
                .filter(msg => {
                  if (activeContact) {
                    // Show only private messages between user and active contact
                    return (msg.from === activeContact.nickname || msg.to === activeContact.nickname) ||
                           (msg.fromId === activeContact.id || msg.toId === activeContact.id)
                  } else {
                    // Show only general messages
                    return !msg.to && !msg.toId
                  }
                })
                .map((msg, i) => (
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
        
        
        {/* FRIENDS VIEW - CLEAN & PROFESSIONAL */}
        {mobileView === 'friends' && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#0a0a0a',
            overflow: 'hidden'
          }}>
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px'
            }}>
              {/* Admin Panel - Show all users and connections */}
              {user?.nickname === 'Admin' && (
                <div style={{
                  marginBottom: '30px',
                  padding: '15px',
                  background: 'linear-gradient(135deg, #9C27B0, #673AB7)',
                  borderRadius: '10px',
                  border: '2px solid #9C27B0'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '15px' }}>
                    👑 Admin Overview
                  </h3>
                  <div style={{ color: 'white', fontSize: '14px' }}>
                    <div>Total Users: {JSON.parse(localStorage.getItem('users') || '[]').length}</div>
                    <div>Total Invites: {pendingInvites?.length || 0}</div>
                    <div style={{ marginTop: '10px' }}>
                      <strong>All Users:</strong>
                      {JSON.parse(localStorage.getItem('users') || '[]').map((u, i) => (
                        <div key={i} style={{ marginLeft: '10px', marginTop: '5px' }}>
                          • {u.nickname} {u.friends?.length > 0 && `(${u.friends.length} friends)`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Pending Invites */}
              {pendingInvites && pendingInvites.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>
                    Pending Invites ({pendingInvites.length})
                  </h3>
                  {pendingInvites.map((invite, i) => (
                    <div key={i} style={{
                      background: '#1a1a1a',
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      border: '1px solid #333',
                      color: '#ccc'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                            From: {invite.fromNick || 'Unknown'}
                          </div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            ID: #{invite.id?.slice(-6) || i}
                          </div>
                        </div>
                        <div style={{ 
                          padding: '4px 8px',
                          background: invite.status === 'used' ? '#666' : '#4CAF50',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'white'
                        }}>
                          {invite.status === 'used' ? 'Used' : 'Waiting'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        {invite.expiresAt ? `Expires: ${new Date(invite.expiresAt).toLocaleString()}` : 'No expiration'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Friends List */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>
                  Friends ({friends.length})
                </h3>
                {friends.length === 0 ? (
                  <div style={{
                    color: '#888',
                    padding: '30px',
                    textAlign: 'center',
                    background: '#1a1a1a',
                    borderRadius: '8px'
                  }}>
                    No friends yet. Send an invite to connect!
                  </div>
                ) : (
                  friends.map((friend, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        // Set friend as active contact for private chat
                        onContactSelect({
                          id: friend.id,
                          nickname: friend.nickname,
                          type: 'private'
                        })
                        setMobileView('chat')
                        console.log('💬 Starting chat with:', friend.nickname)
                      }}
                      style={{
                        background: '#1a1a1a',
                        padding: '12px',
                        marginBottom: '8px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{friend.nickname}</span>
                      {onlineUsers.has(friend.id) && (
                        <span style={{ color: '#4CAF50' }}>● Online</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Send Invite Button - Fixed at bottom */}
            <div style={{
              padding: '15px',
              background: '#1a1a1a',
              borderTop: '1px solid #333'
            }}>
              <button
                onClick={onShowInvite}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Send New Invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}