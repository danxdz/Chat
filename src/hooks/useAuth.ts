import { useState, useCallback, useEffect } from 'react';
import { User, SessionData, InviteData, GunInstance } from '@/types';
import { 
  verifySecureInvite, 
  markInviteUsed,
  createUserAccount 
} from '@/utils/secureAuth';
import {
  createGunUser,
  loginGunUser,
  getAllGunUsers
} from '@/services/gunAuthService';
import * as adminService from '@/services/adminService';
import { logger } from '@/utils/logger';

interface UseAuthReturn {
  user: User | null;
  allUsers: User[];
  login: (nickname: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (nickname: string, password: string) => Promise<boolean>;
  logout: () => void;
  createBootstrapUser: () => Promise<void>;
  restoreSession: () => Promise<User | null>;
}

export const useAuth = (gun: GunInstance | null): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Load all users
  useEffect(() => {
    if (gun) {
      loadAllUsers();
    }
  }, [gun]);

  const loadAllUsers = useCallback(async () => {
    if (!gun) return;
    
    try {
      const users = await getAllGunUsers(gun);
      setAllUsers(users);
    } catch (error) {
      logger.error('Failed to load users:', error);
    }
  }, [gun]);

  const login = useCallback(async (
    nickname: string, 
    password: string, 
    rememberMe = false
  ): Promise<boolean> => {
    if (!gun) {
      throw new Error('Gun.js not initialized');
    }

    try {
      const loggedInUser = await loginGunUser(gun, nickname, password);
      
      if (loggedInUser) {
        setUser(loggedInUser);
        
        // Save session if remember me is checked
        if (rememberMe) {
          const sessionData: SessionData = {
            user: loggedInUser,
            timestamp: Date.now(),
            rememberMe: true
          };
          localStorage.setItem('savedSession', JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem('savedSession', JSON.stringify({
            user: loggedInUser,
            timestamp: Date.now()
          }));
        }
        
        logger.log('✅ Login successful:', nickname);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }, [gun]);

  const register = useCallback(async (nickname: string, password: string, inviteToken?: string) => {
    if (!gun) {
      throw new Error('Gun.js not initialized');
    }

    try {
      // Validate nickname
      if (!nickname || nickname.trim().length < 2) {
        throw new Error('Nickname must be at least 2 characters');
      }
      
      if (nickname.trim().length > 20) {
        throw new Error('Nickname must be less than 20 characters');
      }
      
      // Check if nickname already exists
      const { checkUserExists } = await import('@/services/gunAuthService');
      const existingUser = await checkUserExists(gun, nickname);
      
      if (existingUser) {
        throw new Error(`Nickname "${nickname}" is already taken. Please choose another.`);
      }
      
      // Verify invite if provided
      let inviteData: InviteData | null = null;
      
      if (inviteToken) {
        inviteData = await verifySecureInvite(inviteToken);
      }
      
      // Create user account using gunAuthService
      const newUser = await createGunUser(gun, nickname, password, inviteData);
      
      if (newUser) {
        // Mark invite as used if applicable
        if (inviteToken && inviteData) {
          await markInviteUsed(inviteToken);
          
          // Also mark in inviter's pending invites
          if (inviteData.fromId && inviteData.id) {
            const { markInviteAsUsed } = await import('@/services/inviteService');
            await markInviteAsUsed(gun, inviteData.fromId, inviteData.id, newUser.id);
          }
        }
        
        // Auto-login the new user
        setUser(newUser);
        
        // Save session
        sessionStorage.setItem('savedSession', JSON.stringify({
          user: newUser,
          timestamp: Date.now()
        }));
        
        // Clear pending invite
        sessionStorage.removeItem('pendingInvite');
        
        // Reload all users
        await loadAllUsers();
        
        logger.log('✅ Registration successful:', nickname);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }, [gun, loadAllUsers]);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('savedSession');
    localStorage.removeItem('savedSession');
    logger.log('👋 User logged out');
  }, []);

  const createBootstrapUser = useCallback(async () => {
    if (!gun) {
      throw new Error('Gun.js not initialized');
    }

    try {
      const adminUser = await adminService.createAdminUser(gun);
      if (adminUser) {
        setUser(adminUser);
        sessionStorage.setItem('currentUser', JSON.stringify(adminUser));
        logger.log('✅ Admin user created and logged in');
      }
    } catch (error) {
      logger.error('Failed to create admin user:', error);
      throw error;
    }
  }, [gun]);

  const restoreSession = useCallback(async (): Promise<User | null> => {
    try {
      const savedSession = sessionStorage.getItem('savedSession') || 
                          localStorage.getItem('savedSession');
      
      if (savedSession) {
        const session: SessionData = JSON.parse(savedSession);
        
        // Check if session is not too old (7 days)
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (sessionAge < maxAge) {
          setUser(session.user);
          logger.log('✅ Session restored for:', session.user.nickname);
          return session.user;
        } else {
          // Clear expired session
          localStorage.removeItem('savedSession');
          sessionStorage.removeItem('savedSession');
        }
      }
    } catch (error) {
      logger.error('Failed to restore session:', error);
    }
    
    return null;
  }, []);

  return {
    user,
    allUsers,
    login,
    register,
    logout,
    createBootstrapUser,
    restoreSession
  };
};