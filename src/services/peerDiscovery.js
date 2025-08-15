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
  'https://gunjs.herokuapp.com/gun'
];

// Cache for discovered peers
let cachedPeers = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Test if a peer is responsive
 */
const testPeer = async (peerUrl, timeout = 3000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(peerUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Fetch peers from a source URL
 */
const fetchPeersFromSource = async (sourceUrl) => {
  try {
    const response = await fetch(sourceUrl);
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
    logger.log(`Failed to fetch peers from ${sourceUrl}:`, error.message);
    return [];
  }
};

/**
 * Discover peers dynamically from multiple sources
 */
export const discoverPeers = async (options = {}) => {
  const {
    maxPeers = 5,
    testConnectivity = true,
    useCache = true,
    includeFallbacks = true
  } = options;
  
  // Check cache
  if (useCache && cachedPeers && (Date.now() - lastFetchTime < CACHE_DURATION)) {
    logger.log('Using cached peers');
    return cachedPeers.slice(0, maxPeers);
  }
  
  logger.log('🔍 Discovering Gun.js peers...');
  
  let discoveredPeers = [];
  
  // Try to fetch from peer sources
  for (const source of PEER_SOURCES) {
    const peers = await fetchPeersFromSource(source);
    if (peers.length > 0) {
      discoveredPeers = [...new Set([...discoveredPeers, ...peers])];
      logger.log(`Found ${peers.length} peers from ${source}`);
      break; // Use first successful source
    }
  }
  
  // Add fallback peers if needed
  if (includeFallbacks) {
    discoveredPeers = [...new Set([...discoveredPeers, ...FALLBACK_PEERS])];
  }
  
  // Test peer connectivity if requested
  if (testConnectivity && discoveredPeers.length > 0) {
    logger.log('Testing peer connectivity...');
    
    const peerTests = await Promise.allSettled(
      discoveredPeers.map(async (peer) => ({
        url: peer,
        alive: await testPeer(peer)
      }))
    );
    
    // Filter and sort by responsiveness
    const alivePeers = peerTests
      .filter(result => result.status === 'fulfilled' && result.value.alive)
      .map(result => result.value.url);
    
    const deadPeers = peerTests
      .filter(result => result.status === 'fulfilled' && !result.value.alive)
      .map(result => result.value.url);
    
    logger.log(`✅ ${alivePeers.length} peers responsive, ❌ ${deadPeers.length} peers unresponsive`);
    
    // Prioritize alive peers
    discoveredPeers = [...alivePeers, ...deadPeers];
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

export default {
  discoverPeers,
  getBestPeers,
  refreshPeers,
  FALLBACK_PEERS
};