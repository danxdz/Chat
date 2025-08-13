/**
 * WebRTC Service for true P2P messaging
 * Establishes direct peer connections for private messages
 */

const logger = {
  log: (...args) => console.log('[WebRTC]', ...args),
  error: (...args) => console.error('[WebRTC]', ...args),
  warn: (...args) => console.warn('[WebRTC]', ...args)
}

class WebRTCService {
  constructor(gun, userId, nickname) {
    this.gun = gun
    this.userId = userId
    this.nickname = nickname
    this.peers = new Map() // Map of userId -> RTCPeerConnection
    this.dataChannels = new Map() // Map of userId -> RTCDataChannel
    this.messageHandlers = []
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
    
    this.initializeSignaling()
  }
  
  /**
   * Initialize Gun.js signaling for WebRTC
   */
  initializeSignaling() {
    if (!this.gun || !this.userId) return
    
    // Listen for WebRTC signals meant for us
    this.gun.get('webrtc_signals').get(this.userId).on((data, key) => {
      if (!data || !data.type || data.processed) return
      
      logger.log('📨 Received signal:', data.type, 'from:', data.from?.substring(0, 8))
      
      // Mark as processed to avoid handling twice
      this.gun.get('webrtc_signals').get(this.userId).get(key).put({ ...data, processed: true })
      
      switch (data.type) {
        case 'offer':
          this.handleOffer(data)
          break
        case 'answer':
          this.handleAnswer(data)
          break
        case 'ice-candidate':
          this.handleIceCandidate(data)
          break
      }
    })
  }
  
  /**
   * Create or get peer connection for a user
   */
  async getOrCreatePeerConnection(targetUserId) {
    if (this.peers.has(targetUserId)) {
      return this.peers.get(targetUserId)
    }
    
    const pc = new RTCPeerConnection({ iceServers: this.iceServers })
    this.peers.set(targetUserId, pc)
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetUserId, {
          type: 'ice-candidate',
          candidate: event.candidate
        })
      }
    }
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      logger.log(`Connection state with ${targetUserId.substring(0, 8)}: ${pc.connectionState}`)
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeerConnection(targetUserId)
      }
    }
    
    return pc
  }
  
  /**
   * Initiate WebRTC connection with a peer
   */
  async connectToPeer(targetUserId) {
    try {
      logger.log('🔗 Initiating WebRTC connection to:', targetUserId.substring(0, 8))
      
      const pc = await this.getOrCreatePeerConnection(targetUserId)
      
      // Create data channel for messages
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true,
        reliable: true
      })
      
      this.setupDataChannel(dataChannel, targetUserId)
      
      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      // Send offer through Gun.js signaling
      this.sendSignal(targetUserId, {
        type: 'offer',
        offer: offer
      })
      
      return true
    } catch (error) {
      logger.error('Failed to connect to peer:', error)
      return false
    }
  }
  
  /**
   * Handle incoming offer
   */
  async handleOffer(data) {
    try {
      const { from, offer } = data
      logger.log('📥 Handling offer from:', from.substring(0, 8))
      
      const pc = await this.getOrCreatePeerConnection(from)
      
      // Set up data channel handler
      pc.ondatachannel = (event) => {
        logger.log('📡 Data channel received from:', from.substring(0, 8))
        this.setupDataChannel(event.channel, from)
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      
      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      // Send answer back
      this.sendSignal(from, {
        type: 'answer',
        answer: answer
      })
      
    } catch (error) {
      logger.error('Failed to handle offer:', error)
    }
  }
  
  /**
   * Handle incoming answer
   */
  async handleAnswer(data) {
    try {
      const { from, answer } = data
      logger.log('📥 Handling answer from:', from.substring(0, 8))
      
      const pc = this.peers.get(from)
      if (!pc) {
        logger.warn('No peer connection found for answer from:', from)
        return
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      
    } catch (error) {
      logger.error('Failed to handle answer:', error)
    }
  }
  
  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(data) {
    try {
      const { from, candidate } = data
      
      const pc = this.peers.get(from)
      if (!pc) {
        logger.warn('No peer connection found for ICE candidate from:', from)
        return
      }
      
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
      
    } catch (error) {
      logger.error('Failed to handle ICE candidate:', error)
    }
  }
  
  /**
   * Setup data channel event handlers
   */
  setupDataChannel(channel, peerId) {
    channel.onopen = () => {
      logger.log('✅ Data channel opened with:', peerId.substring(0, 8))
      this.dataChannels.set(peerId, channel)
    }
    
    channel.onclose = () => {
      logger.log('❌ Data channel closed with:', peerId.substring(0, 8))
      this.dataChannels.delete(peerId)
    }
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        logger.log('📨 Received P2P message from:', peerId.substring(0, 8))
        
        // Notify all message handlers
        this.messageHandlers.forEach(handler => handler(message, peerId))
      } catch (error) {
        logger.error('Failed to parse message:', error)
      }
    }
    
    channel.onerror = (error) => {
      logger.error('Data channel error with', peerId.substring(0, 8), ':', error)
    }
  }
  
  /**
   * Send signal through Gun.js
   */
  sendSignal(targetUserId, signal) {
    if (!this.gun) return
    
    const signalData = {
      ...signal,
      from: this.userId,
      fromNick: this.nickname,
      timestamp: Date.now(),
      id: Date.now() + '_' + Math.random()
    }
    
    // Send signal to target user's signal inbox
    this.gun.get('webrtc_signals').get(targetUserId).set(signalData)
    logger.log('📤 Sent signal:', signal.type, 'to:', targetUserId.substring(0, 8))
  }
  
  /**
   * Send message through WebRTC data channel
   */
  async sendMessage(targetUserId, message) {
    // First check if we have an open channel
    let channel = this.dataChannels.get(targetUserId)
    
    // If no channel or not open, try to establish connection
    if (!channel || channel.readyState !== 'open') {
      logger.log('📡 No open channel, establishing connection...')
      await this.connectToPeer(targetUserId)
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000))
      channel = this.dataChannels.get(targetUserId)
    }
    
    if (channel && channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify(message))
        logger.log('✅ Sent P2P message to:', targetUserId.substring(0, 8))
        return true
      } catch (error) {
        logger.error('Failed to send message:', error)
        return false
      }
    } else {
      logger.warn('No open channel to send message')
      return false
    }
  }
  
  /**
   * Register message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler)
  }
  
  /**
   * Close peer connection
   */
  closePeerConnection(userId) {
    const pc = this.peers.get(userId)
    if (pc) {
      pc.close()
      this.peers.delete(userId)
    }
    
    const channel = this.dataChannels.get(userId)
    if (channel) {
      channel.close()
      this.dataChannels.delete(userId)
    }
  }
  
  /**
   * Cleanup all connections
   */
  cleanup() {
    this.peers.forEach(pc => pc.close())
    this.peers.clear()
    
    this.dataChannels.forEach(channel => channel.close())
    this.dataChannels.clear()
    
    this.messageHandlers = []
  }
}

// Singleton instance
let webrtcInstance = null

/**
 * Initialize WebRTC service
 */
export const initWebRTC = (gun, userId, nickname) => {
  if (webrtcInstance) {
    webrtcInstance.cleanup()
  }
  
  webrtcInstance = new WebRTCService(gun, userId, nickname)
  return webrtcInstance
}

/**
 * Get WebRTC instance
 */
export const getWebRTC = () => webrtcInstance

/**
 * Send P2P message via WebRTC
 */
export const sendWebRTCMessage = async (targetUserId, message) => {
  if (!webrtcInstance) {
    logger.error('WebRTC not initialized')
    return false
  }
  
  return webrtcInstance.sendMessage(targetUserId, message)
}

/**
 * Connect to peer
 */
export const connectToPeer = async (targetUserId) => {
  if (!webrtcInstance) {
    logger.error('WebRTC not initialized')
    return false
  }
  
  return webrtcInstance.connectToPeer(targetUserId)
}

export default {
  initWebRTC,
  getWebRTC,
  sendWebRTCMessage,
  connectToPeer
}