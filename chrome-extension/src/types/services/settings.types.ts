// Settings related type definitions
// Based on design document Line 775-840

import { ChannelType, Priority } from '../core/channel.types';

// Application settings
export interface AppSettings {
  // General settings
  general: {
    language: string; // Language setting
    theme: 'light' | 'dark' | 'auto'; // Theme
    autoFetch: boolean; // Auto fetch enabled
    fetchInterval: number; // Fetch interval (minutes)
    maxMessageHistory: number; // History retention count
  };
  
  // Notification settings
  notifications: {
    enabled: boolean; // Notification enabled
    sound: boolean; // Sound notification
    desktop: boolean; // Desktop notification
    priorities: Priority[]; // Target priorities for notification
  };
  
  // AI settings
  ai: {
    provider: 'openai' | 'anthropic' | 'google'; // Provider
    model: string; // Model to use
    temperature: number; // Creativity parameter
    maxTokens: number; // Max tokens
    customPrompt?: string; // Custom prompt
  };
  
  // Channel settings
  channels: {
    [ChannelType.GMAIL]: GmailSettings;
    [ChannelType.DISCORD]: DiscordSettings;
    [ChannelType.LINE]: LineSettings;
  };
  
  // UI settings
  ui: {
    compactMode: boolean; // Compact display
    showAvatars: boolean; // Show avatars
    groupByUser: boolean; // Group by user
    defaultSortOrder: 'timestamp' | 'priority' | 'channel'; // Default sort order
  };
}

// Channel-specific settings
export interface GmailSettings {
  enabled: boolean;
  labels?: string[]; // Target labels
  excludeLabels?: string[]; // Exclude labels
  maxResults: number; // Maximum fetch count
}

export interface DiscordSettings {
  enabled: boolean;
  webhookUrl?: string;
  guildIds?: string[]; // Target servers
  channelIds?: string[]; // Target channels
}

export interface LineSettings {
  enabled: boolean;
  channelAccessToken?: string;
  proxyUrl: string; // Proxy server URL
}

// Settings service interface
export interface ISettingsService {
  // Get settings
  getSettings(): Promise<AppSettings>;
  
  // Update settings
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  
  // Reset settings
  resetSettings(): Promise<void>;
}