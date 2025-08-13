// Storage Service - Handles all localStorage operations

// Storage keys
const STORAGE_KEYS = {
  USERS: 'users',
  ADMIN_USER: 'adminUser',
  CURRENT_USER: 'currentUser',
  PENDING_INVITES: 'pendingInvites',
  CONTACTS: (userId) => `contacts_${userId}`,
  MESSAGES: (userId) => `messages_${userId}`,
  LAST_READ: (userId, contactId) => `lastRead_${userId}_${contactId}`
}

// Get all users
export const getUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
  } catch (error) {
    console.error('Failed to get users:', error)
    return []
  }
}

// Save users
export const saveUsers = (users) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
    return true
  } catch (error) {
    console.error('Failed to save users:', error)
    return false
  }
}

// Get admin user
export const getAdminUser = () => {
  try {
    const adminData = localStorage.getItem(STORAGE_KEYS.ADMIN_USER)
    return adminData ? JSON.parse(adminData) : null
  } catch (error) {
    console.error('Failed to get admin user:', error)
    return null
  }
}

// Save admin user
export const saveAdminUser = (adminUser) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(adminUser))
    return true
  } catch (error) {
    console.error('Failed to save admin user:', error)
    return false
  }
}

// Get current user (temporary)
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

// Save current user (temporary)
export const saveCurrentUser = (user) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
    return true
  } catch (error) {
    console.error('Failed to save current user:', error)
    return false
  }
}

// Clear current user
export const clearCurrentUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
}

// Get pending invites
export const getPendingInvites = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_INVITES) || '[]')
  } catch (error) {
    console.error('Failed to get pending invites:', error)
    return []
  }
}

// Save pending invites
export const savePendingInvites = (invites) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_INVITES, JSON.stringify(invites))
    return true
  } catch (error) {
    console.error('Failed to save pending invites:', error)
    return false
  }
}

// Get user contacts
export const getUserContacts = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTACTS(userId)) || '[]')
  } catch (error) {
    console.error('Failed to get user contacts:', error)
    return []
  }
}

// Save user contacts
export const saveUserContacts = (userId, contacts) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTACTS(userId), JSON.stringify(contacts))
    return true
  } catch (error) {
    console.error('Failed to save user contacts:', error)
    return false
  }
}

// Get user messages
export const getUserMessages = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES(userId)) || '[]')
  } catch (error) {
    console.error('Failed to get user messages:', error)
    return []
  }
}

// Save user messages
export const saveUserMessages = (userId, messages) => {
  try {
    // Limit to last 1000 messages to prevent storage overflow
    const limitedMessages = messages.slice(-1000)
    localStorage.setItem(STORAGE_KEYS.MESSAGES(userId), JSON.stringify(limitedMessages))
    return true
  } catch (error) {
    console.error('Failed to save user messages:', error)
    return false
  }
}

// Get last read timestamp
export const getLastReadTimestamp = (userId, contactId) => {
  try {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_READ(userId, contactId))
    return timestamp ? parseInt(timestamp) : 0
  } catch (error) {
    console.error('Failed to get last read timestamp:', error)
    return 0
  }
}

// Save last read timestamp
export const saveLastReadTimestamp = (userId, contactId, timestamp) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_READ(userId, contactId), timestamp.toString())
    return true
  } catch (error) {
    console.error('Failed to save last read timestamp:', error)
    return false
  }
}

// Clear all user data (for logout)
export const clearUserData = (userId) => {
  try {
    // Clear user-specific data
    localStorage.removeItem(STORAGE_KEYS.CONTACTS(userId))
    localStorage.removeItem(STORAGE_KEYS.MESSAGES(userId))
    
    // Clear last read timestamps for all contacts
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(`lastRead_${userId}_`)) {
        localStorage.removeItem(key)
      }
    })
    
    // Clear session data
    sessionStorage.clear()
    
    return true
  } catch (error) {
    console.error('Failed to clear user data:', error)
    return false
  }
}

// Clear all data (full reset)
export const clearAllData = () => {
  try {
    localStorage.clear()
    sessionStorage.clear()
    return true
  } catch (error) {
    console.error('Failed to clear all data:', error)
    return false
  }
}

// Export storage info (for debugging)
export const getStorageInfo = () => {
  const used = new Blob(Object.values(localStorage)).size
  const estimatedMax = 5 * 1024 * 1024 // 5MB estimate
  
  return {
    used,
    estimatedMax,
    percentUsed: Math.round((used / estimatedMax) * 100),
    itemCount: localStorage.length,
    items: Object.keys(localStorage).map(key => ({
      key,
      size: new Blob([localStorage.getItem(key) || '']).size
    })).sort((a, b) => b.size - a.size)
  }
}

export default {
  getUsers,
  saveUsers,
  getAdminUser,
  saveAdminUser,
  getCurrentUser,
  saveCurrentUser,
  clearCurrentUser,
  getPendingInvites,
  savePendingInvites,
  getUserContacts,
  saveUserContacts,
  getUserMessages,
  saveUserMessages,
  getLastReadTimestamp,
  saveLastReadTimestamp,
  clearUserData,
  clearAllData,
  getStorageInfo
}