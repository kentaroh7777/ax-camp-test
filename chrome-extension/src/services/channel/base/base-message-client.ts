// Base Message Client implementation
// Based on design document Line 573-610

import { IMessageClient, SendMessageParams, GetMessagesParams, SendMessageResult, GetMessagesResult, AuthResult } from '../../../types/core/message.types';
import { IAuthTokenManager } from '../../../types/infrastructure/auth.types';
import { ChannelType, ChannelInfo } from '../../../types/core/channel.types';

export abstract class BaseMessageClient implements IMessageClient {
  protected authTokenManager: IAuthTokenManager;
  protected channel: ChannelType;
  
  constructor(authTokenManager: IAuthTokenManager, channel: ChannelType) {
    this.authTokenManager = authTokenManager;
    this.channel = channel;
  }
  
  abstract sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  abstract getMessages(params: GetMessagesParams): Promise<GetMessagesResult>;
  abstract authenticate(credentials?: any): Promise<AuthResult>;
  
  async isAuthenticated(): Promise<boolean> {
    const token = await this.authTokenManager.getToken(this.channel);
    if (!token) return false;
    
    return await this.authTokenManager.validateToken(this.channel, token);
  }
  
  getChannelInfo(): ChannelInfo {
    return {
      type: this.channel,
      name: this.getChannelName(),
      isConnected: false,
    };
  }
  
  protected abstract getChannelName(): string;
  
  protected async getValidToken(): Promise<string> {
    const token = await this.authTokenManager.getToken(this.channel);
    if (!token) {
      throw new Error(`No authentication token found for ${this.channel}`);
    }
    
    const isValid = await this.authTokenManager.validateToken(this.channel, token);
    if (!isValid) {
      // Try to refresh token
      const refreshedToken = await this.authTokenManager.refreshToken(this.channel);
      return refreshedToken.accessToken;
    }
    
    return token.accessToken;
  }
}