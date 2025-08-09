// Global application state
let app = {
    sodium: null,
    keyPair: null,
    currentContact: null,
    contacts: {},
    peers: {},
    sharedKeys: {},
    isAuthenticated: false,
    userId: null,
    storageKey: null,
    retryTimers: {},
    lockoutUntil: 0
};

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing app...');
    await initSodium();
    loadContacts();
    setupEventListeners();
    checkInviteInURL();
    console.log('App initialization complete');
});

// Initialize libsodium with better error handling
async function initSodium() {
    try {
        console.log('Waiting for sodium to be ready...');
        
        // Wait for sodium to be available
        let attempts = 0;
        while (!window.sodium && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.sodium) {
            throw new Error('Sodium library not loaded after 5 seconds');
        }
        
        await window.sodium.ready;
        app.sodium = window.sodium;
        console.log('Sodium initialized successfully');
        
        // Enable login form
        const loginPrompt = document.getElementById('loginPrompt');
        const pinInput = document.getElementById('pinInput');
        const loginBtn = document.getElementById('loginBtn');
        
        if (loginPrompt && pinInput && loginBtn) {
            loginPrompt.textContent = 'Encryption ready! Enter your 4-digit PIN';
            loginPrompt.style.color = '#2ECC40';
            
            setTimeout(() => {
                loginPrompt.style.color = '';
                loginPrompt.textContent = 'Enter your 4-digit PIN';
                pinInput.disabled = false;
                loginBtn.disabled = false;
                pinInput.focus();
            }, 1500);
        }
        
    } catch (error) {
        console.error('Failed to initialize sodium:', error);
        showLoginError('Failed to initialize encryption library. Please refresh the page.');
    }
}

// PIN Authentication Functions
function getOrCreateSalt() {
    const existing = localStorage.getItem('userSalt');
    if (existing) return app.sodium.from_hex(existing);
    const salt = app.sodium.randombytes_buf(app.sodium.crypto_pwhash_SALTBYTES);
    localStorage.setItem('userSalt', app.sodium.to_hex(salt));
    return salt;
}

function deriveKeyFromPIN(pin) {
    if (!app.sodium) return null;
    const salt = getOrCreateSalt();
    return app.sodium.crypto_pwhash(
        32,
        pin,
        salt,
        app.sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        app.sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        app.sodium.crypto_pwhash_ALG_DEFAULT
    );
}

function hashPIN(pin) {
    const key = deriveKeyFromPIN(pin);
    return key; // store full derived key as PIN hash surrogate
}

function login() {
    const pin = document.getElementById('pinInput').value;
    if (pin.length !== 4) {
        showLoginError('PIN must be 4 digits');
        return;
    }

    if (!app.sodium) {
        showLoginError('Encryption library not ready. Please wait and try again.');
        return;
    }

    const now = Date.now();
    const lockoutUntil = parseInt(localStorage.getItem('lockoutUntil') || '0', 10);
    if (now < lockoutUntil) {
        const seconds = Math.ceil((lockoutUntil - now) / 1000);
        showLoginError(`Too many attempts. Try again in ${seconds}s`);
        return;
    }

    try {
        const derived = hashPIN(pin);
        const hashedPIN = app.sodium.to_hex(derived);
        const storedPIN = localStorage.getItem('userPIN');

        if (storedPIN === null) {
            localStorage.setItem('userPIN', hashedPIN);
            showLoginSuccess('PIN set successfully!');
            setTimeout(() => authenticateUser(pin), 300);
        } else if (storedPIN === hashedPIN) {
            localStorage.removeItem('failedAttempts');
            authenticateUser(pin);
        } else {
            const attempts = parseInt(localStorage.getItem('failedAttempts') || '0', 10) + 1;
            localStorage.setItem('failedAttempts', String(attempts));
            if (attempts >= 5) {
                const until = Date.now() + 60_000; // 1 minute
                localStorage.setItem('lockoutUntil', String(until));
                localStorage.removeItem('failedAttempts');
                showLoginError('Too many attempts. Locked for 60s');
            } else {
                showLoginError('Invalid PIN');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Login failed. Please try again.');
    }
}

function authenticateUser(pin) {
    // Generate unique session keypair
    app.keyPair = app.sodium.crypto_box_keypair();
    app.userId = app.sodium.to_hex(app.keyPair.publicKey).substring(0, 8);
    app.isAuthenticated = true;

    // Derive storage encryption key for at-rest encryption of messages
    app.storageKey = deriveKeyFromPIN(pin);
    
    // Show main app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'grid';
    
    // Update user info
    document.getElementById('userInfo').textContent = `ID: ${app.userId}`;
    
    // Load and display contacts
    loadEncryptedContacts();
    displayContacts();
    
    // Process any pending invites
    processPendingInvite();
    
    showSystemMessage('Welcome to P2P Secure Chat');
}

function generateKeypair() {
    if (!app.sodium) return null;
    return app.sodium.crypto_box_keypair();
}

// Contact Management Functions
function loadContacts() {
    // Load legacy plaintext contacts (pre-login)
    const stored = localStorage.getItem('contacts');
    app.contacts = stored ? JSON.parse(stored) : {};
}

function loadEncryptedContacts() {
    const enc = localStorage.getItem('contacts_enc');
    if (enc && app.storageKey) {
        const parsed = JSON.parse(enc);
        const json = decryptFromStorage(parsed);
        if (json) {
            app.contacts = JSON.parse(json);
            return;
        }
    }
    // fallback to plaintext if exists
    loadContacts();
}

function saveContacts() {
    if (app.storageKey) {
        const payload = encryptForStorage(JSON.stringify(app.contacts));
        if (payload) {
            localStorage.setItem('contacts_enc', JSON.stringify(payload));
            // Clean legacy key to avoid leaking plaintext
            localStorage.removeItem('contacts');
            return;
        }
    }
    // Fallback plaintext for demo if no key
    localStorage.setItem('contacts', JSON.stringify(app.contacts));
}

function addContact(name) {
    const contactId = generateContactId();
    app.contacts[contactId] = {
        name: name,
        id: contactId,
        publicKey: null,
        status: 'offline',
        messages: []
    };
    saveContacts();
    displayContacts();
    return contactId;
}

function generateContactId() {
    return Math.random().toString(36).substring(2, 10);
}

function displayContacts() {
    const list = document.getElementById('contactsList');
    list.innerHTML = '';
    
    Object.values(app.contacts).forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.onclick = () => selectContact(contact.id);
        
        item.innerHTML = `
            <span>${contact.name}</span>
            <div class="contact-status ${contact.status}"></div>
        `;
        
        if (app.currentContact === contact.id) {
            item.classList.add('active');
        }
        
        list.appendChild(item);
    });
}

function selectContact(contactId) {
    app.currentContact = contactId;
    const contact = app.contacts[contactId];
    
    // Update UI
    document.getElementById('currentContact').textContent = contact.name;
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    
    // Display messages
    displayMessages(contactId);
    displayContacts(); // Refresh to show active state
    
    // Attempt connection if not already connected
    if (!app.peers[contactId] || app.peers[contactId].destroyed) {
        attemptConnection(contactId);
    }
}

// P2P Networking Functions
function createPeerConnection(contactId, isInitiator) {
    if (app.peers[contactId]) {
        app.peers[contactId].destroy();
    }
    
    const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false
    });
    
    peer.on('signal', (signalData) => {
        console.log('Signal data generated for', contactId);
        // Broadcast via localStorage for demo cross-tab signaling
        const payload = {
            kind: 'webrtc',
            from: app.userId,
            fromPublicKey: app.sodium.to_hex(app.keyPair.publicKey),
            signal: signalData,
            ts: Date.now()
        };
        const key = `webrtc_${payload.from}_${payload.ts}`;
        localStorage.setItem(key, JSON.stringify(payload));
        // Clean it shortly after to keep storage tidy
        setTimeout(() => localStorage.removeItem(key), 10_000);
    });
    
    peer.on('connect', () => {
        console.log('Connected to peer:', contactId);
        updateContactStatus(contactId, 'online');
        showSystemMessage(`Connected to ${app.contacts[contactId].name}`);
        
        // Exchange public keys to establish shared key if missing
        try {
            const contact = app.contacts[contactId];
            const myPub = app.sodium.to_hex(app.keyPair.publicKey);
            peer.send(JSON.stringify({ type: 'pubkey', publicKey: myPub }));
            if (contact.publicKey) {
                app.sharedKeys[contactId] = app.sodium.crypto_box_beforenm(
                    app.sodium.from_hex(contact.publicKey),
                    app.keyPair.privateKey
                );
            }
        } catch (e) {
            console.error('Error during key exchange:', e);
        }
        // Cancel any reconnect timers
        if (app.retryTimers[contactId]) {
            clearTimeout(app.retryTimers[contactId].timer);
            delete app.retryTimers[contactId];
        }
    });
    
    peer.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'pubkey' && message.publicKey) {
                const contact = app.contacts[contactId];
                if (!contact.publicKey) {
                    contact.publicKey = message.publicKey;
                    saveContacts();
                }
                app.sharedKeys[contactId] = app.sodium.crypto_box_beforenm(
                    app.sodium.from_hex(contact.publicKey),
                    app.keyPair.privateKey
                );
                return;
            }
            receiveMessage(message, contactId);
        } catch (error) {
            console.error('Error parsing received data:', error);
        }
    });
    
    peer.on('error', (error) => {
        console.error('Peer error:', error);
        updateContactStatus(contactId, 'offline');
        showSystemMessage(`Connection error with ${app.contacts[contactId].name}`);
        scheduleReconnect(contactId);
    });
    
    peer.on('close', () => {
        console.log('Peer connection closed:', contactId);
        updateContactStatus(contactId, 'offline');
        showSystemMessage(`Disconnected from ${app.contacts[contactId].name}`);
        scheduleReconnect(contactId);
    });
    
    app.peers[contactId] = peer;
    updateContactStatus(contactId, 'connecting');
    
    return peer;
}

function scheduleReconnect(contactId) {
    if (!app.retryTimers[contactId]) {
        app.retryTimers[contactId] = { attempts: 0, timer: null };
    }
    const state = app.retryTimers[contactId];
    if (state.attempts >= 6) return; // stop after ~max backoff
    const delay = Math.min(30_000, 1000 * Math.pow(2, state.attempts));
    state.attempts += 1;
    state.timer = setTimeout(() => {
        if (app.contacts[contactId] && (!app.peers[contactId] || app.peers[contactId].destroyed)) {
            attemptConnection(contactId);
        }
    }, delay);
}

function attemptConnection(contactId) {
    const contact = app.contacts[contactId];
    if (!contact.publicKey) {
        showSystemMessage('No public key available for this contact');
        return;
    }
    
    // Create peer connection as initiator
    createPeerConnection(contactId, true);
}

function updateContactStatus(contactId, status) {
    if (app.contacts[contactId]) {
        app.contacts[contactId].status = status;
        saveContacts();
        displayContacts();
        
        // Update connection status display
        if (app.currentContact === contactId) {
            const statusEl = document.getElementById('connectionStatus');
            statusEl.textContent = status.toUpperCase();
            statusEl.className = status;
        }
    }
}

// Encryption Functions
function encryptMessage(plaintext, sharedKey) {
    if (!app.sodium || !sharedKey) return null;
    
    const nonce = app.sodium.randombytes_buf(app.sodium.crypto_box_NONCEBYTES);
    const ciphertext = app.sodium.crypto_box_easy_afternm(plaintext, nonce, sharedKey);
    
    return {
        ciphertext: app.sodium.to_hex(ciphertext),
        nonce: app.sodium.to_hex(nonce)
    };
}

function decryptMessage(encryptedData, sharedKey) {
    if (!app.sodium || !sharedKey || !encryptedData) return null;
    
    try {
        const ciphertext = app.sodium.from_hex(encryptedData.ciphertext);
        const nonce = app.sodium.from_hex(encryptedData.nonce);
        const plaintext = app.sodium.crypto_box_open_easy_afternm(ciphertext, nonce, sharedKey);
        return app.sodium.to_string(plaintext);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

// Storage encryption helpers (at-rest)
function encryptForStorage(plaintext) {
    if (!app.sodium || !app.storageKey) return null;
    const nonce = app.sodium.randombytes_buf(app.sodium.crypto_secretbox_NONCEBYTES);
    const messageBytes = app.sodium.from_string(plaintext);
    const boxed = app.sodium.crypto_secretbox_easy(messageBytes, nonce, app.storageKey);
    return { c: app.sodium.to_hex(boxed), n: app.sodium.to_hex(nonce) };
}

function decryptFromStorage(payload) {
    if (!app.sodium || !app.storageKey || !payload) return null;
    try {
        const boxed = app.sodium.from_hex(payload.c);
        const nonce = app.sodium.from_hex(payload.n);
        const opened = app.sodium.crypto_secretbox_open_easy(boxed, nonce, app.storageKey);
        return app.sodium.to_string(opened);
    } catch (e) {
        console.error('Failed to decrypt storage payload:', e);
        return null;
    }
}

// Message Functions
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !app.currentContact) return;
    
    // Handle commands
    if (message.startsWith('/')) {
        handleCommand(message);
        input.value = '';
        return;
    }
    
    const contact = app.contacts[app.currentContact];
    const peer = app.peers[app.currentContact];
    
    if (!peer || !peer.connected) {
        showSystemMessage('Not connected to contact');
        return;
    }
    
    // Encrypt message
    const sharedKey = app.sharedKeys[app.currentContact];
    const encrypted = encryptMessage(message, sharedKey);
    
    if (!encrypted) {
        showSystemMessage('Failed to encrypt message');
        return;
    }
    
    // Send encrypted message
    const messageData = {
        type: 'message',
        content: encrypted,
        timestamp: Date.now(),
        sender: app.userId
    };
    
    try {
        peer.send(JSON.stringify(messageData));
        
        // Add to local message history
        const messageObj = {
            content: message,
            timestamp: Date.now(),
            type: 'sent',
            encrypted: true
        };
        
        contact.messages.push(messageObj);
        saveContacts();
        displayMessage(messageObj);
        
        input.value = '';
    } catch (error) {
        console.error('Failed to send message:', error);
        showSystemMessage('Failed to send message');
    }
}

function receiveMessage(messageData, contactId) {
    const contact = app.contacts[contactId];
    const sharedKey = app.sharedKeys[contactId];
    
    if (messageData.type === 'message') {
        const decrypted = decryptMessage(messageData.content, sharedKey);
        
        if (decrypted) {
            const messageObj = {
                content: decrypted,
                timestamp: messageData.timestamp,
                type: 'received',
                encrypted: true
            };
            
            contact.messages.push(messageObj);
            saveContacts();
            
            if (app.currentContact === contactId) {
                displayMessage(messageObj);
            }
        } else {
            console.error('Failed to decrypt message from', contactId);
        }
    }
}

function displayMessages(contactId) {
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = '';
    
    const contact = app.contacts[contactId];
    if (contact && contact.messages) {
        contact.messages.forEach(message => {
            displayMessage(message);
        });
    }
}

function displayMessage(message) {
    const chatArea = document.getElementById('chatArea');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.type}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    const encryptedIcon = message.encrypted ? '🔒' : '';

    const textNode = document.createElement('span');
    textNode.textContent = message.content;
    const timeNode = document.createElement('span');
    timeNode.className = 'message-time';
    timeNode.textContent = `${encryptedIcon} ${time}`;

    messageEl.appendChild(textNode);
    messageEl.appendChild(timeNode);
    
    chatArea.appendChild(messageEl);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function showSystemMessage(text) {
    const chatArea = document.getElementById('chatArea');
    const messageEl = document.createElement('div');
    messageEl.className = 'message system';
    const textNode = document.createElement('span');
    textNode.textContent = text;
    const timeNode = document.createElement('span');
    timeNode.className = 'message-time';
    timeNode.textContent = new Date().toLocaleTimeString();
    messageEl.appendChild(textNode);
    messageEl.appendChild(timeNode);
    chatArea.appendChild(messageEl);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Command System
function handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
        case '/help':
            showSystemMessage('Available commands:');
            showSystemMessage('/help - Show this help');
            showSystemMessage('/connect - Reconnect to current contact');
            showSystemMessage('/status - Show connection status');
            showSystemMessage('/clear - Clear chat history');
            showSystemMessage('/test - Test encryption');
            break;
            
        case '/connect':
            if (app.currentContact) {
                attemptConnection(app.currentContact);
                showSystemMessage('Attempting to reconnect...');
            } else {
                showSystemMessage('No contact selected');
            }
            break;
            
        case '/status':
            if (app.currentContact) {
                const contact = app.contacts[app.currentContact];
                const peer = app.peers[app.currentContact];
                showSystemMessage(`Contact: ${contact.name}`);
                showSystemMessage(`Status: ${contact.status}`);
                showSystemMessage(`Connected: ${peer && peer.connected ? 'Yes' : 'No'}`);
                showSystemMessage(`Encrypted: ${app.sharedKeys[app.currentContact] ? 'Yes' : 'No'}`);
            } else {
                showSystemMessage('No contact selected');
            }
            break;
            
        case '/clear':
            if (app.currentContact) {
                app.contacts[app.currentContact].messages = [];
                saveContacts();
                document.getElementById('chatArea').innerHTML = '';
                showSystemMessage('Chat history cleared');
            }
            break;
            
        case '/test':
            if (app.currentContact && app.sharedKeys[app.currentContact]) {
                const testMessage = 'Test encryption message';
                const encrypted = encryptMessage(testMessage, app.sharedKeys[app.currentContact]);
                const decrypted = decryptMessage(encrypted, app.sharedKeys[app.currentContact]);
                showSystemMessage(`Encryption test: ${decrypted === testMessage ? 'PASSED' : 'FAILED'}`);
            } else {
                showSystemMessage('No encrypted connection available');
            }
            break;
            
        default:
            showSystemMessage(`Unknown command: ${cmd}`);
    }
}

// Invitation System
function generateInviteLink() {
    if (!app.isAuthenticated) return null;
    
    const inviteData = {
        type: 'invite',
        userId: app.userId,
        publicKey: app.sodium.to_hex(app.keyPair.publicKey),
        timestamp: Date.now()
    };
    
    const encoded = btoa(JSON.stringify(inviteData));
    return `${window.location.origin}${window.location.pathname}#invite=${encoded}`;
}

function parseInvitation(inviteData) {
    try {
        const decoded = JSON.parse(atob(inviteData));
        
        if (decoded.type === 'invite' && decoded.userId && decoded.publicKey) {
            return decoded;
        }
    } catch (error) {
        console.error('Invalid invite data:', error);
    }
    return null;
}

function checkInviteInURL() {
    const hash = window.location.hash;
    if (hash.startsWith('#invite=')) {
        const inviteData = hash.substring(8);
        const invite = parseInvitation(inviteData);
        
        if (invite) {
            if (app.isAuthenticated) {
                // Auto-add contact from invitation
                const contactName = `User_${invite.userId}`;
                const contactId = addContact(contactName);
                app.contacts[contactId].publicKey = invite.publicKey;
                saveContacts();
                displayContacts();
                showSystemMessage(`Contact ${contactName} added from invitation`);
                
                // Clear the invite from URL
                window.location.hash = '';
            } else {
                // Store invite for later processing
                localStorage.setItem('pendingInvite', JSON.stringify(invite));
                console.log('Invite stored for after authentication');
            }
        }
    }
}

function processPendingInvite() {
    const pendingInvite = localStorage.getItem('pendingInvite');
    if (pendingInvite) {
        try {
            const invite = JSON.parse(pendingInvite);
            const contactName = `User_${invite.userId}`;
            const contactId = addContact(contactName);
            app.contacts[contactId].publicKey = invite.publicKey;
            saveContacts();
            displayContacts();
            showSystemMessage(`Contact ${contactName} added from invitation`);
            
            // Clear pending invite
            localStorage.removeItem('pendingInvite');
            window.location.hash = '';
        } catch (error) {
            console.error('Error processing pending invite:', error);
            localStorage.removeItem('pendingInvite');
        }
    }
}

// Event Listeners
function setupEventListeners() {
    // Login
    document.getElementById('loginBtn').onclick = login;
    document.getElementById('pinInput').onkeypress = (e) => {
        if (e.key === 'Enter') login();
    };
    
    // Add Contact
    document.getElementById('addContactBtn').onclick = () => {
        document.getElementById('addContactModal').style.display = 'flex';
    };
    
    document.getElementById('createContactBtn').onclick = () => {
        const name = document.getElementById('contactNameInput').value.trim();
        if (name) {
            const contactId = addContact(name);
            document.getElementById('contactNameInput').value = '';
            document.getElementById('addContactModal').style.display = 'none';
            
            // Generate and show invite link
            const inviteLink = generateInviteLink();
            document.getElementById('inviteLink').textContent = inviteLink;
            document.getElementById('inviteLinkModal').style.display = 'flex';
        }
    };
    
    document.getElementById('cancelAddBtn').onclick = () => {
        document.getElementById('addContactModal').style.display = 'none';
    };
    
    // Invite Link Modal
    document.getElementById('copyInviteBtn').onclick = () => {
        const link = document.getElementById('inviteLink').textContent;
        navigator.clipboard.writeText(link).then(() => {
            showSuccess('Link copied to clipboard!');
        });
    };
    
    document.getElementById('closeInviteBtn').onclick = () => {
        document.getElementById('inviteLinkModal').style.display = 'none';
    };
    
    // Messaging
    document.getElementById('sendBtn').onclick = sendMessage;
    document.getElementById('messageInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    // Mobile menu (placeholder)
    document.getElementById('mobileMenuBtn').onclick = () => {
        // Toggle sidebar visibility on mobile
        document.querySelector('.sidebar').classList.toggle('mobile-show');
    };
    
    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    });

    // Listen for cross-tab signaling events
    window.addEventListener('storage', (e) => {
        if (!e.key || !e.newValue) return;
        if (!e.key.startsWith('webrtc_')) return;
        try {
            const payload = JSON.parse(e.newValue);
            if (!payload || payload.kind !== 'webrtc') return;
            if (payload.from === app.userId) return; // ignore own
            handleIncomingSignal(payload);
        } catch (err) {
            console.error('Failed to handle storage signal:', err);
        }
    });
}

function handleIncomingSignal(payload) {
    // Try to identify contact by public key or by userId hint
    let contactId = null;
    const entries = Object.entries(app.contacts);
    const matchByPub = entries.find(([_, c]) => c.publicKey && c.publicKey.toLowerCase() === (payload.fromPublicKey || '').toLowerCase());
    if (matchByPub) contactId = matchByPub[0];
    if (!contactId) {
        const byRemoteId = entries.find(([_, c]) => c.remoteUserId && c.remoteUserId === payload.from);
        if (byRemoteId) contactId = byRemoteId[0];
    }
    if (!contactId) {
        // Fallback: find a single contact without public key
        const candidates = entries.filter(([_, c]) => !c.publicKey);
        if (candidates.length === 1) {
            contactId = candidates[0][0];
        }
    }
    if (!contactId) {
        // Create a new contact based on sender identity
        const name = `User_${payload.from}`;
        contactId = addContact(name);
    }
    // Ensure we store sender's public key if provided
    if (payload.fromPublicKey) {
        app.contacts[contactId].publicKey = payload.fromPublicKey;
        app.contacts[contactId].remoteUserId = payload.from;
        saveContacts();
        displayContacts();
    }
    // Create or reuse peer as non-initiator
    if (!app.peers[contactId] || app.peers[contactId].destroyed) {
        createPeerConnection(contactId, false);
    }
    try {
        app.peers[contactId].signal(payload.signal);
    } catch (e) {
        console.error('Failed to apply incoming signal:', e);
    }
}

// Utility Functions
function showError(message) {
    console.error(message);
}

function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.className = 'error-message';
    setTimeout(() => {
        errorEl.textContent = '';
    }, 3000);
}

function showLoginSuccess(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.className = 'success-message';
    setTimeout(() => {
        errorEl.textContent = '';
        errorEl.className = 'error-message';
    }, 3000);
}

function showSuccess(message) {
    console.log('Success:', message);
}

// Responsive design check
function checkMobile() {
    const isMobile = window.innerWidth <= 768;
    document.getElementById('mobileMenuBtn').style.display = isMobile ? 'block' : 'none';
}

window.addEventListener('resize', checkMobile);
checkMobile();