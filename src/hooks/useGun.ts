import { useState, useEffect } from 'react';
import { GunInstance } from '@/types';
import { logger } from '@/utils/logger';

// Import Gun.js dynamically to avoid SSR issues
declare global {
  interface Window {
    Gun: any;
    sodium: any;
  }
}

interface UseGunReturn {
  gun: GunInstance | null;
  isReady: boolean;
  error: string | null;
}

export const useGun = (peers: string[]): UseGunReturn => {
  const [gun, setGun] = useState<GunInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGun = async () => {
      try {
        // Wait for Gun.js to be available
        if (!window.Gun) {
          const gunScript = document.createElement('script');
          gunScript.src = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
          await new Promise((resolve, reject) => {
            gunScript.onload = resolve;
            gunScript.onerror = reject;
            document.head.appendChild(gunScript);
          });
        }

        // Load SEA if not available
        if (!window.Gun?.SEA) {
          const seaScript = document.createElement('script');
          seaScript.src = 'https://cdn.jsdelivr.net/npm/gun/sea.js';
          await new Promise((resolve, reject) => {
            seaScript.onload = resolve;
            seaScript.onerror = reject;
            document.head.appendChild(seaScript);
          });
        }

        // Initialize sodium if available
        if (window.sodium) {
          await window.sodium.ready;
          logger.log('✅ Sodium ready for cryptography');
        }

        // Create Gun instance
        const gunInstance = window.Gun(peers);
        
        // Initialize Gun.js data structures
        gunInstance.get('general_chat').put({ initialized: true });
        gunInstance.get('user_presence').put({ initialized: true });
        gunInstance.get('secure_invites').put({ initialized: true });
        gunInstance.get('chat_messages').put({ initialized: true });
        gunInstance.get('chat_users').put({ initialized: true });
        
        setGun(gunInstance as GunInstance);
        setIsReady(true);
        logger.log('🔫 Gun.js initialized with peers:', peers);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize Gun.js';
        setError(errorMsg);
        logger.error('Gun.js initialization error:', err);
      }
    };

    initGun();
  }, []);

  return { gun, isReady, error };
};