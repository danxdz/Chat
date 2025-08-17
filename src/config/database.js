/**
 * Database Configuration
 * Change the DB_NAMESPACE to reset the entire app with a new database
 */

// Get namespace from localStorage or use default
const getNamespace = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('current_db_namespace') || 'p2pchat_v2';
  }
  return 'p2pchat_v2';
};

// Dynamically loaded from localStorage or default
export const DB_NAMESPACE = getNamespace();

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
  GENERAL_CHAT: `${DB_NAMESPACE}_general`,
  USER_INVITES: `${DB_NAMESPACE}_user_invites`
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