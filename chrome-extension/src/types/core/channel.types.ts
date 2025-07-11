// Channel related type definitions
// Based on design document Line 701-721

export enum ChannelType {
  GMAIL = 'gmail',
  DISCORD = 'discord',
  LINE = 'line'
}

export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived'
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum MessageFormat {
  PLAIN_TEXT = 'plain',
  MARKDOWN = 'markdown',
  HTML = 'html'
}

// Channel information interface
export interface ChannelInfo {
  type: ChannelType;
  name: string;
  isConnected: boolean;
  lastSync?: Date;
  rateLimits?: RateLimit;
}

// Rate limit information
export interface RateLimit {
  requestsPerSecond: number;
  requestsPerHour: number;
  remaining: number;
  resetAt: Date;
}

// Send options for messages
export interface SendOptions {
  urgent?: boolean;
  silent?: boolean;
  formatting?: MessageFormat;
}