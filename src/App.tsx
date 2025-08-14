import React, { useState, useEffect } from 'react';
import { ViewType, Contact, PendingInvite, DebugNotification } from './types';
import { useGun } from './hooks/useGun';
import { useAuth } from './hooks/useAuth';
import { useMessages } from './hooks/useMessages';
import { usePresence } from './hooks/usePresence';
import { getFriendsList, changeNickname } from './utils/secureAuth';
import { initWebRTC } from './services/webrtcService';
import { logger, isDev } from './utils/logger';
import gunPeers from './config/gunPeers';

// Import components
import LoginView from './components/LoginView';
import NeedInviteView from './components/NeedInviteView';
import ChatView from './components/ChatView';
import ErrorBoundary from './components/ErrorBoundary';
import DebugNotifications from './components/DebugNotifications';

const App: React.FC = () => {
  // Core state
  const [currentView, setCurrentView] = useState<ViewType>('loading');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [friends, setFriends] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [debugNotifications, setDebugNotifications] = useState<DebugNotification[]>([]);
  const [initStatus, setInitStatus] = useState('Initializing...');
  const [chatError, setChatError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // Initialize hooks
  const { gun, isReady: gunReady, error: gunError } = useGun(gunPeers);
  const { user, allUsers, login, register, logout, createBootstrapUser, restoreSession } = useAuth(gun);
  const { messages, displayMessages, messageDeliveryStatus, sendMessage, clearMessages } = useMessages(gun, user, activeContact);
  const { onlineUsers, lastSeen, connectionStatus, announcePresence, updatePresence } = usePresence(gun, user);

  // Debug notification system
  const showDebugNotification = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    if (!isDev) return;
    
    const notification: DebugNotification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now()
    };
    
    setDebugNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setDebugNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        setInitStatus('Checking Gun.js...');
        
        if (gunError) {
          setChatError(`Failed to initialize Gun.js: ${gunError}`);
          setCurrentView('login');
          return;
        }

        if (!gunReady) {
          return; // Wait for Gun.js to be ready
        }

        setInitStatus('Checking session...');
        
        // Try to restore session
        const restoredUser = await restoreSession();
        
        if (restoredUser) {
          setCurrentView('chat');
          showDebugNotification('Session restored', 'success');
        } else {
          // Check URL for invite token
          const hash = window.location.hash;
          if (hash.startsWith('#invite=')) {
            sessionStorage.setItem('pendingInvite', hash.replace('#invite=', ''));
            setCurrentView('register');
          } else {
            setCurrentView('needInvite');
          }
        }

        // Initialize WebRTC
        if (restoredUser) {
          initWebRTC(restoredUser.id);
        }

        setInitStatus('Ready');
      } catch (error) {
        logger.error('App initialization error:', error);
        setChatError('Failed to initialize app');
        setCurrentView('login');
      }
    };

    init();
  }, [gunReady, gunError]);

  // Load friends when user changes
  useEffect(() => {
    if (user && gun) {
      loadFriends();
      announcePresence();
    }
  }, [user, gun]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (user) {
        updatePresence('offline');
      }
    };
  }, [user]);

  const loadFriends = async () => {
    if (!user || !gun) return;
    
    try {
      const friendsList = await getFriendsList(user.id);
      const friendContacts: Contact[] = friendsList.map(friendId => {
        const friendUser = allUsers.find(u => u.id === friendId);
        return {
          id: friendId,
          nickname: friendUser?.nickname || 'Unknown',
          status: onlineUsers.has(friendId) ? 'online' : 'offline',
          publicKey: friendUser?.publicKey
        };
      });
      setFriends(friendContacts);
    } catch (error) {
      logger.error('Failed to load friends:', error);
    }
  };

  // Handle login
  const handleLogin = async (nickname: string, password: string, rememberMe: boolean) => {
    try {
      const success = await login(nickname, password, rememberMe);
      if (success) {
        setCurrentView('chat');
        showDebugNotification('Login successful', 'success');
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  };

  // Handle registration
  const handleRegister = async (nickname: string, password: string) => {
    try {
      const success = await register(nickname, password);
      if (success) {
        setCurrentView('chat');
        showDebugNotification('Registration successful', 'success');
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setCurrentView('login');
    setActiveContact(null);
    setFriends([]);
    clearMessages();
    showDebugNotification('Logged out', 'info');
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await sendMessage(newMessage, activeContact);
      setNewMessage('');
    } catch (error) {
      logger.error('Failed to send message:', error);
      showDebugNotification('Failed to send message', 'error');
    }
  };

  // Handle nickname change
  const handleNicknameChange = async () => {
    if (!user) return;
    
    const newNickname = prompt('Enter new nickname:', user.nickname);
    if (newNickname && newNickname !== user.nickname) {
      try {
        await changeNickname(user.id, newNickname);
        // Update user object
        const updatedUser = { ...user, nickname: newNickname };
        // Note: In real implementation, update this in auth hook
        showDebugNotification('Nickname updated', 'success');
      } catch (error) {
        logger.error('Failed to change nickname:', error);
        showDebugNotification('Failed to change nickname', 'error');
      }
    }
  };

  // Handle contact selection
  const handleContactSelect = (contact: Contact | null) => {
    setActiveContact(contact);
    if (contact) {
      showDebugNotification(`Chatting with ${contact.nickname}`, 'info');
    }
  };

  // Handle invite creation
  const handleInviteCreated = (invite: PendingInvite) => {
    setPendingInvites(prev => [...prev, invite]);
    showDebugNotification('Invite created', 'success');
  };

  // Test functions for development
  const sendTestMessage = () => {
    if (!user) return;
    const testMsg = `Test message from ${user.nickname} at ${new Date().toLocaleTimeString()}`;
    handleSendMessage();
  };

  const clearCurrentClient = () => {
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    showDebugNotification('Current client data cleared', 'info');
  };

  const clearAllClients = () => {
    localStorage.clear();
    sessionStorage.clear();
    showDebugNotification('All client data cleared', 'warning');
    window.location.reload();
  };

  const forceReload = () => {
    window.location.reload();
  };

  // Render loading state
  if (currentView === 'loading') {
    return (
      <div className="screen">
        <div className="loading">
          <div className="spinner"></div>
          <p>{initStatus}</p>
        </div>
      </div>
    );
  }

  // Render login view
  if (currentView === 'login') {
    return (
      <ErrorBoundary>
        <LoginView
          onLogin={handleLogin}
          onRegister={() => setCurrentView('register')}
          onNeedInvite={() => setCurrentView('needInvite')}
          error={chatError}
        />
      </ErrorBoundary>
    );
  }

  // Render need invite view
  if (currentView === 'needInvite') {
    return (
      <ErrorBoundary>
        <NeedInviteView
          onCreateAdmin={async () => {
            await createBootstrapUser();
            setCurrentView('chat');
          }}
          onHaveInvite={() => setCurrentView('register')}
          onLogin={() => setCurrentView('login')}
        />
      </ErrorBoundary>
    );
  }

  // Render registration view
  if (currentView === 'register') {
    return (
      <ErrorBoundary>
        <div className="screen">
          <DebugNotifications debugNotifications={debugNotifications} isDev={isDev} />
          <div className="form">
            <h1>Create Account</h1>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const nickname = (form.elements.namedItem('nickname') as HTMLInputElement).value;
              const password = (form.elements.namedItem('password') as HTMLInputElement).value;
              
              try {
                await handleRegister(nickname, password);
              } catch (error) {
                alert('Registration failed: ' + (error as Error).message);
              }
            }}>
              <input
                name="nickname"
                type="text"
                placeholder="Choose a nickname"
                required
                className="input"
              />
              <input
                name="password"
                type="password"
                placeholder="Create a password"
                required
                minLength={4}
                className="input"
              />
              <button type="submit" className="btn">
                Create Account
              </button>
            </form>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Render main chat view
  return (
    <ErrorBoundary>
      <ChatView
        user={user}
        gun={gun}
        messages={messages}
        displayMessages={displayMessages}
        friends={friends}
        onlineUsers={onlineUsers}
        allUsers={allUsers}
        pendingInvites={pendingInvites}
        activeContact={activeContact}
        newMessage={newMessage}
        chatError={chatError}
        messageDeliveryStatus={messageDeliveryStatus}
        connectionStatus={connectionStatus}
        lastSeen={lastSeen}
        initStatus={initStatus}
        debugNotifications={debugNotifications}
        isDev={isDev}
        onMessageChange={setNewMessage}
        onSendMessage={handleSendMessage}
        onContactSelect={handleContactSelect}
        onNicknameChange={handleNicknameChange}
        onLogout={handleLogout}
        onInviteCreated={handleInviteCreated}
        onSendTestMessage={sendTestMessage}
        onClearCurrentClient={clearCurrentClient}
        onClearAllClients={clearAllClients}
        onForceReload={forceReload}
      />
    </ErrorBoundary>
  );
};

export default App;