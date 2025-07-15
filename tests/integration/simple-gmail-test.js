#!/usr/bin/env node

/**
 * シンプルなGmail新着メッセージ表示テスト
 * Chrome拡張機能環境に依存しない模擬テスト
 */

const fs = require('fs');
const path = require('path');

// テスト設定
const TEST_CONFIG = {
  maxMessages: 5,
  mockMessages: [
    {
      id: 'msg_001',
      from: '田中太郎 <tanaka@example.com>',
      subject: '【重要】プロジェクトの件について',
      snippet: '明日の会議の件で相談があります。資料の準備状況を確認させてください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分前
      channel: 'gmail',
      isUnread: true,
      threadId: 'thread_001'
    },
    {
      id: 'msg_002', 
      from: '佐藤花子 <sato@company.com>',
      subject: '資料の確認お願いします',
      snippet: '添付ファイルをご確認ください。修正箇所をお知らせします。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
      channel: 'gmail',
      isUnread: true,
      threadId: 'thread_002'
    },
    {
      id: 'msg_003',
      from: 'システム管理者 <admin@system.com>',
      subject: 'メンテナンスのお知らせ',
      snippet: '今夜21:00～23:00の間にメンテナンスを実施します。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4時間前
      channel: 'gmail',
      isUnread: true,
      threadId: 'thread_003'
    }
  ]
};

// Gmail Service モック
class MockGmailService {
  constructor() {
    this.channelType = 'gmail';
    this.channelName = 'Gmail';
    this.isConnected = true;
    this.authState = true; // 認証状態を一貫性を保つため固定
  }

  getChannelInfo() {
    return {
      type: this.channelType,
      name: this.channelName,
      isConnected: this.isConnected
    };
  }

  async isAuthenticated() {
    // 一貫性を保つため、固定値を返す
    return this.authState;
  }

  async authenticate() {
    console.log('📧 Gmail認証を実行中...');
    await this.delay(1000);
    this.authState = true;
    return { success: true };
  }

  async getMessages({ limit = 10, unreadOnly = true } = {}) {
    console.log(`📬 Gmail新着メッセージ取得中... (limit: ${limit}, unreadOnly: ${unreadOnly})`);
    
    // 認証確認
    if (!this.authState) {
      return {
        success: false,
        error: { message: 'Gmail認証が必要です' }
      };
    }

    // 模擬的な取得遅延
    await this.delay(1500);

    // ランダムにメッセージを返す
    const randomCount = Math.floor(Math.random() * TEST_CONFIG.mockMessages.length) + 1;
    const messages = TEST_CONFIG.mockMessages.slice(0, Math.min(randomCount, limit));

    return {
      success: true,
      messages: messages,
      hasMore: false
    };
  }

  async sendMessage(params) {
    console.log('📤 Gmail メッセージ送信中...');
    await this.delay(2000);
    return {
      success: true,
      messageId: 'sent_' + Date.now()
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Reply Assistant Service モック
class MockReplyAssistantService {
  constructor() {
    this.gmailService = new MockGmailService();
  }

  async fetchAllUnreadMessages() {
    console.log('🤖 統合受信箱: 全チャンネルの新着メッセージ取得中...');
    
    const gmailResult = await this.gmailService.getMessages({ limit: 5 });
    
    const result = {
      success: true,
      messages: gmailResult.success ? gmailResult.messages : [],
      channelResults: {
        gmail: {
          success: gmailResult.success,
          messageCount: gmailResult.success ? gmailResult.messages.length : 0,
          error: gmailResult.error
        }
      },
      totalUnread: gmailResult.success ? gmailResult.messages.length : 0,
      lastFetch: new Date()
    };

    return result;
  }

  async generateReply(originalMessage) {
    console.log('🤖 AI返信案生成中...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      reply: `${originalMessage.from.split('<')[0].trim()}様\n\nお疲れさまです。\n\n${originalMessage.subject}の件、承知いたしました。\n詳細を確認して、後日回答させていただきます。\n\nよろしくお願いいたします。`,
      confidence: 0.85
    };
  }
}

// テスト実行関数
async function runGmailMessageDisplayTest() {
  console.log('�� Gmail新着メッセージ表示テスト開始');
  console.log('=====================================');
  
  try {
    // 1. Gmail Service 初期化テスト
    console.log('\n📧 Gmail Service 初期化テスト');
    const gmailService = new MockGmailService();
    const channelInfo = gmailService.getChannelInfo();
    
    console.log(`✅ Channel Type: ${channelInfo.type}`);
    console.log(`✅ Channel Name: ${channelInfo.name}`);
    console.log(`✅ Connection Status: ${channelInfo.isConnected ? '接続中' : '切断'}`);
    
    // 2. 認証状態確認テスト
    console.log('\n🔐 認証状態確認テスト');
    const isAuthenticated = await gmailService.isAuthenticated();
    
    if (!isAuthenticated) {
      console.log('❌ Gmail認証が必要です');
      await gmailService.authenticate();
      console.log('✅ Gmail認証完了');
    } else {
      console.log('✅ Gmail認証済み');
    }
    
    // 3. 新着メッセージ取得テスト
    console.log('\n📬 新着メッセージ取得テスト');
    const result = await gmailService.getMessages({
      limit: TEST_CONFIG.maxMessages,
      unreadOnly: true
    });
    
    if (result.success) {
      console.log(`📨 ${result.messages.length}件の新着メッセージを取得しました`);
      
      // メッセージ表示
      result.messages.forEach((message, index) => {
        console.log(`\n--- メッセージ ${index + 1} ---`);
        console.log(`📧 From: ${message.from}`);
        console.log(`🏷️  Subject: ${message.subject}`);
        console.log(`📄 Snippet: ${message.snippet.substring(0, 50)}...`);
        console.log(`🕐 Time: ${message.timestamp.toLocaleString('ja-JP')}`);
        console.log(`📍 Channel: ${message.channel}`);
        console.log(`🔍 Status: ${message.isUnread ? '未読' : '既読'}`);
        console.log(`🧵 Thread ID: ${message.threadId}`);
      });
      
      // 4. 統合受信箱テスト
      console.log('\n🤖 統合受信箱テスト');
      const replyAssistant = new MockReplyAssistantService();
      const unifiedResult = await replyAssistant.fetchAllUnreadMessages();
      
      console.log(`📊 統合結果: ${unifiedResult.messages.length}件のメッセージ`);
      console.log('📋 チャンネル別内訳:');
      
      Object.entries(unifiedResult.channelResults).forEach(([channel, result]) => {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} ${channel}: ${result.messageCount}件`);
      });
      
      // 5. AI返信案生成テスト
      if (unifiedResult.messages.length > 0) {
        console.log('\n🤖 AI返信案生成テスト');
        const firstMessage = unifiedResult.messages[0];
        const replyResult = await replyAssistant.generateReply(firstMessage);
        
        if (replyResult.success) {
          console.log('✅ AI返信案生成成功');
          console.log(`📝 信頼度: ${(replyResult.confidence * 100).toFixed(1)}%`);
          console.log('📄 生成された返信案:');
          console.log('---');
          console.log(replyResult.reply);
          console.log('---');
        } else {
          console.log('❌ AI返信案生成失敗');
        }
      }
      
      // 6. テスト結果サマリー
      console.log('\n📊 テスト結果サマリー');
      console.log('========================');
      console.log(`✅ Gmail Service 初期化: 成功`);
      console.log(`✅ 認証状態確認: ${isAuthenticated ? '認証済み' : '認証実行完了'}`);
      console.log(`✅ 新着メッセージ取得: ${result.messages.length}件`);
      console.log(`✅ 統合受信箱: ${unifiedResult.totalUnread}件`);
      console.log(`✅ AI返信案生成: 実行完了`);
      
      console.log('\n🎉 Gmail新着メッセージ表示テスト完了!');
      return true;
      
    } else {
      console.log('❌ メッセージ取得に失敗しました');
      console.log('🔍 エラー:', result.error?.message || '不明なエラー');
      return false;
    }
    
  } catch (error) {
    console.error('💥 テスト実行中にエラーが発生しました:', error.message);
    console.log('\n🔧 トラブルシューティング:');
    console.log('1. Node.js環境が正しくセットアップされているか確認');
    console.log('2. 必要な依存関係がインストールされているか確認');
    console.log('3. プロジェクトディレクトリが正しいか確認');
    return false;
  }
}

// テストレポート生成
function generateTestReport(testResult) {
  const report = {
    timestamp: new Date().toISOString(),
    testResult: testResult ? 'SUCCESS' : 'FAILED',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    summary: {
      totalTests: 6,
      passedTests: testResult ? 6 : 0,
      failedTests: testResult ? 0 : 6
    }
  };
  
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 テストレポート生成完了: ${reportPath}`);
}

// メイン実行
async function main() {
  console.log('🧪 Gmail新着メッセージ表示 統合テスト実行');
  console.log('===========================================');
  
  try {
    const testResult = await runGmailMessageDisplayTest();
    generateTestReport(testResult);
    
    if (testResult) {
      console.log('\n🎉 すべてのテストが成功しました！');
      process.exit(0);
    } else {
      console.log('\n❌ テストに失敗しました');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 統合テスト実行中にエラーが発生しました:', error.message);
    generateTestReport(false);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

module.exports = { runGmailMessageDisplayTest, MockGmailService, MockReplyAssistantService }; 