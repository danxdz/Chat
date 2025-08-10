# 🌐 Decentralized P2P Chat

A fully decentralized peer-to-peer chat application built with React and Gun.js. No servers, no central authority - just pure P2P messaging that works across all devices.

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://chat-brown-chi-22.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![Gun.js](https://img.shields.io/badge/Gun.js-0.2020.520-orange)](https://gun.eco/)

## ✨ Features

### 🔒 **Fully Decentralized**
- **No servers required** - runs entirely on Gun.js P2P network
- **Cross-device sync** - messages appear instantly on all devices
- **Offline-first** - works without internet, syncs when reconnected
- **Censorship resistant** - no central point of failure

### 💬 **Rich Messaging**
- **General chat** - public messages visible to all users
- **Private messaging** - encrypted 1-on-1 conversations
- **Real-time sync** - instant message delivery across devices
- **Message persistence** - chat history preserved across sessions

### 🔗 **Magic Link Invitations**
- **One-click invites** - generate shareable invitation links
- **Auto-contact addition** - invitees automatically added as pending contacts
- **Secure invite codes** - URL-safe base64 encoded invitations
- **User onboarding** - seamless friend addition workflow

### 📱 **Mobile Optimized**
- **4-inch screen support** - perfect for iPhone SE and small phones
- **Touch-friendly UI** - 44px minimum touch targets
- **Responsive design** - works on all screen sizes
- **Horizontal contact scrolling** - space-efficient contact management

### 🧪 **Developer Tools**
- **Built-in testing suite** - comprehensive P2P connectivity tests
- **Debug console** - real-time Gun.js activity monitoring
- **Connection diagnostics** - network health and peer status
- **Data management** - clear storage and reset functionality

## 🚀 Quick Start

### Online Demo
Visit the live demo: **[https://chat-brown-chi-22.vercel.app](https://chat-brown-chi-22.vercel.app)**

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/danxdz/Chat.git
   cd Chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   Navigate to `http://localhost:5173`

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with Vite
- **P2P Network**: Gun.js (v0.2020.520)
- **Styling**: CSS3 with responsive design
- **Deployment**: Vercel with automatic deployments

### P2P Communication
```
Device A ←→ Gun.js Network ←→ Device B
    ↑                           ↓
    └── Real-time sync ─────────┘
```

### Data Flow
1. **Message Creation**: User types message in React UI
2. **P2P Broadcast**: Gun.js distributes to network peers
3. **Real-time Sync**: All connected devices receive message
4. **Local Storage**: Messages cached for offline access

## 💻 Usage Guide

### Getting Started
1. **Registration**: Choose a nickname and create your identity
2. **General Chat**: Start messaging in the public chat room
3. **Add Contacts**: Use the "➕ Add" button or invite links
4. **Private Chat**: Click any contact for 1-on-1 messaging

### Invitation Workflow
1. **Generate Invite**: Click "📤 Invite" button
2. **Copy Link**: Share the generated invitation URL
3. **Friend Joins**: They register using your invite link
4. **Auto-Connect**: Automatically added as pending contact

### Mobile Usage
- **Contacts**: Swipe horizontally through contact list
- **Messages**: Optimized bubbles for small screens
- **Input**: Touch-friendly message composition
- **Navigation**: Compact header with icon-only mode

### Testing & Debugging
1. **Open Tests**: Click "🧪 Tests" button
2. **Run Diagnostics**: Use "🔍 Run All Tests"
3. **Check Connectivity**: "🔍 Test Basic Gun.js"
4. **Cross-Device**: "🚀 Cross-Device Test"

## 🔧 Technical Details

### Gun.js Integration
```javascript
// Initialize Gun.js with multiple peers
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wallie.io/gun',
    'wss://gun-manhattan.herokuapp.com/gun'
  ]
})

// Send message to P2P network
gun.get('chat_messages').get(`msg_${messageId}`).put(message)

// Listen for incoming messages
gun.get('chat_messages').map().on((data, key) => {
  // Handle incoming message
})
```

### Message Structure
```javascript
{
  id: "1234567890_abc123",
  text: "Hello, world!",
  from: "Alice",
  fromId: "user_123",
  to: "General",
  toId: "general",
  timestamp: 1640995200000,
  type: "general" // or "private"
}
```

### Channel Architecture
- **General Chat**: `general_chat` - public messages
- **Private Chat**: `private_{id1}_{id2}` - 1-on-1 messages
- **Unique Keys**: `msg_{messageId}` - prevents message replacement

## 📱 Mobile Optimization

### Responsive Breakpoints
- **414px × 736px**: 4-inch phones (iPhone SE)
- **480px**: General small phone adjustments
- **360px**: Very small screens (icons only)

### Mobile Features
- **Compact Header**: 48px height on small screens
- **Horizontal Contacts**: 80px scrollable contact bar
- **Touch Targets**: Minimum 40px height for all buttons
- **Prevent Zoom**: 16px font size to prevent iOS zoom
- **Optimized Messages**: 90% width with compact spacing

## 🛠️ Development

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Project Structure
```
├── src/
│   ├── App.jsx          # Main application component
│   ├── index.css        # Global styles and responsive design
│   └── main.jsx         # React entry point
├── public/
│   └── sodium.js        # Cryptography library
├── index.html           # Main HTML template
├── package.json         # Dependencies and scripts
└── vercel.json          # Deployment configuration
```

### Code Organization
- **Components**: React functional components with hooks
- **State Management**: useState and useEffect hooks
- **Styling**: CSS classes with mobile-first responsive design
- **P2P Logic**: Gun.js integration with error handling

## 🌐 Deployment

### Vercel Deployment
The app is automatically deployed to Vercel on every push to main branch.

**Live URL**: [https://chat-brown-chi-22.vercel.app](https://chat-brown-chi-22.vercel.app)

### Manual Deployment
1. **Build the app**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npx vercel --prod
   ```

3. **Or deploy to any static host**
   Upload the `dist/` folder contents

## 🧪 Testing

### Built-in Test Suite
The app includes a comprehensive testing panel accessible via "🧪 Tests":

- **🔍 Run All Tests**: Complete system diagnostics
- **📡 Send Test Message**: P2P messaging test
- **🚀 Cross-Device Test**: Multi-device sync verification
- **🔍 Test Basic Gun.js**: Network connectivity check
- **👥 Create Test Users**: Generate sample users

### Manual Testing
1. **Same Browser**: Open multiple tabs
2. **Cross-Browser**: Test in different browsers
3. **Cross-Device**: Use phone and computer
4. **Network Conditions**: Test with poor connectivity

### Console Debugging
Open browser console to see detailed logs:
```
📡 SENDING MESSAGE TO GUN.JS: {message}
📨 GENERAL CHAT - RAW DATA: {data}
✅ VALID GENERAL MESSAGE - Adding to state
💾 Adding NEW message to state
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature-name`
3. **Commit changes**: `git commit -m 'Add feature'`
4. **Push to branch**: `git push origin feature-name`
5. **Create Pull Request**

### Development Guidelines
- Follow React best practices
- Maintain mobile-first responsive design
- Test on multiple devices and browsers
- Document any new features
- Ensure P2P functionality works offline

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Gun.js** - For the amazing P2P database technology
- **React** - For the powerful UI framework
- **Vercel** - For seamless deployment platform
- **Open Source Community** - For inspiration and collaboration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/danxdz/Chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/danxdz/Chat/discussions)
- **Gun.js Help**: [http://chat.gun.eco](http://chat.gun.eco)

---

**Built with ❤️ for a decentralized future**
