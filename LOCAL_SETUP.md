# 🚀 Local Setup Guide for Secure Chat

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## 📥 Step 1: Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/danxdz/Chat.git

# OR clone via SSH (if you have SSH keys set up)
git clone git@github.com:danxdz/Chat.git

# Navigate to the project directory
cd Chat
```

## 📦 Step 2: Install Dependencies

```bash
# Install all required packages
npm install

# OR if you prefer yarn
yarn install
```

This will install:
- React 18.2.0
- Vite 5.1.4 (build tool)
- Gun.js (P2P library)
- libsodium-wrappers (encryption)
- Other development dependencies

## 🔧 Step 3: Fix Known Issues (Optional but Recommended)

### Update Vite to fix security vulnerability:
```bash
npm update vite@latest
```

### If you encounter any dependency issues:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

## 🏃 Step 4: Run the Development Server

```bash
# Start the development server
npm run dev

# The app will be available at:
# ➜  Local:   http://localhost:3000/
# ➜  Network: http://192.168.x.x:3000/
```

## 🌐 Step 5: Access the Application

1. Open your browser and go to `http://localhost:3000`
2. You should see the Secure Chat application loading

## 🔑 Step 6: First Time Setup

### Creating Your First Account:

1. **Click the 🛠️ DEV button** in the top-right corner
2. **Click "📋 Copy Link"** to get your magic invitation link
3. **Open the link** in the same or a new browser tab
4. **Create your account:**
   - Choose a nickname (or use the random one provided)
   - Set a 4-6 digit PIN (remember this!)
   - Click "Join Chat"

### Inviting Others (for testing locally):

1. Share the same magic link with others on your network
2. They can open it in different browsers or incognito windows
3. Each person creates their own account with the link

## 🛠️ Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 📁 Project Structure

```
Chat/
├── src/                  # React source code
│   ├── App.jsx          # Main React component
│   ├── main.jsx         # React entry point
│   └── index.css        # Styles
├── public/              # Static assets
│   └── sodium.js        # Encryption library
├── dist/                # Production build (generated)
├── script.js            # Legacy vanilla JS implementation
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── vercel.json          # Vercel deployment config
```

## 🐛 Troubleshooting

### Port 3000 is already in use:
```bash
# Kill the process using port 3000
npx kill-port 3000

# Or change the port in vite.config.js:
# server: { port: 3001 }
```

### Module not found errors:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Blank screen or loading issues:
1. Check browser console for errors (F12)
2. Clear browser cache and localStorage
3. Try incognito/private browsing mode
4. Make sure all CDN resources in index.html are loading

### Sodium library not loading:
- The app uses libsodium for encryption
- It loads from `/public/sodium.js`
- If missing, the app won't work properly

## 🔒 Security Notes for Local Development

⚠️ **Important:** The current code has a hardcoded admin key that should be changed:

1. Open `script.js`
2. Find line 21: `const MASTER_SETUP_KEY = "ADMIN-FIRST-USER-2024"`
3. Change it to something secure or remove the feature entirely

## 🚀 Building for Production

```bash
# Create optimized production build
npm run build

# Test the production build locally
npm run preview

# The build output will be in the dist/ folder
# You can deploy this to any static hosting service
```

## 🌍 Deployment Options

### Deploy to Vercel (Recommended):
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. It will auto-deploy on every push

### Deploy to other platforms:
- **Netlify:** Drag and drop the `dist` folder
- **GitHub Pages:** Use gh-pages branch with the `dist` folder
- **Any static host:** Upload the contents of `dist` folder

## 📝 Environment Variables (Optional)

If you want to use environment variables:

1. Create a `.env` file in the root directory:
```env
VITE_APP_TITLE=My Secure Chat
VITE_API_URL=http://localhost:3000
```

2. Access in your code:
```javascript
const title = import.meta.env.VITE_APP_TITLE
```

## 💡 Tips for Development

1. **Use multiple browsers** or incognito windows to test multi-user chat
2. **Browser DevTools** (F12) to inspect network, console, and storage
3. **React DevTools** extension for debugging React components
4. The **🛠️ DEV menu** in the app has useful debugging features

## 🆘 Need Help?

- Check the browser console for error messages
- Look at the `server.log` file for server-side issues
- Review the original README.md for feature documentation
- The test file `test_runner.js` can be run in browser console for diagnostics

---

## ✅ Quick Start Summary

```bash
# 1. Clone
git clone https://github.com/danxdz/Chat.git
cd Chat

# 2. Install
npm install

# 3. Run
npm run dev

# 4. Open
# Visit http://localhost:3000 in your browser
```

That's it! You should now have the Secure Chat application running locally. 🎉