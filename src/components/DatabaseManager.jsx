import { useState, useEffect } from 'react';
import { DB_NAMESPACE } from '../config/database.js';

const DatabaseManager = ({ onClose }) => {
  const [currentNamespace, setCurrentNamespace] = useState(DB_NAMESPACE);
  const [newNamespace, setNewNamespace] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedNamespaces, setSavedNamespaces] = useState([]);

  useEffect(() => {
    // Load saved namespaces from localStorage
    const saved = JSON.parse(localStorage.getItem('db_namespaces') || '[]');
    setSavedNamespaces(saved);
    
    // Get current namespace from localStorage or use default
    const current = localStorage.getItem('current_db_namespace') || DB_NAMESPACE;
    setCurrentNamespace(current);
  }, []);

  const handleChangeDatabase = () => {
    if (!newNamespace.trim()) {
      alert('Please enter a namespace name');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newNamespace)) {
      alert('Namespace can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setShowConfirm(true);
  };

  const confirmChange = () => {
    // Save the new namespace
    localStorage.setItem('current_db_namespace', newNamespace);
    
    // Add to saved namespaces if not already there
    if (!savedNamespaces.includes(newNamespace)) {
      const updated = [...savedNamespaces, newNamespace];
      localStorage.setItem('db_namespaces', JSON.stringify(updated));
      setSavedNamespaces(updated);
    }
    
    // Clear local storage (except namespace settings)
    const namespaceSetting = localStorage.getItem('current_db_namespace');
    const savedNamespacesList = localStorage.getItem('db_namespaces');
    localStorage.clear();
    localStorage.setItem('current_db_namespace', namespaceSetting);
    localStorage.setItem('db_namespaces', savedNamespacesList);
    
    // Reload the page to apply changes
    alert(`Database changed to: ${newNamespace}\n\nThe page will now reload with the new database.`);
    window.location.reload();
  };

  const quickSwitch = (namespace) => {
    setNewNamespace(namespace);
    localStorage.setItem('current_db_namespace', namespace);
    
    // Clear local storage (except namespace settings)
    const namespaceSetting = localStorage.getItem('current_db_namespace');
    const savedNamespacesList = localStorage.getItem('db_namespaces');
    localStorage.clear();
    localStorage.setItem('current_db_namespace', namespaceSetting);
    localStorage.setItem('db_namespaces', savedNamespacesList);
    
    alert(`Switched to database: ${namespace}\n\nThe page will now reload.`);
    window.location.reload();
  };

  const clearAllData = () => {
    if (confirm('This will clear ALL local data including saved namespaces. Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      alert('All data cleared! Page will reload.');
      window.location.reload();
    }
  };

  const generateNamespace = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    setNewNamespace(`p2pchat_${timestamp}_${random}`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001,
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a2e',
        border: '2px solid #764ba2',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>🗄️ Database Manager</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Current Database */}
          <div style={{
            background: 'rgba(118, 75, 162, 0.2)',
            border: '1px solid rgba(118, 75, 162, 0.5)',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>
              CURRENT DATABASE
            </div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace' }}>
              {currentNamespace}
            </div>
          </div>

          {/* Quick Switch */}
          {savedNamespaces.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>
                📚 Quick Switch
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {savedNamespaces.map(ns => (
                  <button
                    key={ns}
                    onClick={() => quickSwitch(ns)}
                    disabled={ns === currentNamespace}
                    style={{
                      padding: '5px 12px',
                      background: ns === currentNamespace 
                        ? 'rgba(118, 75, 162, 0.5)' 
                        : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: ns === currentNamespace ? '#fff' : '#aaa',
                      cursor: ns === currentNamespace ? 'default' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {ns}
                    {ns === currentNamespace && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New Database */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>
              🆕 Create New Database
            </h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={newNamespace}
                onChange={(e) => setNewNamespace(e.target.value)}
                placeholder="Enter namespace (e.g., p2pchat_v3)"
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={generateNamespace}
                style={{
                  padding: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Generate random namespace"
              >
                🎲
              </button>
            </div>
            <button
              onClick={handleChangeDatabase}
              style={{
                width: '100%',
                padding: '12px',
                background: '#28a745',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Switch to New Database
            </button>
          </div>

          {/* Presets */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>
              ⚡ Preset Databases
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['p2pchat_v1', 'p2pchat_v2', 'p2pchat_v3', 'p2pchat_test', 'p2pchat_dev', 'p2pchat_prod'].map(preset => (
                <button
                  key={preset}
                  onClick={() => setNewNamespace(preset)}
                  style={{
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#aaa',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div style={{
            background: 'rgba(220, 53, 69, 0.1)',
            border: '1px solid rgba(220, 53, 69, 0.3)',
            borderRadius: '8px',
            padding: '15px'
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#ff6b6b' }}>
              ⚠️ Danger Zone
            </h3>
            <button
              onClick={clearAllData}
              style={{
                width: '100%',
                padding: '10px',
                background: '#dc3545',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear All Data & Reset
            </button>
          </div>

          {/* Info */}
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(23, 162, 184, 0.1)',
            border: '1px solid rgba(23, 162, 184, 0.3)',
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: '1.5'
          }}>
            <strong>ℹ️ How it works:</strong><br/>
            • Each namespace is a completely separate database<br/>
            • Switching namespaces gives you a fresh start<br/>
            • Your data in other namespaces remains intact<br/>
            • Use this to test, develop, or start over
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#1a1a2e',
              border: '2px solid #764ba2',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '400px',
              width: '100%'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Confirm Database Change</h3>
              <p style={{ marginBottom: '20px', fontSize: '14px' }}>
                Switch from <strong>{currentNamespace}</strong> to <strong>{newNamespace}</strong>?
              </p>
              <p style={{ marginBottom: '20px', fontSize: '12px', color: '#ffc107' }}>
                ⚠️ This will reload the page and start with the new database.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={confirmChange}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#28a745',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#6c757d',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseManager;