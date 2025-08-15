/**
 * Message Queue System
 * Handles message delivery with retry logic and guarantees
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

export class MessageQueue {
  constructor(gun) {
    this.gun = gun;
    this.pendingMessages = new Map();
    this.maxRetries = 3;
    this.retryDelay = 2000; // Base delay in ms
    this.deliveryCallbacks = new Map();
    this.isProcessing = false;
    this.processInterval = null;
  }

  start() {
    if (this.processInterval) {
      return; // Already running
    }

    // Process queue every second
    this.processInterval = setInterval(() => {
      this.processPendingMessages();
    }, 1000);

    if (isDev) {
      console.log('📬 Message queue started');
    }
  }

  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    if (isDev) {
      console.log('🛑 Message queue stopped');
    }
  }

  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendMessage(channel, message, options = {}) {
    const messageId = this.generateId();
    
    const messageData = {
      id: messageId,
      content: message.content || message,
      from: message.from,
      to: message.to,
      timestamp: Date.now(),
      status: 'pending',
      encrypted: message.encrypted || false,
      ...options
    };

    // Add to pending queue
    this.pendingMessages.set(messageId, {
      ...messageData,
      channel,
      retries: 0,
      lastAttempt: null,
      nextRetry: Date.now()
    });

    if (isDev) {
      console.log(`📤 Message ${messageId} queued for ${channel}`);
    }

    // Try to send immediately
    await this.attemptSend(messageId);

    return messageId;
  }

  async attemptSend(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;

    message.lastAttempt = Date.now();
    message.status = 'sending';

    try {
      // Attempt to send via Gun.js
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Send timeout'));
        }, 5000);

        this.gun.get(message.channel).get(message.id).put(message, (ack) => {
          clearTimeout(timeout);
          
          if (ack && ack.err) {
            reject(new Error(ack.err));
          } else {
            resolve(ack);
          }
        });
      });

      // Success - mark as delivered
      this.markAsDelivered(messageId);
      
      if (isDev) {
        console.log(`✅ Message ${messageId} delivered`);
      }

      return true;
    } catch (error) {
      if (isDev) {
        console.warn(`❌ Failed to send message ${messageId}:`, error.message);
      }

      // Schedule retry
      this.scheduleRetry(messageId);
      return false;
    }
  }

  scheduleRetry(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;

    message.retries++;

    if (message.retries > this.maxRetries) {
      this.markAsFailed(messageId);
      return;
    }

    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, message.retries - 1);
    message.nextRetry = Date.now() + delay;
    message.status = 'retry_scheduled';

    if (isDev) {
      console.log(`🔄 Retry ${message.retries}/${this.maxRetries} scheduled for message ${messageId} in ${delay}ms`);
    }
  }

  async processPendingMessages() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = Date.now();

    for (const [messageId, message] of this.pendingMessages) {
      if (message.status === 'retry_scheduled' && message.nextRetry <= now) {
        await this.attemptSend(messageId);
      }
    }

    this.isProcessing = false;
  }

  markAsDelivered(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;

    message.status = 'delivered';
    message.deliveredAt = Date.now();

    // Notify callback if registered
    const callback = this.deliveryCallbacks.get(messageId);
    if (callback) {
      callback({ success: true, messageId, deliveredAt: message.deliveredAt });
      this.deliveryCallbacks.delete(messageId);
    }

    // Remove from pending after a short delay
    setTimeout(() => {
      this.pendingMessages.delete(messageId);
    }, 1000);
  }

  markAsFailed(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;

    message.status = 'failed';
    message.failedAt = Date.now();

    if (isDev) {
      console.error(`❌ Message ${messageId} failed after ${message.retries} retries`);
    }

    // Notify callback if registered
    const callback = this.deliveryCallbacks.get(messageId);
    if (callback) {
      callback({ 
        success: false, 
        messageId, 
        error: 'Max retries exceeded',
        retries: message.retries 
      });
      this.deliveryCallbacks.delete(messageId);
    }

    // Keep failed messages for debugging (clean up after 5 minutes)
    setTimeout(() => {
      this.pendingMessages.delete(messageId);
    }, 300000);
  }

  onDelivery(messageId, callback) {
    this.deliveryCallbacks.set(messageId, callback);
  }

  getStatus() {
    const stats = {
      pending: 0,
      sending: 0,
      retry_scheduled: 0,
      delivered: 0,
      failed: 0
    };

    for (const message of this.pendingMessages.values()) {
      stats[message.status] = (stats[message.status] || 0) + 1;
    }

    return {
      total: this.pendingMessages.size,
      ...stats
    };
  }

  getPendingMessages() {
    return Array.from(this.pendingMessages.values())
      .filter(m => m.status !== 'delivered' && m.status !== 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getFailedMessages() {
    return Array.from(this.pendingMessages.values())
      .filter(m => m.status === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  retryFailedMessage(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message || message.status !== 'failed') return false;

    // Reset for retry
    message.status = 'pending';
    message.retries = 0;
    message.nextRetry = Date.now();

    if (isDev) {
      console.log(`🔄 Manually retrying failed message ${messageId}`);
    }

    // Try to send immediately
    this.attemptSend(messageId);
    return true;
  }

  clearFailedMessages() {
    let cleared = 0;
    
    for (const [messageId, message] of this.pendingMessages) {
      if (message.status === 'failed') {
        this.pendingMessages.delete(messageId);
        cleared++;
      }
    }

    if (isDev) {
      console.log(`🗑️ Cleared ${cleared} failed messages`);
    }

    return cleared;
  }
}

// Singleton instance
let queueInstance = null;

export const getMessageQueue = (gun) => {
  if (!queueInstance && gun) {
    queueInstance = new MessageQueue(gun);
    queueInstance.start();
  }
  return queueInstance;
};

export const resetMessageQueue = () => {
  if (queueInstance) {
    queueInstance.stop();
    queueInstance = null;
  }
};