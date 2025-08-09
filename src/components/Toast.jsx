import { useEffect, useState } from 'react'
import './Toast.css'

function Toast({ message, type = 'info' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show toast
    setVisible(true)
    
    // Auto hide after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null

  return (
    <div className={`toast ${type} ${visible ? 'show' : ''}`}>
      {message}
    </div>
  )
}

export default Toast