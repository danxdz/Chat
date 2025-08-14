// User and Authentication Types
export interface User {
  id: string;
  nickname: string;
  passwordHash?: string;
  passwordSalt?: string;
  privateKey?: string;
  publicKey: string;
  createdAt: number;
  invitedBy?: string | null;
  inviterNickname?: string | null;
  friends: string[];
}

export interface SessionData {
  user: User;
  timestamp: number;
  rememberMe?: boolean;
}

// Message Types
export interface Message {
  id: string;
  content: string;
  from: string;
  fromNick: string;
  to?: string;
  timestamp: number;
  channel?: string;
  type?: 'text' | 'system' | 'join' | 'leave';
  encrypted?: boolean;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
}

// Contact and Friend Types
export interface Contact {
  id: string;
  nickname: string;
  status?: 'online' | 'offline' | 'pending';
  addedAt?: number;
  publicKey?: string;
}

export interface OnlineUser {
  nickname: string;
  timestamp: number;
}

// Invite Types
export interface InviteData {
  from: string;
  fromNick: string;
  fromId: string;
  timestamp: number;
  expiresAt: number;
  signature?: string;
  used?: boolean;
}

export interface PendingInvite {
  token: string;
  createdAt: number;
  expiresAt: number;
  fromNick: string;
}

// Connection Types
export interface ConnectionStatus {
  peerId: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastSeen?: number;
}

// View Types
export type ViewType = 
  | 'loading' 
  | 'login' 
  | 'needInvite' 
  | 'register' 
  | 'simpleRegister' 
  | 'chat';

// Gun.js Types
export interface GunInstance {
  get: (key: string) => any;
  put: (data: any) => any;
  on: (callback: (data: any, key?: string) => void) => any;
  map: () => any;
  once: (callback?: (data: any, key?: string) => void) => any;
  off: () => void;
  _: {
    opt: {
      peers: Record<string, any>;
    };
  };
}

export interface GunSEA {
  pair: () => Promise<{ pub: string; priv: string; epub: string; epriv: string }>;
  sign: (data: any, pair: any) => Promise<string>;
  verify: (data: any, pair: any) => Promise<any>;
  encrypt: (data: any, pair: any) => Promise<string>;
  decrypt: (data: any, pair: any) => Promise<any>;
  work: (data: string, salt?: string) => Promise<string>;
  secret: (epub: string, pair: any) => Promise<string>;
}

// Component Props Types
export interface ChatAreaProps {
  chatError: string | null;
  messages: Message[];
  displayMessages: Message[];
  user: User | null;
  activeContact: Contact | null;
  newMessage: string;
  messageDeliveryStatus: Map<string, string>;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
}

export interface HeaderProps {
  user: User | null;
  gun: GunInstance | null;
  onlineUsers: Map<string, OnlineUser>;
  allUsers: User[];
  connectionStatus: Map<string, ConnectionStatus>;
  isDev: boolean;
  onNicknameChange: () => void;
  onLogout: () => void;
  onInviteCreated: (invite: PendingInvite) => void;
  onSendTestMessage: () => void;
  onClearCurrentClient: () => void;
  onClearAllClients: () => void;
  onForceReload: () => void;
}

export interface ContactSidebarProps {
  friends: Contact[];
  onlineUsers: Map<string, OnlineUser>;
  activeContact: Contact | null;
  onContactSelect: (contact: Contact | null) => void;
}

// Notification Types
export interface DebugNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
}