# Task 5: Application Service Layer（アプリケーションサービス層）

## 概要
Reply Assistant Service、User Mapping Service、LLM Integration Service、Settings Serviceを実装する。Task4のChannel Service Layerを利用してビジネスロジックを統合し、統一されたアプリケーション機能を提供する。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 7.1 統一インタフェース定義 - Application Serviceインタフェース
- **参照行数**: Line 646-707

### 設計書詳細の具体的反映

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

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- **前提条件**: Task4 (Channel Service Layer) - メッセージクライアント利用に必要

### 成果物
- `chrome-extension/src/services/application/reply-assistant.service.ts` - 返信支援サービス
- `chrome-extension/src/services/application/user-mapping.service.ts` - ユーザー紐づけサービス
- `chrome-extension/src/services/application/llm-integration.service.ts` - LLM統合サービス
- `chrome-extension/src/services/application/settings.service.ts` - 設定サービス

### テスト成果物【必須】
- **テストファイル**: `tests/unit/application/reply-assistant.test.ts`
- **テストファイル**: `tests/unit/application/user-mapping.test.ts`
- **テストファイル**: `tests/unit/application/llm-integration.test.ts`
- **テストファイル**: `tests/unit/application/settings.test.ts`

## 実装要件
### 【必須制約】ビジネスロジック統合
- **Channel Service Layer利用**: Task4のMessageClientFactoryを使用必須
- **Infrastructure Layer利用**: Task3のストレージ・認証管理利用必須
- **統合ワークフロー**: 全チャンネル並列処理の実装必須

## 実装ガイド【設計書詳細反映必須】

### ステップ1: Reply Assistant Service実装
**【設計書Line 646-677 対応】**
```typescript
// chrome-extension/src/services/application/reply-assistant.service.ts
import { IReplyAssistantService } from '@/types/services/reply-assistant.types';
import { MessageClientFactory } from '@/services/channel/base/message-client.factory';
import { IUserMappingService } from '@/types/services/user-mapping.types';
import { ILLMIntegrationService } from '@/types/services/llm.types';
import { ChannelType } from '@/types/core/channel.types';

export class ReplyAssistantService implements IReplyAssistantService {
  constructor(
    private messageClientFactory: MessageClientFactory,
    private userMappingService: IUserMappingService,
    private llmService: ILLMIntegrationService
  ) {}
  
  async fetchAllUnreadMessages(): Promise<UnifiedInboxResult> {
    const allClients = this.messageClientFactory.createAllClients();
    const channels = Object.keys(allClients) as ChannelType[];
    
    // 並列処理で全チャンネルから取得
    const fetchResults = await Promise.allSettled(
      channels.map(async (channel) => {
        const client = allClients[channel];
        const isAuthenticated = await client.isAuthenticated();
        
        if (!isAuthenticated) {
          return { channel, success: false, messages: [], error: 'Not authenticated' };
        }
        
        const result = await client.getMessages({ unreadOnly: true, limit: 50 });
        return {
          channel,
          success: result.success,
          messages: result.messages || [],
          error: result.error?.message,
        };
      })
    );
    
    // 結果統合
    const allMessages: Message[] = [];
    const channelResults: Record<ChannelType, ChannelFetchResult> = {} as any;
    
    fetchResults.forEach((result, index) => {
      const channel = channels[index];
      const fetchResult = result.status === 'fulfilled' ? result.value : { 
        channel, 
        success: false, 
        messages: [], 
        error: 'Fetch failed' 
      };
      
      channelResults[channel] = {
        success: fetchResult.success,
        messageCount: fetchResult.messages.length,
        error: fetchResult.error ? { code: 'FETCH_ERROR', message: fetchResult.error } : undefined,
        fetchTime: 0,
      };
      
      if (fetchResult.success) {
        allMessages.push(...fetchResult.messages);
      }
    });
    
    // ユーザー紐づけ解決
    const resolvedMessages = await this.userMappingService.resolveUserMappings(allMessages);
    
    return {
      success: true,
      messages: resolvedMessages,
      channelResults,
      totalUnread: allMessages.length,
      lastFetch: new Date(),
    };
  }
  
  async generateReply(context: ReplyContext): Promise<ReplyGenerationResult> {
    try {
      const optimizedPrompt = this.llmService.optimizePrompt(context);
      const reply = await this.llmService.generateReply(optimizedPrompt, context);
      
      return {
        success: true,
        reply,
        confidence: 0.85,
        tokensUsed: reply.length / 4, // 概算
      };
    } catch (error) {
      return {
        success: false,
        reply: '',
        confidence: 0,
        tokensUsed: 0,
        error: {
          code: 'REPLY_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async getRelatedMessages(userId: string, originalMessage: Message): Promise<Message[]> {
    const userMapping = await this.userMappingService.getMapping(userId);
    if (!userMapping) return [];
    
    const relatedMessages: Message[] = [];
    const allClients = this.messageClientFactory.createAllClients();
    
    // 各チャンネルから関連メッセージを検索
    for (const [channel, channelInfo] of Object.entries(userMapping.channels)) {
      const client = allClients[channel as ChannelType];
      if (!client || !await client.isAuthenticated()) continue;
      
      const result = await client.getMessages({ 
        limit: 5,
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 過去7日間
      });
      
      if (result.success) {
        const userMessages = result.messages.filter(msg => 
          this.isMessageFromUser(msg, channelInfo)
        );
        relatedMessages.push(...userMessages);
      }
    }
    
    return relatedMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  private isMessageFromUser(message: Message, channelInfo: any): boolean {
    switch (message.channel) {
      case ChannelType.GMAIL:
        return message.from.includes(channelInfo.email);
      case ChannelType.DISCORD:
        return message.from.includes(channelInfo.username);
      case ChannelType.LINE:
        return message.from === channelInfo.userId;
      default:
        return false;
    }
  }
}
```

### ステップ2: User Mapping Service実装
```typescript
// chrome-extension/src/services/application/user-mapping.service.ts
import { IUserMappingService } from '@/types/services/user-mapping.types';
import { IChromeStorageRepository } from '@/types/infrastructure/storage.types';
import { STORAGE_KEYS } from '@/types/core/constants';

export class UserMappingService implements IUserMappingService {
  constructor(private storageRepository: IChromeStorageRepository) {}
  
  async createMapping(mapping: UserMappingRequest): Promise<UserMapping> {
    const userMapping: UserMapping = {
      id: this.generateId(),
      name: mapping.name,
      channels: mapping.channels,
      avatar: mapping.avatar,
      priority: mapping.priority || Priority.NORMAL,
      tags: mapping.tags || [],
      lastActivity: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const existingMappings = await this.getAllMappings();
    existingMappings.push(userMapping);
    
    await this.storageRepository.save(STORAGE_KEYS.USER_MAPPINGS, existingMappings);
    return userMapping;
  }
  
  async getMapping(userId: string): Promise<UserMapping | null> {
    const mappings = await this.getAllMappings();
    return mappings.find(mapping => mapping.id === userId) || null;
  }
  
  async resolveUserMappings(messages: Message[]): Promise<ResolvedMessage[]> {
    const mappings = await this.getAllMappings();
    
    return messages.map(message => {
      const resolvedUser = this.findUserMappingForMessage(message, mappings);
      return {
        ...message,
        resolvedUser,
        relatedMessages: [],
        priority: resolvedUser?.priority || Priority.NORMAL,
      };
    });
  }
  
  async getAllMappings(): Promise<UserMapping[]> {
    return await this.storageRepository.get<UserMapping[]>(STORAGE_KEYS.USER_MAPPINGS) || [];
  }
  
  private findUserMappingForMessage(message: Message, mappings: UserMapping[]): UserMapping | undefined {
    return mappings.find(mapping => {
      const channelInfo = mapping.channels[message.channel];
      if (!channelInfo) return false;
      
      switch (message.channel) {
        case ChannelType.GMAIL:
          return message.from.includes(channelInfo.email);
        case ChannelType.DISCORD:
          return message.from.includes(channelInfo.username);
        case ChannelType.LINE:
          return message.from === channelInfo.userId;
        default:
          return false;
      }
    });
  }
  
  private generateId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### ステップ3: LLM Integration Service実装
```typescript
// chrome-extension/src/services/application/llm-integration.service.ts
export class LLMIntegrationService implements ILLMIntegrationService {
  async generateReply(prompt: string, context: any): Promise<string> {
    // OpenAI APIを使用した実装例
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  optimizePrompt(context: ReplyContext): string {
    return `Please generate a reply to the following message:
Original: ${context.originalMessage.content}
From: ${context.originalMessage.from}
Channel: ${context.originalMessage.channel}
Context: ${context.relatedMessages.map(m => m.content).join('\n')}`;
  }
  
  async getUsageStats(): Promise<LLMUsageStats> {
    return {
      totalRequests: 0,
      totalTokens: 0,
      successRate: 1.0,
      averageResponseTime: 1500,
      monthlyCost: 0,
      lastUpdated: new Date(),
    };
  }
}
```

### ステップ4: Settings Service実装
```typescript
// chrome-extension/src/services/application/settings.service.ts
export class SettingsService implements ISettingsService {
  constructor(private storageRepository: IChromeStorageRepository) {}
  
  async getSettings(): Promise<AppSettings> {
    const settings = await this.storageRepository.get<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
    return settings || this.getDefaultSettings();
  }
  
  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await this.storageRepository.save(STORAGE_KEYS.APP_SETTINGS, updatedSettings);
  }
  
  async resetSettings(): Promise<void> {
    await this.storageRepository.save(STORAGE_KEYS.APP_SETTINGS, this.getDefaultSettings());
  }
  
  private getDefaultSettings(): AppSettings {
    return {
      general: {
        language: 'ja',
        theme: 'auto',
        autoFetch: true,
        fetchInterval: 5,
        maxMessageHistory: 1000,
      },
      notifications: {
        enabled: true,
        sound: true,
        desktop: true,
        priorities: [Priority.HIGH, Priority.URGENT],
      },
      ai: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 500,
      },
      channels: {
        [ChannelType.GMAIL]: { enabled: true, maxResults: 50 },
        [ChannelType.DISCORD]: { enabled: true },
        [ChannelType.LINE]: { enabled: true, proxyUrl: process.env.LINE_PROXY_URL || '' },
      },
      ui: {
        compactMode: false,
        showAvatars: true,
        groupByUser: true,
        defaultSortOrder: 'timestamp',
      },
    };
  }
}
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] 全チャンネル並列取得が正常動作
- [ ] ユーザー紐づけ解決が正常動作
- [ ] AI返信生成が正常動作
- [ ] 設定管理が正常動作

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] vitestによるテストケース実装完了
- [ ] Channel Service Layerとの統合が正常動作

### 設計書詳細反映検証【新規必須】
- [x] 設計書のApplication Serviceインタフェースが完全に実装済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み

## 注意事項
### 【厳守事項】
- Channel Service Layerとの適切な連携必須
- 並列処理でのエラーハンドリング必須
- vitestによる自動テスト実行が可能な状態を維持すること
- **【新規】設計書詳細完全反映ルールを必ず遵守すること** 