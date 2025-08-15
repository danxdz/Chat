/**
 * Connection Monitor Service
 * Monitors Gun.js connection health and handles auto-reconnection
 */

import { logger } from '../utils/logger';
import { refreshPeers, startPeerHealthMonitoring, stopPeerHealthMonitoring } from './peerDiscovery';

class ConnectionMonitor {
  constructor(gun, options = {}) {
    this.gun = gun;
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.failedChecks = 0;
    this.reconnectAttempts = 0;
    this.healthCheckInterval = null;
    this.listeners = new Set();
    this.currentPeers = [];
    this.peerHealthUnsubscribe = null;
    
    // Configuration
    this.config = {
      checkInterval: options.checkInterval || 30000, // 30 seconds
      maxFailedChecks: options.maxFailedChecks || 3,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 5000, // 5 seconds
      testTimeout: options.testTimeout || 5000, // 5 seconds
      autoStart: options.autoStart !== false,
      enablePeerSwitching: options.enablePeerSwitching !== false,
      peerHealthMonitoring: options.peerHealthMonitoring !== false
    };
    
    if (this.config.autoStart) {
      this.startHealthCheck();
    }
    
    // Start peer health monitoring if enabled
    if (this.config.peerHealthMonitoring && this.currentPeers.length > 0) {
      this.startPeerMonitoring();
    }
  }
  
  /**
   * Start monitoring peer health
   */
  startPeerMonitoring() {
    if (this.peerHealthUnsubscribe) {
      this.peerHealthUnsubscribe();
    }
    
    this.peerHealthUnsubscribe = startPeerHealthMonitoring(
      this.currentPeers,
      (healthData) => {
        if (healthData.discovered) {
          // New peers discovered, update connection
          this.switchToBetterPeers(healthData.discovered);
        } else if (healthData.unhealthy && healthData.unhealthy.length > 0) {
          logger.log(`⚠️ ${healthData.unhealthy.length} peers unhealthy`);
          
          // If most peers are unhealthy, trigger reconnection
          if (healthData.unhealthy.length > healthData.healthy.length) {
            this.handleConnectionIssue();
          }
        }
      }
    );
  }
  
  /**
   * Stop monitoring peer health
   */
  stopPeerMonitoring() {
    if (this.peerHealthUnsubscribe) {
      this.peerHealthUnsubscribe();
      this.peerHealthUnsubscribe = null;
    }
    stopPeerHealthMonitoring();
  }
  
  /**
   * Switch to better performing peers
   */
  async switchToBetterPeers(newPeers) {
    if (!this.config.enablePeerSwitching) {
      return;
    }
    
    logger.log('🔄 Switching to better peers:', newPeers);
    
    try {
      // Update Gun.js peer configuration
      if (this.gun && this.gun.opt) {
        // Remove old peers
        this.currentPeers.forEach(peer => {
          if (this.gun._.opt.peers && this.gun._.opt.peers[peer]) {
            delete this.gun._.opt.peers[peer];
          }
        });
        
        // Add new peers
        newPeers.forEach(peer => {
          this.gun.opt({ peers: [peer] });
        });
        
        this.currentPeers = newPeers;
        
        // Restart peer monitoring with new peers
        if (this.config.peerHealthMonitoring) {
          this.startPeerMonitoring();
        }
        
        // Notify listeners
        this.notifyListeners({
          healthy: true,
          message: 'Switched to better performing peers',
          peers: newPeers,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.log('Error switching peers:', error);
    }
  }
  
  /**
   * Add a status change listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Notify all listeners of status change
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.log('Error in connection status listener:', error);
      }
    });
  }
  
  /**
   * Start health monitoring
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      return; // Already running
    }
    
    logger.log('🏥 Starting connection health monitoring');
    
    // Initial check
    this.checkHealth();
    
    // Schedule periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.config.checkInterval);
  }
  
  /**
   * Stop health monitoring
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.log('🛑 Stopped connection health monitoring');
    }
    
    this.stopPeerMonitoring();
  }
  
  /**
   * Check connection health
   */
  async checkHealth() {
    try {
      const startTime = Date.now();
      const testKey = `health_check_${startTime}`;
      const testValue = { timestamp: startTime, random: Math.random() };
      
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), this.config.testTimeout);
      });
      
      // Create the health check promise
      const healthCheckPromise = new Promise((resolve, reject) => {
        // Try to write and read data
        this.gun.get(testKey).put(testValue, (ack) => {
          if (ack.err) {
            reject(new Error(ack.err));
          } else {
            // Try to read it back
            this.gun.get(testKey).once((data) => {
              if (data && data.timestamp === startTime) {
                resolve(true);
              } else {
                reject(new Error('Data verification failed'));
              }
            });
          }
        });
      });
      
      // Race between health check and timeout
      await Promise.race([healthCheckPromise, timeoutPromise]);
      
      // Health check passed
      this.handleHealthCheckSuccess();
      
    } catch (error) {
      // Health check failed
      this.handleHealthCheckFailure(error);
    }
  }
  
  /**
   * Handle successful health check
   */
  handleHealthCheckSuccess() {
    const wasUnhealthy = !this.isHealthy;
    
    this.isHealthy = true;
    this.failedChecks = 0;
    this.reconnectAttempts = 0;
    this.lastHealthCheck = Date.now();
    
    if (wasUnhealthy) {
      logger.log('✅ Connection restored!');
      this.notifyListeners({
        healthy: true,
        message: 'Connection restored',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Handle failed health check
   */
  handleHealthCheckFailure(error) {
    this.failedChecks++;
    logger.log(`❌ Health check failed (${this.failedChecks}/${this.config.maxFailedChecks}):`, error.message);
    
    if (this.failedChecks >= this.config.maxFailedChecks) {
      this.handleConnectionLoss();
    } else {
      this.notifyListeners({
        healthy: false,
        message: `Connection unstable (${this.failedChecks} failed checks)`,
        timestamp: Date.now(),
        failedChecks: this.failedChecks
      });
    }
  }
  
  /**
   * Handle connection loss
   */
  handleConnectionLoss() {
    const wasHealthy = this.isHealthy;
    this.isHealthy = false;
    
    if (wasHealthy) {
      logger.log('🔌 Connection lost! Attempting to reconnect...');
      this.notifyListeners({
        healthy: false,
        message: 'Connection lost',
        timestamp: Date.now(),
        reconnecting: true
      });
    }
    
    // Attempt reconnection
    this.attemptReconnection();
  }
  
  /**
   * Attempt to reconnect
   */
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.log('❌ Max reconnection attempts reached. Manual intervention required.');
      this.notifyListeners({
        healthy: false,
        message: 'Reconnection failed. Please refresh the page.',
        timestamp: Date.now(),
        fatal: true
      });
      
      // Show user-friendly error
      if (typeof window !== 'undefined' && window.confirm(
        'Connection to the network has been lost. Would you like to refresh the page?'
      )) {
        window.location.reload();
      }
      return;
    }
    
    this.reconnectAttempts++;
    logger.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
    
    try {
      // Try to refresh peers
      const newPeers = await refreshPeers();
      
      if (newPeers && newPeers.length > 0) {
        // Update Gun peers if possible
        if (this.gun.opt && this.gun.opt.peers) {
          // Add new peers to existing Gun instance
          newPeers.forEach(peer => {
            this.gun.opt({peers: [peer]});
          });
          logger.log('Updated Gun.js with new peers:', newPeers);
        }
        
        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay));
        
        // Check if reconnection was successful
        await this.checkHealth();
        
      } else {
        throw new Error('No peers available');
      }
      
    } catch (error) {
      logger.log('Reconnection attempt failed:', error);
      
      // Schedule next attempt
      setTimeout(() => {
        if (!this.isHealthy) {
          this.attemptReconnection();
        }
      }, this.config.reconnectDelay);
    }
  }
  
  /**
   * Get current connection status
   */
  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastHealthCheck,
      failedChecks: this.failedChecks,
      reconnectAttempts: this.reconnectAttempts,
      monitoring: !!this.healthCheckInterval
    };
  }
  
  /**
   * Force a health check
   */
  forceCheck() {
    return this.checkHealth();
  }
  
  /**
   * Destroy the monitor
   */
  destroy() {
    this.stopHealthCheck();
    this.listeners.clear();
  }
}

// Singleton instance
let monitorInstance = null;

/**
 * Initialize connection monitoring for a Gun instance
 */
export const initConnectionMonitor = (gun, options = {}) => {
  if (monitorInstance) {
    monitorInstance.destroy();
  }
  
  monitorInstance = new ConnectionMonitor(gun, options);
  
  // Expose to window for debugging in development
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.connectionMonitor = monitorInstance;
  }
  
  return monitorInstance;
};

/**
 * Get the current monitor instance
 */
export const getMonitor = () => monitorInstance;

export default ConnectionMonitor;