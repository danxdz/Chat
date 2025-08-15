/**
 * Connection Health Monitor
 * Monitors Gun.js peer connections and handles reconnection
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

// Fallback peers if discovery fails
const FALLBACK_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wallie.io/gun'
];

// Peer discovery endpoints (future implementation)
const PEER_DISCOVERY_ENDPOINTS = [
  // Add discovery endpoints when available
];

export class ConnectionMonitor {
  constructor(gun, onStatusChange) {
    this.gun = gun;
    this.onStatusChange = onStatusChange || (() => {});
    this.isHealthy = false;
    this.peers = [];
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.lastHealthCheck = null;
    this.peerStatus = new Map();
  }

  start() {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    // Initial check
    this.checkPeerHealth();

    // Regular health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkPeerHealth();
    }, 30000);

    if (isDev) {
      console.log('🏥 Connection monitor started');
    }
  }

  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (isDev) {
      console.log('🛑 Connection monitor stopped');
    }
  }

  async discoverPeers() {
    // Try to discover peers from endpoints
    for (const endpoint of PEER_DISCOVERY_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, { 
          signal: AbortSignal.timeout(5000) 
        });
        const peers = await response.json();
        
        if (peers && peers.active && peers.active.length > 0) {
          if (isDev) {
            console.log(`✅ Discovered ${peers.active.length} peers from ${endpoint}`);
          }
          return peers.active;
        }
      } catch (error) {
        if (isDev) {
          console.warn(`Failed to discover peers from ${endpoint}:`, error.message);
        }
      }
    }

    // Fallback to hardcoded peers
    if (isDev) {
      console.log('Using fallback peers');
    }
    return FALLBACK_PEERS;
  }

  async pingPeer(peer) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Peer ${peer} timeout`));
      }, 5000);

      // Try to write and read a test value
      const testKey = `health_check_${Date.now()}_${Math.random()}`;
      const testValue = { ping: true, timestamp: Date.now() };

      this.gun.get(testKey).put(testValue, (ack) => {
        clearTimeout(timeout);
        
        if (ack && ack.err) {
          reject(new Error(ack.err));
        } else {
          // Successfully wrote, now try to read
          this.gun.get(testKey).once((data) => {
            if (data && data.ping) {
              resolve(true);
            } else {
              reject(new Error('Read verification failed'));
            }
          });
        }
      });
    });
  }

  async checkPeerHealth() {
    this.lastHealthCheck = Date.now();
    const healthyPeers = [];
    const unhealthyPeers = [];

    // Get current peers or discover new ones
    if (this.peers.length === 0) {
      this.peers = await this.discoverPeers();
    }

    // Test each peer
    for (const peer of this.peers) {
      try {
        await this.pingPeer(peer);
        healthyPeers.push(peer);
        this.peerStatus.set(peer, 'healthy');
        
        if (isDev) {
          console.log(`✅ Peer ${peer} is healthy`);
        }
      } catch (error) {
        unhealthyPeers.push(peer);
        this.peerStatus.set(peer, 'unhealthy');
        
        if (isDev) {
          console.warn(`❌ Peer ${peer} is unhealthy:`, error.message);
        }
      }
    }

    const wasHealthy = this.isHealthy;
    this.isHealthy = healthyPeers.length > 0;

    // Notify status change
    this.onStatusChange({
      isHealthy: this.isHealthy,
      healthyPeers: healthyPeers.length,
      totalPeers: this.peers.length,
      lastCheck: this.lastHealthCheck
    });

    // Handle connection loss
    if (!this.isHealthy && wasHealthy) {
      console.error('⚠️ Lost all peer connections!');
      this.handleConnectionLoss();
    }

    // Handle connection recovery
    if (this.isHealthy && !wasHealthy) {
      console.log('✅ Connection restored!');
      this.reconnectAttempts = 0;
    }

    return {
      healthy: healthyPeers,
      unhealthy: unhealthyPeers,
      isHealthy: this.isHealthy
    };
  }

  async handleConnectionLoss() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.onStatusChange({
        isHealthy: false,
        error: 'Unable to connect to network',
        needsManualReconnect: true
      });
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Try to discover new peers
    const newPeers = await this.discoverPeers();
    
    // Shuffle peers to try different ones first
    const shuffled = [...newPeers].sort(() => Math.random() - 0.5);
    this.peers = shuffled;

    // Try to reconnect
    setTimeout(() => {
      this.checkPeerHealth();
    }, 2000 * this.reconnectAttempts); // Exponential backoff
  }

  async reconnectWithNewPeers() {
    console.log('🔄 Manual reconnection requested');
    
    // Reset attempts
    this.reconnectAttempts = 0;
    
    // Discover fresh peers
    const newPeers = await this.discoverPeers();
    
    // Reinitialize Gun with new peers
    if (window.Gun) {
      this.gun = window.Gun(newPeers);
      this.peers = newPeers;
      
      // Check health immediately
      await this.checkPeerHealth();
      
      return this.gun;
    }
    
    throw new Error('Gun.js not available for reconnection');
  }

  getStatus() {
    return {
      isHealthy: this.isHealthy,
      peers: this.peers.length,
      healthyPeers: Array.from(this.peerStatus.entries())
        .filter(([_, status]) => status === 'healthy')
        .map(([peer, _]) => peer),
      lastCheck: this.lastHealthCheck,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  getPeerLatency() {
    // Future: implement actual latency measurement
    return new Map(this.peers.map(peer => [peer, Math.random() * 100]));
  }
}

// Singleton instance
let monitorInstance = null;

export const getConnectionMonitor = (gun, onStatusChange) => {
  if (!monitorInstance && gun) {
    monitorInstance = new ConnectionMonitor(gun, onStatusChange);
  }
  return monitorInstance;
};

export const resetConnectionMonitor = () => {
  if (monitorInstance) {
    monitorInstance.stop();
    monitorInstance = null;
  }
};