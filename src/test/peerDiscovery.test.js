import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  discoverPeers, 
  getBestPeers, 
  refreshPeers,
  startPeerHealthMonitoring,
  stopPeerHealthMonitoring,
  getPeerHealthStats
} from '../services/peerDiscovery';

// Mock fetch globally
global.fetch = vi.fn();

describe('Peer Discovery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch.mockReset();
  });

  describe('discoverPeers', () => {
    it('should discover peers from remote sources', async () => {
      const mockPeers = [
        'https://peer1.example.com/gun',
        'https://peer2.example.com/gun'
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers
      });

      const peers = await discoverPeers({ 
        maxPeers: 2, 
        testConnectivity: false 
      });

      expect(peers).toHaveLength(2);
      expect(peers).toEqual(expect.arrayContaining(mockPeers));
    });

    it('should handle different peer response formats', async () => {
      // Test object format
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          peer1: 'https://peer1.example.com/gun',
          peer2: 'https://peer2.example.com/gun'
        })
      });

      const peers = await discoverPeers({ 
        maxPeers: 5, 
        testConnectivity: false 
      });

      expect(peers.length).toBeGreaterThan(0);
    });

    it('should use fallback peers when discovery fails', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const peers = await discoverPeers({ 
        maxPeers: 3,
        testConnectivity: false,
        includeFallbacks: true
      });

      expect(peers.length).toBe(3);
      expect(peers[0]).toMatch(/^https?:\/\//);
    });

    it('should test peer connectivity when requested', async () => {
      const mockPeers = ['https://test-peer.com/gun'];
      
      // Mock peer source fetch
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers
      });

      // Mock connectivity test
      global.fetch.mockResolvedValueOnce({
        ok: true
      });

      const peers = await discoverPeers({ 
        maxPeers: 1,
        testConnectivity: true,
        includeFallbacks: false
      });

      expect(peers).toHaveLength(1);
      // Should have made 2 fetch calls (source + connectivity test)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should respect maxPeers limit', async () => {
      const mockPeers = [
        'https://peer1.example.com/gun',
        'https://peer2.example.com/gun',
        'https://peer3.example.com/gun',
        'https://peer4.example.com/gun',
        'https://peer5.example.com/gun'
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers
      });

      const peers = await discoverPeers({ 
        maxPeers: 3,
        testConnectivity: false
      });

      expect(peers).toHaveLength(3);
    });

    it('should use cache when available', async () => {
      const mockPeers = ['https://cached-peer.com/gun'];
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers
      });

      // First call - should fetch
      const peers1 = await discoverPeers({ 
        maxPeers: 1,
        testConnectivity: false,
        useCache: true
      });

      // Second call - should use cache
      const peers2 = await discoverPeers({ 
        maxPeers: 1,
        testConnectivity: false,
        useCache: true
      });

      expect(peers1).toEqual(peers2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only one fetch
    });

    it('should retry failed peer source fetches', async () => {
      // First attempt fails
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      // Second attempt succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ['https://retry-peer.com/gun']
      });

      const peers = await discoverPeers({ 
        maxPeers: 1,
        testConnectivity: false,
        includeFallbacks: false
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBestPeers', () => {
    it('should return best available peers', async () => {
      const mockPeers = ['https://best-peer.com/gun'];
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers
      });

      const peers = await getBestPeers();

      expect(peers).toBeDefined();
      expect(peers.length).toBeGreaterThan(0);
      expect(peers.length).toBeLessThanOrEqual(5);
    });

    it('should return fallbacks on error', async () => {
      global.fetch.mockRejectedValue(new Error('Discovery failed'));

      const peers = await getBestPeers();

      expect(peers).toBeDefined();
      expect(peers.length).toBe(5);
      expect(peers[0]).toMatch(/^https?:\/\//);
    });
  });

  describe('refreshPeers', () => {
    it('should force new discovery without cache', async () => {
      const mockPeers1 = ['https://peer1.com/gun'];
      const mockPeers2 = ['https://peer2.com/gun'];
      
      // First discovery
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers1
      });

      await discoverPeers({ useCache: true });

      // Refresh should bypass cache
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeers2
      });

      const refreshedPeers = await refreshPeers();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(refreshedPeers).toContain('https://peer2.com/gun');
    });
  });

  describe('Peer Health Monitoring', () => {
    it('should start and stop health monitoring', () => {
      const callback = vi.fn();
      const peers = ['https://test-peer.com/gun'];

      const unsubscribe = startPeerHealthMonitoring(peers, callback);
      
      expect(unsubscribe).toBeInstanceOf(Function);
      
      stopPeerHealthMonitoring();
      // Should not throw
    });

    it('should get peer health statistics', () => {
      const stats = getPeerHealthStats();
      
      expect(stats).toBeInstanceOf(Array);
      // Stats should be sorted by score
      for (let i = 1; i < stats.length; i++) {
        expect(stats[i - 1].score).toBeGreaterThanOrEqual(stats[i].score);
      }
    });

    it('should trigger rediscovery when many peers are unhealthy', async () => {
      const callback = vi.fn();
      const peers = ['https://unhealthy1.com/gun', 'https://unhealthy2.com/gun'];

      // Mock all peers as unhealthy
      global.fetch.mockRejectedValue(new Error('Connection failed'));

      startPeerHealthMonitoring(peers, callback);

      // Wait for health check to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Callback should be called with unhealthy peers
      expect(callback).toHaveBeenCalled();
      
      stopPeerHealthMonitoring();
    });
  });
});