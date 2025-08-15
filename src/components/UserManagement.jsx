import { useState, useEffect } from 'react';
import { getAllGunUsers } from '../services/gunAuthService';
import { getFriendsFromGun, removeFriendship } from '../services/friendsService';
import { logger } from '../utils/logger';

const UserManagement = ({ gun, currentUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFriends, setUserFriends] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load all users and their friends
  useEffect(() => {
    loadUsers();
  }, [gun]);

  const loadUsers = async () => {
    if (!gun) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all users from Gun.js
      const allUsers = await getAllGunUsers(gun);
      logger.log('Loaded users:', allUsers);
      setUsers(allUsers);
      
      // Load friends for each user
      const friendsData = {};
      for (const user of allUsers) {
        try {
          const friends = await getFriendsFromGun(gun, user.id);
          friendsData[user.id] = friends;
        } catch (err) {
          logger.error(`Failed to load friends for ${user.id}:`, err);
          friendsData[user.id] = [];
        }
      }
      setUserFriends(friendsData);
      
    } catch (err) {
      logger.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!gun || !userId) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      // Don't allow deleting the current user
      if (userId === currentUser?.id) {
        setError("You cannot delete your own account while logged in.");
        setConfirmDelete(null);
        return;
      }
      
      // Don't allow deleting admin users
      const userToDelete = users.find(u => u.id === userId);
      if (userToDelete?.isAdmin || userToDelete?.nickname?.toLowerCase() === 'admin') {
        setError("Admin users cannot be deleted.");
        setConfirmDelete(null);
        return;
      }
      
      logger.log('Deleting user:', userId);
      
      // Remove user from Gun.js
      await gun.get('chat_users').get(userId).put(null);
      
      // Remove user from nickname index
      if (userToDelete?.nickname) {
        await gun.get('chat_users_by_nick').get(userToDelete.nickname.toLowerCase()).put(null);
      }
      
      // Remove all friendships
      const friends = userFriends[userId] || [];
      for (const friendId of friends) {
        await removeFriendship(gun, userId, friendId);
      }
      
      // Remove user's messages
      await gun.get('chat_messages').get(userId).put(null);
      
      // Remove from local storage if exists
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const filteredUsers = localUsers.filter(u => u.id !== userId);
      localStorage.setItem('users', JSON.stringify(filteredUsers));
      
      setSuccess(`User "${userToDelete?.nickname}" has been deleted successfully.`);
      setConfirmDelete(null);
      
      // Reload users
      await loadUsers();
      
    } catch (err) {
      logger.error('Failed to delete user:', err);
      setError('Failed to delete user. Please try again.');
    }
  };

  const getFriendNicknames = (userId) => {
    const friends = userFriends[userId] || [];
    return friends.map(friendId => {
      const friend = users.find(u => u.id === friendId);
      return friend?.nickname || friendId.substring(0, 8);
    });
  };

  const filteredUsers = users.filter(user => 
    user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

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
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>👥 User Management</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
          <input
            type="text"
            placeholder="🔍 Search users by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            margin: '15px 20px',
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div style={{
            margin: '15px 20px',
            padding: '12px',
            background: '#efe',
            border: '1px solid #cfc',
            borderRadius: '8px',
            color: '#060'
          }}>
            ✅ {success}
          </div>
        )}

        {/* User List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    background: selectedUser?.id === user.id ? '#f0f8ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedUser(user.id === selectedUser?.id ? null : user)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px', color: '#333' }}>
                          {user.nickname}
                        </strong>
                        {user.isAdmin && (
                          <span style={{
                            background: '#764ba2',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            ADMIN
                          </span>
                        )}
                        {user.id === currentUser?.id && (
                          <span style={{
                            background: '#28a745',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                        ID: {user.id}
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                        Created: {formatDate(user.createdAt)}
                      </div>
                      
                      {user.invitedBy && (
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                          Invited by: {users.find(u => u.id === user.invitedBy)?.nickname || user.invitedBy}
                        </div>
                      )}
                      
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        Friends ({userFriends[user.id]?.length || 0}): 
                        {userFriends[user.id]?.length > 0 ? (
                          <span style={{ color: '#007bff', marginLeft: '5px' }}>
                            {getFriendNicknames(user.id).join(', ')}
                          </span>
                        ) : (
                          <span style={{ color: '#999', marginLeft: '5px' }}>None</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {confirmDelete === user.id ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUser(user.id);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(null);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(user.id);
                            setError(null);
                            setSuccess(null);
                          }}
                          disabled={user.id === currentUser?.id || user.isAdmin}
                          style={{
                            padding: '6px 12px',
                            background: user.id === currentUser?.id || user.isAdmin ? '#ccc' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: user.id === currentUser?.id || user.isAdmin ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            opacity: user.id === currentUser?.id || user.isAdmin ? 0.5 : 1
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {selectedUser?.id === user.id && (
                    <div style={{
                      marginTop: '15px',
                      paddingTop: '15px',
                      borderTop: '1px solid #eee'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Detailed Information</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', fontSize: '13px' }}>
                        <strong>Public Key:</strong>
                        <span style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px' }}>
                          {user.publicKey || 'N/A'}
                        </span>
                        
                        <strong>Has Password:</strong>
                        <span>{user.passwordHash ? 'Yes' : 'No'}</span>
                        
                        <strong>Friend Count:</strong>
                        <span>{userFriends[user.id]?.length || 0}</span>
                        
                        <strong>Friend IDs:</strong>
                        <span style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px' }}>
                          {userFriends[user.id]?.join(', ') || 'None'}
                        </span>
                      </div>
                      
                      {userFriends[user.id]?.length > 0 && (
                        <div style={{ marginTop: '15px' }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Friend Details</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {userFriends[user.id].map(friendId => {
                              const friend = users.find(u => u.id === friendId);
                              return (
                                <div
                                  key={friendId}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#f0f0f0',
                                    borderRadius: '15px',
                                    fontSize: '12px',
                                    border: '1px solid #ddd'
                                  }}
                                >
                                  {friend?.nickname || friendId.substring(0, 8)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '15px 20px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa'
        }}>
          <div style={{ fontSize: '13px', color: '#666' }}>
            Total Users: {users.length} | Filtered: {filteredUsers.length}
          </div>
          <button
            onClick={loadUsers}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;