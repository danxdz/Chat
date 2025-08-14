import { useState, useCallback, useEffect, useRef } from 'react';
import { User, OnlineUser, GunInstance } from '@/types';
import { logger } from '@/utils/logger';

interface UsePresenceReturn {
  onlineUsers: Map<string, OnlineUser>;
  lastSeen: Map<string, number>;
  connectionStatus: Map<string, any>;
  announcePresence: () => void;
  updatePresence: (status: 'online' | 'offline') => void;
}

export const usePresence = (
  gun: GunInstance | null,
  user: User | null
): UsePresenceReturn => {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [lastSeen, setLastSeen] = useState<Map<string, number>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<Map<string, any>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to presence updates
  useEffect(() => {
    if (!gun || !user) return;

    const presenceSub = gun.get('user_presence')
      .map()
      .on((data: any) => {
        if (data && typeof data === 'object') {
          handlePresenceUpdate(data);
        }
      });

    // Start heartbeat
    startHeartbeat();

    return () => {
      if (presenceSub && typeof presenceSub.off === 'function') {
        presenceSub.off();
      }
      stopHeartbeat();
    };
  }, [gun, user]);

  const handlePresenceUpdate = useCallback((data: any) => {
    if (!data || !data.userId) return;
    
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      
      if (data.status === 'online') {
        newMap.set(data.userId, {
          nickname: data.nickname,
          timestamp: data.timestamp
        });
      } else if (data.status === 'offline') {
        newMap.delete(data.userId);
      }
      
      return newMap;
    });
    
    setLastSeen(prev => {
      const newMap = new Map(prev);
      newMap.set(data.userId, data.timestamp);
      return newMap;
    });

    // Handle IRC-style join/leave messages
    if (data.type === 'join' || data.type === 'leave') {
      logger.log(`👤 ${data.nickname} has ${data.type}ed the chat`);
    }
  }, []);

  const announcePresence = useCallback(() => {
    if (!gun || !user) return;

    const presenceData = {
      userId: user.id,
      nickname: user.nickname,
      status: 'online',
      timestamp: Date.now(),
      type: 'join'
    };

    gun.get('user_presence')
      .get(user.id)
      .put(presenceData);

    logger.log('📢 Announced presence:', user.nickname);
  }, [gun, user]);

  const updatePresence = useCallback((status: 'online' | 'offline') => {
    if (!gun || !user) return;

    const presenceData = {
      userId: user.id,
      nickname: user.nickname,
      status,
      timestamp: Date.now(),
      type: status === 'offline' ? 'leave' : undefined
    };

    gun.get('user_presence')
      .get(user.id)
      .put(presenceData);

    logger.log(`📢 Updated presence to ${status}:`, user.nickname);
  }, [gun, user]);

  const startHeartbeat = useCallback(() => {
    if (!gun || !user) return;

    // Clear any existing interval
    stopHeartbeat();

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      const heartbeat = {
        userId: user.id,
        nickname: user.nickname,
        status: 'online',
        timestamp: Date.now()
      };

      gun.get('user_presence')
        .get(user.id)
        .put(heartbeat);

      // Clean up stale users (not seen in 2 minutes)
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        const now = Date.now();
        const staleThreshold = 2 * 60 * 1000; // 2 minutes

        for (const [userId, userData] of newMap.entries()) {
          if (now - userData.timestamp > staleThreshold && userId !== user.id) {
            newMap.delete(userId);
            logger.log(`🔴 Removing stale user: ${userData.nickname}`);
          }
        }

        return newMap;
      });
    }, 30000);

    logger.log('💓 Heartbeat started');
  }, [gun, user]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      logger.log('💔 Heartbeat stopped');
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (user) {
        updatePresence('offline');
      }
    };
  }, [user]);

  // Monitor Gun.js peer connections
  useEffect(() => {
    if (!gun) return;

    const interval = setInterval(() => {
      if (gun._ && gun._.opt && gun._.opt.peers) {
        const peers = gun._.opt.peers;
        const peerStatus = new Map();
        
        Object.entries(peers).forEach(([peerId, peerData]: [string, any]) => {
          peerStatus.set(peerId, {
            status: peerData.wire ? 'connected' : 'disconnected',
            lastSeen: Date.now()
          });
        });
        
        setConnectionStatus(peerStatus);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [gun]);

  return {
    onlineUsers,
    lastSeen,
    connectionStatus,
    announcePresence,
    updatePresence
  };
};