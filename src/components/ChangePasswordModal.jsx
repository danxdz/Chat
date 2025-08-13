import { useState } from 'react'

export default function ChangePasswordModal({ user, gun, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChangePassword = async () => {
    setError('')
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    
    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }
    
    setIsChanging(true)
    
    try {
      // Verify current password
      const hashedCurrent = await window.Gun.SEA.work(currentPassword, null, null, {name: 'SHA-256'})
      
      // Check if current password matches stored hash
      if (user.passwordHash !== hashedCurrent) {
        throw new Error('Current password is incorrect')
      }
      
      // Hash new password
      const hashedNew = await window.Gun.SEA.work(newPassword, null, null, {name: 'SHA-256'})
      
      // Update in Gun.js if available
      if (gun && user.id) {
        await gun.get('chat_users').get(user.id).get('passwordHash').put(hashedNew)
      }
      
      // Update in localStorage (for backward compatibility)
      const users = JSON.parse(localStorage.getItem('users') || '[]')
      const userIndex = users.findIndex(u => u.id === user.id)
      if (userIndex !== -1) {
        users[userIndex].passwordHash = hashedNew
        localStorage.setItem('users', JSON.stringify(users))
      }
      
      // Update current user object
      user.passwordHash = hashedNew
      
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
      
    } catch (error) {
      setError(error.message || 'Failed to change password')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#2a2a2a',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <h2 style={{ 
          color: '#fff', 
          marginBottom: '20px',
          fontSize: '24px',
          textAlign: 'center'
        }}>
          🔐 Change Password
        </h2>
        
        {error && (
          <div style={{
            background: '#ff4444',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div style={{
            background: '#4CAF50',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            ✅ Password changed successfully!
          </div>
        )}
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            color: '#aaa', 
            marginBottom: '5px',
            fontSize: '14px'
          }}>
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isChanging || success}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px'
            }}
            placeholder="Enter current password"
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            color: '#aaa', 
            marginBottom: '5px',
            fontSize: '14px'
          }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isChanging || success}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px'
            }}
            placeholder="Enter new password (min 6 characters)"
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            color: '#aaa', 
            marginBottom: '5px',
            fontSize: '14px'
          }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isChanging || success}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isChanging && !success) {
                handleChangePassword()
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px'
            }}
            placeholder="Confirm new password"
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isChanging}
            style={{
              padding: '10px 20px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleChangePassword}
            disabled={isChanging || success}
            style={{
              padding: '10px 20px',
              background: success ? '#4CAF50' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isChanging || success ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: isChanging || success ? 0.7 : 1
            }}
          >
            {isChanging ? 'Changing...' : success ? 'Success!' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  )
}