/**
 * Data Pruning Service
 * Manages message retention and prevents infinite storage growth
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

// Configuration
const CONFIG = {
  MESSAGE_RETENTION_DAYS: 30,
  MAX_MESSAGES_PER_CHANNEL: 1000,
  MAX_MESSAGES_PER_USER: 5000,
  PRUNE_INTERVAL_MS: 3600000, // 1 hour
  BATCH_SIZE: 100 // Process in batches to avoid blocking
};

export class DataPruningService {
  constructor(gun) {
    this.gun = gun;
    this.pruneInterval = null;
    this.isPruning = false;
    this.stats = {
      lastPrune: null,
      messagesDeleted: 0,
      channelsPruned: 0,
      errors: 0
    };
  }

  start() {
    if (this.pruneInterval) {
      return; // Already running
    }

    // Initial prune after 1 minute
    setTimeout(() => this.pruneAll(), 60000);

    // Regular pruning
    this.pruneInterval = setInterval(() => {
      this.pruneAll();
    }, CONFIG.PRUNE_INTERVAL_MS);

    if (isDev) {
      console.log('🧹 Data pruning service started');
    }
  }

  stop() {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }

    if (isDev) {
      console.log('🛑 Data pruning service stopped');
    }
  }

  async pruneAll() {
    if (this.isPruning) {
      if (isDev) {
        console.log('⏳ Pruning already in progress, skipping...');
      }
      return;
    }

    this.isPruning = true;
    this.stats.lastPrune = Date.now();

    try {
      if (isDev) {
        console.log('🧹 Starting data pruning...');
      }

      // Prune old messages
      await this.pruneOldMessages();

      // Prune oversized channels
      await this.pruneOversizedChannels();

      // Clean up orphaned data
      await this.cleanupOrphanedData();

      if (isDev) {
        console.log(`✅ Pruning complete. Deleted ${this.stats.messagesDeleted} messages from ${this.stats.channelsPruned} channels`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Pruning error:', error);
    } finally {
      this.isPruning = false;
    }
  }

  async pruneOldMessages() {
    const cutoffTime = Date.now() - (CONFIG.MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const channelsToPrune = ['general_chat', 'private_messages', 'group_chats'];
    
    for (const channel of channelsToPrune) {
      try {
        await this.pruneChannelOldMessages(channel, cutoffTime);
      } catch (error) {
        console.error(`Failed to prune ${channel}:`, error);
      }
    }
  }

  async pruneChannelOldMessages(channel, cutoffTime) {
    return new Promise((resolve) => {
      const messagesToDelete = [];
      let checked = 0;

      // Collect old messages
      this.gun.get(channel).map().once((message, key) => {
        checked++;
        
        if (message && message.timestamp && message.timestamp < cutoffTime) {
          messagesToDelete.push(key);
        }

        // Process in batches
        if (checked % CONFIG.BATCH_SIZE === 0) {
          this.deleteBatch(channel, messagesToDelete.splice(0, CONFIG.BATCH_SIZE));
        }
      });

      // Cleanup after timeout
      setTimeout(() => {
        if (messagesToDelete.length > 0) {
          this.deleteBatch(channel, messagesToDelete);
        }
        
        if (messagesToDelete.length > 0) {
          this.stats.channelsPruned++;
        }
        
        resolve();
      }, 5000);
    });
  }

  async pruneOversizedChannels() {
    const channelsToCheck = ['general_chat', 'private_messages'];
    
    for (const channel of channelsToCheck) {
      try {
        await this.limitChannelSize(channel);
      } catch (error) {
        console.error(`Failed to limit size of ${channel}:`, error);
      }
    }
  }

  async limitChannelSize(channel) {
    return new Promise((resolve) => {
      const messages = [];
      
      // Collect all messages with timestamps
      this.gun.get(channel).map().once((message, key) => {
        if (message && message.timestamp) {
          messages.push({ 
            key, 
            timestamp: message.timestamp,
            size: JSON.stringify(message).length 
          });
        }
      });

      setTimeout(() => {
        if (messages.length > CONFIG.MAX_MESSAGES_PER_CHANNEL) {
          // Sort by timestamp (oldest first)
          messages.sort((a, b) => a.timestamp - b.timestamp);
          
          // Calculate how many to delete
          const toDelete = messages.length - CONFIG.MAX_MESSAGES_PER_CHANNEL;
          const deleteList = messages.slice(0, toDelete);
          
          if (isDev) {
            console.log(`📏 Channel ${channel} has ${messages.length} messages, deleting ${toDelete} oldest`);
          }
          
          // Delete oldest messages
          this.deleteBatch(channel, deleteList.map(m => m.key));
          this.stats.channelsPruned++;
        }
        
        resolve();
      }, 5000);
    });
  }

  async cleanupOrphanedData() {
    // Clean up test data
    this.gun.get('gun_init_test').map().once((data, key) => {
      if (key && key.startsWith('gun_init_test_')) {
        this.gun.get('gun_init_test').get(key).put(null);
      }
    });

    // Clean up old health checks
    this.gun.get('health_check').map().once((data, key) => {
      if (key && key.startsWith('health_check_')) {
        this.gun.get('health_check').get(key).put(null);
      }
    });

    // Clean up old presence data (older than 24 hours)
    const presenceCutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    this.gun.get('user_presence').map().once((presence, userId) => {
      if (presence && presence.lastSeen && presence.lastSeen < presenceCutoff) {
        this.gun.get('user_presence').get(userId).put(null);
      }
    });
  }

  deleteBatch(channel, keys) {
    if (!keys || keys.length === 0) return;
    
    for (const key of keys) {
      this.gun.get(channel).get(key).put(null);
      this.stats.messagesDeleted++;
    }
    
    if (isDev) {
      console.log(`🗑️ Deleted ${keys.length} messages from ${channel}`);
    }
  }

  async getUserMessageCount(userId) {
    return new Promise((resolve) => {
      let count = 0;
      
      // Count messages in all channels
      this.gun.get('messages').get(userId).map().once((message) => {
        if (message) count++;
      });
      
      setTimeout(() => resolve(count), 2000);
    });
  }

  async pruneUserMessages(userId) {
    const count = await this.getUserMessageCount(userId);
    
    if (count > CONFIG.MAX_MESSAGES_PER_USER) {
      const toDelete = count - CONFIG.MAX_MESSAGES_PER_USER;
      
      if (isDev) {
        console.log(`👤 User ${userId} has ${count} messages, need to delete ${toDelete}`);
      }
      
      // Collect and delete oldest messages
      const messages = [];
      
      this.gun.get('messages').get(userId).map().once((message, key) => {
        if (message && message.timestamp) {
          messages.push({ key, timestamp: message.timestamp });
        }
      });
      
      setTimeout(() => {
        messages.sort((a, b) => a.timestamp - b.timestamp);
        const deleteList = messages.slice(0, toDelete);
        
        for (const item of deleteList) {
          this.gun.get('messages').get(userId).get(item.key).put(null);
          this.stats.messagesDeleted++;
        }
      }, 2000);
    }
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: !!this.pruneInterval,
      isPruning: this.isPruning,
      config: CONFIG
    };
  }

  updateConfig(newConfig) {
    Object.assign(CONFIG, newConfig);
    
    if (isDev) {
      console.log('📝 Pruning config updated:', CONFIG);
    }
  }

  async manualPrune() {
    if (isDev) {
      console.log('🔧 Manual prune triggered');
    }
    
    await this.pruneAll();
    return this.stats;
  }
}

// Singleton instance
let pruningInstance = null;

export const getDataPruningService = (gun) => {
  if (!pruningInstance && gun) {
    pruningInstance = new DataPruningService(gun);
  }
  return pruningInstance;
};

export const resetDataPruningService = () => {
  if (pruningInstance) {
    pruningInstance.stop();
    pruningInstance = null;
  }
};