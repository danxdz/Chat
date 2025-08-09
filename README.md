# 🔒 Secure Chat - Simple P2P Encrypted Chat

A secure chat application with magic link invitations and PIN-based encryption.

## 🚀 **HOW TO USE**

### **Step 1: Get Your Magic Link**
1. Visit the app (your Vercel URL or localhost:3000)
2. Click the **🛠️ DEV** button (top-right corner)
3. Click **📋 Copy Link** or **🔗 Open Link**

### **Step 2: Create Your Account**
1. Open the magic link (in same or new browser tab)
2. Choose a nickname (or use the random one)
3. Set a 4-6 digit PIN
4. Click **Join Chat**

### **Step 3: Share with Others**
1. Share the same magic link with others
2. Everyone can use the same link to join
3. Check user count in the **🛠️ DEV** menu

### **Step 4: Login**
1. Return users just enter their PIN
2. Data is decrypted locally
3. Secure access to chat

## 🔐 **Security Features**

- **🔒 PIN-based encryption** - All data encrypted with your PIN
- **🎫 Magic links** - Simple invitation system  
- **💾 Local storage** - No data sent to servers
- **🔐 End-to-end encryption** - Messages encrypted locally
- **🚫 No passwords** - PIN-only authentication

## 🛠️ **Development**

### **Built-in Dev Menu**
- Click **🛠️ DEV** to access:
  - 🎫 Copy/Open magic link
  - 👥 See user count
  - 🔗 Check link status
  - 🗑️ Clear all data (for testing)

### **Tech Stack**
- **Frontend:** React 18 + Vite
- **Crypto:** libsodium.js (PIN hashing)
- **Storage:** Encrypted localStorage
- **Deployment:** Vercel

### **Local Development**
```bash
npm install
npm run dev
# Visit localhost:3000
```

### **Production Build**
```bash
npm run build
# Deploy dist/ folder to Vercel
```

## 📱 **User Experience**

### **First Time User:**
- Sees "No users registered yet" message
- Instructions point to 🛠️ DEV button
- Gets magic link to create account

### **Magic Link User:**
- Clicks link → account creation form
- Sets nickname + PIN → joins chat
- Link can be reused by others

### **Returning User:**
- Enters PIN → data decrypts → secure access
- All messages and data encrypted locally

## 🎯 **Simple & Secure**

- ✅ No complex admin systems
- ✅ No broken test pages
- ✅ No server-side data
- ✅ Everyone has equal access
- ✅ PIN protects everything
- ✅ Works on any device

---

## 🎉 **Ready to Use!**

**Just deploy to Vercel and start chatting securely!**

**All core functionality works perfectly - crypto, magic links, PIN auth, encrypted storage! 🔒**// Production deployment Sat Aug  9 10:05:49 PM UTC 2025
