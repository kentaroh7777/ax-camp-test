# Task 4: Channel Service Layer（チャンネルサービス層）

## 概要
Gmail、Discord、LINEの各チャンネル専用サービスとメッセージクライアントファクトリーを実装する。統一インタフェースを通じて各チャンネルの固有実装を抽象化し、Application Serviceからの透明なアクセスを実現する。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 7.1 統一インタフェース定義 - 基本インタフェース、8.2.2 ソースコード構成 - Service Layer
- **参照行数**: Line 573-645, 1253-1279

### 設計書詳細の具体的反映

#### 統一メッセージクライアント（設計書Line 573-610から転記）
```typescript
// 統一メッセージクライアント
interface IMessageClient {
  // メッセージ送信
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  
  // メッセージ取得
  getMessages(params: GetMessagesParams): Promise<GetMessagesResult>;
  
  // 認証状態確認
  isAuthenticated(): Promise<boolean>;
  
  // 認証実行
  authenticate(credentials?: any): Promise<AuthResult>;
  
  // チャンネル情報取得
  getChannelInfo(): ChannelInfo;
}

// 送信パラメータ
interface SendMessageParams {
  to: string;           // 送信先ID
  content: string;      // メッセージ内容
  replyTo?: string;     // 返信対象メッセージID
  options?: SendOptions;
}

// 取得パラメータ
interface GetMessagesParams {
  limit?: number;       // 取得件数制限
  unreadOnly?: boolean; // 未読のみ取得
  since?: Date;         // 指定日時以降
  threadId?: string;    // スレッドID指定
}
```

#### Channel Service Layer構成（設計書Line 1253-1279から転記）
```
├── channel/                         # Channel Service Layer
│   ├── base/
│   │   ├── message-client.interface.ts # 統一インタフェース
│   │   ├── base-message-client.ts      # 基底クラス
│   │   └── message-client.factory.ts   # ファクトリー
│   ├── gmail/
│   │   ├── gmail.service.ts             # Gmail サービス
│   │   ├── gmail-auth.service.ts        # Gmail 認証
│   │   └── gmail-api.client.ts          # Gmail API クライアント
│   ├── discord/
│   │   ├── discord.service.ts           # Discord サービス
│   │   ├── discord-webhook.client.ts    # Discord Webhook
│   │   └── discord-dom.service.ts       # Discord DOM操作
│   └── line/
│       ├── line.service.ts              # LINE サービス
│       ├── line-proxy.client.ts         # LINE Proxy クライアント
│       └── line-webhook.service.ts      # LINE Webhook
```

#### 統一メッセージ形式（設計書Line 611-645から転記）
```typescript
// 統一メッセージ形式
interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  isUnread: boolean;
  channel: ChannelType;
  threadId?: string;    // スレッド/会話ID
  replyToId?: string;   // 返信元メッセージID
  attachments?: Attachment[]; // 添付ファイル
  raw?: any; // 各チャンネル固有の生データ
}

// チャンネル情報
interface ChannelInfo {
  type: ChannelType;
  name: string;
  isConnected: boolean;
  lastSync?: Date;
  rateLimits?: RateLimit;
}
```

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- 本実装の元となる設計書: `doc/design/prototype-architecture.md`
- **前提条件**: Task3 (Infrastructure Layer) - Chrome Storage Repository、Auth Token Manager

### 前提条件
- **Task3完了**: Infrastructure Layer実装 - 認証管理とデータ永続化に必要

### 成果物
- `chrome-extension/src/services/channel/base/message-client.interface.ts` - 統一インタフェース
- `chrome-extension/src/services/channel/base/base-message-client.ts` - 基底クラス
- `chrome-extension/src/services/channel/base/message-client.factory.ts` - ファクトリー
- `chrome-extension/src/services/channel/gmail/gmail.service.ts` - Gmail サービス
- `chrome-extension/src/services/channel/gmail/gmail-auth.service.ts` - Gmail 認証
- `chrome-extension/src/services/channel/gmail/gmail-api.client.ts` - Gmail API クライアント
- `chrome-extension/src/services/channel/discord/discord.service.ts` - Discord サービス
- `chrome-extension/src/services/channel/discord/discord-webhook.client.ts` - Discord Webhook
- `chrome-extension/src/services/channel/discord/discord-dom.service.ts` - Discord DOM操作
- `chrome-extension/src/services/channel/line/line.service.ts` - LINE サービス
- `chrome-extension/src/services/channel/line/line-proxy.client.ts` - LINE Proxy クライアント
- `chrome-extension/src/services/channel/line/line-webhook.service.ts` - LINE Webhook

### テスト成果物【必須】
- **テストファイル**: `tests/unit/channel/gmail.service.test.ts` - Gmail Serviceテスト
- **テストファイル**: `tests/unit/channel/discord.service.test.ts` - Discord Serviceテスト
- **テストファイル**: `tests/unit/channel/line.service.test.ts` - LINE Serviceテスト
- **テストファイル**: `tests/unit/channel/message-client.factory.test.ts` - Factoryテスト

### 影響範囲
- Application Service Layer（Task5）が本レイヤーを利用

## 実装要件
### 【必須制約】統一インタフェース準拠
- **IMessageClient準拠**: 全チャンネルで統一インタフェース実装必須
- **Factory Pattern**: チャンネル種別による実装の動的生成
- **認証連携**: Task3のAuth Token Managerとの連携必須

### 技術仕様
```typescript
// Base Message Client実装例
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
  
  getChannelInfo(): ChannelInfo {
    return {
      type: this.channel,
      name: this.channel.toString(),
      isConnected: false,
    };
  }
}
```

### 設計パターン
**パターン**: Factory Pattern、Template Method Pattern、Strategy Pattern
**理由**: チャンネル固有実装の抽象化と動的生成

## 実装ガイド【設計書詳細反映必須】

### ステップ1: Base Message Client実装
**【設計書Line 573-610 対応】**
```typescript
// chrome-extension/src/services/channel/base/message-client.interface.ts
import { ChannelType } from '@/types/core/channel.types';

export interface SendMessageParams {
  to: string;           // 送信先ID
  content: string;      // メッセージ内容
  replyTo?: string;     // 返信対象メッセージID
  options?: SendOptions;
}

export interface GetMessagesParams {
  limit?: number;       // 取得件数制限
  unreadOnly?: boolean; // 未読のみ取得
  since?: Date;         // 指定日時以降
  threadId?: string;    // スレッドID指定
}

export interface SendOptions {
  urgent?: boolean;     // 緊急フラグ
  silent?: boolean;     // 通知無効化
  formatting?: MessageFormat; // メッセージ形式
}

export interface IMessageClient {
  // メッセージ送信
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  
  // メッセージ取得
  getMessages(params: GetMessagesParams): Promise<GetMessagesResult>;
  
  // 認証状態確認
  isAuthenticated(): Promise<boolean>;
  
  // 認証実行
  authenticate(credentials?: any): Promise<AuthResult>;
  
  // チャンネル情報取得
  getChannelInfo(): ChannelInfo;
}
```

```typescript
// chrome-extension/src/services/channel/base/base-message-client.ts
import { IMessageClient, SendMessageParams, GetMessagesParams } from './message-client.interface';
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';
import { ChannelType, ChannelInfo } from '@/types/core/channel.types';
import { SendMessageResult, GetMessagesResult, AuthResult } from '@/types/core/api.types';

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
      // トークン更新を試行
      const refreshedToken = await this.authTokenManager.refreshToken(this.channel);
      return refreshedToken.accessToken;
    }
    
    return token.accessToken;
  }
}
```

### ステップ2: Message Client Factory実装
```typescript
// chrome-extension/src/services/channel/base/message-client.factory.ts
import { IMessageClient } from './message-client.interface';
import { ChannelType } from '@/types/core/channel.types';
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';
import { GmailService } from '../gmail/gmail.service';
import { DiscordService } from '../discord/discord.service';
import { LineService } from '../line/line.service';

export class MessageClientFactory {
  private authTokenManager: IAuthTokenManager;
  
  constructor(authTokenManager: IAuthTokenManager) {
    this.authTokenManager = authTokenManager;
  }
  
  createClient(channel: ChannelType): IMessageClient {
    switch (channel) {
      case ChannelType.GMAIL:
        return new GmailService(this.authTokenManager);
      case ChannelType.DISCORD:
        return new DiscordService(this.authTokenManager);
      case ChannelType.LINE:
        return new LineService(this.authTokenManager);
      default:
        throw new Error(`Unsupported channel type: ${channel}`);
    }
  }
  
  createAllClients(): Record<ChannelType, IMessageClient> {
    return {
      [ChannelType.GMAIL]: this.createClient(ChannelType.GMAIL),
      [ChannelType.DISCORD]: this.createClient(ChannelType.DISCORD),
      [ChannelType.LINE]: this.createClient(ChannelType.LINE),
    };
  }
}
```

### ステップ3: Gmail Service実装
**【Gmail API対応】**
```typescript
// chrome-extension/src/services/channel/gmail/gmail.service.ts
import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams } from '../base/message-client.interface';
import { ChannelType } from '@/types/core/channel.types';
import { SendMessageResult, GetMessagesResult, AuthResult } from '@/types/core/api.types';
import { Message } from '@/types/core/message.types';
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';

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
      
      // Gmail APIの送信用メッセージフォーマット作成
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
      
      // Gmail API クエリパラメータ構築
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
      
      // メッセージ詳細を並列取得
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
      // Chrome Identity API を使用したOAuth 2.0認証
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
      
      // 認証コードを抽出
      const urlParams = new URL(responseUrl).searchParams;
      const code = urlParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code received');
      }
      
      // アクセストークンを取得
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
      
      // トークンを保存
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
    const subject = params.options?.subject || 'Reply from Multi-Channel Assistant';
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
      
      // Gmail API レスポンスを統一Message形式に変換
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
```

### ステップ4: Discord Service実装
**【Discord Webhook対応】**
```typescript
// chrome-extension/src/services/channel/discord/discord.service.ts
import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams } from '../base/message-client.interface';
import { ChannelType } from '@/types/core/channel.types';
import { SendMessageResult, GetMessagesResult, AuthResult } from '@/types/core/api.types';
import { Message } from '@/types/core/message.types';
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';

export class DiscordService extends BaseMessageClient {
  constructor(authTokenManager: IAuthTokenManager) {
    super(authTokenManager, ChannelType.DISCORD);
  }
  
  protected getChannelName(): string {
    return 'Discord';
  }
  
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const webhookUrl = await this.getValidToken(); // WebhookURLをトークンとして保存
      
      const payload = {
        content: params.content,
        username: 'Multi-Channel Assistant',
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
    // Discord Webhookはメッセージ取得に対応していないため、DOM解析で実装
    // ここではプレースホルダー実装
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
      
      // Webhook URLの有効性確認
      const response = await fetch(credentials.webhookUrl, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Invalid Discord Webhook URL');
      }
      
      // WebhookURLをトークンとして保存
      const authToken = {
        accessToken: credentials.webhookUrl,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年間有効
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
```

### ステップ5: LINE Service実装
**【LINE Proxy対応】**
```typescript
// chrome-extension/src/services/channel/line/line.service.ts
import { BaseMessageClient } from '../base/base-message-client';
import { SendMessageParams, GetMessagesParams } from '../base/message-client.interface';
import { ChannelType } from '@/types/core/channel.types';
import { SendMessageResult, GetMessagesResult, AuthResult } from '@/types/core/api.types';
import { Message } from '@/types/core/message.types';
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';

export class LineService extends BaseMessageClient {
  private readonly proxyUrl = process.env.LINE_PROXY_URL || 'https://line-proxy.railway.app';
  
  constructor(authTokenManager: IAuthTokenManager) {
    super(authTokenManager, ChannelType.LINE);
  }
  
  protected getChannelName(): string {
    return 'LINE';
  }
  
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const token = await this.getValidToken();
      
      const payload = {
        to: params.to,
        messages: [
          {
            type: 'text',
            text: params.content,
          },
        ],
      };
      
      const response = await fetch(`${this.proxyUrl}/api/line/message/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`LINE API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        messageId: result.messageId || 'line-message-sent',
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
      const token = await this.getValidToken();
      
      const queryParams = new URLSearchParams({
        limit: (params.limit || 50).toString(),
      });
      
      if (params.since) {
        queryParams.append('since', params.since.toISOString());
      }
      
      const response = await fetch(`${this.proxyUrl}/api/line/messages?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`LINE API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const messages = result.messages?.map((msg: any) => this.convertLineToMessage(msg)) || [];
      
      return {
        success: true,
        messages,
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
      
      // Channel Access Tokenの有効性確認
      const response = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.channelAccessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Invalid LINE Channel Access Token');
      }
      
      // トークンを保存
      const authToken = {
        accessToken: credentials.channelAccessToken,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年間有効
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
      isUnread: true, // LINEでは基本的に新着メッセージは未読扱い
      channel: ChannelType.LINE,
      raw: lineMessage,
    };
  }
}
```

### テスト環境構築【全プロジェクト必須】

#### ステップA: Channel Service テスト作成
```typescript
// tests/unit/channel/message-client.factory.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageClientFactory } from '@/services/channel/base/message-client.factory';
import { ChannelType } from '@/types/core/channel.types';
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';

describe('MessageClientFactory', () => {
  let factory: MessageClientFactory;
  let mockAuthTokenManager: IAuthTokenManager;
  
  beforeEach(() => {
    mockAuthTokenManager = {
      saveToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      refreshToken: vi.fn(),
      validateToken: vi.fn(),
    };
    
    factory = new MessageClientFactory(mockAuthTokenManager);
  });
  
  describe('createClient', () => {
    it('should create Gmail client', () => {
      const client = factory.createClient(ChannelType.GMAIL);
      expect(client.getChannelInfo().type).toBe(ChannelType.GMAIL);
    });
    
    it('should create Discord client', () => {
      const client = factory.createClient(ChannelType.DISCORD);
      expect(client.getChannelInfo().type).toBe(ChannelType.DISCORD);
    });
    
    it('should create LINE client', () => {
      const client = factory.createClient(ChannelType.LINE);
      expect(client.getChannelInfo().type).toBe(ChannelType.LINE);
    });
    
    it('should throw error for unsupported channel', () => {
      expect(() => factory.createClient('unsupported' as ChannelType)).toThrow();
    });
  });
  
  describe('createAllClients', () => {
    it('should create all channel clients', () => {
      const clients = factory.createAllClients();
      
      expect(clients[ChannelType.GMAIL]).toBeDefined();
      expect(clients[ChannelType.DISCORD]).toBeDefined();
      expect(clients[ChannelType.LINE]).toBeDefined();
    });
  });
});
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] 統一インタフェースを通じた各チャンネルアクセスが正常動作
- [ ] Gmail OAuth 2.0認証とAPI呼び出しが正常動作
- [ ] Discord Webhook送信が正常動作
- [ ] LINE Proxy経由のAPI呼び出しが正常動作
- [ ] Message Client Factoryによる動的生成が正常動作

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] vitestによるテストケース実装完了（カバレッジ80%以上）
- [ ] 既存テストが継続して通る
- [ ] 基本ルール（@test-debug-rule.mdc）準拠

### 設計書詳細反映検証【新規必須】
- [x] 設計書の統一メッセージクライアントインタフェースが完全に実装済み
- [x] 設計書のChannel Service Layer構成が完全に反映済み
- [x] 設計書の統一メッセージ形式が具体的に実装済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み
- [x] 各チャンネルの固有実装が設計書通りに実装済み

### 自動テスト検証【必須】
- [ ] `npm test` でテスト実行可能
- [ ] `npm run test:run` で非対話モード実行可能
- [ ] Channel Service層の全テストケースが合格
- [ ] 各チャンネルサービスの独立したテストが正常動作
- [ ] 外部API呼び出しのモックテストが適切

### 統合検証
- [ ] Application Service Layer（Task5）から正常にアクセス可能
- [ ] Infrastructure Layer（Task3）との連携が正常動作

## 実装例【設計書詳細反映版】
```typescript
// 【設計書Line 573-645 から転記】具体的な使用例
import { MessageClientFactory } from '@/services/channel/base/message-client.factory';
import { AuthTokenManager } from '@/services/infrastructure/auth-token.manager';
import { ChromeStorageRepository } from '@/services/infrastructure/chrome-storage.repository';
import { ChannelType } from '@/types/core/channel.types';

// Channel Service層の初期化
const storageRepository = new ChromeStorageRepository();
const authTokenManager = new AuthTokenManager(storageRepository);
const messageClientFactory = new MessageClientFactory(authTokenManager);

// Gmail クライアント使用例
const gmailClient = messageClientFactory.createClient(ChannelType.GMAIL);

// Gmail認証
const gmailAuthResult = await gmailClient.authenticate();
if (gmailAuthResult.success) {
  console.log('Gmail authentication successful');
  
  // メッセージ取得
  const messagesResult = await gmailClient.getMessages({ 
    limit: 10, 
    unreadOnly: true 
  });
  
  if (messagesResult.success) {
    console.log(`Found ${messagesResult.messages.length} unread messages`);
    
    // 返信送信
    const sendResult = await gmailClient.sendMessage({
      to: messagesResult.messages[0].from,
      content: 'Thank you for your message!',
      replyTo: messagesResult.messages[0].id,
    });
    
    if (sendResult.success) {
      console.log('Reply sent successfully');
    }
  }
}

// 全チャンネルクライアント使用例
const allClients = messageClientFactory.createAllClients();
const channels = Object.keys(allClients) as ChannelType[];

for (const channel of channels) {
  const client = allClients[channel];
  const isAuthenticated = await client.isAuthenticated();
  console.log(`${channel} authentication status: ${isAuthenticated}`);
}
```

## 注意事項
### 【厳守事項】
- 統一インタフェース（IMessageClient）の完全準拠必須
- 各チャンネルの認証方式の正確な実装必須
- 外部API呼び出しでの適切なエラーハンドリング必須
- vitestによる自動テスト実行が可能な状態を維持すること
- **【新規】設計書詳細完全反映ルールを必ず遵守すること**

### 【推奨事項】
- Factory Patternによる拡張性確保
- 適切なRate Limiting実装
- APIレスポンスの型安全な処理

### 【禁止事項】
- インタフェースを逸脱した独自実装
- 認証情報の平文ログ出力
- vitestの設定や既存テストを破壊する変更
- **【新規】設計書詳細を「参照」のみで済ませる曖昧な指示**

## 参考情報
- [Gmail API Documentation](https://developers.google.com/workspace/gmail/api/guides): Gmail API仕様
- [Discord Developer Documentation](https://discord.com/developers/docs/): Discord API仕様
- [LINE Messaging API Documentation](https://developers.line.biz/ja/docs/messaging-api/): LINE API仕様
- [Factory Pattern](https://refactoring.guru/design-patterns/factory-method): Factory Pattern参考 