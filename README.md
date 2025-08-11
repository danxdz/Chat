# 🚀 Decentralized P2P Chat Application

A fully decentralized, serverless P2P chat application built with **React**, **Gun.js**, and **Gun SEA** for secure, real-time messaging without central servers.

## ✨ Features

### 🔐 **Security & Privacy**
- **End-to-end encryption** using Gun SEA
- **Cryptographically signed invites** with expiration
- **Permanent cryptographic identities** (keypairs)
- **IRC-style nickname system** with changeable display names
- **No central server** - data lives on the P2P network

### 🌐 **P2P Networking**
- **Fully decentralized** - no backend required
- **Real-time message sync** across all devices
- **Offline-first** with automatic sync when online
- **Multiple Gun.js relay peers** for reliability
- **Mesh networking** with peer discovery

### 💬 **Chat Features**
- **General chat** for all users
- **Private messaging** between friends
- **IRC-style presence system** (online/offline, join/leave notifications)
- **Message delivery status** (sending, sent, delivered)
- **Friend system** with auto-friendship on invite
- **Real-time typing indicators**

### 📱 **User Experience**
- **Mobile-responsive** design optimized for 4-inch screens
- **PWA-ready** for mobile installation
- **Admin bootstrap** system for initial setup
- **Invite-only registration** with secure links
- **Auto-login** after registration
- **Error recovery** with data clearing options

## 🏗️ Architecture

### **Frontend (React)**
- **Main App** (`src/App.jsx`) - Core chat interface
- **Components** - Modular UI components
  - `Header.jsx` - Navigation and user info
  - `ChatArea.jsx` - Message display and input
  - `ContactSidebar.jsx` - Friends and online users
  - `TestingPanel.jsx` - Developer tools
  - `SecureInviteModal.jsx` - Invite generation

### **Registration System**
- **Separate HTML page** (`public/register.html`) - Vanilla JS registration
- **Bypasses React** to avoid initialization conflicts
- **Direct Gun.js integration** for account creation
- **Auto-redirect** back to main app after registration

### **P2P Backend (Gun.js)**
- **Data Channels**:
  - `general_chat` - Public messages
  - `private_{id1}_{id2}` - Private messages
  - `user_presence` - Online status and IRC-style events
  - `secure_invites` - Invite verification data
  - `chat_messages` - All message history

### **Authentication (`src/utils/secureAuth.js`)**
- **Identity Generation** - Gun SEA keypairs
- **Password Hashing** - SHA-256 with Gun SEA
- **Invite System** - Signed, expiring, one-time-use invites
- **Friend Management** - Permanent ID-based relationships

## 🚀 Getting Started

### **Prerequisites**
- Node.js 16+
- npm or yarn

### **Installation**
```bash
git clone <repository>
cd decentralized-p2p-chat
npm install
```

### **Development**
```bash
npm run dev
```
Starts development server at `http://localhost:3000`

### **Production Build**
```bash
npm run build
```

### **Deploy**
```bash
npm run perfect
```
Automated test, build, commit, and deploy to Vercel.

## 🔧 Configuration

### **Gun.js Peers**
Update `gunPeers` array in `src/App.jsx`:
```javascript
const gunPeers = [
  'https://relay.peer.ooo/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wallie.io/gun'
]
```

### **Domain Configuration**
Update invite links in `src/utils/secureAuth.js`:
```javascript
inviteUrl: `https://your-domain.com/register.html#invite=${token}`
```

## 🛠️ Usage

### **Initial Setup**
1. **Deploy the app** to your hosting platform
2. **Visit the app** and click "🚀 Create Admin"
3. **Login as Admin** (Admin/admin123)
4. **Create invite links** for new users

### **User Registration**
1. **Receive invite link** from existing user
2. **Click invite link** → redirects to registration page
3. **Choose nickname and password**
4. **Auto-login** to main chat app

### **Chat Features**
- **General Chat** - Click "General" to join public chat
- **Private Messages** - Click on a friend's name
- **Invite Friends** - Click invite button in header
- **Change Nickname** - Dev menu → Change Nickname
- **View Online Users** - Left sidebar shows active users

## 🔒 Security Model

### **Cryptographic Identity**
- Each user has a **Gun SEA keypair** (permanent ID)
- **Public key** serves as immutable user ID
- **Private key** used for signing and encryption
- **Nickname** is just a changeable display name

### **Invite Security**
- **Cryptographically signed** by inviter
- **Time-limited** (60s, 5m, 1h, 1day)
- **One-time use** (marked as used after registration)
- **Forgery-resistant** signature verification

### **Message Encryption**
- **AES encryption** using Gun SEA
- **Shared keys** per channel (`p2p-chat-key-{channel}`)
- **End-to-end encrypted** private messages
- **Forward secrecy** through ephemeral sessions

## 🧪 Development Tools

### **Built-in Testing**
- **P2P Message Tests** - Verify Gun.js connectivity
- **Multi-user Tests** - Simulate multiple users
- **Private Message Tests** - Test encryption
- **Visual Test Panel** - Real-time test results

### **Debug Options**
- **Clear Session Data** - Reset current session
- **Clear All Data** - Full app reset
- **Force Reload** - Hard refresh
- **Clear Gun.js Data** - Network data clearing

### **Automated Deployment**
The `npm run perfect` script provides:
- **Automatic testing** before deployment
- **Build optimization** and bundling
- **Git commit** with deployment
- **Vercel deployment** integration

## 📁 Project Structure

```
src/
├── App.jsx                 # Main application
├── index.css              # Global styles
├── components/            # React components
│   ├── Header.jsx
│   ├── ChatArea.jsx
│   ├── ContactSidebar.jsx
│   ├── TestingPanel.jsx
│   └── SecureInviteModal.jsx
└── utils/
    └── secureAuth.js      # Authentication utilities

public/
├── register.html          # Standalone registration page
└── index.html            # Main app entry

dist/                      # Production build
test-and-deploy.cjs       # Automated deployment script
```

## 🌟 Key Technical Achievements

- **Solved React initialization issues** with separate registration page
- **Implemented bulletproof Gun.js integration** with proper error handling
- **Created secure invite system** with cryptographic signatures
- **Built IRC-style presence system** with real-time user tracking
- **Optimized for mobile** with 4-inch screen support
- **Achieved true P2P** without any backend dependencies
- **Modular component architecture** for maintainability

## 📦 Dependencies

### **Core**
- **React 18** - UI framework
- **Gun.js 0.2020.520** - P2P database
- **Gun SEA** - Cryptography module
- **Vite** - Build tool and dev server

### **Deployment**
- **Vercel** - Hosting platform
- **Node.js** - Development environment

## 🐛 Troubleshooting

### **Common Issues**

**"cb not a function" errors:**
- Fixed with Gun.js version pinning to 0.2020.520
- Separate registration page bypasses React conflicts

**Invite links not working:**
- Ensure domain configuration matches deployment
- Check Gun.js peer connectivity
- Verify signature validation in console

**Messages not syncing:**
- Check network connectivity
- Verify Gun.js peers are accessible
- Test with multiple relay peers

**Mobile UI issues:**
- App optimized for 4-inch screens and larger
- Use browser dev tools for mobile testing
- Check CSS media queries for responsive behavior

## 🚀 Deployment

### **Vercel (Recommended)**
1. **Connect GitHub repo** to Vercel
2. **Set build command:** `npm run build`
3. **Set output directory:** `dist`
4. **Deploy automatically** on git push

### **Other Platforms**
- **Netlify** - Same build settings as Vercel
- **GitHub Pages** - Static hosting compatible
- **Firebase Hosting** - Works with SPA routing

## 🎯 Future Enhancements

- **File sharing** with P2P transfers
- **Voice/video calls** with WebRTC
- **Group chat rooms** with admin controls
- **Message reactions** and emoji support
- **Push notifications** with service workers
- **Advanced encryption** with forward secrecy
- **Plugin system** for extensibility

---

**Built with ❤️ for the decentralized web**

*No servers, no tracking, no central authority - just pure P2P communication.*
