import './Screen.css'

function InviteSetup({ sodium, onComplete, showToast }) {
  return (
    <div className="screen">
      <div className="container">
        <div className="header">
          <h1>🎉 Welcome!</h1>
          <p>You've been invited to join</p>
        </div>
        
        <div className="form">
          <p>Invite setup coming soon...</p>
          <button 
            className="btn primary"
            onClick={() => showToast('Invite setup not implemented yet', 'info')}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default InviteSetup