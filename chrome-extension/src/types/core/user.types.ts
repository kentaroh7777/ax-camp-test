// User related type definitions
// Based on design document Line 725-772

import { ChannelType, Priority } from './channel.types';
import { Message } from './message.types';

// User mapping information
export interface UserMapping {
  id: string; // UUID
  name: string; // Display name
  channels: {
    [ChannelType.GMAIL]?: {
      email: string;
      userId: string;
      displayName?: string;
    };
    [ChannelType.DISCORD]?: {
      username: string;
      userId: string;
      discriminator?: string;
      guildId?: string;
      displayName?: string;
    };
    [ChannelType.LINE]?: {
      displayName: string;
      userId: string;
      pictureUrl?: string;
    };
  };
  avatar?: string; // Unified avatar URL
  priority: Priority; // User priority
  tags: string[]; // Custom tags
  lastActivity: Date; // Last activity timestamp
  isActive: boolean; // Active status
  createdAt: Date;
  updatedAt: Date;
}

// User mapping request
export interface UserMappingRequest {
  name: string;
  channels: Partial<UserMapping['channels']>;
  avatar?: string;
  priority?: Priority;
  tags?: string[];
}

// Resolved message (after user mapping applied)
export interface ResolvedMessage extends Message {
  resolvedUser?: UserMapping; // Resolved user mapping
  relatedMessages?: Message[]; // Related messages
  priority: Priority; // Calculated priority
}