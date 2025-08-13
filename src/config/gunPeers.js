/**
 * Centralized Gun.js peer configuration
 * These are public relay servers for the P2P network
 */

export const GUN_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wallie.io/gun',
  'https://gunjs.herokuapp.com/gun'
]

// Development peers (optional local server)
export const DEV_PEERS = process.env.NODE_ENV === 'development' ? [
  'http://localhost:8765/gun'  // Optional local Gun.js server
] : []

// Combine all peers
export const ALL_PEERS = [...GUN_PEERS, ...DEV_PEERS]

export default ALL_PEERS