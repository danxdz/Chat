// Global application state
let app = {
    sodium: null,
    keyPair: null,
    currentContact: null,
    contacts: {},
    peers: {},
    sharedKeys: {},
    isAuthenticated: false,
    userId: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    await initSodium();
    loadContacts();
    setupEventListeners();
    checkInviteInURL();
});

// Initialize libsodium
async function initSodium() {
    try {
        await window.sodium.ready;
        app.sodium = window.sodium;
        console.log('Sodium initialized successfully');
    } catch (error) {
        console.error('Failed to initialize sodium:', error);
        showError('Failed to initialize encryption library');
    }
}

// PIN Authentication Functions
function hashPIN(pin) {
    if (!app.sodium) return null;
    const salt = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]); // Fixed salt for demo
    return app.sodium.crypto_pwhash(
        32,
        pin,
        salt,
        app.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        app.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        app.sodium.crypto_pwhash_ALG_DEFAULT
    );
}

function login() {
    const pin = document.getElementById('pinInput').value;
    if (pin.length !== 4) {
        showLoginError('PIN must be 4 digits');
        return;
    }

    const hashedPIN = app.sodium.to_hex(hashPIN(pin));
    const storedPIN = localStorage.getItem('userPIN');

    if (storedPIN === null) {
        // First time user - set PIN
        localStorage.setItem('userPIN', hashedPIN);
        showSuccess('PIN set successfully!');
        setTimeout(() => authenticateUser(pin), 1000);
    } else if (storedPIN === hashedPIN) {
        // Returning user - authenticate
        authenticateUser(pin);
    } else {
        showLoginError('Invalid PIN');
    }
}

function authenticateUser(pin) {
    // Generate unique session keypair
    app.keyPair = app.sodium.crypto_box_keypair();
    app.userId = app.sodium.to_hex(app.keyPair.publicKey).substring(0, 8);
    app.isAuthenticated = true;
    
    // Show main app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'grid';
    
    // Update user info
    document.getElementById('userInfo').textContent = `ID: ${app.userId}`;
    
    // Load and display contacts
    displayContacts();
    
    showSystemMessage('Welcome to P2P Secure Chat');
}

function generateKeypair() {
    if (!app.sodium) return null;
    return app.sodium.crypto_box_keypair();
}

// Contact Management Functions
function loadContacts() {
    const stored = localStorage.getItem('contacts');
    app.contacts = stored ? JSON.parse(stored) : {};
}

function saveContacts() {
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
        // In a real app, this would be sent through a signaling server
        // For demo, we'll store it for manual exchange
        localStorage.setItem(`signal_${contactId}`, JSON.stringify(signalData));
    });
    
    peer.on('connect', () => {
        console.log('Connected to peer:', contactId);
        updateContactStatus(contactId, 'online');
        showSystemMessage(`Connected to ${app.contacts[contactId].name}`);
        
        // Derive shared key for encryption
        if (app.contacts[contactId].publicKey) {
            app.sharedKeys[contactId] = app.sodium.crypto_box_beforenm(
                app.sodium.from_hex(app.contacts[contactId].publicKey),
                app.keyPair.privateKey
            );
        }
    });
    
    peer.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());
            receiveMessage(message, contactId);
        } catch (error) {
            console.error('Error parsing received data:', error);
        }
    });
    
    peer.on('error', (error) => {
        console.error('Peer error:', error);
        updateContactStatus(contactId, 'offline');
        showSystemMessage(`Connection error with ${app.contacts[contactId].name}`);
    });
    
    peer.on('close', () => {
        console.log('Peer connection closed:', contactId);
        updateContactStatus(contactId, 'offline');
        showSystemMessage(`Disconnected from ${app.contacts[contactId].name}`);
    });
    
    app.peers[contactId] = peer;
    updateContactStatus(contactId, 'connecting');
    
    return peer;
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
    
    messageEl.innerHTML = `
        ${message.content}
        <span class="message-time">${encryptedIcon} ${time}</span>
    `;
    
    chatArea.appendChild(messageEl);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function showSystemMessage(text) {
    const chatArea = document.getElementById('chatArea');
    const messageEl = document.createElement('div');
    messageEl.className = 'message system';
    messageEl.innerHTML = `${text} <span class="message-time">${new Date().toLocaleTimeString()}</span>`;
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
        
        if (invite && app.isAuthenticated) {
            // Auto-add contact from invitation
            const contactName = `User_${invite.userId}`;
            const contactId = addContact(contactName);
            app.contacts[contactId].publicKey = invite.publicKey;
            saveContacts();
            displayContacts();
            showSystemMessage(`Contact ${contactName} added from invitation`);
            
            // Clear the invite from URL
            window.location.hash = '';
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
}

// Utility Functions
function showError(message) {
    console.error(message);
}

function showLoginError(message) {
    document.getElementById('loginError').textContent = message;
    setTimeout(() => {
        document.getElementById('loginError').textContent = '';
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