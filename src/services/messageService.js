// Message Service - Handles message formatting and processing

// Format time for display
export const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// Format a system message
export const formatSystemMessage = (content, type = 'info') => {
  return {
    id: 'system_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    type: 'system',
    systemType: type,
    content,
    timestamp: Date.now()
  }
}

// Format a user message
export const formatUserMessage = (user, content, recipient = null) => {
  return {
    userId: user.id,
    nickname: user.nickname,
    content,
    recipient: recipient ? { id: recipient.id, nickname: recipient.nickname } : null,
    timestamp: Date.now()
  }
}

// Process incoming message
export const processIncomingMessage = (data, currentUserId) => {
  if (!data || typeof data !== 'object') return null
  
  // Skip if it's metadata or invalid
  if (data._ || !data.content) return null
  
  // Determine message type
  const isSystem = data.type === 'system'
  const isPrivate = data.recipient && (
    data.recipient.id === currentUserId || 
    data.userId === currentUserId
  )
  const isOwn = data.userId === currentUserId
  
  return {
    ...data,
    isSystem,
    isPrivate,
    isOwn,
    formattedTime: formatTime(data.timestamp || Date.now())
  }
}

// Filter messages for display
export const filterMessagesForDisplay = (messages, activeContact, currentUserId) => {
  if (!activeContact) {
    // Show general chat messages
    return messages.filter(msg => 
      !msg.recipient || 
      msg.type === 'system'
    )
  }
  
  // Show private messages with the active contact
  return messages.filter(msg => {
    if (msg.type === 'system') return true
    
    if (msg.recipient) {
      const isToContact = msg.recipient.id === activeContact.id && msg.userId === currentUserId
      const isFromContact = msg.userId === activeContact.id && msg.recipient.id === currentUserId
      return isToContact || isFromContact
    }
    
    return false
  })
}

// Get unread message count
export const getUnreadCount = (messages, contactId, lastReadTimestamp = 0) => {
  return messages.filter(msg => 
    msg.userId === contactId &&
    msg.timestamp > lastReadTimestamp &&
    !msg.isOwn
  ).length
}

// Sort messages by timestamp
export const sortMessagesByTime = (messages) => {
  return [...messages].sort((a, b) => 
    (a.timestamp || 0) - (b.timestamp || 0)
  )
}

// Get last message for a contact
export const getLastMessage = (messages, contactId, currentUserId) => {
  const contactMessages = messages.filter(msg => {
    if (msg.type === 'system') return false
    
    if (msg.recipient) {
      const isToContact = msg.recipient.id === contactId && msg.userId === currentUserId
      const isFromContact = msg.userId === contactId && msg.recipient.id === currentUserId
      return isToContact || isFromContact
    }
    
    return false
  })
  
  if (contactMessages.length === 0) return null
  
  const sorted = sortMessagesByTime(contactMessages)
  return sorted[sorted.length - 1]
}

// Create presence message
export const createPresenceMessage = (nickname, action) => {
  const actionText = action === 'join' 
    ? `${nickname} joined the chat` 
    : `${nickname} left the chat`
  
  return formatSystemMessage(actionText, action)
}

export default {
  formatTime,
  formatSystemMessage,
  formatUserMessage,
  processIncomingMessage,
  filterMessagesForDisplay,
  getUnreadCount,
  sortMessagesByTime,
  getLastMessage,
  createPresenceMessage
}