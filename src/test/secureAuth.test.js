import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generatePermanentId,
  createUserAccount,
  ircLogin,
  createSecureInvite,
  verifySecureInvite,
  markInviteUsed
} from '../utils/secureAuth';

describe('Secure Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('generatePermanentId', () => {
    it('should generate a permanent ID with public and private keys', async () => {
      const identity = await generatePermanentId();
      
      expect(identity).toHaveProperty('id');
      expect(identity).toHaveProperty('privateKey');
      expect(identity).toHaveProperty('publicKey');
      expect(identity.id).toMatch(/test-public-key/);
    });

    it('should throw error when Gun.SEA is not available', async () => {
      const originalSEA = window.Gun.SEA;
      window.Gun.SEA = null;
      
      await expect(generatePermanentId()).rejects.toThrow('Gun.SEA not available');
      
      window.Gun.SEA = originalSEA;
    });
  });

  describe('createUserAccount', () => {
    it('should create a user account with nickname and password', async () => {
      const user = await createUserAccount('testuser', 'password123');
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('nickname', 'testuser');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('privateKey');
      expect(user).toHaveProperty('publicKey');
      expect(user).toHaveProperty('createdAt');
      expect(user.passwordHash).not.toBe('password123'); // Should be hashed
    });

    it('should auto-friend the inviter when invite data is provided', async () => {
      const inviteData = {
        fromId: 'inviter-id',
        fromNick: 'inviter'
      };
      
      const user = await createUserAccount('newuser', 'pass123', inviteData);
      
      expect(user.invitedBy).toBe('inviter-id');
      expect(user.inviterNickname).toBe('inviter');
      expect(user.friends).toContain('inviter-id');
    });
  });

  describe('ircLogin', () => {
    beforeEach(async () => {
      // Create a test user
      const user = await createUserAccount('logintest', 'testpass');
      const users = [user];
      localStorage.setItem('users', JSON.stringify(users));
    });

    it('should successfully login with correct credentials', async () => {
      const loggedInUser = await ircLogin('logintest', 'testpass');
      
      expect(loggedInUser).toBeDefined();
      expect(loggedInUser.nickname).toBe('logintest');
    });

    it('should fail login with incorrect password', async () => {
      await expect(ircLogin('logintest', 'wrongpass')).rejects.toThrow('Invalid password');
    });

    it('should fail login with non-existent nickname', async () => {
      await expect(ircLogin('nonexistent', 'pass')).rejects.toThrow('Nickname not found');
    });

    it('should be case-insensitive for nicknames', async () => {
      const loggedInUser = await ircLogin('LOGINTEST', 'testpass');
      expect(loggedInUser.nickname).toBe('logintest');
    });
  });

  describe('createSecureInvite', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createUserAccount('inviter', 'pass123');
    });

    it('should create a secure invite with default expiration', async () => {
      const invite = await createSecureInvite(testUser);
      
      expect(invite).toHaveProperty('inviteId');
      expect(invite).toHaveProperty('inviteUrl');
      expect(invite).toHaveProperty('expiresAt');
      expect(invite.inviteUrl).toMatch(/^http:\/\/localhost:3000\/register\.html#invite=/);
    });

    it('should create invite with custom expiration', async () => {
      const invite = await createSecureInvite(testUser, '5m');
      
      const expectedExpiry = Date.now() + (5 * 60 * 1000);
      expect(Math.abs(invite.expiresAt - expectedExpiry)).toBeLessThan(1000);
    });

    it('should fail if user has no private key', async () => {
      const userWithoutKey = { ...testUser, privateKey: null };
      
      await expect(createSecureInvite(userWithoutKey)).rejects.toThrow('User private key not available');
    });

    it('should use Base64URL encoding for invite token', async () => {
      const invite = await createSecureInvite(testUser);
      const token = invite.inviteUrl.split('#invite=')[1];
      
      // Base64URL should not contain +, /, or =
      expect(token).not.toMatch(/[+\/=]/);
    });
  });

  describe('verifySecureInvite', () => {
    let testUser;
    let validInvite;

    beforeEach(async () => {
      testUser = await createUserAccount('verifier', 'pass123');
      validInvite = await createSecureInvite(testUser, '1h');
    });

    it('should verify a valid invite', async () => {
      const token = validInvite.inviteUrl.split('#invite=')[1];
      const verified = await verifySecureInvite(token);
      
      expect(verified).toHaveProperty('id', validInvite.inviteId);
      expect(verified).toHaveProperty('fromNick', testUser.nickname);
    });

    it('should reject expired invites', async () => {
      // Create an expired invite
      const expiredInvite = await createSecureInvite(testUser, '60s');
      const token = expiredInvite.inviteUrl.split('#invite=')[1];
      
      // Decode and modify the expiration
      const base64 = token
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(token.length + (4 - token.length % 4) % 4, '=');
      
      const inviteData = JSON.parse(atob(base64));
      inviteData.expiresAt = Date.now() - 1000; // Set to past
      
      const expiredToken = btoa(JSON.stringify(inviteData))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      await expect(verifySecureInvite(expiredToken)).rejects.toThrow('expired');
    });

    it('should validate invite data structure', async () => {
      const invalidToken = btoa(JSON.stringify({ invalid: 'data' }));
      
      await expect(verifySecureInvite(invalidToken)).rejects.toThrow('Invalid invite data structure');
    });

    it('should handle both Base64 and Base64URL formats', async () => {
      const token = validInvite.inviteUrl.split('#invite=')[1];
      
      // Try Base64URL format
      const verified1 = await verifySecureInvite(token);
      expect(verified1).toHaveProperty('id', validInvite.inviteId);
      
      // Try regular Base64 format
      const base64Token = token
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const verified2 = await verifySecureInvite(base64Token);
      expect(verified2).toHaveProperty('id', validInvite.inviteId);
    });
  });

  describe('markInviteUsed', () => {
    it('should mark an invite as used', async () => {
      const testUser = await createUserAccount('marker', 'pass123');
      const invite = await createSecureInvite(testUser);
      const token = invite.inviteUrl.split('#invite=')[1];
      
      // Mock gun.put
      window.gun = {
        get: vi.fn(() => ({
          get: vi.fn(() => ({
            put: vi.fn()
          }))
        }))
      };
      
      await markInviteUsed(token);
      
      expect(window.gun.get).toHaveBeenCalledWith('secure_invites');
    });
  });
});