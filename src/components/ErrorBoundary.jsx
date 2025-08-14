import { Component } from 'react'
import { logger } from '../utils/logger'

// Error Boundary Component - extracted from App.jsx with same functionality
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logger.error('🚨 React Error Boundary caught an error:', error, errorInfo)
    logger.error('🔍 Error stack:', error.stack)
    
    // Clear sessionStorage if there's an initialization error  
    if (error.message && error.message.includes('before initialization')) {
      console.log('🔧 Clearing sessionStorage due to initialization error')
      sessionStorage.clear()
      // Don't clear localStorage to keep admin user
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen">
          <div className="form">
            <h1 style={{ color: '#dc3545' }}>⚠️ Something went wrong</h1>
            <p>The application encountered an error:</p>
            <pre style={{ 
              background: '#333', 
              padding: '1rem', 
              borderRadius: '4px', 
              fontSize: '0.8rem',
              overflow: 'auto'
            }}>
              {this.state.error?.toString()}
            </pre>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  sessionStorage.clear()
                  window.location.href = window.location.origin
                }} 
                className="btn"
                style={{ background: '#ffc107', color: '#000' }}
              >
                🔧 Clear Session & Retry
              </button>
              <button 
                onClick={() => {
                  sessionStorage.clear()
                  localStorage.clear()
                  window.location.href = window.location.origin
                }} 
                className="btn"
                style={{ background: '#ff6b6b' }}
              >
                🗑️ Full Reset
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="btn"
                style={{ background: '#dc3545' }}
              >
                🔄 Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary