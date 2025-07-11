// Discord Service implementation
// Based on design document Discord Webhook integration

import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams, SendMessageResult, GetMessagesResult, AuthResult } from '../../../types/core/message.types';
import { ChannelType } from '../../../types/core/channel.types';
import { Message } from '../../../types/core/message.types';
import { IAuthTokenManager } from '../../../types/infrastructure/auth.types';

export class DiscordService extends BaseMessageClient {
  constructor(authTokenManager: IAuthTokenManager) {
    super(authTokenManager, ChannelType.DISCORD);
  }
  
  protected getChannelName(): string {
    return 'Discord';
  }
  
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const webhookUrl = await this.getValidToken(); // Webhook URL is stored as token
      
      const payload = {
        content: params.content,
        username: 'Multi-Channel Assistant',
        avatar_url: undefined, // Can be set in the future
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Discord Webhook error: ${response.status} ${response.statusText}`);
      }
      
      return {
        success: true,
        messageId: 'discord-webhook-sent',
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
    // Discord Webhooks do not support message retrieval
    // This would require DOM scraping or Discord Bot API implementation
    // For now, return empty result as placeholder
    return {
      success: true,
      messages: [],
      hasMore: false,
    };
  }
  
  async authenticate(credentials?: { webhookUrl: string }): Promise<AuthResult> {
    try {
      if (!credentials?.webhookUrl) {
        throw new Error('Discord Webhook URL is required');
      }
      
      // Validate webhook URL
      const response = await fetch(credentials.webhookUrl, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Invalid Discord Webhook URL');
      }
      
      // Store webhook URL as token
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