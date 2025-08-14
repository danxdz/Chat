import { useState, useCallback, useEffect } from 'react';
import { Message, User, Contact, GunInstance } from '@/types';
import { sendWebRTCMessage } from '@/services/webrtcService';
import { logger } from '@/utils/logger';

interface UseMessagesReturn {
  messages: Message[];
  displayMessages: Message[];
  messageDeliveryStatus: Map<string, string>;
  sendMessage: (content: string, to?: Contact | null) => Promise<void>;
  clearMessages: () => void;
}

export const useMessages = (
  gun: GunInstance | null,
  user: User | null,
  activeContact: Contact | null
): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState<Map<string, string>>(new Map());

  // Subscribe to messages when gun and user are available
  useEffect(() => {
    if (!gun || !user) return;

    const subscriptions: any[] = [];

    // Listen for general chat messages
    const generalSub = gun.get('general_chat')
      .map()
      .on((data: any) => {
        if (data && typeof data === 'object' && data.content) {
          handleIncomingMessage(data);
        }
      });
    subscriptions.push(generalSub);

    // Listen for private messages
    user.friends.forEach(friendId => {
      const channelName = [user.id, friendId].sort().join('_');
      const privateSub = gun.get(`private_${channelName}`)
        .map()
        .on((data: any) => {
          if (data && typeof data === 'object' && data.content) {
            handleIncomingMessage(data);
          }
        });
      subscriptions.push(privateSub);
    });

    return () => {
      subscriptions.forEach(sub => {
        if (sub && typeof sub.off === 'function') {
          sub.off();
        }
      });
    };
  }, [gun, user]);

  const handleIncomingMessage = useCallback((msgData: any) => {
    if (!msgData || !user) return;
    
    const message: Message = {
      id: msgData.id || `${Date.now()}_${Math.random()}`,
      content: msgData.content,
      from: msgData.from,
      fromNick: msgData.fromNick || 'Unknown',
      to: msgData.to,
      timestamp: msgData.timestamp || Date.now(),
      channel: msgData.channel,
      type: msgData.type || 'text',
      encrypted: msgData.encrypted
    };
    
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
    });
    
    // Update delivery status for received messages
    if (message.from !== user?.id) {
      setMessageDeliveryStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(message.id, 'delivered');
        return newMap;
      });
    }
  }, [user]);

  const sendMessage = useCallback(async (
    content: string,
    to: Contact | null = null
  ) => {
    if (!gun || !user || !content.trim()) return;

    const messageId = `${Date.now()}_${Math.random()}`;
    const timestamp = Date.now();
    
    // Create message object
    const message: Message = {
      id: messageId,
      content: content.trim(),
      from: user.id,
      fromNick: user.nickname,
      to: to?.id,
      timestamp,
      channel: to ? `private_${[user.id, to.id].sort().join('_')}` : 'general_chat',
      type: 'text'
    };

    // Add to local messages immediately
    setMessages(prev => [...prev, message]);
    
    // Set delivery status to sending
    setMessageDeliveryStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, 'sending');
      return newMap;
    });

    try {
      // Determine channel
      const channelName = to 
        ? `private_${[user.id, to.id].sort().join('_')}`
        : 'general_chat';

      // Try to encrypt message if SEA is available
      let messageToSend = { ...message };
      
      if ((window as any).Gun?.SEA) {
        try {
          const messageKey = `p2p-chat-key-${channelName}`;
          const encrypted = await (window as any).Gun.SEA.encrypt(
            message.content,
            messageKey
          );
          messageToSend = { ...message, content: encrypted, encrypted: true };
        } catch (error) {
          logger.warn('Encryption failed, sending unencrypted:', error);
        }
      }

      // Send via Gun.js
      await gun.get(channelName).get(messageId).put(messageToSend);
      
      // Also try WebRTC for private messages
      if (to) {
        try {
          await sendWebRTCMessage(to.id, messageToSend);
        } catch (error) {
          logger.warn('WebRTC send failed, relying on Gun.js:', error);
        }
      }

      // Update delivery status to sent
      setMessageDeliveryStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(messageId, 'sent');
        return newMap;
      });

      logger.log('📤 Message sent:', channelName);
    } catch (error) {
      logger.error('Failed to send message:', error);
      
      // Update delivery status to failed
      setMessageDeliveryStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(messageId, 'failed');
        return newMap;
      });
      
      throw error;
    }
  }, [gun, user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageDeliveryStatus(new Map());
    logger.log('🗑️ Messages cleared');
  }, []);

  // Filter messages for display based on active contact
  const displayMessages = activeContact 
    ? messages.filter(msg => 
        (msg.from === user?.id && msg.to === activeContact.id) ||
        (msg.from === activeContact.id && msg.to === user?.id) ||
        (msg.channel === `private_${[user?.id, activeContact.id].sort().join('_')}`)
      )
    : messages.filter(msg => !msg.to && msg.channel === 'general_chat');

  return {
    messages,
    displayMessages,
    messageDeliveryStatus,
    sendMessage,
    clearMessages
  };
};