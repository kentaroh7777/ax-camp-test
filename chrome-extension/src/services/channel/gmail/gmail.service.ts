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
      // 非Chrome拡張機能環境での認証（テスト・結合テスト用）
      if (typeof chrome === 'undefined' || !chrome.identity) {
        return this.authenticateNonExtension(credentials);
      }

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

  /**
   * 非Chrome拡張機能環境での認証（テスト・結合テスト用）
   * @param credentials - 認証情報（アクセストークンまたはリフレッシュトークン）
   */
  private async authenticateNonExtension(credentials?: any): Promise<AuthResult> {
    try {
      // 直接アクセストークンが提供された場合
      if (credentials?.accessToken) {
        const authToken = {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt || new Date(Date.now() + 3600 * 1000),
          scope: credentials.scope || ['https://www.googleapis.com/auth/gmail.readonly'],
          tokenType: 'Bearer' as const,
        };

        await this.authTokenManager.saveToken(ChannelType.GMAIL, authToken);
        
        return {
          success: true,
          token: authToken.accessToken,
          expiresAt: authToken.expiresAt,
        };
      }

      // .env.localから設定を読み込んでリフレッシュトークンフローを実行
      if (credentials?.refreshToken || process.env.GMAIL_REFRESH_TOKEN) {
        const refreshToken = credentials?.refreshToken || process.env.GMAIL_REFRESH_TOKEN;
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: process.env.GMAIL_CLIENT_ID!,
            client_secret: process.env.GMAIL_CLIENT_SECRET!,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
        }

        const tokenData = await tokenResponse.json();

        const authToken = {
          accessToken: tokenData.access_token,
          refreshToken: refreshToken,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          scope: tokenData.scope?.split(' ') || ['https://www.googleapis.com/auth/gmail.readonly'],
          tokenType: 'Bearer' as const,
        };

        await this.authTokenManager.saveToken(ChannelType.GMAIL, authToken);

        return {
          success: true,
          token: authToken.accessToken,
          expiresAt: authToken.expiresAt,
        };
      }

      throw new Error('非Chrome拡張機能環境では、accessTokenまたはrefreshTokenが必要です。');
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GMAIL_AUTH_NON_EXTENSION_ERROR',
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
    let contentPart: any = null;
    let mimeType = '';

    // Recursively find the most suitable content part, preferring text/plain.
    const findPart = (parts: any[]) => {
      if (!parts) return;
      for (const part of parts) {
        if (part.mimeType === 'text/plain') {
          contentPart = part;
          mimeType = 'text/plain';
          return; // Found plain text, stop searching.
        }
        if (part.mimeType === 'text/html' && !contentPart) {
          contentPart = part;
          mimeType = 'text/html';
        }
        if (part.parts) {
          findPart(part.parts);
          if (mimeType === 'text/plain') return;
        }
      }
    };

    findPart(payload.parts || [payload]);

    if (!contentPart && payload.body?.data) {
        contentPart = payload;
        mimeType = payload.mimeType || 'text/plain';
    }

    if (contentPart && contentPart.body?.data) {
      const bodyData = contentPart.body.data.replace(/-/g, '+').replace(/_/g, '/');
      const contentTypeHeader = contentPart.headers?.find(
        (h: any) => h.name.toLowerCase() === 'content-type'
      )?.value || 'text/plain; charset=utf-8';
      
      const match = contentTypeHeader.match(/charset="?([^"]*)"?/i);
      const charset = match ? match[1].toLowerCase() : 'utf-8';
      
      try {
        // Cross-platform Base64 to Uint8Array decoding
        const binaryString = atob(bodyData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const decoder = new TextDecoder(charset, { fatal: false });
        let text = decoder.decode(bytes);
        
        if (mimeType === 'text/html') {
          text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          text = text.replace(/<[^>]+>/g, ' ');
          text = text.replace(/\s+/g, ' ').trim();
        }
        return text;
      } catch (e) {
        console.error(`Error decoding email content with charset ${charset}:`, e);
        return atob(bodyData);
      }
    }

    return 'No content available';
  }
}