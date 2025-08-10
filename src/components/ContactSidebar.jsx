export default function ContactSidebar({ 
  contacts, 
  activeContact, 
  connectionStatus, 
  onContactSelect, 
  onAddContact 
}) {
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
        Contacts
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
            flexShrink: 0
          }}
        >
          💬 General
        </button>

        {/* Contact List */}
        {contacts.map(contact => {
          const status = connectionStatus.get(contact.id) || 'disconnected'
          const statusIcon = status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴'
          
          return (
            <button
              key={contact.id}
              className="contact-button"
              onClick={() => onContactSelect(contact)}
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
                flexShrink: 0
              }}
            >
              <span>{statusIcon}</span>
              <span>{contact.nickname}</span>
              {contact.status === 'pending' && (
                <span style={{ color: '#ffc107' }}>⏳</span>
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
            flexShrink: 0
          }}
        >
          ➕ Add
        </button>
      </div>
    </div>
  )
}