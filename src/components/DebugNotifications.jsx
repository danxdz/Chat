// Debug notifications component (only in development)
function DebugNotifications({ debugNotifications, isDev }) {
  if (!isDev) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 10000,
      pointerEvents: 'none'
    }}>
      {debugNotifications.map((notif) => (
        <div
          key={notif.id}
          style={{
            background: notif.type === 'error' ? '#ff6666' : 
                       notif.type === 'success' ? '#66ff66' : '#66bbff',
            color: '#000',
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '4px',
            fontSize: '12px',
            maxWidth: '300px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontWeight: 'bold',
            border: '1px solid rgba(0,0,0,0.2)'
          }}
        >
          {notif.message}
        </div>
      ))}
    </div>
  )
}

export default DebugNotifications