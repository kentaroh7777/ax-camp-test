import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { 
  GmailMessage,
  GmailListResponse,
  GmailMessagesRequest,
  GmailMessagesResponse,
  GmailSendRequest,
  GmailSendResponse,
  UnifiedGmailMessage,
  GmailTokenInfo,
  GmailOAuthToken
} from '../types/gmail.types.js';
import { ApiError } from '../types/api.types.js';

// Gmail API Error class
class GmailApiError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'GmailApiError';
  }
}

export class GmailApiService {
  private httpClient: AxiosInstance;
  private circuitBreaker: CircuitBreakerService;
  private tokenInfo: GmailTokenInfo | null = null;

  constructor() {
    this.httpClient = axios.create({
      baseURL: 'https://gmail.googleapis.com/gmail/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreaker = new CircuitBreakerService({
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
      volumeThreshold: 5,
    });

    // 環境変数からトークン情報を初期化
    this.initializeTokenInfo();
  }

  /**
   * 環境変数からGmail認証情報を初期化
   */
  private async initializeTokenInfo(): Promise<void> {
    try {
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;

      if (refreshToken && clientId && clientSecret) {
        // リフレッシュトークンを使用してアクセストークンを取得
        await this.refreshAccessToken(refreshToken, clientId, clientSecret);
        logger.info('Gmail API: Token initialized from environment variables');
      } else {
        logger.warn('Gmail API: Missing environment variables for token initialization');
      }
    } catch (error) {
      logger.error('Gmail API: Failed to initialize token:', error);
    }
  }

  /**
   * リフレッシュトークンを使用してアクセストークンを取得
   */
  private async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<void> {
    try {
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const tokenData: GmailOAuthToken = tokenResponse.data;
      
      this.tokenInfo = {
        accessToken: tokenData.access_token,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        clientId: clientId,
        clientSecret: clientSecret,
      };

      logger.info('Gmail API: Access token refreshed successfully');
    } catch (error) {
      logger.error('Gmail API: Failed to refresh access token:', error);
      throw new GmailApiError('Failed to refresh Gmail access token');
    }
  }

  /**
   * 有効なアクセストークンを取得
   */
  private async getValidAccessToken(): Promise<string> {
    if (!this.tokenInfo) {
      throw new GmailApiError('Gmail API: No token information available');
    }

    // トークンの有効期限をチェック（5分前にリフレッシュ）
    const now = new Date();
    const expiryBuffer = new Date(this.tokenInfo.expiresAt.getTime() - 5 * 60 * 1000);

    if (now >= expiryBuffer) {
      logger.info('Gmail API: Token expiring soon, refreshing...');
      await this.refreshAccessToken(
        this.tokenInfo.refreshToken,
        this.tokenInfo.clientId,
        this.tokenInfo.clientSecret
      );
    }

    return this.tokenInfo!.accessToken;
  }

  /**
   * Gmailメッセージ一覧を取得
   */
  async getMessages(params: GmailMessagesRequest): Promise<GmailMessagesResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      // クエリパラメータを構築
      const queryParams = new URLSearchParams({
        maxResults: (params.limit || 50).toString(),
      });

      if (params.unreadOnly) {
        queryParams.append('labelIds', 'UNREAD');
      }

      if (params.pageToken) {
        queryParams.append('pageToken', params.pageToken);
      }

      // メッセージリストを取得
      const listResponse = await this.httpClient.get(`/users/me/messages?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const messageList: GmailListResponse = listResponse.data;

      if (!messageList.messages || messageList.messages.length === 0) {
        return {
          success: true,
          data: {
            messages: [],
            hasMore: false,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // 各メッセージの詳細を並列取得
      const messagePromises = messageList.messages.map(msg => 
        this.httpClient.get(`/users/me/messages/${msg.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      const messageResponses = await Promise.all(messagePromises);
      const gmailMessages: GmailMessage[] = messageResponses.map(res => res.data);

      // 統一フォーマットに変換
      const unifiedMessages: UnifiedGmailMessage[] = gmailMessages.map(msg => 
        this.convertToUnifiedMessage(msg)
      );

      return {
        success: true,
        data: {
          messages: unifiedMessages,
          hasMore: !!messageList.nextPageToken,
          nextPageToken: messageList.nextPageToken,
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Gmail API: Failed to get messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Gmail messages',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * メール送信
   */
  async sendMessage(params: GmailSendRequest): Promise<GmailSendResponse> {
    try {
      const accessToken = await this.getValidAccessToken();

      // RFC 2822形式のメールメッセージを作成
      const emailContent = this.createEmailContent(params);
      const base64EncodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.httpClient.post('/users/me/messages/send', {
        raw: base64EncodedEmail,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        data: {
          messageId: response.data.id,
          threadId: response.data.threadId,
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Gmail API: Failed to send message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send Gmail message',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * GmailメッセージをUnifiedMessage形式に変換
   */
  private convertToUnifiedMessage(gmailMessage: GmailMessage): UnifiedGmailMessage {
    const headers = gmailMessage.payload.headers;
    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
    const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
    const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');

    // メール本文を抽出
    const content = this.extractEmailContent(gmailMessage);

    return {
      id: gmailMessage.id,
      from: fromHeader?.value || 'Unknown Sender',
      to: toHeader?.value || 'me',
      content: content,
      timestamp: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
      isUnread: gmailMessage.labelIds.includes('UNREAD'),
      channel: 'gmail',
      threadId: gmailMessage.threadId,
      raw: gmailMessage,
    };
  }

  /**
   * Gmailメッセージから本文を抽出
   */
  private extractEmailContent(message: GmailMessage): string {
    try {
      // シンプルなテキスト抽出
      if (message.payload.body?.data) {
        return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      }

      // マルチパートメッセージの場合
      if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      }

      // snippetをフォールバックとして使用
      return message.snippet || 'No content available';
    } catch (error) {
      logger.error('Gmail API: Failed to extract email content:', error);
      return 'No content available';
    }
  }

  /**
   * RFC 2822形式のメールコンテンツを作成
   */
  private createEmailContent(params: GmailSendRequest): string {
    const toList = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    const ccList = params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : '';
    const bccList = params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : '';

    let emailContent = `To: ${toList}\r\n`;
    if (ccList) emailContent += `Cc: ${ccList}\r\n`;
    if (bccList) emailContent += `Bcc: ${bccList}\r\n`;
    emailContent += `Subject: ${params.subject}\r\n`;
    emailContent += `Content-Type: ${params.isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"\r\n`;
    emailContent += `\r\n${params.content}`;

    return emailContent;
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.tokenInfo) {
        return {
          status: 'error',
          details: { message: 'No Gmail token configured' }
        };
      }

      // 簡単なAPI呼び出しでヘルスチェック
      const accessToken = await this.getValidAccessToken();
      await this.httpClient.get('/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        status: 'healthy',
        details: { 
          message: 'Gmail API connection successful',
          tokenExpiry: this.tokenInfo.expiresAt.toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { 
          message: 'Gmail API connection failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
} 