// Authentication related type definitions
// Based on design document Line 679-696 and 843-866

import { ChannelType } from '../core/channel.types';

// Authentication token
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string[];
  tokenType: 'Bearer' | 'OAuth';
}

// Authentication state
export interface AuthState {
  channel: ChannelType;
  isAuthenticated: boolean;
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  lastAuth: Date;
  expiresAt?: Date;
}

// Authentication token manager interface
export interface IAuthTokenManager {
  // Save token
  saveToken(channel: ChannelType, token: AuthToken): Promise<void>;
  
  // Get token
  getToken(channel: ChannelType): Promise<AuthToken | null>;
  
  // Delete token
  removeToken(channel: ChannelType): Promise<void>;
  
  // Refresh token
  refreshToken(channel: ChannelType): Promise<AuthToken>;
  
  // Validate token
  validateToken(channel: ChannelType, token: AuthToken): Promise<boolean>;
}