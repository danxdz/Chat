# P2P Secure Chat - Testing Instructions

## Quick Start Testing

1. **Open the application**: Navigate to `http://localhost:8000/index.html`

2. **Set up your PIN**: 
   - Enter any 4-digit PIN (e.g., 1234)
   - Click LOGIN (first time users will have their PIN saved)

3. **Test in Multiple Browser Tabs**:
   
   ### Tab 1 (User A):
   - Open first tab with the application
   - Login with your PIN 
   - Click "ADD CONTACT"
   - Enter a nickname (e.g., "User B")
   - Copy the generated invitation link
   
   ### Tab 2 (User B):
   - Open second tab (new incognito window works best)
   - Login with a different 4-digit PIN
   - Paste the invitation link in the address bar and press Enter
   - The contact should be auto-added
   
   ### Tab 1 (User A):
   - Click on the contact in your contacts list
   - You should see "CONNECTING" then "ONLINE" status
   
   ### Both Tabs:
   - Now you can send encrypted messages between tabs!
   - Messages show a 🔒 icon indicating they're encrypted

## Features to Test

### Authentication
- ✅ PIN-based login (4 digits required)
- ✅ PIN hashing and secure storage
- ✅ Session keypair generation

### Contact Management  
- ✅ Add new contacts with nicknames
- ✅ Generate invitation links
- ✅ Auto-add contacts from invitation URLs
- ✅ Contact status indicators (offline/connecting/online)

### P2P Communication
- ✅ WebRTC peer connections using SimplePeer
- ✅ Real-time connection status updates
- ✅ Direct peer-to-peer messaging

### End-to-End Encryption
- ✅ Message encryption using libsodium
- ✅ Unique session keypairs per login
- ✅ Encrypted message indicators (🔒)

### Chat Interface
- ✅ Terminal/hacker aesthetic styling
- ✅ Message history persistence (encrypted at rest)
- ✅ Timestamp display
- ✅ System messages for connection events

### Commands System
Test these IRC-style commands by typing them in the message input:

- `/help` - Show available commands
- `/connect` - Manually reconnect to selected contact
- `/status` - Show connection and encryption status
- `/clear` - Clear chat history for current contact
- `/test` - Test encryption functionality

## Known Limitations

1. **Signaling**: Currently uses localStorage for WebRTC signaling exchange (demo purposes)
   - In production, this would use a proper signaling server
   - For testing, both users need to be on the same device/browser

2. **NAT Traversal**: May not work across different networks without STUN/TURN servers

3. **Mobile**: Responsive design included but best tested on desktop

## Troubleshooting

- **Connection Failed**: Try the `/connect` command to retry, or wait for automatic reconnection
- **Messages Not Encrypted**: Check `/status` command - encryption requires successful WebRTC connection
- **Contacts Not Showing**: Refresh the page and re-login
- **Invitation Links**: Make sure both users are logged in before opening invitation links

## Security Features Verified

- ✅ All messages encrypted with libsodium before transmission
- ✅ Unique session keypairs (not persisted between sessions)  
- ✅ Secure PIN storage (derived key with per-user salt)
- ✅ No message data stored on servers (P2P only)
- ✅ Forward secrecy (new keys each session)

The application demonstrates a fully functional P2P secure chat with real WebRTC connections, end-to-end encryption, and a terminal-style interface perfect for secure communications.