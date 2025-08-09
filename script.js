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
    lockoutUntil: 0,
    nickname: null,
    isAdmin: false,
    invitations: {},
    users: {}
};

// Master admin setup key - only for the very first user (change this!)
const MASTER_SETUP_KEY = "ADMIN-FIRST-USER-2024"; // This creates the first admin account

// Invitation system configuration
const INVITATION_EXPIRY_HOURS = 24; // Invitations expire after 24 hours

// Random nickname generator
function generateRandomNickname() {
    const adjectives = [
        'Swift', 'Brave', 'Clever', 'Bright', 'Silent', 'Quick', 'Bold', 'Wise',
        'Sharp', 'Cool', 'Fast', 'Smart', 'Elite', 'Prime', 'Tech', 'Neo',
        'Cyber', 'Alpha', 'Beta', 'Zen', 'Fire', 'Ice', 'Storm', 'Star'
    ];
    
    const nouns = [
        'Wolf', 'Eagle', 'Fox', 'Tiger', 'Lion', 'Bear', 'Hawk', 'Raven',
        'Phoenix', 'Dragon', 'Hunter', 'Warrior', 'Knight', 'Sage', 'Ninja',
        'Ghost', 'Shadow', 'Blade', 'Arrow', 'Thunder', 'Lightning', 'Comet',
        'Rocket', 'Falcon', 'Viper', 'Cobra', 'Panther', 'Jaguar'
    ];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    
    return `${adj}${noun}${num}`;
}

// Master setup functions
function showMasterSetup() {
    hideAllScreens();
    document.getElementById('masterSetupScreen').style.display = 'block';
    setupMasterEventListeners();
}

function setupMasterEventListeners() {
    const verifyBtn = document.getElementById('verifyMasterBtn');
    const masterKeyInput = document.getElementById('masterKeyInput');
    
    if (verifyBtn) {
        verifyBtn.onclick = () => {
            console.log('Master verify button clicked');
            verifyMasterKey();
        };
    }
    
    if (masterKeyInput) {
        masterKeyInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed in master key input');
                verifyMasterKey();
            }
        };
        // Focus the input
        masterKeyInput.focus();
    }
}

function verifyMasterKey() {
    console.log('verifyMasterKey() called');
    const masterKey = document.getElementById('masterKeyInput').value;
    console.log('Master key entered:', masterKey ? 'provided' : 'empty');
    
    if (masterKey !== MASTER_SETUP_KEY) {
        console.log('Master key invalid');
        showMasterError('Invalid master setup key');
        return;
    }
    
    console.log('Master key verified, setting up first user');
    // Mark as first user and proceed to setup
    localStorage.setItem('isFirstUser', 'true');
    showSetupScreen('🎉 Master key verified! Set up your admin account:');
}

function showMasterError(message) {
    const errorDiv = document.getElementById('masterError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Invitation system functions
function handleInviteLink(inviteToken) {
    try {
        // Decode and validate invitation
        const invitation = validateInvitation(inviteToken);
        if (!invitation) {
            showInviteError('Invalid or expired invitation link');
            return;
        }
        
        // Store invitation data temporarily
        sessionStorage.setItem('pendingInvitation', JSON.stringify(invitation));
        
        // Show setup screen for invited user
        showSetupScreen(`🎉 Welcome! You've been invited by ${invitation.inviterName}`);
        
    } catch (error) {
        console.error('Invitation error:', error);
        showInviteError('Failed to process invitation link');
    }
}

function validateInvitation(token) {
    try {
        // Decode base64 token
        const decoded = atob(token);
        const invitation = JSON.parse(decoded);
        
        // Validate required fields
        if (!invitation.id || !invitation.inviterId || !invitation.expiresAt) {
            return null;
        }
        
        // Check expiration
        const now = Date.now();
        if (now > invitation.expiresAt) {
            return null; // Expired
        }
        
        // Check if invitation was already used (check against stored invitations)
        const storedInvitations = JSON.parse(localStorage.getItem('invitations') || '{}');
        const storedInvite = storedInvitations[invitation.id];
        if (storedInvite && storedInvite.used) {
            return null; // Already used
        }
        
        return invitation;
    } catch (error) {
        return null; // Invalid token
    }
}

function markInvitationAsUsed(inviteId, usedBy) {
    try {
        // Mark invitation as used in localStorage
        const invitations = JSON.parse(localStorage.getItem('invitations') || '{}');
        if (invitations[inviteId]) {
            invitations[inviteId].used = true;
            invitations[inviteId].usedBy = usedBy;
            invitations[inviteId].usedAt = Date.now();
            localStorage.setItem('invitations', JSON.stringify(invitations));
        }
        
        // Also try to mark it in the inviter's storage if we have access
        // (This would need to be done via P2P communication in a real implementation)
        console.log(`Invitation ${inviteId} marked as used by ${usedBy}`);
    } catch (error) {
        console.error('Failed to mark invitation as used:', error);
    }
}

function showInviteError(message) {
    hideAllScreens();
    
    // Create error screen
    const errorScreen = document.createElement('div');
    errorScreen.className = 'login-screen';
    errorScreen.innerHTML = `
        <h1 class="login-title terminal-glow">⚠️ Invitation Error</h1>
        <div class="login-form box-glow">
            <p style="color: #ff3b30; margin-bottom: 20px;">${message}</p>
            <div class="info-box">
                <p><strong>Possible reasons:</strong></p>
                <ul>
                    <li>Invitation link has expired</li>
                    <li>Invitation was already used</li>
                    <li>Invalid invitation format</li>
                    <li>Invitation was revoked</li>
                </ul>
            </div>
            <button onclick="window.location.href = window.location.pathname" class="btn">
                🏠 Go to Home Page
            </button>
        </div>
    `;
    
    document.body.appendChild(errorScreen);
}

// Helper function to hide all screens
function hideAllScreens() {
    document.getElementById('masterSetupScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    // Keep appContainer as is
}

// Setup screen functions
function showSetupScreen(customMessage = null) {
    hideAllScreens();
    document.getElementById('setupScreen').style.display = 'block';
    
    // Set custom message if provided
    if (customMessage) {
        document.getElementById('setupMessage').textContent = customMessage;
    }
    
    // Generate and set random nickname
    const randomNickname = generateRandomNickname();
    document.getElementById('nicknameInput').value = randomNickname;
    
    // Setup event listeners for setup screen
    setupScreenEventListeners();
}

function setupScreenEventListeners() {
    // Random nickname button
    const randomBtn = document.getElementById('randomNicknameBtn');
    if (randomBtn) {
        // Remove existing listeners to prevent duplicates
        randomBtn.onclick = null;
        randomBtn.onclick = () => {
            document.getElementById('nicknameInput').value = generateRandomNickname();
        };
    }
    
    // Complete setup button
    const setupBtn = document.getElementById('completeSetupBtn');
    if (setupBtn) {
        // Remove existing listeners to prevent duplicates
        setupBtn.onclick = null;
        setupBtn.onclick = () => {
            console.log('Setup button clicked');
            completeSetup();
        };
    }
    
    // Enter key on PIN input
    const setupPinInput = document.getElementById('setupPinInput');
    if (setupPinInput) {
        setupPinInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed in PIN input');
                completeSetup();
            }
        };
    }
}

function completeSetup() {
    console.log('completeSetup() called');
    
    const nickname = document.getElementById('nicknameInput').value.trim();
    const pin = document.getElementById('setupPinInput').value;
    
    console.log('Setup data:', { nickname, pin: pin ? `${pin.length} digits` : 'empty' });
    
    // Validate PIN
    if (pin.length < 4 || pin.length > 6) {
        showSetupError('PIN must be 4-6 digits');
        return;
    }
    
    if (!/^\d+$/.test(pin)) {
        showSetupError('PIN must contain only numbers');
        return;
    }
    
    // Validate nickname (optional)
    if (nickname && nickname.length > 20) {
        showSetupError('Nickname must be 20 characters or less');
        return;
    }
    
    if (!app.sodium) {
        showSetupError('Encryption library not ready. Please refresh and try again.');
        console.error('app.sodium not available');
        return;
    }

    // Enforce invitation-only registration for non-admin users
    const isFirstUserFlag = localStorage.getItem('isFirstUser') === 'true';
    const pendingInvitationRaw = sessionStorage.getItem('pendingInvitation');
    if (!isFirstUserFlag && !pendingInvitationRaw) {
        showSetupError('Registration requires a valid invitation. Please open your invitation link to proceed.');
        return;
    }
    
    try {
        console.log('Starting setup process...');
        
        // Set the PIN
        const derived = hashPIN(pin);
        if (!derived) {
            throw new Error('Failed to derive PIN hash');
        }
        
        const hashedPIN = app.sodium.to_hex(derived);
        localStorage.setItem('userPIN', hashedPIN);
        console.log('PIN saved');
        
        // Set the nickname
        const finalNickname = nickname || generateRandomNickname();
        localStorage.setItem('userNickname', finalNickname);
        app.nickname = finalNickname;
        console.log('Nickname set:', finalNickname);
        
        // Check if this is the first user (admin)
        const isFirstUser = localStorage.getItem('isFirstUser') === 'true';
        console.log('Is first user:', isFirstUser);
        
        if (isFirstUser) {
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('adminUserId', app.sodium.to_hex(app.sodium.randombytes_buf(4)));
            console.log('Admin privileges granted');
        }
        
        // Handle invitation if present
        const pendingInvitation = sessionStorage.getItem('pendingInvitation');
        if (pendingInvitation) {
            console.log('Processing invitation...');
            const invitation = JSON.parse(pendingInvitation);
            // Add inviter as contact automatically
            addInviterAsContact(invitation);
            // Mark invitation as used
            markInvitationAsUsed(invitation.id, finalNickname);
            sessionStorage.removeItem('pendingInvitation');
        }
        
        // Mark setup as complete
        localStorage.setItem('setupComplete', 'true');
        console.log('Setup marked as complete');
        
        const welcomeMsg = isFirstUser ? 'Admin account created! Logging you in...' : 'Account created! Logging you in...';
        showSetupSuccess(welcomeMsg);
        
        setTimeout(() => {
            console.log('Authenticating user...');
            // Hide setup screen and authenticate
            hideAllScreens();
            authenticateUser(pin);
        }, 1000);
        
    } catch (error) {
        console.error('Setup error:', error);
        showSetupError(`Setup failed: ${error.message}`);
    }
}

function addInviterAsContact(invitation) {
    try {
        // Load existing contacts
        const contacts = JSON.parse(localStorage.getItem('contacts') || '{}');
        
        // Add inviter as contact
        contacts[invitation.inviterId] = {
            name: invitation.inviterName,
            publicKey: invitation.inviterPublicKey,
            addedAt: Date.now(),
            addedVia: 'invitation'
        };
        
        // Save contacts
        localStorage.setItem('contacts', JSON.stringify(contacts));
        
        console.log(`Added ${invitation.inviterName} as contact via invitation`);
    } catch (error) {
        console.error('Failed to add inviter as contact:', error);
    }
}

// ==================== INVITATION MANAGEMENT SYSTEM ====================

function createInvitationLink() {
    if (!app.isAdmin) {
        showSystemMessage('❌ Only admins can create invitations');
        return;
    }
    
    try {
        // Generate unique invitation token
        const inviteId = app.sodium.to_hex(app.sodium.randombytes_buf(16));
        const expiresAt = Date.now() + (INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);
        
        // Create invitation object
        const invitation = {
            id: inviteId,
            inviterId: app.userId,
            inviterName: app.nickname,
            inviterPublicKey: app.sodium.to_hex(app.keyPair.publicKey),
            createdAt: Date.now(),
            expiresAt: expiresAt,
            used: false,
            usedBy: null,
            usedAt: null
        };
        
        // Encode invitation as base64 token
        const token = btoa(JSON.stringify(invitation));
        
        // Store invitation locally
        const invitations = JSON.parse(localStorage.getItem('invitations') || '{}');
        invitations[inviteId] = invitation;
        localStorage.setItem('invitations', JSON.stringify(invitations));
        
        // Create invitation URL
        const baseUrl = window.location.origin + window.location.pathname;
        const inviteUrl = `${baseUrl}?invite=${token}`;
        
        // Show invitation modal
        showInvitationModal(inviteUrl, invitation);
        
    } catch (error) {
        console.error('Failed to create invitation:', error);
        showSystemMessage('❌ Failed to create invitation');
    }
}

function showInvitationModal(inviteUrl, invitation) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎉 Invitation Created!</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <p><strong>Share this link to invite someone:</strong></p>
                <div class="invite-url-container">
                    <input type="text" id="inviteUrlInput" value="${inviteUrl}" readonly>
                    <button onclick="copyInviteUrl()" class="btn secondary-btn">📋 Copy</button>
                </div>
                <div class="invite-details">
                    <p><strong>Details:</strong></p>
                    <ul>
                        <li>Created by: ${invitation.inviterName}</li>
                        <li>Expires: ${new Date(invitation.expiresAt).toLocaleString()}</li>
                        <li>Valid for: ${INVITATION_EXPIRY_HOURS} hours</li>
                    </ul>
                </div>
                <div class="invite-actions">
                    <button onclick="shareInvite('${inviteUrl}')" class="btn">📱 Share</button>
                    <button onclick="emailInvite('${inviteUrl}')" class="btn">📧 Email</button>
                    <button onclick="viewInvitations()" class="btn secondary-btn">📋 Manage All</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function copyInviteUrl() {
    const input = document.getElementById('inviteUrlInput');
    input.select();
    document.execCommand('copy');
    showSystemMessage('✅ Invitation link copied to clipboard!');
}

function shareInvite(url) {
    if (navigator.share) {
        navigator.share({
            title: 'Join P2P Secure Chat',
            text: `${app.nickname} invited you to join a secure chat!`,
            url: url
        });
    } else {
        copyInviteUrl();
    }
}

function emailInvite(url) {
    const subject = encodeURIComponent('Invitation to P2P Secure Chat');
    const body = encodeURIComponent(`Hi!

${app.nickname} has invited you to join a secure P2P chat.

Click this link to create your account:
${url}

This invitation expires in ${INVITATION_EXPIRY_HOURS} hours.

Best regards,
P2P Secure Chat`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
}

function viewInvitations() {
    const invitations = JSON.parse(localStorage.getItem('invitations') || '{}');
    const inviteList = Object.values(invitations)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(inv => {
            const status = inv.used ? '✅ Used' : (inv.expiresAt < Date.now() ? '⏰ Expired' : '🟢 Active');
            const date = new Date(inv.createdAt).toLocaleDateString();
            const usedInfo = inv.used ? ` by ${inv.usedBy}` : '';
            return `<div class="invite-item">
                <span>${status} - Created ${date}${usedInfo}</span>
                ${!inv.used && inv.expiresAt > Date.now() ? 
                    `<button onclick="revokeInvitation('${inv.id}')" class="btn-small danger">Revoke</button>` : 
                    ''
                }
            </div>`;
        }).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📋 Invitation Management</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="invite-list">
                    ${inviteList || '<p>No invitations created yet.</p>'}
                </div>
                <div class="invite-stats">
                    <p><strong>Statistics:</strong></p>
                    <ul>
                        <li>Total created: ${Object.keys(invitations).length}</li>
                        <li>Used: ${Object.values(invitations).filter(i => i.used).length}</li>
                        <li>Active: ${Object.values(invitations).filter(i => !i.used && i.expiresAt > Date.now()).length}</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function revokeInvitation(inviteId) {
    const invitations = JSON.parse(localStorage.getItem('invitations') || '{}');
    if (invitations[inviteId]) {
        delete invitations[inviteId];
        localStorage.setItem('invitations', JSON.stringify(invitations));
        showSystemMessage('✅ Invitation revoked');
        // Refresh the modal
        document.querySelector('.modal-overlay').remove();
        viewInvitations();
    }
}

function showSetupError(message) {
    const errorDiv = document.getElementById('setupError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function showSetupSuccess(message) {
    const errorDiv = document.getElementById('setupError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#2ECC40';
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.style.color = '';
        }, 3000);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('P2P Secure Chat starting...');
    console.log('SimplePeer available:', typeof SimplePeer !== 'undefined');
    console.log('Sodium available:', typeof window.sodium !== 'undefined');
    
    try {
        await initSodium();
        loadContacts();
        setupEventListeners();
        checkInviteInURL();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('App initialization failed:', error);
        showLoginError('Encryption library failed to load. Please refresh the page.');
        updateLoginPrompt('❌ Failed to load encryption');
    }
});

// Initialize libsodium
async function initSodium() {
    console.log('Initializing sodium...');
    updateLoginPrompt('⏳ Loading encryption...');
    
    try {
        // Wait for sodium to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds should be enough for local file
        
        while (!window.sodium && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            if (attempts % 10 === 0) {
                console.log(`Waiting for sodium... ${attempts}/${maxAttempts}`);
                updateLoginPrompt(`⏳ Loading encryption... ${Math.round((attempts/maxAttempts)*100)}%`);
            }
        }
        
        if (!window.sodium) {
            throw new Error('Sodium library not loaded from local file');
        }
        
        console.log('Sodium found, initializing...');
        updateLoginPrompt('🔧 Initializing encryption...');
        
        // Handle sodium ready - this should be immediate with the local file
        if (window.sodium.ready) {
            await window.sodium.ready;
        }
        
        app.sodium = window.sodium;
        console.log('Sodium initialized successfully');
        
        // Test basic functionality
        const testBytes = app.sodium.randombytes_buf(32);
        console.log('Sodium test passed - generated', testBytes.length, 'bytes');
        
        enableLoginForm();
        
    } catch (error) {
        console.error('Sodium initialization failed:', error);
        showLoginError('Encryption library failed to load. Please refresh the page.');
        updateLoginPrompt('❌ Encryption failed to load');
        throw error;
    }
}

async function waitForSodiumLoad() {
    let attempts = 0;
    const maxAttempts = 150; // 15 seconds
    
    while (!window.sodium && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        
        // Show progress every 20 attempts (every 2 seconds)
        if (attempts % 20 === 0) {
            const percentage = Math.round((attempts/maxAttempts)*100);
            console.log(`Waiting for sodium... ${attempts}/${maxAttempts} (${percentage}%)`);
            updateLoginPrompt(`⏳ Loading encryption... ${percentage}%`);
        }
        
        // Check if script failed to load
        if (attempts === 50) { // After 5 seconds
            console.log('Checking script elements...');
            const scripts = document.querySelectorAll('script[src*="sodium"]');
            scripts.forEach((script, i) => {
                console.log(`Sodium script ${i}:`, script.src, 'loaded:', script.readyState);
            });
        }
    }
    
    return !!window.sodium;
}

async function handleSodiumReady() {
    console.log('Sodium object found:', typeof window.sodium);
    console.log('Sodium ready property:', typeof window.sodium.ready);
    updateLoginPrompt('🔧 Initializing encryption...');
    
    // Multiple strategies for handling sodium.ready
    try {
        if (typeof window.sodium.ready === 'function') {
            console.log('Using sodium.ready as callback...');
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Sodium ready timeout')), 5000);
                window.sodium.ready(() => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
        } else if (window.sodium.ready && typeof window.sodium.ready.then === 'function') {
            console.log('Using sodium.ready as promise...');
            await window.sodium.ready;
        } else if (window.sodium.ready === true) {
            console.log('Sodium already ready (boolean true)');
        } else {
            console.log('Assuming sodium is ready (no ready property)');
            // Test if sodium actually works
            try {
                window.sodium.randombytes_buf(32);
                console.log('Sodium functionality test passed');
            } catch (testError) {
                throw new Error(`Sodium not functional: ${testError.message}`);
            }
        }
        
        app.sodium = window.sodium;
        console.log('=== SODIUM INITIALIZATION SUCCESS ===');
        
        // Test basic functionality
        try {
            const testData = app.sodium.randombytes_buf(32);
            console.log('Sodium test successful, generated', testData.length, 'random bytes');
        } catch (testError) {
            console.warn('Sodium loaded but basic test failed:', testError);
        }
        
        enableLoginForm();
        
    } catch (readyError) {
        throw new Error(`Sodium ready failed: ${readyError.message}`);
    }
}

async function tryAlternativeInit() {
    console.log('Trying alternative sodium initialization...');
    updateLoginPrompt('🔄 Trying alternative loading...');
    
    // Wait a bit more in case of slow loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (window.sodium) {
        console.log('Sodium appeared during alternative wait');
        return await handleSodiumReady();
    }
    
    // Fallback to Web Crypto API
    console.log('No sodium available, falling back to Web Crypto API...');
    return await initWebCryptoFallback();
}

async function initWebCryptoFallback() {
    console.log('=== INITIALIZING WEB CRYPTO FALLBACK ===');
    updateLoginPrompt('🔄 Using browser crypto...');
    
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Neither libsodium nor Web Crypto API are available');
    }
    
    // Create a fallback sodium-like object using Web Crypto API
    const fallbackSodium = {
        // Random bytes generation
        randombytes_buf: function(length) {
            return window.crypto.getRandomValues(new Uint8Array(length));
        },
        
        // Convert to hex
        to_hex: function(bytes) {
            return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        },
        
        // Convert from hex
        from_hex: function(hex) {
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
            }
            return bytes;
        },
        
        // Convert to string
        to_string: function(bytes) {
            return new TextDecoder().decode(bytes);
        },
        
        // Convert from string
        from_string: function(str) {
            return new TextEncoder().encode(str);
        },
        
        // Password hashing using PBKDF2
        crypto_pwhash: async function(outputLength, password, salt, opslimit, memlimit, algorithm) {
            const key = await window.crypto.subtle.importKey(
                'raw',
                typeof password === 'string' ? new TextEncoder().encode(password) : password,
                'PBKDF2',
                false,
                ['deriveBits']
            );
            
            const bits = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000, // Fixed iterations for consistency
                    hash: 'SHA-256'
                },
                key,
                outputLength * 8
            );
            
            return new Uint8Array(bits);
        },
        
        // Constants (approximate values)
        crypto_pwhash_OPSLIMIT_INTERACTIVE: 4,
        crypto_pwhash_MEMLIMIT_INTERACTIVE: 33554432,
        crypto_pwhash_ALG_DEFAULT: 2,
        
        // Simple keypair generation using Web Crypto
        crypto_box_keypair: async function() {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                ['deriveKey', 'deriveBits']
            );
            
            const publicKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
            const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
            
            return {
                publicKey: new Uint8Array(publicKey),
                privateKey: new Uint8Array(privateKey),
                keyType: 'web-crypto'
            };
        },
        
        // Note: This is a simplified fallback
        // Full libsodium compatibility would require more complex implementation
        _fallback: true
    };
    
    // Make the hash function synchronous for compatibility
    const originalPwhash = fallbackSodium.crypto_pwhash;
    fallbackSodium.crypto_pwhash = function(outputLength, password, salt, opslimit, memlimit, algorithm) {
        // For the PIN hashing, we'll use a simpler approach
        return window.crypto.subtle.digest('SHA-256', 
            new TextEncoder().encode(password + salt.join('')))
            .then(hash => new Uint8Array(hash.slice(0, outputLength)));
    };
    
    app.sodium = fallbackSodium;
    console.log('=== WEB CRYPTO FALLBACK INITIALIZED ===');
    console.log('Note: Using simplified crypto implementation');
    
    updateLoginPrompt('⚡ Browser crypto ready!');
    setTimeout(() => {
        enableLoginForm();
    }, 1000);
}

function updateLoginPrompt(message) {
    const loginPrompt = document.getElementById('loginPrompt');
    if (loginPrompt) {
        loginPrompt.textContent = message;
    }
}

function enableLoginForm() {
    const hasAnyUsers = localStorage.getItem('userPIN') !== null;
    const isFirstUser = localStorage.getItem('isFirstUser') === 'true';
    
    // Check URL for invitation
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    
    if (inviteToken) {
        // User came via invitation link
        handleInviteLink(inviteToken);
        return;
    }
    
    if (!hasAnyUsers && !isFirstUser) {
        // No users exist and not first user - show master setup
        showMasterSetup();
        return;
    }
    
    if (!hasAnyUsers && isFirstUser) {
        // First user needs to complete setup
        showSetupScreen('Welcome! Complete your admin account setup.');
        return;
    }
    
    // Regular login for existing users
    showLoginScreen();
}

function showLoginScreen() {
    const loginPrompt = document.getElementById('loginPrompt');
    const pinInput = document.getElementById('pinInput');
    const loginBtn = document.getElementById('loginBtn');
    
    if (loginPrompt && pinInput && loginBtn) {
        loginPrompt.textContent = '✅ Enter your PIN to access secure chat';
        loginPrompt.style.color = '#2ECC40';
        
        setTimeout(() => {
            loginPrompt.style.color = '';
            pinInput.disabled = false;
            loginBtn.disabled = false;
            pinInput.focus();
        }, 1500);
    }
}

// Add network connectivity check
async function checkNetworkConnectivity() {
    console.log('Checking network connectivity...');
    try {
        // Test if we can reach a basic CDN
        const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/simple-peer/9.11.1/simplepeer.min.js', {
            method: 'HEAD',
            mode: 'no-cors'
        });
        console.log('Network connectivity check passed');
        return true;
    } catch (error) {
        console.error('Network connectivity check failed:', error);
        return false;
    }
}

// Fallback library loading
function loadFallbackLibraries() {
    console.log('Loading fallback libraries...');
    
    // Load alternative SimplePeer if needed
    if (typeof SimplePeer === 'undefined') {
        console.log('Loading fallback SimplePeer...');
        const script1 = document.createElement('script');
        script1.src = 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js';
        script1.async = false;
        document.head.appendChild(script1);
    }
    
    // Load alternative sodium if needed
    if (typeof window.sodium === 'undefined') {
        console.log('Loading fallback sodium...');
        const script2 = document.createElement('script');
        script2.src = 'https://unpkg.com/libsodium-wrappers@0.7.11/dist/browsers-sumo/sodium.js';
        script2.async = false;
        document.head.appendChild(script2);
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
    
    // Validate PIN length (4-6 digits)
    if (pin.length < 4 || pin.length > 6) {
        showLoginError('PIN must be 4-6 digits');
        return;
    }
    
    // Validate PIN contains only numbers
    if (!/^\d+$/.test(pin)) {
        showLoginError('PIN must contain only numbers');
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

        if (storedPIN === hashedPIN) {
            // Correct PIN
            localStorage.removeItem('failedAttempts');
            authenticateUser(pin);
        } else {
            // Wrong PIN
            const attempts = parseInt(localStorage.getItem('failedAttempts') || '0', 10) + 1;
            localStorage.setItem('failedAttempts', String(attempts));
            if (attempts >= 5) {
                const until = Date.now() + 60_000; // 1 minute
                localStorage.setItem('lockoutUntil', String(until));
                localStorage.removeItem('failedAttempts');
                showLoginError('Too many attempts. Locked for 60s');
            } else {
                showLoginError(`Invalid PIN (${attempts}/5 attempts)`);
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

    // Load nickname
    app.nickname = localStorage.getItem('userNickname') || generateRandomNickname();

    // Check if user is admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    app.isAdmin = isAdmin;

    // Derive storage encryption key for at-rest encryption of messages
    app.storageKey = deriveKeyFromPIN(pin);
    
    // Show main app
    hideAllScreens();
    document.getElementById('appContainer').style.display = 'grid';
    
    // Update user info with nickname and admin status
    const adminBadge = isAdmin ? ' 👑' : '';
    document.getElementById('userInfo').textContent = `${app.nickname}${adminBadge} (ID: ${app.userId})`;
    
    // Show admin features if user is admin
    if (isAdmin) {
        document.getElementById('createInviteBtn').style.display = 'inline-block';
    }
    
    // Load and display contacts
    loadEncryptedContacts();
    displayContacts();
    
    // Process any pending invites
    processPendingInvite();
    
    const welcomeMsg = isAdmin ? `Welcome back, Admin ${app.nickname}!` : `Welcome back, ${app.nickname}!`;
    showSystemMessage(welcomeMsg);
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
    
    // Create Invitation (Admin only)
    const createInviteBtn = document.getElementById('createInviteBtn');
    if (createInviteBtn) {
        createInviteBtn.onclick = createInvitationLink;
    }
    
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