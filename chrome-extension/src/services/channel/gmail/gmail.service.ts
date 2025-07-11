// Gmail Service implementation
// Based on design document Gmail API integration

import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams, SendMessageResult, GetMessagesResult, AuthResult } from '../../../types/core/message.types';
import { ChannelType } from '../../../types/core/channel.types';
import { Message } from '../../../types/core/message.types';
import { IAuthTokenManager } from '../../../types/infrastructure/auth.types';

export class GmailService extends BaseMessageClient {
  private readonly baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  
  constructor(authTokenManager: IAuthTokenManager) {
    super(authTokenManager, ChannelType.GMAIL);
  }
  
  protected getChannelName(): string {
    return 'Gmail';
  }
  
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const token = await this.getValidToken();
      
      // Create Gmail API message format
      const emailContent = this.createEmailContent(params);
      
      const response = await fetch(`${this.baseUrl}/users/me/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GMAIL_SEND_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async getMessages(params: GetMessagesParams): Promise<GetMessagesResult> {
    try {
      const token = await this.getValidToken();
      
      // Build Gmail API query parameters
      const queryParams = new URLSearchParams({
        maxResults: (params.limit || 50).toString(),
      });
      
      if (params.unreadOnly) {
        queryParams.append('labelIds', 'UNREAD');
      }
      
      const response = await fetch(`${this.baseUrl}/users/me/messages?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const messages: Message[] = [];
      
      // Fetch message details in parallel
      if (result.messages) {
        const messageDetails = await Promise.all(
          result.messages.map((msg: any) => this.getMessageDetail(msg.id, token))
        );
        
        messages.push(...messageDetails.filter(msg => msg !== null));
      }
      
      return {
        success: true,
        messages,
        hasMore: !!result.nextPageToken,
        nextToken: result.nextPageToken,
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        hasMore: false,
        error: {
          code: 'GMAIL_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async authenticate(credentials?: any): Promise<AuthResult> {
    try {
      // Use Chrome Identity API for OAuth 2.0 authentication
      const authUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${process.env.GMAIL_CLIENT_ID}&` +
        `response_type=code&` +
        `scope=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send&` +
        `redirect_uri=${chrome.identity.getRedirectURL()}`;
      
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });
      
      if (!responseUrl) {
        throw new Error('Authentication was cancelled or failed');
      }
      
      // Extract authorization code
      const urlParams = new URL(responseUrl).searchParams;
      const code = urlParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code received');
      }
      
      // Get access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: chrome.identity.getRedirectURL(),
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      // Save token
      const authToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope?.split(' ') || [],
        tokenType: 'Bearer' as const,
      };
      
      await this.authTokenManager.saveToken(ChannelType.GMAIL, authToken);
      
      return {
        success: true,
        token: tokenData.access_token,
        expiresAt: authToken.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GMAIL_AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  private createEmailContent(params: SendMessageParams): string {
    const subject = (params.options as any)?.subject || 'Reply from Multi-Channel Assistant';
    const to = params.to;
    const content = params.content;
    
    return [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      '',
      content,
    ].join('\n');
  }
  
  private async getMessageDetail(messageId: string, token: string): Promise<Message | null> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/messages/${messageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const messageData = await response.json();
      
      // Convert Gmail API response to unified Message format
      return this.convertGmailToMessage(messageData);
    } catch {
      return null;
    }
  }
  
  private convertGmailToMessage(gmailMessage: any): Message {
    const headers = gmailMessage.payload?.headers || [];
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
    const subjectHeader = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';
    
    return {
      id: gmailMessage.id,
      from: fromHeader,
      to: 'me',
      content: this.extractEmailContent(gmailMessage.payload),
      timestamp: new Date(dateHeader || gmailMessage.internalDate),
      isUnread: gmailMessage.labelIds?.includes('UNREAD') || false,
      channel: ChannelType.GMAIL,
      threadId: gmailMessage.threadId,
      raw: gmailMessage,
    };
  }
  
  private extractEmailContent(payload: any): string {
    if (payload.body?.data) {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      }
    }
    
    return 'No content available';
  }
}