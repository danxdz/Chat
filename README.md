# P2P Secure Chat Application

A complete peer-to-peer secure chat application with end-to-end encryption, built as a single HTML file with dark terminal aesthetic.

## Features

### 🔐 Security
- **PIN-based authentication** (4-digit PIN)
- **End-to-end encryption** using libsodium
- **Session-based keypairs** (not persisted for security)
- **Encrypted local storage** for contacts and message history
- **Secure PIN storage** (hashed in localStorage)

### 🌐 P2P Communication
- **Real WebRTC data channels** using SimplePeer
- **Direct peer-to-peer messaging** (no central server after connection)
- **Connection status indicators** (connecting/connected/disconnected)
- **Automatic reconnection attempts**

### 👥 Contact Management
- **Add contacts with nicknames**
- **Generate shareable invitation links**
- **Auto-add contacts from invitation links**
- **Online/offline status display**
- **Persistent contact storage**

### 💬 Chat Interface
- **Modern terminal-style UI** (green on black)
- **Message history persistence**
- **Timestamp display**
- **Visual indicators for message types**
- **IRC-style commands**

### 📱 Responsive Design
- **Works on desktop and mobile**
- **Cyberpunk/hacker aesthetic**
- **Glowing effects and animations**

## How to Use

### 1. First Time Setup
1. Open `index.html` in your browser
2. Enter a 4-digit PIN (this will be your login PIN)
3. The PIN is hashed and stored securely in localStorage

### 2. Adding Contacts
1. Click the "ADD" button in the contacts section
2. Enter a nickname for your contact
3. Copy the generated invitation link
4. Share the link with your contact

### 3. Accepting Invitations
1. When someone shares an invitation link with you
2. Simply open the link in your browser (while logged in)
3. The contact will be automatically added

### 4. Chatting
1. Select a contact from the sidebar
2. The app will attempt to establish a P2P connection
3. Once connected, you can send encrypted messages
4. All messages are end-to-end encrypted using libsodium

### 5. Commands
Type these commands in the message input:
- `/help` - Show available commands
- `/connect` - Manual connection to selected contact
- `/status` - Show connection statistics
- `/clear` - Clear chat history
- `/test` - Test encryption functionality

## Testing P2P Functionality

### Method 1: Two Browser Tabs
1. Open the app in two separate browser tabs
2. Use different PINs for each "user"
3. Create a contact in the first tab and copy the invite link
4. Paste the invite link in the second tab's address bar
5. Switch between tabs to test messaging

### Method 2: Two Different Browsers
1. Open the app in Chrome and Firefox (or any two browsers)
2. Follow the same process as above
3. This better simulates real P2P communication

### Method 3: Two Devices
1. Serve the file from a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
2. Access from multiple devices on the same network
3. Use the computer's IP address (e.g., `http://192.168.1.100:8000/p2p-secure-chat.html`)

## Technical Details

### Libraries Used
- **SimplePeer**: WebRTC wrapper for P2P connections
- **libsodium-js**: Cryptographic library for encryption (with SRI and CSP)

### Encryption
- Uses `crypto_box_easy` from libsodium
- Unique nonce per message (transport) and per record (storage)
- Session-based keypairs (generated on login)
- Perfect forward secrecy

### Storage
- **Encrypted localStorage** for contacts and chat history
- **sessionStorage** for temporary connection data
- **No server-side storage** (fully decentralized)

### Connection Process
1. User A creates an invitation containing their public key
2. User B accepts the invitation and stores the public key
3. WebRTC signaling occurs (simulated via localStorage across tabs for demo)
4. P2P connection established
5. Messages encrypted with recipient's public key

## Security Considerations

### Current Implementation
- PIN-based authentication (derived key with per-user salt and lockout)
- Session keypairs (not persisted)
- Local signaling (for demo purposes)

### Production Improvements Needed
- Stronger passphrase-based auth (longer than 4 digits)
- Real signaling server for WebRTC
- Better error handling for failed connections
- Rate limiting and spam protection

## Browser Compatibility

### Requirements
- Modern browser with WebRTC support
- JavaScript enabled
- localStorage support

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Connection Issues
1. Check browser console for errors
2. Ensure both users are online
3. Try the `/connect` command to manually reconnect
4. Refresh the page if WebRTC fails

### Encryption Errors
1. Use the `/test` command to verify encryption
2. Check that contact has valid public key
3. Ensure libsodium loaded properly

### UI Issues
1. Clear localStorage to reset data
2. Check browser developer tools for errors
3. Ensure all required libraries loaded

## Development

### File Structure
```
index.html              # Main app entry
README.md               # This documentation
```

### Key Functions
- `authenticateUser()` - PIN validation and app initialization
- `connectToPeer()` - Establish WebRTC connection
- `encryptMessage()` / `decryptMessage()` - Encryption using libsodium
- `sendMessage()` / `receiveMessage()` - Message handling
- `addNewContact()` - Contact management

### Extending the App
- Add file sharing capabilities
- Implement voice/video chat
- Add group chat functionality
- Create mobile app wrapper
- Add more IRC-style commands

## License

This project is provided as-is for educational and demonstration purposes.

## Security Notice

This is a demonstration application. For production use, implement proper security measures including:
- Secure signaling server
- Proper key derivation
- Input validation and sanitization
- Rate limiting
- Audit logging