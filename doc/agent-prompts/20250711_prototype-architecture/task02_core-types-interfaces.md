# Task 2: Core型定義とインタフェース

## 概要
統一インタフェース、データモデル、共通型定義をタスク1で構築した基盤の上に実装する。全チャンネル（Gmail、Discord、LINE）で共通利用される型定義を構築し、後続のサービス層実装の基礎とする。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 7. 技術仕様 (7.1 統一インタフェース定義、7.2 データモデル)
- **参照行数**: Line 570-906

### 設計書詳細の具体的反映

#### 基本インタフェース（設計書Line 573-610から転記）
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

// 送信オプション
interface SendOptions {
  urgent?: boolean;     // 緊急フラグ
  silent?: boolean;     // 通知無効化
  formatting?: MessageFormat; // メッセージ形式
}

// メッセージ形式
enum MessageFormat {
  PLAIN_TEXT = 'plain',
  MARKDOWN = 'markdown',
  HTML = 'html'
}
```

#### 統一メッセージ型（設計書Line 611-645から転記）
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

// 添付ファイル
interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

// API結果型
interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: ApiError;
}

interface GetMessagesResult {
  success: boolean;
  messages: Message[];
  hasMore: boolean;
  nextToken?: string;
  error?: ApiError;
}

interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: ApiError;
}

// エラー型
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// チャンネル情報
interface ChannelInfo {
  type: ChannelType;
  name: string;
  isConnected: boolean;
  lastSync?: Date;
  rateLimits?: RateLimit;
}

interface RateLimit {
  requestsPerSecond: number;
  requestsPerHour: number;
  remaining: number;
  resetAt: Date;
}
```

#### Application Serviceインタフェース（設計書Line 646-707から転記）
```typescript
// 返信支援サービス
interface IReplyAssistantService {
  // 全チャンネル未読取得
  fetchAllUnreadMessages(): Promise<UnifiedInboxResult>;
  
  // AI返信案生成
  generateReply(context: ReplyContext): Promise<ReplyGenerationResult>;
  
  // 関連メッセージ取得
  getRelatedMessages(userId: string, originalMessage: Message): Promise<Message[]>;
}

// ユーザー紐づけサービス
interface IUserMappingService {
  // ユーザー紐づけ作成
  createMapping(mapping: UserMappingRequest): Promise<UserMapping>;
  
  // ユーザー紐づけ取得
  getMapping(userId: string): Promise<UserMapping | null>;
  
  // 自動紐づけ解決
  resolveUserMappings(messages: Message[]): Promise<ResolvedMessage[]>;
  
  // 紐づけ一覧取得
  getAllMappings(): Promise<UserMapping[]>;
}

// LLM統合サービス
interface ILLMIntegrationService {
  // 返信生成
  generateReply(prompt: string, context: any): Promise<string>;
  
  // プロンプト最適化
  optimizePrompt(context: ReplyContext): string;
  
  // 使用量取得
  getUsageStats(): Promise<LLMUsageStats>;
}

// 設定サービス
interface ISettingsService {
  // 設定取得
  getSettings(): Promise<AppSettings>;
  
  // 設定更新
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  
  // 設定リセット
  resetSettings(): Promise<void>;
}
```

#### Repositoryインタフェース（設計書Line 708-750から転記）
```typescript
// ストレージリポジトリ
interface IChromeStorageRepository {
  // データ保存
  save<T>(key: string, data: T): Promise<void>;
  
  // データ取得
  get<T>(key: string): Promise<T | null>;
  
  // データ削除
  remove(key: string): Promise<void>;
  
  // 全データ取得
  getAll(): Promise<Record<string, any>>;
  
  // データ存在確認
  exists(key: string): Promise<boolean>;
}

// 認証トークン管理
interface IAuthTokenManager {
  // トークン保存
  saveToken(channel: ChannelType, token: AuthToken): Promise<void>;
  
  // トークン取得
  getToken(channel: ChannelType): Promise<AuthToken | null>;
  
  // トークン削除
  removeToken(channel: ChannelType): Promise<void>;
  
  // トークン更新
  refreshToken(channel: ChannelType): Promise<AuthToken>;
  
  // 有効性確認
  validateToken(channel: ChannelType, token: AuthToken): Promise<boolean>;
}
```

#### 基本型定義（設計書Line 751-774から転記）
```typescript
enum ChannelType {
  GMAIL = 'gmail',
  DISCORD = 'discord',
  LINE = 'line'
}

enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived'
}

enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

#### ユーザー関連データモデル（設計書Line 775-820から転記）
```typescript
// ユーザー紐づけ情報
interface UserMapping {
  id: string; // UUID
  name: string; // 表示名
  channels: {
    [ChannelType.GMAIL]?: {
      email: string;
      userId: string;
      displayName?: string;
    };
    [ChannelType.DISCORD]?: {
      username: string;
      userId: string;
      discriminator?: string;
      guildId?: string;
      displayName?: string;
    };
    [ChannelType.LINE]?: {
      displayName: string;
      userId: string;
      pictureUrl?: string;
    };
  };
  avatar?: string; // 統一アバターURL
  priority: Priority; // ユーザー重要度
  tags: string[]; // カスタムタグ
  lastActivity: Date; // 最終活動日時
  isActive: boolean; // アクティブ状態
  createdAt: Date;
  updatedAt: Date;
}

// ユーザー紐づけ要求
interface UserMappingRequest {
  name: string;
  channels: Partial<UserMapping['channels']>;
  avatar?: string;
  priority?: Priority;
  tags?: string[];
}

// 解決済みメッセージ（ユーザー紐づけ適用後）
interface ResolvedMessage extends Message {
  resolvedUser?: UserMapping; // 紐づけ解決されたユーザー
  relatedMessages?: Message[]; // 関連メッセージ
  priority: Priority; // 計算された優先度
}
```

#### アプリケーション設定データモデル（設計書Line 821-890から転記）
```typescript
// アプリケーション設定
interface AppSettings {
  // 一般設定
  general: {
    language: string; // 言語設定
    theme: 'light' | 'dark' | 'auto'; // テーマ
    autoFetch: boolean; // 自動取得有効
    fetchInterval: number; // 取得間隔（分）
    maxMessageHistory: number; // 履歴保持件数
  };
  
  // 通知設定
  notifications: {
    enabled: boolean; // 通知有効
    sound: boolean; // 音声通知
    desktop: boolean; // デスクトップ通知
    priorities: Priority[]; // 通知対象優先度
  };
  
  // AI設定
  ai: {
    provider: 'openai' | 'anthropic' | 'google'; // プロバイダー
    model: string; // 使用モデル
    temperature: number; // 創造性パラメータ
    maxTokens: number; // 最大トークン数
    customPrompt?: string; // カスタムプロンプト
  };
  
  // チャンネル設定
  channels: {
    [ChannelType.GMAIL]: GmailSettings;
    [ChannelType.DISCORD]: DiscordSettings;
    [ChannelType.LINE]: LineSettings;
  };
  
  // UI設定
  ui: {
    compactMode: boolean; // コンパクト表示
    showAvatars: boolean; // アバター表示
    groupByUser: boolean; // ユーザー別グループ化
    defaultSortOrder: 'timestamp' | 'priority' | 'channel'; // デフォルトソート
  };
}

// チャンネル別設定
interface GmailSettings {
  enabled: boolean;
  labels?: string[]; // 対象ラベル
  excludeLabels?: string[]; // 除外ラベル
  maxResults: number; // 最大取得件数
}

interface DiscordSettings {
  enabled: boolean;
  webhookUrl?: string;
  guildIds?: string[]; // 対象サーバー
  channelIds?: string[]; // 対象チャンネル
}

interface LineSettings {
  enabled: boolean;
  channelAccessToken?: string;
  proxyUrl: string; // プロキシサーバーURL
}
```

#### ストレージキー定義（設計書Line 891-906から転記）
```typescript
// ストレージキー定数
const STORAGE_KEYS = {
  // 認証関連
  AUTH_TOKENS: 'auth_tokens',
  AUTH_STATE: 'auth_state',
  
  // ユーザーデータ
  USER_MAPPINGS: 'user_mappings',
  MESSAGE_HISTORY: 'message_history',
  
  // アプリケーション設定
  APP_SETTINGS: 'app_settings',
  UI_STATE: 'ui_state',
  
  // 統計・ログ
  USAGE_STATS: 'usage_stats',
  ERROR_LOG: 'error_log',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
```

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- 本実装の元となる設計書: `doc/design/prototype-architecture.md`
- **前提条件**: Task1 (プロジェクト基盤構築) - プロジェクト構造とTypeScript環境

### 前提条件
- **Task1完了**: プロジェクト基盤、TypeScript設定、ディレクトリ構造 - 型定義ファイルの配置に必要

### 成果物
- `shared/types/index.ts` - 共通型定義エクスポート
- `chrome-extension/src/types/core/message.types.ts` - メッセージ関連型
- `chrome-extension/src/types/core/channel.types.ts` - チャンネル関連型  
- `chrome-extension/src/types/core/user.types.ts` - ユーザー関連型
- `chrome-extension/src/types/core/api.types.ts` - API関連型
- `chrome-extension/src/types/services/reply-assistant.types.ts` - 返信支援型
- `chrome-extension/src/types/services/user-mapping.types.ts` - ユーザー紐づけ型
- `chrome-extension/src/types/services/llm.types.ts` - LLM関連型
- `chrome-extension/src/types/services/settings.types.ts` - 設定型
- `chrome-extension/src/types/infrastructure/storage.types.ts` - ストレージ型
- `chrome-extension/src/types/infrastructure/auth.types.ts` - 認証型
- `chrome-extension/src/types/infrastructure/error.types.ts` - エラー型

### テスト成果物【必須】
- **テストファイル**: `tests/unit/types/core-types.test.ts` - 型定義のテスト
- **型検証テスト**: TypeScript型レベルでの検証テスト

### 影響範囲
- 後続全タスクの基礎となる型定義（Service Layer、UI Layer全てに影響）

## 実装要件
### 【必須制約】TypeScript型安全性の完全確保
- **厳密な型定義**: 全インタフェースでoptional/requiredの明確化必須
- **型推論支援**: 適切なGenericと型ガードの実装
- **Enum使用**: 文字列リテラル型よりEnumを優先使用

### 技術仕様
```typescript
// 型安全性確保の例
interface TypeSafeInterface<T extends ChannelType> {
  channel: T;
  data: T extends ChannelType.GMAIL ? GmailData : 
        T extends ChannelType.DISCORD ? DiscordData : 
        T extends ChannelType.LINE ? LineData : never;
}

// 型ガード例
function isGmailMessage(message: Message): message is Message & { channel: ChannelType.GMAIL } {
  return message.channel === ChannelType.GMAIL;
}
```

### 設計パターン
**パターン**: 型中心設計（Type-Driven Design）
**理由**: 実装前に型を確定することで、実装時の型エラーを防止し、APIの一貫性を保証

## 実装ガイド【設計書詳細反映必須】

### ステップ1: 基本Enum・定数定義
**【設計書Line 751-774 対応】**
```typescript
// chrome-extension/src/types/core/channel.types.ts
export enum ChannelType {
  GMAIL = 'gmail',
  DISCORD = 'discord',
  LINE = 'line'
}

export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived'
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum MessageFormat {
  PLAIN_TEXT = 'plain',
  MARKDOWN = 'markdown',
  HTML = 'html'
}
```

### ステップ2: 基本インタフェース定義
**【設計書Line 573-610 対応】**
```typescript
// chrome-extension/src/types/core/api.types.ts
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

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: ApiError;
}

export interface GetMessagesResult {
  success: boolean;
  messages: Message[];
  hasMore: boolean;
  nextToken?: string;
  error?: ApiError;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: ApiError;
}
```

### ステップ3: サービス層インタフェース
**【設計書Line 646-750 対応】**
```typescript
// chrome-extension/src/types/services/reply-assistant.types.ts
export interface IReplyAssistantService {
  fetchAllUnreadMessages(): Promise<UnifiedInboxResult>;
  generateReply(context: ReplyContext): Promise<ReplyGenerationResult>;
  getRelatedMessages(userId: string, originalMessage: Message): Promise<Message[]>;
}

export interface IUserMappingService {
  createMapping(mapping: UserMappingRequest): Promise<UserMapping>;
  getMapping(userId: string): Promise<UserMapping | null>;
  resolveUserMappings(messages: Message[]): Promise<ResolvedMessage[]>;
  getAllMappings(): Promise<UserMapping[]>;
}

export interface ILLMIntegrationService {
  generateReply(prompt: string, context: any): Promise<string>;
  optimizePrompt(context: ReplyContext): string;
  getUsageStats(): Promise<LLMUsageStats>;
}

export interface ISettingsService {
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  resetSettings(): Promise<void>;
}
```

### ステップ4: Infrastructure層インタフェース
**【設計書Line 708-750 対応】**
```typescript
// chrome-extension/src/types/infrastructure/storage.types.ts
export interface IChromeStorageRepository {
  save<T>(key: string, data: T): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  getAll(): Promise<Record<string, any>>;
  exists(key: string): Promise<boolean>;
}

// chrome-extension/src/types/infrastructure/auth.types.ts
export interface IAuthTokenManager {
  saveToken(channel: ChannelType, token: AuthToken): Promise<void>;
  getToken(channel: ChannelType): Promise<AuthToken | null>;
  removeToken(channel: ChannelType): Promise<void>;
  refreshToken(channel: ChannelType): Promise<AuthToken>;
  validateToken(channel: ChannelType, token: AuthToken): Promise<boolean>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string[];
  tokenType: 'Bearer' | 'OAuth';
}
```

### テスト環境構築【全プロジェクト必須】

#### ステップA: 型定義テスト作成
```typescript
// tests/unit/types/core-types.test.ts
import { describe, it, expect } from 'vitest'
import { ChannelType, MessageStatus, Priority } from '@/types/core/channel.types'
import type { Message, SendMessageParams } from '@/types/core/message.types'

describe('Core型定義テスト', () => {
  it('ChannelType enumが正しく定義されている', () => {
    expect(ChannelType.GMAIL).toBe('gmail')
    expect(ChannelType.DISCORD).toBe('discord')
    expect(ChannelType.LINE).toBe('line')
  })

  it('Message型が適切な構造を持つ', () => {
    const message: Message = {
      id: 'test-id',
      from: 'test@example.com',
      to: 'recipient@example.com',
      content: 'test content',
      timestamp: new Date(),
      isUnread: true,
      channel: ChannelType.GMAIL
    }
    
    expect(message.channel).toBe(ChannelType.GMAIL)
    expect(typeof message.content).toBe('string')
  })

  it('SendMessageParamsが必須フィールドを持つ', () => {
    const params: SendMessageParams = {
      to: 'test@example.com',
      content: 'test message'
    }
    
    expect(params.to).toBeDefined()
    expect(params.content).toBeDefined()
  })
})
```

#### ステップB: 型検証ヘルパー作成
```typescript
// chrome-extension/src/types/utils/type-guards.ts
import type { Message, ResolvedMessage } from '@/types/core/message.types'
import { ChannelType } from '@/types/core/channel.types'

export function isGmailMessage(message: Message): message is Message & { channel: ChannelType.GMAIL } {
  return message.channel === ChannelType.GMAIL
}

export function isDiscordMessage(message: Message): message is Message & { channel: ChannelType.DISCORD } {
  return message.channel === ChannelType.DISCORD
}

export function isLineMessage(message: Message): message is Message & { channel: ChannelType.LINE } {
  return message.channel === ChannelType.LINE
}

export function isResolvedMessage(message: Message): message is ResolvedMessage {
  return 'priority' in message
}
```

#### ステップC: 共通型エクスポート設定
```typescript
// shared/types/index.ts
// Core types
export * from '../../chrome-extension/src/types/core/channel.types'
export * from '../../chrome-extension/src/types/core/message.types'
export * from '../../chrome-extension/src/types/core/user.types'
export * from '../../chrome-extension/src/types/core/api.types'

// Service types  
export * from '../../chrome-extension/src/types/services/reply-assistant.types'
export * from '../../chrome-extension/src/types/services/user-mapping.types'
export * from '../../chrome-extension/src/types/services/llm.types'
export * from '../../chrome-extension/src/types/services/settings.types'

// Infrastructure types
export * from '../../chrome-extension/src/types/infrastructure/storage.types'
export * from '../../chrome-extension/src/types/infrastructure/auth.types'
export * from '../../chrome-extension/src/types/infrastructure/error.types'

// Type guards
export * from '../../chrome-extension/src/types/utils/type-guards'
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] 全ての型定義が適切なファイルに配置されている
- [ ] 型の循環参照が発生していない
- [ ] 全てのEnumが適切に定義されている

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] 型レベルでのテストが全て通る
- [ ] ESLintエラー0件
- [ ] 既存テストが継続して通る
- [ ] 基本ルール（@test-debug-rule.mdc）準拠

### 設計書詳細反映検証【新規必須】
- [x] 設計書の具体的な型定義が完全に転記済み
- [x] 設計書のインタフェース定義が完全に反映済み
- [x] 設計書のEnum定義が具体的に記載済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み
- [x] 型の詳細仕様が設計書から完全反映済み

### 自動テスト検証【必須】
- [ ] `npm test` で型定義テスト実行可能
- [ ] 型ガード関数の動作テスト合格
- [ ] TypeScript型チェックでエラー0件
- [ ] 型安全性が保証されたインタフェース

### 統合検証
- [ ] 後続タスクで必要な型定義が全て準備済み
- [ ] sharedライブラリからの型エクスポート正常動作

## 実装例【設計書詳細反映版】
```typescript
// 完全な型定義実装例
// chrome-extension/src/types/core/message.types.ts
import { ChannelType, MessageStatus, MessageFormat } from './channel.types'

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  isUnread: boolean;
  channel: ChannelType;
  threadId?: string;
  replyToId?: string;
  attachments?: Attachment[];
  raw?: any;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

// 設計書Line 775-820の完全な実装
export interface UserMapping {
  id: string;
  name: string;
  channels: {
    [ChannelType.GMAIL]?: {
      email: string;
      userId: string;
      displayName?: string;
    };
    [ChannelType.DISCORD]?: {
      username: string;
      userId: string;
      discriminator?: string;
      guildId?: string;
      displayName?: string;
    };
    [ChannelType.LINE]?: {
      displayName: string;
      userId: string;
      pictureUrl?: string;
    };
  };
  avatar?: string;
  priority: Priority;
  tags: string[];
  lastActivity: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## 注意事項
### 【厳守事項】
- 全ての型定義は設計書の仕様に完全準拠すること
- optional/requiredの指定を設計書通りに正確に実装すること
- 型の循環参照を避けること
- 設計書詳細完全反映ルールを必ず遵守すること

### 【推奨事項】
- 型ガード関数の積極的活用
- Genericを活用した型安全性の向上
- 適切なnamespace使用による型の整理

### 【禁止事項】
- anyの濫用
- 型定義の勝手な変更・追加
- 設計書詳細を「参照」のみで済ませる曖昧な指示

## 参考情報
- 設計書: `doc/design/prototype-architecture.md` 7章技術仕様
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Task1で構築したプロジェクト基盤構造 