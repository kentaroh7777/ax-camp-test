#!/usr/bin/env node

/**
 * Gmail新着メッセージ表示 結合テスト
 * 
 * このテストは以下の機能を検証します：
 * 1. Gmail Service の初期化
 * 2. 認証状態の確認
 * 3. 新着メッセージの取得
 * 4. メッセージ表示の確認
 * 5. 統合受信箱での表示
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome API globally for all tests that might use it
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
    launchWebAuthFlow: vi.fn(),
  },
};

// Mock the entire modules for dependency injection
vi.mock('../../chrome-extension/src/services/infrastructure/auth-token.manager', () => {
  const mockAuthTokenManagerInstance = {
    getToken: vi.fn(),
    validateToken: vi.fn(),
    refreshToken: vi.fn(),
    saveToken: vi.fn(),
  };
  return { AuthTokenManager: vi.fn(() => mockAuthTokenManagerInstance) };
});

vi.mock('../../chrome-extension/src/services/channel/base/message-client.factory', () => {
  const mockGmailClient = {
    getChannelInfo: () => ({ type: 'gmail', name: 'Gmail', isConnected: true }),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    authenticate: vi.fn(),
    isAuthenticated: vi.fn(),
  };
  const mockMessageClientFactoryInstance = {
    createAllClients: vi.fn(() => ({
      gmail: mockGmailClient,
      // Add other mocked clients if necessary for future tests
    })),
  };
  return { MessageClientFactory: vi.fn(() => mockMessageClientFactoryInstance) };
});

vi.mock('../../chrome-extension/src/services/application/user-mapping.service', () => {
  const mockUserMappingServiceInstance = {
    resolveUserMappings: vi.fn(async (messages) => messages.map(msg => ({ ...msg, resolvedContact: { name: 'Mock User', email: 'mock@example.com' } }))),
    getMapping: vi.fn(),
  };
  return { UserMappingService: vi.fn(() => mockUserMappingServiceInstance) };
});

vi.mock('../../chrome-extension/src/services/application/llm-integration.service', () => {
  const mockLLMIntegrationServiceInstance = {
    optimizePrompt: vi.fn((context) => `Optimized: ${context}`),
    generateReply: vi.fn(async (prompt, context) => `Generated reply for: ${prompt}`),
  };
  return { LLMIntegrationService: vi.fn(() => mockLLMIntegrationServiceInstance) };
});

// Import the actual services after mocking their dependencies
import { GmailService } from '../../chrome-extension/src/services/channel/gmail/gmail.service';
import { ReplyAssistantService } from '../../chrome-extension/src/services/application/reply-assistant.service';
import { ChromeStorageRepository } from '../../chrome-extension/src/services/infrastructure/chrome-storage.repository';

// Get the mocked instances
import { AuthTokenManager } from '../../chrome-extension/src/services/infrastructure/auth-token.manager';
import { MessageClientFactory } from '../../chrome-extension/src/services/channel/base/message-client.factory';
import { UserMappingService } from '../../chrome-extension/src/services/application/user-mapping.service';
import { LLMIntegrationService } from '../../chrome-extension/src/services/application/llm-integration.service';


describe('Gmail新着メッセージ表示 結合テスト', () => {
  let gmailService: GmailService;
  let replyAssistant: ReplyAssistantService;
  let storageRepository: ChromeStorageRepository;
  let mockedAuthTokenManager: ReturnType<typeof AuthTokenManager>;
  let mockedMessageClientFactory: ReturnType<typeof MessageClientFactory>;
  let mockedUserMappingService: ReturnType<typeof UserMappingService>;
  let mockedLLMService: ReturnType<typeof LLMIntegrationService>;


  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked instances from the mocked modules
    mockedAuthTokenManager = new AuthTokenManager();
    mockedMessageClientFactory = new MessageClientFactory(mockedAuthTokenManager);
    mockedUserMappingService = new UserMappingService();
    mockedLLMService = new LLMIntegrationService();

    // Set up mock return values for AuthTokenManager
    mockedAuthTokenManager.getToken.mockResolvedValue({
      accessToken: 'mock_access_token',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      tokenType: 'Bearer',
      scope: [],
    });
    mockedAuthTokenManager.validateToken.mockResolvedValue(true);
    mockedAuthTokenManager.refreshToken.mockResolvedValue({
      accessToken: 'mock_new_access_token',
      expiresAt: new Date(Date.now() + 3600000),
      tokenType: 'Bearer',
      scope: [],
    });

    // Set up mock return values for UserMappingService
    mockedUserMappingService.resolveUserMappings.mockImplementation(async (messages) => messages.map(msg => ({ ...msg, resolvedContact: { name: 'Mock User', email: 'mock@example.com' } })));
    mockedUserMappingService.getMapping.mockResolvedValue({
      userId: 'mock_user_id',
      channels: {
        gmail: { email: 'mock@example.com' },
      },
    });

    // Set up mock return values for LLMIntegrationService
    mockedLLMService.optimizePrompt.mockImplementation((context) => `Optimized: ${context}`);
    mockedLLMService.generateReply.mockImplementation(async (prompt, context) => `Generated reply for: ${prompt}`);

    // Instantiate services with mocked dependencies
    gmailService = new GmailService(mockedAuthTokenManager);
    replyAssistant = new ReplyAssistantService(mockedMessageClientFactory, mockedUserMappingService, mockedLLMService);
    storageRepository = new ChromeStorageRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Gmail Service 初期化テスト', () => {
    it('Gmail Service が正常に初期化される', () => {
      expect(gmailService).toBeDefined();
      expect(gmailService.getChannelInfo().type).toBe('gmail');
    });

    it('認証状態を確認できる', async () => {
      const isAuthenticated = await gmailService.isAuthenticated();
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('メッセージ取得テスト', () => {
    beforeEach(() => {
      // Mock Gmail API レスポンス
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          messages: [
            {
              id: '1',
              threadId: 'thread1',
              snippet: 'テストメッセージ1',
              payload: {
                headers: [
                  { name: 'From', value: 'test@example.com' },
                  { name: 'Subject', value: 'テスト件名1' },
                  { name: 'Date', value: new Date().toISOString() }
                ]
              }
            },
            {
              id: '2',
              threadId: 'thread2',
              snippet: 'テストメッセージ2',
              payload: {
                headers: [
                  { name: 'From', value: 'test2@example.com' },
                  { name: 'Subject', value: 'テスト件名2' },
                  { name: 'Date', value: new Date().toISOString() }
                ]
              }
            }
          ]
        })
      });
    });

    it('新着メッセージを取得できる', async () => {
      const result = await gmailService.getMessages({
        limit: 10,
        unreadOnly: true
      });

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].from).toBe('test@example.com');
      expect(result.messages[0].content).toContain('テスト件名1');
    });

    it('エラーハンドリングが正常に動作する', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await gmailService.getMessages({
        limit: 10,
        unreadOnly: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('統合受信箱テスト', () => {
    beforeEach(() => {
      // Mock Gmail API レスポンス
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          messages: [
            {
              id: '1',
              threadId: 'thread1',
              snippet: 'Gmail新着メッセージ',
              payload: {
                headers: [
                  { name: 'From', value: 'gmail@example.com' },
                  { name: 'Subject', value: 'Gmail件名' },
                  { name: 'Date', value: new Date().toISOString() }
                ]
              }
            }
          ]
        })
      });
    });

    it('統合受信箱で全チャンネルのメッセージを取得できる', async () => {
      const result = await replyAssistant.fetchAllUnreadMessages();

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].channel).toBe('gmail');
      expect(result.messages[0].from).toBe('gmail@example.com');
    });

    it('チャンネル別の統計情報を取得できる', async () => {
      const result = await replyAssistant.fetchAllUnreadMessages();
      
      expect(result.channelResults).toBeDefined();
      expect(result.channelResults.gmail).toBeDefined();
      expect(result.channelResults.gmail.success).toBe(true);
      expect(result.channelResults.gmail.messageCount).toBe(1);
    });
  });

  describe('メッセージ表示フォーマットテスト', () => {
    it('メッセージが正しい形式で表示される', async () => {
      const mockMessage = {
        id: 'msg123',
        threadId: 'thread123',
        snippet: 'テストメッセージ内容',
        payload: {
          headers: [
            { name: 'From', value: '田中太郎 <tanaka@example.com>' },
            { name: 'Subject', value: '【重要】プロジェクトの件について' },
            { name: 'Date', value: new Date('2025-01-15T10:30:00Z').toISOString() }
          ]
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [mockMessage] })
      });

      const result = await gmailService.getMessages({ limit: 1 });
      const message = result.messages[0];

      expect(message.from).toBe('田中太郎 <tanaka@example.com>');
      expect(message.content).toContain('【重要】プロジェクトの件について');
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.channel).toBe('gmail');
      expect(message.isUnread).toBe(true);
    });
  });
});

// 実際のテスト実行用のスタンドアロン関数
export async function runGmailMessageDisplayTest() {
  console.log('🔍 Gmail新着メッセージ表示テスト開始');
  console.log('=====================================');

  try {
    // Chrome拡張機能環境チェック
    if (typeof chrome === 'undefined') {
      console.log('❌ Chrome拡張機能環境が必要です');
      console.log('💡 Chrome拡張機能をロードしてから実行してください');
      return;
    }

    // Gmail Service 初期化
    const authTokenManager = new AuthTokenManager();
    const gmailService = new GmailService(authTokenManager);
    console.log('✅ Gmail Service 初期化完了');

    // 認証状態確認
    console.log('🔐 認証状態確認中...');
    const isAuthenticated = await gmailService.isAuthenticated();
    
    if (!isAuthenticated) {
      console.log('❌ Gmail認証が必要です');
      console.log('💡 セットアップを実行してください');
      return;
    }

    console.log('✅ Gmail認証確認完了');

    // 新着メッセージ取得
    console.log('📬 新着メッセージ取得中...');
    const result = await gmailService.getMessages({
      limit: 5,
      unreadOnly: true
    });

    if (result.success) {
      console.log(`📨 ${result.messages.length}件の新着メッセージを取得しました`);
      
      // メッセージ表示
      result.messages.forEach((message, index) => {
        console.log(`\n--- メッセージ ${index + 1} ---`);
        console.log(`📧 From: ${message.from}`);
        console.log(`🏷️  Subject: ${message.content.substring(0, 50)}...`);
        console.log(`🕐 Time: ${message.timestamp.toLocaleString('ja-JP')}`);
        console.log(`📍 Channel: ${message.channel}`);
        console.log(`🔍 Status: ${message.isUnread ? '未読' : '既読'}`);
      });

      // 統合受信箱テスト
      console.log('\n🤖 統合受信箱テスト実行中...');
      const messageClientFactory = new MessageClientFactory(authTokenManager);
      const userMappingService = new UserMappingService();
      const llmService = new LLMIntegrationService();
      const replyAssistant = new ReplyAssistantService(messageClientFactory, userMappingService, llmService);
      const unifiedResult = await replyAssistant.fetchAllUnreadMessages();

      console.log(`📊 統合結果: ${unifiedResult.messages.length}件のメッセージ`);
      console.log('📋 チャンネル別内訳:');
      
      const channelCounts = {};
      unifiedResult.messages.forEach(msg => {
        channelCounts[msg.channel] = (channelCounts[msg.channel] || 0) + 1;
      });

      Object.entries(channelCounts).forEach(([channel, count]) => {
        console.log(`  - ${channel}: ${count}件`);
      });

      console.log('\n✅ Gmail新着メッセージ表示テスト完了');
      return unifiedResult;

    } else {
      console.log('❌ メッセージ取得に失敗しました');
      console.log('🔍 エラー:', result.error);
      return null;
    }

  } catch (error) {
    console.error('💥 テスト実行中にエラーが発生しました:', error);
    console.log('\n🔧 トラブルシューティング:');
    console.log('1. Chrome拡張機能がロードされているか確認');
    console.log('2. Gmail認証が完了しているか確認');
    console.log('3. ネットワーク接続を確認');
    throw error;
  }
}

// Node.js環境での実行
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
  runGmailMessageDisplayTest().catch(console.error);
}