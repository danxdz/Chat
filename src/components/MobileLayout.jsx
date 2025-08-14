import { useState, useEffect, useRef } from 'react'
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
  const messagesEndRef = useRef(null)
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayMessages])
  
  // Debug logging
// [REMOVED CONSOLE LOG]
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
              
              {/* Debug: Check if messages exist */}
              {(!displayMessages || displayMessages.length === 0) && (
                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  No messages yet. Start chatting!
                </div>
              )}
              
              {/* Show all messages */}
              {displayMessages && displayMessages.length > 0 && displayMessages.map((msg, i) => {
// [REMOVED CONSOLE LOG]
                return (
                  <div key={i} style={{
                    background: '#222',
                    padding: '8px',
                    marginBottom: '5px',
                    borderRadius: '5px',
                    color: 'white'
                  }}>
                    <strong>{msg.from}:</strong> {msg.text}
                  </div>
                )
              })}
              
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
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
                onClick={(e) => {
                  e.preventDefault()
// [REMOVED CONSOLE LOG]
                  if (newMessage && newMessage.trim()) {
                    onSendMessage(e)
                  }
                }}
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
                      border: invite.status === 'accepted' ? '1px solid #4CAF50' : '1px solid #333',
                      color: '#ccc'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                            From: {invite.fromNick || 'You'}
                          </div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            ID: #{invite.id?.slice(-6) || i}
                          </div>
                          {invite.acceptedNickname && (
                            <div style={{ fontSize: '12px', marginTop: '4px', color: '#4CAF50' }}>
                              ✅ Accepted by: {invite.acceptedNickname}
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          padding: '4px 8px',
                          background: invite.status === 'accepted' ? '#4CAF50' : 
                                     invite.status === 'expired' ? '#ff4444' : '#ffa500',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'white'
                        }}>
                          {invite.status === 'accepted' ? 'Accepted' : 
                           invite.status === 'expired' ? 'Expired' : 'Pending'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        {invite.acceptedAt ? 
                          `Accepted: ${new Date(invite.acceptedAt).toLocaleString()}` :
                          invite.expiresAt ? 
                            `Expires: ${new Date(invite.expiresAt).toLocaleString()}` : 
                            'No expiration'
                        }
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
// [REMOVED CONSOLE LOG]
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