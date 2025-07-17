// Discord Service implementation
// Based on design document Discord Webhook integration

import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams, SendMessageResult, GetMessagesResult, AuthResult } from '../../../types/core/message.types';
import { ChannelType } from '../../../types/core/channel.types';
import { Message } from '../../../types/core/message.types';
import { IAuthTokenManager } from '../../../types/infrastructure/auth.types';

export class DiscordService extends BaseMessageClient {
  private proxyUrl: string;

  constructor(authTokenManager: IAuthTokenManager) {
    super(authTokenManager, ChannelType.DISCORD);
    this.proxyUrl = process.env.PROXY_SERVER_URL + '/api/discord';
  }
  
  protected getChannelName(): string {
    return 'Discord';
  }
  
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    console.log('DiscordService.sendMessage called.');
    console.log('DiscordService.sendMessage: Entering try block.');
    try {
      const token = await this.getValidToken();
      console.log('DiscordService.sendMessage: Token obtained:', token);
      
      const payload = {
        channelId: params.to,
        content: params.content,
      };

      const fullUrl = `${this.proxyUrl}/send`;
      console.log('Discord Service: Sending message to URL:', fullUrl, 'with payload:', payload);
      console.log('DiscordService.sendMessage: About to call fetch.');
      
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
        throw new Error(`Discord Proxy error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(`Discord Proxy reported failure: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        messageId: result.data?.messageId || 'discord-message-sent',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DISCORD_SEND_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async getMessages(params: GetMessagesParams): Promise<GetMessagesResult> {
    try {
      const token = await this.getValidToken();
      const queryParams = new URLSearchParams({
        limit: (params.limit || 50).toString(),
      });
      if (params.since) {
        queryParams.append('since', params.since.toISOString());
      }

      const fullUrl = `${this.proxyUrl}/messages?${queryParams.toString()}`;
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord Proxy error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Discord Proxy reported failure: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        messages: result.messages || [],
        hasMore: result.hasMore || false,
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        hasMore: false,
        error: {
          code: 'DISCORD_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async authenticate(credentials?: { webhookUrl: string }): Promise<AuthResult> {
    // Authentication for Discord will now involve getting a bot token or similar
    // For now, we'll assume the token is managed by the proxy server and just validate webhook URL if provided
    try {
      if (!credentials?.webhookUrl) {
        // If no webhookUrl is provided, assume authentication is handled by proxy setup
        return {
          success: true,
          token: 'proxy-managed-auth',
        };
      }
      
      // Validate webhook URL if provided (for initial setup or direct webhook use)
      const response = await fetch(credentials.webhookUrl, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Invalid Discord Webhook URL');
      }
      
      // Store webhook URL as token (if still needed for some direct operations)
      const authToken = {
        accessToken: credentials.webhookUrl,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
        tokenType: 'Bearer' as const,
      };
      
      await this.authTokenManager.saveToken(ChannelType.DISCORD, authToken);
      
      return {
        success: true,
        token: credentials.webhookUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DISCORD_AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}