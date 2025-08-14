import { createGunUser, getAllGunUsers } from './gunAuthService'
import { logger } from '../utils/logger'

// Bootstrap function to create first admin user for demo
export const createBootstrapUser = async () => {
  try {
    console.log('🎯 Creating bootstrap admin user...')
    
    // First, check what users currently exist
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
    console.log('📊 Current users before creation:', existingUsers.length)
    
    // Check if Admin already exists
    const existingAdmin = existingUsers.find(u => u.nickname.toLowerCase() === 'admin')
    if (existingAdmin) {
      console.log('👤 Admin user already exists')
      return { success: true, user: existingAdmin, message: 'Admin user already exists!' }
    }
    
    const bootstrapUser = await createGunUser('Admin', 'admin123', null)
    console.log('👤 Bootstrap user created:', bootstrapUser)
    
    const updatedUsers = [...existingUsers, bootstrapUser]
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    
    // Verify it was saved
    const savedUsers = JSON.parse(localStorage.getItem('users') || '[]')
    console.log('💾 Users after save:', savedUsers.length)
    console.log('🔍 Saved users:', savedUsers.map(u => u.nickname))
    
    console.log('🎯 Bootstrap admin user created successfully')
    console.log('📋 Login credentials: Admin / admin123')
    
    return { 
      success: true, 
      user: bootstrapUser, 
      message: 'Admin user created!\nLogin: Admin\nPassword: admin123\n\nYou can now login!' 
    }
    
  } catch (error) {
    console.error('❌ Failed to create bootstrap user:', error)
    console.error('❌ Error details:', error)
    return { 
      success: false, 
      error: error.message, 
      message: 'Failed to create bootstrap user: ' + error.message 
    }
  }
}

// Simple test message function
export const createTestMessage = (user, gun) => {
  if (!user || !gun) {
    return { success: false, message: 'Please login first to send test messages' }
  }
  
  const testMsg = `Test message from ${user.nickname} at ${new Date().toLocaleTimeString()}`
  return { success: true, message: testMsg }
}

// Clear current user data
export const clearCurrentClientData = async (user, gun, announcePresence) => {
  if (!confirm('Clear all data for current user? This cannot be undone.')) {
    return { success: false, cancelled: true }
  }

  try {
    // Clear user-specific data
    if (user) {
      localStorage.removeItem(`contacts_${user.id}`)
      localStorage.removeItem(`friends_${user.id}`)
      
      // Announce leaving
      if (gun && announcePresence) {
        await announcePresence('leave')
      }
    }
    
    // Clear session data
    sessionStorage.clear()
    
    return { 
      success: true, 
      message: 'Current session cleared. Please login again.' 
    }
  } catch (error) {
    console.error('Failed to clear data:', error)
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to clear some data. Try refreshing the page.' 
    }
  }
}

// Clear all data
export const clearAllClientsData = async (user, gun, announcePresence) => {
  if (!confirm('Clear ALL application data? This will remove all users and require new registration.')) {
    return { success: false, cancelled: true }
  }

  try {
    // Announce leaving if logged in
    if (user && gun && announcePresence) {
      await announcePresence('leave')
    }
    
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear Gun.js data if available
    if (gun) {
      try {
        await gun.get('p2pchat').get('messages').put(null)
        await gun.get('online_users').put(null)
        await gun.get('user_presence').put(null)
      } catch (e) {
        console.log('Could not clear Gun.js data:', e)
      }
    }
    
    return { 
      success: true, 
      message: 'All data cleared. Refreshing...',
      shouldReload: true 
    }
  } catch (error) {
    console.error('Failed to clear all data:', error)
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to clear some data. Please manually clear browser data.' 
    }
  }
}

// Force reload
export const forceReload = () => {
  if (confirm('Reload the application?')) {
    window.location.reload()
    return { success: true }
  }
  return { success: false, cancelled: true }
}