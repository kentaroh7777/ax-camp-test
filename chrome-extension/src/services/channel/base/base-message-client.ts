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
    // プロキシサーバーの認証が無効の場合はスキップ
    const proxyAuthEnabled = process.env.PROXY_AUTH_ENABLE;
    console.log(`BaseMessageClient.isAuthenticated: ${this.channel} - PROXY_AUTH_ENABLE:`, proxyAuthEnabled);
    
    if (proxyAuthEnabled === 'false') {
      console.log(`BaseMessageClient.isAuthenticated: ${this.channel} - Auth bypassed, returning true`);
      return true;
    }
    
    console.log(`BaseMessageClient.isAuthenticated: ${this.channel} - Auth required, checking token`);
    const token = await this.authTokenManager.getToken(this.channel);
    if (!token) {
      console.log(`BaseMessageClient.isAuthenticated: ${this.channel} - No token found`);
      return false;
    }
    
    const isValid = await this.authTokenManager.validateToken(this.channel, token);
    console.log(`BaseMessageClient.isAuthenticated: ${this.channel} - Token valid:`, isValid);
    return isValid;
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
    // プロキシサーバーの認証が無効の場合はダミートークンを返す
    const proxyAuthEnabled = process.env.PROXY_AUTH_ENABLE;
    if (proxyAuthEnabled === 'false') {
      return 'dummy-token';
    }
    
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