export default function ContactSidebar({ 
  contacts, 
  activeContact, 
  connectionStatus, 
  lastSeen,
  onContactSelect, 
  onAddContact 
}) {
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="sidebar" style={{ 
      width: window.innerWidth < 768 ? '100%' : '250px',
      height: window.innerWidth < 768 ? '120px' : 'auto',
      background: '#333', 
      borderRight: window.innerWidth < 768 ? 'none' : '1px solid #555',
      borderBottom: window.innerWidth < 768 ? '1px solid #555' : 'none',
      padding: '0.5rem',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.9rem' }}>
        Contacts ({contacts.length})
      </h3>
      
      <div className={window.innerWidth < 480 ? "contacts-horizontal" : "contacts-container"} style={{ 
        display: 'flex', 
        gap: '0.3rem', 
        flexWrap: window.innerWidth < 480 ? 'nowrap' : 'wrap',
        overflowX: window.innerWidth < 480 ? 'auto' : 'visible'
      }}>
        {/* General Chat Button */}
        <button
          className="contact-button"
          onClick={() => onContactSelect(null)}
          style={{
            padding: '0.4rem 0.6rem',
            background: !activeContact ? '#0066cc' : '#444',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#fff',
            border: 'none',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          💬 General
        </button>

        {/* Contact List */}
        {contacts.map(contact => {
          const status = connectionStatus.get(contact.id) || 'disconnected'
          const lastSeenTime = lastSeen.get(contact.id)
          const statusIcon = status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴'
          
          return (
            <button
              key={contact.id}
              className="contact-button"
              onClick={() => onContactSelect(contact)}
              title={`${contact.nickname} - ${status} ${lastSeenTime ? '(last seen ' + formatLastSeen(lastSeenTime) + ')' : ''}`}
              style={{
                padding: '0.4rem 0.6rem',
                background: activeContact?.id === contact.id ? '#0066cc' : '#444',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#fff',
                border: 'none',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                flexShrink: 0,
                flexDirection: 'column',
                minWidth: window.innerWidth < 480 ? '80px' : 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>{statusIcon}</span>
                <span>{contact.nickname}</span>
                {contact.status === 'pending' && (
                  <span style={{ color: '#ffc107' }}>⏳</span>
                )}
              </div>
              {status === 'disconnected' && lastSeenTime && (
                <span style={{ 
                  fontSize: '0.6rem', 
                  color: '#888',
                  display: window.innerWidth < 480 ? 'none' : 'block'
                }}>
                  {formatLastSeen(lastSeenTime)}
                </span>
              )}
            </button>
          )
        })}

        {/* Add Contact Button */}
        <button 
          className="contact-button"
          onClick={onAddContact}
          style={{
            padding: '0.4rem 0.6rem',
            background: '#28a745',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          ➕ <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Add</span>
        </button>
      </div>
    </div>
  )
}