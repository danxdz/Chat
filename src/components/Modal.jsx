import React from 'react'

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'medium',
  showCloseButton = true
}) {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const sizeClasses = {
    small: 'modal-small',
    medium: 'modal-medium',
    large: 'modal-large',
    fullscreen: 'modal-fullscreen'
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal ${sizeClasses[size]}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          {showCloseButton && (
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  )
}