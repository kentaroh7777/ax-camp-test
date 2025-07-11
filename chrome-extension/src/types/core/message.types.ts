// Message related type definitions
// Based on design document Line 611-645

import { ChannelType, MessageFormat, SendOptions, ChannelInfo } from './channel.types';
import { ApiError } from './api.types';

// Unified message format
export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  isUnread: boolean;
  channel: ChannelType;
  threadId?: string;    // Thread/conversation ID
  replyToId?: string;   // Reply target message ID
  attachments?: Attachment[]; // Attachments
  raw?: any; // Channel-specific raw data
}

// Attachment interface
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

// Send message parameters
export interface SendMessageParams {
  to: string;           // Target ID
  content: string;      // Message content
  replyTo?: string;     // Reply target message ID
  options?: SendOptions;
}

// Get messages parameters
export interface GetMessagesParams {
  limit?: number;       // Limit number of messages
  unreadOnly?: boolean; // Fetch unread only
  since?: Date;         // Since specified date
  threadId?: string;    // Thread ID specification
}

// API result types
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: ApiError;
}

export interface GetMessagesResult {
  success: boolean;
  messages: Message[];
  hasMore: boolean;
  nextToken?: string;
  error?: ApiError;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: ApiError;
}

// Unified message client interface
export interface IMessageClient {
  // Send message
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  
  // Get messages
  getMessages(params: GetMessagesParams): Promise<GetMessagesResult>;
  
  // Check authentication status
  isAuthenticated(): Promise<boolean>;
  
  // Execute authentication
  authenticate(credentials?: any): Promise<AuthResult>;
  
  // Get channel information
  getChannelInfo(): ChannelInfo;
}