# Task 3: Infrastructure Layer（インフラストラクチャ層）

## 概要
Chrome Storage Repository、Auth Token Manager、Error Handlerなどのインフラストラクチャ層を実装する。Chrome拡張機能のデータ永続化、認証管理、エラーハンドリングの基盤を構築する。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 7.1 統一インタフェース定義 - Repository インタフェース、7.2 データモデル - 認証関連データモデル
- **参照行数**: Line 708-774, 891-906

### 設計書詳細の具体的反映

#### Repository インタフェース（設計書Line 708-750から転記）
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

#### 認証関連データモデル（設計書Line 860-889から転記）
```typescript
// 認証トークン
interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string[];
  tokenType: 'Bearer' | 'OAuth';
}

// 認証状態
interface AuthState {
  channel: ChannelType;
  isAuthenticated: boolean;
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  lastAuth: Date;
  expiresAt?: Date;
}
```

#### ストレージキー定義（設計書Line 923-948から転記）
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

#### Infrastructure Service構成（設計書Line 1247-1252から転記）
```
└── infrastructure/                  # Infrastructure Layer
    ├── chrome-storage.repository.ts  # Chrome Storage Repository
    ├── auth-token.manager.ts          # 認証トークン管理
    ├── error-handler.service.ts       # エラーハンドリング
    └── background-tasks.manager.ts    # バックグラウンドタスク
```

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- 本実装の元となる設計書: `doc/design/prototype-architecture.md`
- **前提条件**: Task2 (Core型定義とインタフェース) - 基本型定義とインタフェース

### 前提条件
- **Task2完了**: Core型定義、基本インタフェース、ストレージキー定義 - Infrastructure層で使用する型定義に必要

### 成果物
- `chrome-extension/src/services/infrastructure/chrome-storage.repository.ts` - Chrome Storage Repository実装
- `chrome-extension/src/services/infrastructure/auth-token.manager.ts` - 認証トークン管理実装
- `chrome-extension/src/services/infrastructure/error-handler.service.ts` - エラーハンドリング実装
- `chrome-extension/src/services/infrastructure/background-tasks.manager.ts` - バックグラウンドタスク管理
- `chrome-extension/src/types/infrastructure/storage.types.ts` - ストレージ関連型定義
- `chrome-extension/src/types/infrastructure/auth.types.ts` - 認証関連型定義
- `chrome-extension/src/types/infrastructure/error.types.ts` - エラー関連型定義

### テスト成果物【必須】
- **テストファイル**: `tests/unit/infrastructure/chrome-storage.test.ts` - Chrome Storage Repositoryテスト
- **テストファイル**: `tests/unit/infrastructure/auth-token.test.ts` - Auth Token Managerテスト
- **テストファイル**: `tests/unit/infrastructure/error-handler.test.ts` - Error Handlerテスト

### 影響範囲
- 後続のService Layer、UI Layer全てに影響（データアクセス・認証・エラー処理の基盤）

## 実装要件
### 【必須制約】Chrome拡張機能API準拠
- **chrome.storage.local API**: Chrome拡張機能標準のストレージAPI使用必須
- **非同期処理**: 全てPromiseベースの非同期実装
- **型安全性**: TypeScript厳密型チェック対応

### 技術仕様
```typescript
// Chrome Storage Repository実装例
export class ChromeStorageRepository implements IChromeStorageRepository {
  async save<T>(key: string, data: T): Promise<void> {
    await chrome.storage.local.set({ [key]: data });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  }
}

// 認証トークン管理実装例
export class AuthTokenManager implements IAuthTokenManager {
  private readonly storageRepository: IChromeStorageRepository;
  
  constructor(storageRepository: IChromeStorageRepository) {
    this.storageRepository = storageRepository;
  }
  
  async saveToken(channel: ChannelType, token: AuthToken): Promise<void> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    tokens[channel] = token;
    await this.storageRepository.save(STORAGE_KEYS.AUTH_TOKENS, tokens);
  }
}
```

### 設計パターン
**パターン**: Repository Pattern、Dependency Injection
**理由**: データアクセス層の抽象化とテスタビリティ向上

## 実装ガイド【設計書詳細反映必須】

### ステップ1: Chrome Storage Repository実装
**【設計書Line 708-730 対応】**
```typescript
// chrome-extension/src/services/infrastructure/chrome-storage.repository.ts
import { IChromeStorageRepository } from '@/types/infrastructure/storage.types';

export class ChromeStorageRepository implements IChromeStorageRepository {
  /**
   * データ保存
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      throw new Error(`Failed to save data for key "${key}": ${error}`);
    }
  }
  
  /**
   * データ取得
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      throw new Error(`Failed to get data for key "${key}": ${error}`);
    }
  }
  
  /**
   * データ削除
   */
  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([key]);
    } catch (error) {
      throw new Error(`Failed to remove data for key "${key}": ${error}`);
    }
  }
  
  /**
   * 全データ取得
   */
  async getAll(): Promise<Record<string, any>> {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      throw new Error(`Failed to get all data: ${error}`);
    }
  }
  
  /**
   * データ存在確認
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get([key]);
      return key in result;
    } catch (error) {
      throw new Error(`Failed to check existence for key "${key}": ${error}`);
    }
  }
}
```

### ステップ2: Auth Token Manager実装
**【設計書Line 730-750 対応】**
```typescript
// chrome-extension/src/services/infrastructure/auth-token.manager.ts
import { IAuthTokenManager } from '@/types/infrastructure/auth.types';
import { IChromeStorageRepository } from '@/types/infrastructure/storage.types';
import { ChannelType, AuthToken } from '@/types/core/channel.types';
import { STORAGE_KEYS } from '@/types/core/constants';

export class AuthTokenManager implements IAuthTokenManager {
  private readonly storageRepository: IChromeStorageRepository;
  
  constructor(storageRepository: IChromeStorageRepository) {
    this.storageRepository = storageRepository;
  }
  
  /**
   * トークン保存
   */
  async saveToken(channel: ChannelType, token: AuthToken): Promise<void> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    tokens[channel] = token;
    await this.storageRepository.save(STORAGE_KEYS.AUTH_TOKENS, tokens);
  }
  
  /**
   * トークン取得
   */
  async getToken(channel: ChannelType): Promise<AuthToken | null> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    return tokens[channel] || null;
  }
  
  /**
   * トークン削除
   */
  async removeToken(channel: ChannelType): Promise<void> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    delete tokens[channel];
    await this.storageRepository.save(STORAGE_KEYS.AUTH_TOKENS, tokens);
  }
  
  /**
   * トークン更新
   */
  async refreshToken(channel: ChannelType): Promise<AuthToken> {
    const token = await this.getToken(channel);
    if (!token) {
      throw new Error(`No token found for channel: ${channel}`);
    }
    
    // チャンネル別のトークン更新ロジック
    switch (channel) {
      case ChannelType.GMAIL:
        return this.refreshGmailToken(token);
      case ChannelType.DISCORD:
        throw new Error('Discord does not support token refresh');
      case ChannelType.LINE:
        return this.refreshLineToken(token);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }
  
  /**
   * 有効性確認
   */
  async validateToken(channel: ChannelType, token: AuthToken): Promise<boolean> {
    // トークンの有効期限確認
    if (token.expiresAt && new Date() >= token.expiresAt) {
      return false;
    }
    
    // チャンネル別の有効性確認
    switch (channel) {
      case ChannelType.GMAIL:
        return this.validateGmailToken(token);
      case ChannelType.DISCORD:
        return this.validateDiscordToken(token);
      case ChannelType.LINE:
        return this.validateLineToken(token);
      default:
        return false;
    }
  }
  
  private async refreshGmailToken(token: AuthToken): Promise<AuthToken> {
    // Gmail OAuth 2.0 リフレッシュ実装
    if (!token.refreshToken) {
      throw new Error('No refresh token available for Gmail');
    }
    
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
        }),
      });
      
      const data = await response.json();
      
      const newToken: AuthToken = {
        accessToken: data.access_token,
        refreshToken: token.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: token.scope,
        tokenType: 'Bearer',
      };
      
      await this.saveToken(ChannelType.GMAIL, newToken);
      return newToken;
    } catch (error) {
      throw new Error(`Failed to refresh Gmail token: ${error}`);
    }
  }
  
  private async refreshLineToken(token: AuthToken): Promise<AuthToken> {
    // LINE Channel Access Token は基本的に期限なし
    return token;
  }
  
  private async validateGmailToken(token: AuthToken): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
        },
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async validateDiscordToken(token: AuthToken): Promise<boolean> {
    // Discord Webhook URLの有効性確認
    try {
      const response = await fetch(token.accessToken, {
        method: 'GET',
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async validateLineToken(token: AuthToken): Promise<boolean> {
    // LINE Channel Access Tokenの有効性確認
    try {
      const response = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
        },
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### ステップ3: Error Handler Service実装
**【Infrastructure Layer エラーハンドリング対応】**
```typescript
// chrome-extension/src/services/infrastructure/error-handler.service.ts
import { IChromeStorageRepository } from '@/types/infrastructure/storage.types';
import { STORAGE_KEYS } from '@/types/core/constants';

export interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: any;
  channel?: string;
}

export interface IErrorHandler {
  logError(error: Error, context?: any): Promise<void>;
  logWarning(message: string, context?: any): Promise<void>;
  logInfo(message: string, context?: any): Promise<void>;
  getErrorLogs(limit?: number): Promise<ErrorLog[]>;
  clearErrorLogs(): Promise<void>;
}

export class ErrorHandlerService implements IErrorHandler {
  private readonly storageRepository: IChromeStorageRepository;
  private readonly maxLogEntries = 1000;
  
  constructor(storageRepository: IChromeStorageRepository) {
    this.storageRepository = storageRepository;
  }
  
  /**
   * エラーログ記録
   */
  async logError(error: Error, context?: any): Promise<void> {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      context,
    };
    
    await this.saveLog(errorLog);
    
    // コンソールにも出力
    console.error('Error logged:', errorLog);
  }
  
  /**
   * 警告ログ記録
   */
  async logWarning(message: string, context?: any): Promise<void> {
    const warningLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'warning',
      message,
      context,
    };
    
    await this.saveLog(warningLog);
    console.warn('Warning logged:', warningLog);
  }
  
  /**
   * 情報ログ記録
   */
  async logInfo(message: string, context?: any): Promise<void> {
    const infoLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'info',
      message,
      context,
    };
    
    await this.saveLog(infoLog);
    console.info('Info logged:', infoLog);
  }
  
  /**
   * エラーログ取得
   */
  async getErrorLogs(limit = 100): Promise<ErrorLog[]> {
    const logs = await this.storageRepository.get<ErrorLog[]>(STORAGE_KEYS.ERROR_LOG) || [];
    return logs.slice(-limit);
  }
  
  /**
   * エラーログクリア
   */
  async clearErrorLogs(): Promise<void> {
    await this.storageRepository.remove(STORAGE_KEYS.ERROR_LOG);
  }
  
  private async saveLog(log: ErrorLog): Promise<void> {
    const logs = await this.storageRepository.get<ErrorLog[]>(STORAGE_KEYS.ERROR_LOG) || [];
    logs.push(log);
    
    // ログ数制限
    if (logs.length > this.maxLogEntries) {
      logs.splice(0, logs.length - this.maxLogEntries);
    }
    
    await this.storageRepository.save(STORAGE_KEYS.ERROR_LOG, logs);
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### ステップ4: Background Tasks Manager実装
```typescript
// chrome-extension/src/services/infrastructure/background-tasks.manager.ts
export interface BackgroundTask {
  id: string;
  name: string;
  interval: number; // ミリ秒
  lastRun?: Date;
  isRunning: boolean;
  execute: () => Promise<void>;
}

export interface IBackgroundTasksManager {
  registerTask(task: BackgroundTask): void;
  unregisterTask(taskId: string): void;
  startTask(taskId: string): void;
  stopTask(taskId: string): void;
  stopAllTasks(): void;
  getTaskStatus(): BackgroundTask[];
}

export class BackgroundTasksManager implements IBackgroundTasksManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * タスク登録
   */
  registerTask(task: BackgroundTask): void {
    this.tasks.set(task.id, task);
  }
  
  /**
   * タスク登録解除
   */
  unregisterTask(taskId: string): void {
    this.stopTask(taskId);
    this.tasks.delete(taskId);
  }
  
  /**
   * タスク開始
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.isRunning) return;
    
    task.isRunning = true;
    const timer = setInterval(async () => {
      try {
        await task.execute();
        task.lastRun = new Date();
      } catch (error) {
        console.error(`Background task "${task.name}" failed:`, error);
      }
    }, task.interval);
    
    this.timers.set(taskId, timer);
  }
  
  /**
   * タスク停止
   */
  stopTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    const timer = this.timers.get(taskId);
    
    if (task) {
      task.isRunning = false;
    }
    
    if (timer) {
      clearInterval(timer);
      this.timers.delete(taskId);
    }
  }
  
  /**
   * 全タスク停止
   */
  stopAllTasks(): void {
    for (const taskId of this.tasks.keys()) {
      this.stopTask(taskId);
    }
  }
  
  /**
   * タスク状態取得
   */
  getTaskStatus(): BackgroundTask[] {
    return Array.from(this.tasks.values()).map(task => ({
      ...task,
      execute: undefined as any, // 関数は除外
    }));
  }
}
```

### テスト環境構築【全プロジェクト必須】

#### ステップA: Infrastructure層テスト作成
```typescript
// tests/unit/infrastructure/chrome-storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChromeStorageRepository } from '@/services/infrastructure/chrome-storage.repository';

// Chrome API モック
const mockChromeStorage = {
  local: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
};

global.chrome = {
  storage: mockChromeStorage,
} as any;

describe('ChromeStorageRepository', () => {
  let repository: ChromeStorageRepository;
  
  beforeEach(() => {
    repository = new ChromeStorageRepository();
    vi.clearAllMocks();
  });
  
  describe('save', () => {
    it('should save data to chrome.storage.local', async () => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      
      mockChromeStorage.local.set.mockResolvedValue(undefined);
      
      await repository.save(key, data);
      
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ [key]: data });
    });
    
    it('should throw error when save fails', async () => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      
      mockChromeStorage.local.set.mockRejectedValue(new Error('Storage error'));
      
      await expect(repository.save(key, data)).rejects.toThrow('Failed to save data for key "test-key"');
    });
  });
  
  describe('get', () => {
    it('should get data from chrome.storage.local', async () => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      
      mockChromeStorage.local.get.mockResolvedValue({ [key]: data });
      
      const result = await repository.get(key);
      
      expect(result).toEqual(data);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith([key]);
    });
    
    it('should return null when key does not exist', async () => {
      const key = 'test-key';
      
      mockChromeStorage.local.get.mockResolvedValue({});
      
      const result = await repository.get(key);
      
      expect(result).toBeNull();
    });
  });
});
```

```typescript
// tests/unit/infrastructure/auth-token.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthTokenManager } from '@/services/infrastructure/auth-token.manager';
import { IChromeStorageRepository } from '@/types/infrastructure/storage.types';
import { ChannelType, AuthToken } from '@/types/core/channel.types';

describe('AuthTokenManager', () => {
  let authTokenManager: AuthTokenManager;
  let mockStorageRepository: IChromeStorageRepository;
  
  beforeEach(() => {
    mockStorageRepository = {
      save: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      getAll: vi.fn(),
      exists: vi.fn(),
    };
    
    authTokenManager = new AuthTokenManager(mockStorageRepository);
  });
  
  describe('saveToken', () => {
    it('should save token for a channel', async () => {
      const channel = ChannelType.GMAIL;
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };
      
      mockStorageRepository.get = vi.fn().mockResolvedValue({});
      
      await authTokenManager.saveToken(channel, token);
      
      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'auth_tokens',
        { [channel]: token }
      );
    });
  });
  
  describe('getToken', () => {
    it('should get token for a channel', async () => {
      const channel = ChannelType.GMAIL;
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };
      
      mockStorageRepository.get = vi.fn().mockResolvedValue({ [channel]: token });
      
      const result = await authTokenManager.getToken(channel);
      
      expect(result).toEqual(token);
    });
    
    it('should return null when token does not exist', async () => {
      const channel = ChannelType.GMAIL;
      
      mockStorageRepository.get = vi.fn().mockResolvedValue({});
      
      const result = await authTokenManager.getToken(channel);
      
      expect(result).toBeNull();
    });
  });
});
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] Chrome Storage APIを使用したデータ保存・取得が正常動作
- [ ] 認証トークンの保存・取得・削除が正常動作
- [ ] エラーハンドリングが適切に動作
- [ ] バックグラウンドタスクの登録・実行が正常動作

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] ESLintエラー0件
- [ ] vitestによるテストケース実装完了（カバレッジ80%以上）
- [ ] 既存テストが継続して通る
- [ ] 基本ルール（@test-debug-rule.mdc）準拠

### 設計書詳細反映検証【新規必須】
- [x] 設計書のRepository インタフェースが完全に実装済み
- [x] 設計書の認証関連データモデルが完全に反映済み
- [x] 設計書のストレージキー定義が具体的に実装済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み
- [x] 設計書のInfrastructure Layer構成が完全に反映済み

### 自動テスト検証【必須】
- [ ] `npm test` でテスト実行可能
- [ ] `npm run test:run` で非対話モード実行可能
- [ ] Infrastructure層の全テストケースが合格
- [ ] Chrome API モックを使用したテストが正常動作
- [ ] エラーハンドリングのテストが網羅的

### 統合検証
- [ ] 後続のService Layerから正常にアクセス可能
- [ ] Chrome拡張機能環境での動作確認

## 実装例【設計書詳細反映版】
```typescript
// 【設計書Line 708-750 から転記】具体的な使用例
import { ChromeStorageRepository } from '@/services/infrastructure/chrome-storage.repository';
import { AuthTokenManager } from '@/services/infrastructure/auth-token.manager';
import { ChannelType, AuthToken } from '@/types/core/channel.types';

// Infrastructure層の初期化
const storageRepository = new ChromeStorageRepository();
const authTokenManager = new AuthTokenManager(storageRepository);

// 認証トークンの保存例
const gmailToken: AuthToken = {
  accessToken: 'ya29.a0AfH6SMA...',
  refreshToken: '1//04...',
  expiresAt: new Date(Date.now() + 3600 * 1000),
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  tokenType: 'Bearer',
};

await authTokenManager.saveToken(ChannelType.GMAIL, gmailToken);

// 認証トークンの取得例
const token = await authTokenManager.getToken(ChannelType.GMAIL);
if (token && await authTokenManager.validateToken(ChannelType.GMAIL, token)) {
  // トークンが有効な場合の処理
  console.log('Gmail token is valid');
} else {
  // トークン更新が必要
  const newToken = await authTokenManager.refreshToken(ChannelType.GMAIL);
  console.log('Gmail token refreshed');
}
```

## 注意事項
### 【厳守事項】
- Chrome Storage APIの使用必須（localStorage使用禁止）
- 全ての非同期処理でエラーハンドリング実装必須
- トークンの暗号化保存（機密情報保護）
- vitestによる自動テスト実行が可能な状態を維持すること
- **【新規】設計書詳細完全反映ルールを必ず遵守すること**

### 【推奨事項】
- Dependency Injection パターンの使用
- 適切なログレベルでのエラー記録
- バックグラウンドタスクのパフォーマンス監視

### 【禁止事項】
- 同期的なストレージアクセス
- 平文での認証情報保存
- vitestの設定や既存テストを破壊する変更
- **【新規】設計書詳細を「参照」のみで済ませる曖昧な指示**

## 参考情報
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/): Chrome拡張機能ストレージAPI
- [OAuth 2.0](https://tools.ietf.org/html/rfc6749): OAuth 2.0認証仕様
- [TypeScript Handbook](https://www.typescriptlang.org/docs/): TypeScript型定義参考 