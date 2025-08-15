import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      userMessage: '',
      isRecoverable: true
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat application error:', error, errorInfo);
    
    // Determine user-friendly message and recovery options
    const { message, recoverable } = this.getReadableError(error);
    
    this.setState({
      errorInfo,
      userMessage: message,
      isRecoverable: recoverable
    });

    // Log to external service in production
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }
  }

  getReadableError(error) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Gun.js connection errors
    if (errorMessage.includes('Gun') || errorMessage.includes('peer')) {
      return {
        message: '🔌 Connection problem. Trying to reconnect...',
        recoverable: true
      };
    }
    
    // Encryption errors
    if (errorMessage.includes('SEA') || errorMessage.includes('encrypt') || errorMessage.includes('decrypt')) {
      return {
        message: '🔐 Encryption error. Please check your password and try again.',
        recoverable: true
      };
    }
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      return {
        message: '🌐 Network issue. Please check your connection.',
        recoverable: true
      };
    }
    
    // Storage errors
    if (errorMessage.includes('localStorage') || errorMessage.includes('storage')) {
      return {
        message: '💾 Storage error. Your browser storage might be full.',
        recoverable: true
      };
    }
    
    // Key/Auth errors
    if (errorMessage.includes('key') || errorMessage.includes('auth') || errorMessage.includes('password')) {
      return {
        message: '🔑 Authentication problem. Please try logging in again.',
        recoverable: true
      };
    }
    
    // Default message
    return {
      message: '😕 Something went wrong. Please try refreshing the page.',
      recoverable: false
    };
  }

  logErrorToService(error, errorInfo) {
    // In production, send to error tracking service
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // TODO: Send to your error tracking service
    console.error('Production error:', errorData);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      userMessage: '',
      isRecoverable: true
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleClearStorage = () => {
    if (confirm('This will clear all local data and log you out. Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            color: '#333'
          }}>
            <h1 style={{
              fontSize: '28px',
              marginBottom: '20px',
              color: '#764ba2'
            }}>
              Oops! Something went wrong
            </h1>
            
            <div style={{
              fontSize: '18px',
              marginBottom: '30px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '10px',
              border: '1px solid #dee2e6'
            }}>
              {this.state.userMessage}
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details style={{
                marginBottom: '20px',
                padding: '10px',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '5px',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  Developer Details
                </summary>
                <pre style={{
                  marginTop: '10px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {this.state.isRecoverable && (
                <button
                  onClick={this.handleReset}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#218838'}
                  onMouseOut={(e) => e.target.style.background = '#28a745'}
                >
                  Try Again
                </button>
              )}
              
              <button
                onClick={this.handleRefresh}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = '#0056b3'}
                onMouseOut={(e) => e.target.style.background = '#007bff'}
              >
                Refresh Page
              </button>
              
              <button
                onClick={this.handleClearStorage}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = '#c82333'}
                onMouseOut={(e) => e.target.style.background = '#dc3545'}
              >
                Clear Data & Reset
              </button>
            </div>

            <div style={{
              marginTop: '30px',
              padding: '15px',
              background: '#e3f2fd',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0d47a1'
            }}>
              💡 <strong>Tip:</strong> If this keeps happening, try using a different browser or clearing your browser cache.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;