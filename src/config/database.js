/**
 * Database Configuration
 * Change the DB_NAMESPACE to reset the entire app with a new database
 */

// Change this value to reset the entire app with a new database
// Examples: 'p2pchat_v1', 'p2pchat_v2', 'mychat_2024', etc.
export const DB_NAMESPACE = 'p2pchat_v2';  // Changed from default to v2 for fresh start

// Database keys with namespace
export const DB_KEYS = {
  USERS: `${DB_NAMESPACE}_users`,
  USERS_BY_NICK: `${DB_NAMESPACE}_users_by_nick`,
  MESSAGES: `${DB_NAMESPACE}_messages`,
  INVITES: `${DB_NAMESPACE}_invites`,
  FRIENDSHIPS: `${DB_NAMESPACE}_friendships`,
  NOTIFICATIONS: `${DB_NAMESPACE}_notifications`,
  ONLINE_USERS: `${DB_NAMESPACE}_online`,
  USER_PRESENCE: `${DB_NAMESPACE}_presence`,
  GENERAL_CHAT: `${DB_NAMESPACE}_general`
};

// Legacy keys (for migration if needed)
export const LEGACY_KEYS = {
  USERS: 'chat_users',
  USERS_BY_NICK: 'chat_users_by_nick',
  MESSAGES: 'chat_messages',
  INVITES: 'secure_invites',
  FRIENDSHIPS: 'friendships',
  NOTIFICATIONS: 'notifications',
  ONLINE_USERS: 'online_users',
  USER_PRESENCE: 'user_presence',
  GENERAL_CHAT: 'general_chat'
};

export default DB_KEYS;