#!/usr/bin/env node

/**
 * AI自己テスト対応 Gmail新着メッセージ表示テスト
 * 
 * 特徴:
 * - 最小限の依存関係（Node.js標準ライブラリのみ）
 * - セルフコンテインド（一つのファイルで完結）
 * - 明確な成功/失敗判定
 * - 詳細なログ出力
 * - 自動化対応
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const { performance } = require('perf_hooks');

// === テスト設定 ===
const TEST_CONFIG = {
  name: 'Gmail新着メッセージ表示テスト',
  version: '1.0.0',
  timeout: 30000, // 30秒
  retries: 3,
  verbose: true,
  outputFormat: 'json',
  
  // テストデータ
  mockMessages: [
    {
      id: 'msg_001',
      from: '田中太郎 <tanaka@example.com>',
      subject: '【重要】プロジェクトの件について',
      snippet: '明日の会議の件で相談があります。資料の準備状況を確認させてください。',
      body: '田中です。\n\n明日の会議の件で相談があります。\n資料の準備状況を確認させてください。\n\nよろしくお願いします。',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分前
      channel: 'gmail',
      isUnread: true,
      threadId: 'thread_001',
      labels: ['INBOX', 'UNREAD'],
      priority: 'high'
    },
    {
      id: 'msg_002',
      from: '佐藤花子 <sato@company.com>',
      subject: '資料の確認お願いします',
      snippet: '添付ファイルをご確認ください。修正箇所をお知らせします。',
      body: '佐藤です。\n\n添付ファイルをご確認ください。\n修正箇所をお知らせします。\n\n確認後、ご連絡ください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
      channel: 'gmail',
      isUnread: true,
      threadId: 'thread_002',
      labels: ['INBOX', 'UNREAD'],
      priority: 'normal'
    },
    {
      id: 'msg_003',
      from: 'システム管理者 <admin@system.com>',
      subject: 'メンテナンスのお知らせ',
      snippet: '今夜21:00～23:00の間にメンテナンスを実施します。',
      body: 'システム管理者です。\n\n今夜21:00～23:00の間にメンテナンスを実施します。\nシステムが一時的に利用できなくなります。\n\nご了承ください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4時間前
      channel: 'gmail',
      isUnread: true,
      threadId: 'thread_003',
      labels: ['INBOX', 'UNREAD', 'IMPORTANT'],
      priority: 'low'
    }
  ]
};

// === ユーティリティ関数 ===
class TestLogger {
  constructor(verbose = true) {
    this.verbose = verbose;
    this.logs = [];
    this.startTime = performance.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Math.round(performance.now() - this.startTime);
    
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      elapsed: `${elapsed}ms`
    };

    this.logs.push(logEntry);

    if (this.verbose) {
      const prefix = this.getLevelPrefix(level);
      const timeStr = `[${elapsed}ms]`;
      console.log(`${prefix} ${timeStr} ${message}`);
      
      if (data && typeof data === 'object') {
        console.log(util.inspect(data, { depth: 2, colors: true }));
      }
    }
  }

  getLevelPrefix(level) {
    const prefixes = {
      'info': '🔍',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'debug': '🐛',
      'step': '📋'
    };
    return prefixes[level] || '📝';
  }

  getLogSummary() {
    const levels = {};
    this.logs.forEach(log => {
      levels[log.level] = (levels[log.level] || 0) + 1;
    });
    return levels;
  }
}

class TestAssertion {
  constructor(logger) {
    this.logger = logger;
    this.passed = 0;
    this.failed = 0;
  }

  assert(condition, message, expected = null, actual = null) {
    if (condition) {
      this.passed++;
      this.logger.log('success', `✓ ${message}`);
      return true;
    } else {
      this.failed++;
      this.logger.log('error', `✗ ${message}`, { expected, actual });
      return false;
    }
  }

  assertEquals(actual, expected, message) {
    return this.assert(
      actual === expected,
      message || `Expected ${expected}, got ${actual}`,
      expected,
      actual
    );
  }

  assertNotNull(value, message) {
    return this.assert(
      value !== null && value !== undefined,
      message || `Expected non-null value, got ${value}`
    );
  }

  assertGreaterThan(actual, expected, message) {
    return this.assert(
      actual > expected,
      message || `Expected ${actual} > ${expected}`,
      `> ${expected}`,
      actual
    );
  }

  assertArrayLength(array, expectedLength, message) {
    return this.assert(
      Array.isArray(array) && array.length === expectedLength,
      message || `Expected array length ${expectedLength}, got ${array?.length}`,
      expectedLength,
      array?.length
    );
  }

  getSummary() {
    return {
      passed: this.passed,
      failed: this.failed,
      total: this.passed + this.failed,
      successRate: this.passed / (this.passed + this.failed) * 100
    };
  }
}

// === モックサービス ===
class MockGmailService {
  constructor(logger) {
    this.logger = logger;
    this.channelType = 'gmail';
    this.channelName = 'Gmail';
    this.isConnected = true;
    this.authState = true;
    this.apiCallCount = 0;
    this.rateLimitRemaining = 250;
  }

  getChannelInfo() {
    return {
      type: this.channelType,
      name: this.channelName,
      isConnected: this.isConnected,
      lastSync: new Date(),
      rateLimitRemaining: this.rateLimitRemaining
    };
  }

  async isAuthenticated() {
    this.logger.log('debug', 'Gmail認証状態確認');
    await this.simulateDelay(100);
    return this.authState;
  }

  async authenticate(credentials = {}) {
    this.logger.log('info', 'Gmail認証実行中...');
    await this.simulateDelay(1000);
    
    // 認証シミュレーション
    if (Math.random() > 0.1) { // 90%成功率
      this.authState = true;
      this.logger.log('success', 'Gmail認証成功');
      return { success: true, token: 'mock_token_' + Date.now() };
    } else {
      this.logger.log('error', 'Gmail認証失敗');
      return { success: false, error: 'Authentication failed' };
    }
  }

  async getMessages(params = {}) {
    const { limit = 10, unreadOnly = true, query = '' } = params;
    
    this.logger.log('info', `Gmail新着メッセージ取得開始`, { limit, unreadOnly, query });
    this.apiCallCount++;
    this.rateLimitRemaining--;

    // 認証確認
    if (!this.authState) {
      return {
        success: false,
        error: { message: 'Gmail認証が必要です', code: 'AUTH_REQUIRED' }
      };
    }

    // Rate Limit確認
    if (this.rateLimitRemaining <= 0) {
      return {
        success: false,
        error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }
      };
    }

    // API呼び出しシミュレーション
    await this.simulateDelay(1500);

    // ランダム成功率（95%）
    if (Math.random() > 0.05) {
      const messages = this.filterMessages(TEST_CONFIG.mockMessages, { limit, unreadOnly, query });
      
      this.logger.log('success', `Gmail新着メッセージ取得成功: ${messages.length}件`);
      
      return {
        success: true,
        messages,
        hasMore: messages.length === limit,
        totalCount: TEST_CONFIG.mockMessages.length,
        nextPageToken: messages.length === limit ? 'next_page_token' : null
      };
    } else {
      this.logger.log('error', 'Gmail新着メッセージ取得失敗');
      return {
        success: false,
        error: { message: 'API call failed', code: 'API_ERROR' }
      };
    }
  }

  filterMessages(messages, { limit, unreadOnly, query }) {
    let filtered = [...messages];

    // 未読フィルタ
    if (unreadOnly) {
      filtered = filtered.filter(msg => msg.isUnread);
    }

    // 検索クエリフィルタ
    if (query) {
      filtered = filtered.filter(msg => 
        msg.subject.toLowerCase().includes(query.toLowerCase()) ||
        msg.body.toLowerCase().includes(query.toLowerCase()) ||
        msg.from.toLowerCase().includes(query.toLowerCase())
      );
    }

    // 日付順ソート（新しい順）
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // 件数制限
    return filtered.slice(0, limit);
  }

  async sendMessage(params) {
    const { to, subject, body, replyTo } = params;
    
    this.logger.log('info', `Gmail送信開始`, { to, subject: subject?.substring(0, 50) });
    this.apiCallCount++;
    this.rateLimitRemaining--;

    await this.simulateDelay(2000);

    if (Math.random() > 0.05) { // 95%成功率
      const messageId = 'sent_' + Date.now();
      this.logger.log('success', `Gmail送信成功: ${messageId}`);
      
      return {
        success: true,
        messageId,
        timestamp: new Date()
      };
    } else {
      this.logger.log('error', 'Gmail送信失敗');
      return {
        success: false,
        error: { message: 'Send failed', code: 'SEND_ERROR' }
      };
    }
  }

  async simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getApiStats() {
    return {
      callCount: this.apiCallCount,
      rateLimitRemaining: this.rateLimitRemaining,
      authState: this.authState
    };
  }
}

class MockReplyAssistantService {
  constructor(logger, gmailService) {
    this.logger = logger;
    this.gmailService = gmailService;
    this.channels = ['gmail']; // 将来的にdiscord, lineも追加
  }

  async fetchAllUnreadMessages() {
    this.logger.log('info', '統合受信箱: 全チャンネル新着メッセージ取得開始');
    
    const channelResults = {};
    const allMessages = [];

    // Gmail
    const gmailResult = await this.gmailService.getMessages({ limit: 10, unreadOnly: true });
    channelResults.gmail = {
      success: gmailResult.success,
      messageCount: gmailResult.success ? gmailResult.messages.length : 0,
      error: gmailResult.error
    };

    if (gmailResult.success) {
      allMessages.push(...gmailResult.messages);
    }

    // メッセージをタイムスタンプ順でソート
    allMessages.sort((a, b) => b.timestamp - a.timestamp);

    const result = {
      success: true,
      messages: allMessages,
      channelResults,
      totalUnread: allMessages.length,
      lastFetch: new Date()
    };

    this.logger.log('success', `統合受信箱: ${allMessages.length}件のメッセージ取得完了`);
    return result;
  }

  async generateReply(originalMessage, options = {}) {
    const { tone = 'formal', includeContext = true } = options;
    
    this.logger.log('info', 'AI返信案生成開始', { tone, includeContext });
    
    // AI処理シミュレーション
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 成功率95%
    if (Math.random() > 0.05) {
      const senderName = originalMessage.from.split('<')[0].trim();
      const replyTemplate = this.getReplyTemplate(originalMessage, tone);
      
      const reply = replyTemplate.replace('{sender}', senderName)
                                  .replace('{subject}', originalMessage.subject)
                                  .replace('{context}', includeContext ? 'コンテキストを考慮して' : '');

      this.logger.log('success', 'AI返信案生成成功');
      
      return {
        success: true,
        reply,
        confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
        tokensUsed: Math.floor(Math.random() * 500) + 100, // 100-600
        alternatives: this.generateAlternatives(originalMessage, tone)
      };
    } else {
      this.logger.log('error', 'AI返信案生成失敗');
      return {
        success: false,
        error: { message: 'AI generation failed', code: 'AI_ERROR' }
      };
    }
  }

  getReplyTemplate(message, tone) {
    const templates = {
      formal: '{sender}様\n\nお疲れさまです。\n\n{subject}の件、{context}承知いたしました。\n詳細を確認して、後日回答させていただきます。\n\nよろしくお願いいたします。',
      casual: '{sender}さん\n\nお疲れさまです！\n\n{subject}の件、{context}了解しました。\n確認して連絡しますね。\n\nよろしくお願いします。',
      friendly: '{sender}さん\n\nお疲れさまです😊\n\n{subject}の件、{context}承知しました！\n確認してお返事させていただきますね。\n\nよろしくお願いいたします。'
    };

    return templates[tone] || templates.formal;
  }

  generateAlternatives(message, tone) {
    const alternatives = [
      '承知いたしました。確認後、ご連絡差し上げます。',
      'ありがとうございます。検討してお返事します。',
      'お疲れさまです。内容を確認させていただきます。'
    ];

    return alternatives.slice(0, 2); // 2つの代替案
  }
}

// === テストスイート ===
class GmailMessageDisplayTest {
  constructor() {
    this.logger = new TestLogger(TEST_CONFIG.verbose);
    this.assert = new TestAssertion(this.logger);
    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      testCases: []
    };
  }

  async run() {
    this.logger.log('info', `=== ${TEST_CONFIG.name} 開始 ===`);
    this.logger.log('info', `バージョン: ${TEST_CONFIG.version}`);
    this.logger.log('info', `実行環境: Node.js ${process.version}`);

    try {
      // テストケース実行
      await this.testGmailServiceInitialization();
      await this.testAuthentication();
      await this.testMessageRetrieval();
      await this.testMessageFiltering();
      await this.testUnifiedInbox();
      await this.testAIReplyGeneration();
      await this.testErrorHandling();
      await this.testPerformance();

      // 結果集計
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      const summary = this.assert.getSummary();
      const logSummary = this.logger.getLogSummary();

      this.logger.log('info', `=== ${TEST_CONFIG.name} 完了 ===`);
      this.logger.log('info', `実行時間: ${this.results.duration}ms`);
      this.logger.log('info', `テスト結果: ${summary.passed}/${summary.total} (${summary.successRate.toFixed(1)}%)`);
      
      // 結果をファイルに保存
      await this.saveResults(summary, logSummary);
      
      return summary.failed === 0;

    } catch (error) {
      this.logger.log('error', `テスト実行中にエラー: ${error.message}`);
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      await this.saveResults(this.assert.getSummary(), this.logger.getLogSummary(), error);
      return false;
    }
  }

  async testGmailServiceInitialization() {
    this.logger.log('step', '1. Gmail Service 初期化テスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    const duration = performance.now() - startTime;
    
    const channelInfo = gmailService.getChannelInfo();
    
    this.assert.assertEquals(channelInfo.type, 'gmail', 'チャンネルタイプが正しい');
    this.assert.assertEquals(channelInfo.name, 'Gmail', 'チャンネル名が正しい');
    this.assert.assertEquals(channelInfo.isConnected, true, '接続状態が正しい');
    this.assert.assertNotNull(channelInfo.lastSync, '最終同期時刻が設定されている');
    this.assert.assertGreaterThan(channelInfo.rateLimitRemaining, 0, 'レート制限が適切');
    
    this.results.testCases.push({
      name: 'Gmail Service 初期化',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testAuthentication() {
    this.logger.log('step', '2. Gmail 認証テスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    
    // 認証状態確認
    const isAuth1 = await gmailService.isAuthenticated();
    this.assert.assertEquals(isAuth1, true, '初期認証状態が正しい');
    
    // 認証実行
    const authResult = await gmailService.authenticate();
    this.assert.assertEquals(authResult.success, true, '認証が成功');
    this.assert.assertNotNull(authResult.token, '認証トークンが取得できた');
    
    // 認証後の状態確認
    const isAuth2 = await gmailService.isAuthenticated();
    this.assert.assertEquals(isAuth2, true, '認証後の状態が正しい');
    
    const duration = performance.now() - startTime;
    this.results.testCases.push({
      name: 'Gmail 認証',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testMessageRetrieval() {
    this.logger.log('step', '3. メッセージ取得テスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    
    // 基本的なメッセージ取得
    const result1 = await gmailService.getMessages({ limit: 5, unreadOnly: true });
    this.assert.assertEquals(result1.success, true, 'メッセージ取得が成功');
    this.assert.assertArrayLength(result1.messages, 3, '期待されるメッセージ数が取得できた');
    
    // メッセージ構造確認
    const firstMessage = result1.messages[0];
    this.assert.assertNotNull(firstMessage.id, 'メッセージIDが存在');
    this.assert.assertNotNull(firstMessage.from, '送信者が存在');
    this.assert.assertNotNull(firstMessage.subject, '件名が存在');
    this.assert.assertNotNull(firstMessage.timestamp, 'タイムスタンプが存在');
    this.assert.assertEquals(firstMessage.channel, 'gmail', 'チャンネルが正しい');
    
    // 検索クエリテスト
    const result2 = await gmailService.getMessages({ query: 'プロジェクト' });
    this.assert.assertEquals(result2.success, true, '検索クエリが成功');
    this.assert.assertGreaterThan(result2.messages.length, 0, '検索結果が存在');
    
    const duration = performance.now() - startTime;
    this.results.testCases.push({
      name: 'メッセージ取得',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testMessageFiltering() {
    this.logger.log('step', '4. メッセージフィルタリングテスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    
    // 件数制限テスト
    const result1 = await gmailService.getMessages({ limit: 2 });
    this.assert.assertArrayLength(result1.messages, 2, '件数制限が正しく動作');
    
    // 未読フィルタテスト
    const result2 = await gmailService.getMessages({ unreadOnly: true });
    this.assert.assertEquals(result2.success, true, '未読フィルタが成功');
    result2.messages.forEach((msg, index) => {
      this.assert.assertEquals(msg.isUnread, true, `メッセージ${index + 1}が未読`);
    });
    
    // 検索フィルタテスト
    const result3 = await gmailService.getMessages({ query: 'システム' });
    this.assert.assertEquals(result3.success, true, '検索フィルタが成功');
    const hasSystemMessage = result3.messages.some(msg => 
      msg.subject.includes('システム') || msg.body.includes('システム')
    );
    this.assert.assertEquals(hasSystemMessage, true, '検索結果が正しい');
    
    const duration = performance.now() - startTime;
    this.results.testCases.push({
      name: 'メッセージフィルタリング',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testUnifiedInbox() {
    this.logger.log('step', '5. 統合受信箱テスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    const replyAssistant = new MockReplyAssistantService(this.logger, gmailService);
    
    // 統合受信箱機能
    const result = await replyAssistant.fetchAllUnreadMessages();
    this.assert.assertEquals(result.success, true, '統合受信箱が成功');
    this.assert.assertGreaterThan(result.messages.length, 0, 'メッセージが取得できた');
    this.assert.assertNotNull(result.channelResults.gmail, 'Gmailチャンネル結果が存在');
    this.assert.assertEquals(result.channelResults.gmail.success, true, 'Gmailチャンネルが成功');
    
    // メッセージソート確認
    const messages = result.messages;
    for (let i = 0; i < messages.length - 1; i++) {
      const isDescOrder = messages[i].timestamp >= messages[i + 1].timestamp;
      this.assert.assertEquals(isDescOrder, true, `メッセージ${i + 1}が正しい順序`);
    }
    
    const duration = performance.now() - startTime;
    this.results.testCases.push({
      name: '統合受信箱',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testAIReplyGeneration() {
    this.logger.log('step', '6. AI返信案生成テスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    const replyAssistant = new MockReplyAssistantService(this.logger, gmailService);
    
    // テスト用メッセージ
    const testMessage = TEST_CONFIG.mockMessages[0];
    
    // 基本的な返信生成
    const result1 = await replyAssistant.generateReply(testMessage);
    this.assert.assertEquals(result1.success, true, 'AI返信案生成が成功');
    this.assert.assertNotNull(result1.reply, '返信案が生成された');
    this.assert.assertGreaterThan(result1.confidence, 0.8, '信頼度が十分');
    this.assert.assertGreaterThan(result1.tokensUsed, 0, 'トークン使用数が記録された');
    
    // 返信内容確認
    const reply = result1.reply;
    this.assert.assertEquals(reply.includes('田中太郎'), true, '送信者名が含まれている');
    this.assert.assertEquals(reply.includes('お疲れさまです'), true, '適切な挨拶が含まれている');
    
    // 異なるトーンテスト
    const result2 = await replyAssistant.generateReply(testMessage, { tone: 'casual' });
    this.assert.assertEquals(result2.success, true, 'カジュアルトーンが成功');
    this.assert.assertNotNull(result2.reply, 'カジュアル返信案が生成された');
    
    const duration = performance.now() - startTime;
    this.results.testCases.push({
      name: 'AI返信案生成',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testErrorHandling() {
    this.logger.log('step', '7. エラーハンドリングテスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    
    // 未認証状態でのメッセージ取得
    gmailService.authState = false;
    const result1 = await gmailService.getMessages();
    this.assert.assertEquals(result1.success, false, '未認証時にエラーが発生');
    this.assert.assertNotNull(result1.error, 'エラー情報が存在');
    this.assert.assertEquals(result1.error.code, 'AUTH_REQUIRED', 'エラーコードが正しい');
    
    // Rate Limit テスト
    gmailService.authState = true;
    gmailService.rateLimitRemaining = 0;
    const result2 = await gmailService.getMessages();
    this.assert.assertEquals(result2.success, false, 'Rate Limit時にエラーが発生');
    this.assert.assertEquals(result2.error.code, 'RATE_LIMIT_EXCEEDED', 'Rate Limitエラーが正しい');
    
    const duration = performance.now() - startTime;
    this.results.testCases.push({
      name: 'エラーハンドリング',
      duration: Math.round(duration),
      passed: true
    });
  }

  async testPerformance() {
    this.logger.log('step', '8. パフォーマンステスト');
    
    const startTime = performance.now();
    const gmailService = new MockGmailService(this.logger);
    
    // 複数回の呼び出しテスト
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(gmailService.getMessages({ limit: 3 }));
    }
    
    const results = await Promise.all(promises);
    const duration = performance.now() - startTime;
    
    // 成功率確認
    const successCount = results.filter(r => r.success).length;
    this.assert.assertEquals(successCount, 5, '並列処理がすべて成功');
    
    // パフォーマンス確認
    this.assert.assertGreaterThan(10000, duration, '並列処理が10秒以内に完了'); // 10秒以内
    
    // API統計確認
    const apiStats = gmailService.getApiStats();
    this.assert.assertEquals(apiStats.callCount, 5, 'API呼び出し回数が正しい');
    
    this.results.testCases.push({
      name: 'パフォーマンス',
      duration: Math.round(duration),
      passed: true
    });
  }

  async saveResults(testSummary, logSummary, error = null) {
    const report = {
      test: {
        name: TEST_CONFIG.name,
        version: TEST_CONFIG.version,
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString(),
        duration: this.results.duration
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memoryUsage: process.memoryUsage()
      },
      summary: {
        ...testSummary,
        overallResult: error ? 'ERROR' : (testSummary.failed === 0 ? 'SUCCESS' : 'FAILED')
      },
      testCases: this.results.testCases,
      logs: {
        summary: logSummary,
        entries: this.logger.logs.slice(-20) // 最新20件のログ
      },
      error: error ? {
        message: error.message,
        stack: error.stack
      } : null
    };

    const outputPath = path.join(__dirname, 'ai-self-test-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    
    this.logger.log('info', `テストレポート保存完了: ${outputPath}`);
    
    // CSV形式でも保存
    const csvPath = path.join(__dirname, 'ai-self-test-results.csv');
    const csvContent = this.generateCSVReport(report);
    fs.writeFileSync(csvPath, csvContent);
    
    this.logger.log('info', `CSV レポート保存完了: ${csvPath}`);
  }

  generateCSVReport(report) {
    const headers = ['TestCase', 'Duration(ms)', 'Status'];
    const rows = [headers.join(',')];
    
    report.testCases.forEach(testCase => {
      const row = [
        testCase.name,
        testCase.duration,
        testCase.passed ? 'PASS' : 'FAIL'
      ];
      rows.push(row.join(','));
    });
    
    // サマリー行
    rows.push('');
    rows.push('SUMMARY');
    rows.push(`Total Tests,${report.summary.total},`);
    rows.push(`Passed,${report.summary.passed},`);
    rows.push(`Failed,${report.summary.failed},`);
    rows.push(`Success Rate,${report.summary.successRate.toFixed(1)}%,`);
    rows.push(`Total Duration,${report.test.duration}ms,`);
    
    return rows.join('\n');
  }
}

// === メイン実行 ===
async function main() {
  console.log('🤖 AI自己テスト対応 Gmail新着メッセージ表示テスト');
  console.log('====================================================');
  
  const test = new GmailMessageDisplayTest();
  
  try {
    const success = await test.run();
    
    if (success) {
      console.log('\n🎉 すべてのテストが成功しました！');
      process.exit(0);
    } else {
      console.log('\n❌ テストに失敗しました');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 テスト実行中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

module.exports = { GmailMessageDisplayTest, MockGmailService, MockReplyAssistantService, TEST_CONFIG }; 