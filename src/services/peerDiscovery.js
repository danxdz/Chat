/**
 * Dynamic Peer Discovery Service
 * Fetches and manages Gun.js relay peers dynamically
 */

import { logger } from '../utils/logger';

// Known public peer endpoints
const PEER_SOURCES = [
  'https://gun.eco/peers.json',
  'https://raw.githubusercontent.com/amark/gun/master/examples/peers.json'
];

// Fallback peers if dynamic discovery fails
const FALLBACK_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wallie.io/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://gun-relay.2px.us/gun',
  'https://gun.dirtbag.one/gun',
  'https://gundb.herokuapp.com/gun'
];

// Cache for discovered peers
let cachedPeers = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Peer health tracking
const peerHealthScores = new Map();
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
let healthCheckTimer = null;

/**
 * Calculate peer health score based on response time and success rate
 */
const updatePeerHealth = (peerUrl, responseTime, success) => {
  const current = peerHealthScores.get(peerUrl) || {
    successCount: 0,
    failureCount: 0,
    avgResponseTime: 0,
    lastCheck: 0,
    score: 50
  };
  
  if (success) {
    current.successCount++;
    current.avgResponseTime = (current.avgResponseTime * (current.successCount - 1) + responseTime) / current.successCount;
  } else {
    current.failureCount++;
  }
  
  current.lastCheck = Date.now();
  
  // Calculate score (0-100)
  const successRate = current.successCount / (current.successCount + current.failureCount);
  const responseScore = Math.max(0, 100 - (current.avgResponseTime / 30)); // 3000ms = 0 score
  current.score = (successRate * 70) + (responseScore * 0.3);
  
  peerHealthScores.set(peerUrl, current);
  return current.score;
};

/**
 * Test if a peer is responsive with health tracking
 */
const testPeer = async (peerUrl, timeout = 3000) => {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(peerUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      updatePeerHealth(peerUrl, responseTime, true);
      return { alive: true, responseTime, score: peerHealthScores.get(peerUrl)?.score || 50 };
    } else {
      updatePeerHealth(peerUrl, responseTime, false);
      return { alive: false, responseTime, score: 0 };
    }
  } catch (error) {
    updatePeerHealth(peerUrl, timeout, false);
    return { alive: false, responseTime: timeout, score: 0, error: error.message };
  }
};

/**
 * Fetch peers from a source URL with retry logic
 */
const fetchPeersFromSource = async (sourceUrl, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.peers && Array.isArray(data.peers)) {
        return data.peers;
      } else if (typeof data === 'object') {
        // Extract URLs from object format
        return Object.values(data).filter(v => typeof v === 'string' && v.startsWith('http'));
      }
      
      return [];
    } catch (error) {
      logger.log(`Attempt ${attempt + 1} failed for ${sourceUrl}:`, error.message);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  return [];
};

/**
 * Discover peers dynamically from multiple sources
 */
export const discoverPeers = async (options = {}) => {
  const {
    maxPeers = 5,
    testConnectivity = true,
    useCache = true,
    includeFallbacks = true,
    minHealthScore = 30
  } = options;
  
  // Check cache
  if (useCache && cachedPeers && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    logger.log('Using cached peers');
    return cachedPeers.slice(0, maxPeers);
  }
  
  logger.log('🔍 Discovering Gun.js peers...');
  
  let discoveredPeers = [];
  
  // Try to fetch from peer sources in parallel
  const peerFetchPromises = PEER_SOURCES.map(source => fetchPeersFromSource(source));
  const results = await Promise.allSettled(peerFetchPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      discoveredPeers = [...new Set([...discoveredPeers, ...result.value])];
      logger.log(`Found ${result.value.length} peers from source`);
    }
  }
  
  // Add fallback peers if needed
  if (includeFallbacks) {
    discoveredPeers = [...new Set([...discoveredPeers, ...FALLBACK_PEERS])];
  }
  
  // Test peer connectivity if requested
  if (testConnectivity && discoveredPeers.length > 0) {
    logger.log('Testing peer connectivity...');
    
    // Test peers in parallel with smaller batches to avoid overwhelming
    const batchSize = 10;
    const allPeerTests = [];
    
    for (let i = 0; i < discoveredPeers.length; i += batchSize) {
      const batch = discoveredPeers.slice(i, i + batchSize);
      const batchTests = await Promise.allSettled(
        batch.map(async (peer) => ({
          url: peer,
          ...await testPeer(peer)
        }))
      );
      allPeerTests.push(...batchTests);
    }
    
    // Filter and sort by health score
    const peerResults = allPeerTests
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(peer => peer.alive || peer.score >= minHealthScore)
      .sort((a, b) => b.score - a.score);
    
    const alivePeers = peerResults.filter(p => p.alive);
    const deadPeers = peerResults.filter(p => !p.alive);
    
    logger.log(`✅ ${alivePeers.length} peers responsive, ❌ ${deadPeers.length} peers unresponsive`);
    
    // Use best performing peers
    discoveredPeers = peerResults.map(p => p.url);
  }
  
  // Limit to requested number
  const finalPeers = discoveredPeers.slice(0, maxPeers);
  
  // Update cache
  cachedPeers = finalPeers;
  lastFetchTime = Date.now();
  
  // Ensure we always return some peers
  if (finalPeers.length === 0) {
    logger.log('⚠️ No peers discovered, using fallbacks');
    return FALLBACK_PEERS.slice(0, maxPeers);
  }
  
  logger.log(`📡 Using ${finalPeers.length} peers:`, finalPeers);
  return finalPeers;
};

/**
 * Get the best available peers with fallback
 */
export const getBestPeers = async () => {
  try {
    // Try dynamic discovery first
    const peers = await discoverPeers({
      maxPeers: 5,
      testConnectivity: false, // Skip testing for faster init
      useCache: true,
      includeFallbacks: true
    });
    
    return peers.length > 0 ? peers : FALLBACK_PEERS.slice(0, 5);
  } catch (error) {
    logger.log('Peer discovery failed, using fallbacks:', error);
    return FALLBACK_PEERS.slice(0, 5);
  }
};

/**
 * Refresh peer list (force new discovery)
 */
export const refreshPeers = async () => {
  cachedPeers = null;
  lastFetchTime = 0;
  return discoverPeers({
    maxPeers: 5,
    testConnectivity: true,
    useCache: false,
    includeFallbacks: true
  });
};

/**
 * Start periodic health checks for active peers
 */
export const startPeerHealthMonitoring = (peers, callback) => {
  stopPeerHealthMonitoring();
  
  const checkHealth = async () => {
    logger.log('🏥 Checking peer health...');
    const healthResults = await Promise.allSettled(
      peers.map(async (peer) => ({
        url: peer,
        ...await testPeer(peer, 5000)
      }))
    );
    
    const healthyPeers = healthResults
      .filter(r => r.status === 'fulfilled' && r.value.alive)
      .map(r => r.value.url);
    
    const unhealthyPeers = healthResults
      .filter(r => r.status === 'fulfilled' && !r.value.alive)
      .map(r => r.value.url);
    
    if (callback) {
      callback({
        healthy: healthyPeers,
        unhealthy: unhealthyPeers,
        scores: Object.fromEntries(
          healthResults
            .filter(r => r.status === 'fulfilled')
            .map(r => [r.value.url, r.value.score || 0])
        )
      });
    }
    
    // If too many peers are unhealthy, trigger discovery
    if (unhealthyPeers.length > healthyPeers.length) {
      logger.log('⚠️ Many peers unhealthy, triggering rediscovery...');
      const newPeers = await refreshPeers();
      if (callback) {
        callback({ discovered: newPeers });
      }
    }
  };
  
  // Initial check
  checkHealth();
  
  // Schedule periodic checks
  healthCheckTimer = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
  
  return () => stopPeerHealthMonitoring();
};

/**
 * Stop peer health monitoring
 */
export const stopPeerHealthMonitoring = () => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
};

/**
 * Get peer health statistics
 */
export const getPeerHealthStats = () => {
  const stats = [];
  for (const [url, health] of peerHealthScores.entries()) {
    stats.push({
      url,
      ...health,
      status: health.score > 70 ? 'excellent' : 
              health.score > 40 ? 'good' : 
              health.score > 10 ? 'poor' : 'dead'
    });
  }
  return stats.sort((a, b) => b.score - a.score);
};

export default {
  discoverPeers,
  getBestPeers,
  refreshPeers,
  startPeerHealthMonitoring,
  stopPeerHealthMonitoring,
  getPeerHealthStats,
  FALLBACK_PEERS
};