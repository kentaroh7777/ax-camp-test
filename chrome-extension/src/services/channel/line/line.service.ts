// LINE Service implementation
// Based on design document LINE Proxy integration

import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams, SendMessageResult, GetMessagesResult, AuthResult } from '../../../types/core/message.types';
import { ChannelType } from '../../../types/core/channel.types';
import { Message } from '../../../types/core/message.types';
import { IAuthTokenManager } from '../../../types/infrastructure/auth.types';

export class LineService extends BaseMessageClient {
  private proxyUrl: string;
  
  constructor(authTokenManager: IAuthTokenManager) {
    super(authTokenManager, ChannelType.LINE);
    this.proxyUrl = process.env.PROXY_SERVER_URL + '/api/line';
  }
  
  protected getChannelName(): string {
    return 'LINE';
  }
  
  async sendMessage(params: any, channelToken?: string): Promise<SendMessageResult> {
    try {
      const token = channelToken || await this.getValidToken();
      
      const payload = {
        to: params.to,
        messages: params.messages || [
          {
            type: 'text',
            text: params.content,
          },
        ],
      };
      
      const fullUrl = `${this.proxyUrl}/message/push`;
      console.log('LINE Service: Sending message to URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LINE API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        messageId: result.sentMessages?.[0]?.id || 'line-message-sent',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LINE_SEND_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async getMessages(params: GetMessagesParams): Promise<GetMessagesResult> {
    try {
      console.log(`LineService.getMessages: Starting request...`);
      const token = await this.getValidToken();
      console.log(`LineService.getMessages: Token obtained: ${token}`);
      
      const queryParams = new URLSearchParams({
        limit: (params.limit || 50).toString(),
      });
      
      if (params.since) {
        queryParams.append('since', params.since.toISOString());
      }
      
      const fullUrl = `${this.proxyUrl}/messages?${queryParams}`;
      console.log(`LineService.getMessages: Requesting URL: ${fullUrl}`);
      console.log(`LineService.getMessages: Headers:`, { 'Authorization': `Bearer ${token}` });
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log(`LineService.getMessages: Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`LineService.getMessages: Error response:`, errorText);
        throw new Error(`LINE API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`LineService.getMessages: Response result:`, result);
      
      // Convert timestamp strings to Date objects
      const convertedMessages = (result.messages || []).map((message: any) => ({
        ...message,
        timestamp: new Date(message.timestamp)
      }));
      
      return {
        success: true,
        messages: convertedMessages,
        hasMore: result.hasMore || false,
        nextToken: result.nextToken,
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        hasMore: false,
        error: {
          code: 'LINE_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async authenticate(credentials?: { channelAccessToken: string }): Promise<AuthResult> {
    try {
      if (!credentials?.channelAccessToken) {
        throw new Error('LINE Channel Access Token is required');
      }
      
      // Validate Channel Access Token
      const response = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.channelAccessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Invalid LINE Channel Access Token');
      }
      
      // Save token
      const authToken = {
        accessToken: credentials.channelAccessToken,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
        tokenType: 'Bearer' as const,
      };
      
      await this.authTokenManager.saveToken(ChannelType.LINE, authToken);
      
      return {
        success: true,
        token: credentials.channelAccessToken,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LINE_AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  private convertLineToMessage(lineMessage: any): Message {
    return {
      id: lineMessage.id,
      from: lineMessage.source?.userId || lineMessage.source?.groupId || 'unknown',
      to: 'bot',
      content: lineMessage.message?.text || 'Non-text message',
      timestamp: new Date(lineMessage.timestamp),
      isUnread: true, // LINE messages are typically unread by default
      channel: ChannelType.LINE,
      raw: lineMessage,
    };
  }
}