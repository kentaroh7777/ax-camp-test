#!/usr/bin/env node

/**
 * Gmail新着メッセージ表示テスト
 * Chrome拡張機能のサービス層をテストします
 */

const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '../../chrome-extension');
const TEST_TIMEOUT = 30000; // 30秒

async function testGmailMessageDisplay() {
    console.log('🔍 Gmail新着メッセージ表示テスト開始');
    console.log('=====================================');
    
    let browser;
    let context;
    let page;
    
    try {
        // Chrome拡張機能の設定
        console.log('🚀 Chrome拡張機能環境セットアップ中...');
        
        browser = await chromium.launch({
            headless: false,
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`,
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        context = await browser.newContext();
        page = await context.newPage();
        
        // テスト用HTMLページを開く
        const testHtmlPath = path.join(__dirname, 'gmail-message-demo.html');
        await page.goto(`file://${testHtmlPath}`);
        
        console.log('✅ Chrome拡張機能環境セットアップ完了');
        
        // ページ読み込み待機
        await page.waitForSelector('#startTest', { timeout: TEST_TIMEOUT });
        
        // Chrome拡張機能環境チェック
        console.log('🔍 Chrome拡張機能環境チェック中...');
        
        const chromeApiAvailable = await page.evaluate(() => {
            return typeof chrome !== 'undefined';
        });
        
        if (!chromeApiAvailable) {
            throw new Error('Chrome拡張機能環境が利用できません');
        }
        
        console.log('✅ Chrome拡張機能環境チェック完了');
        
        // Gmail新着メッセージ取得テスト開始
        console.log('📬 Gmail新着メッセージ取得テスト開始...');
        
        // テスト開始ボタンをクリック
        await page.click('#startTest');
        
        // テスト実行完了を待機
        await page.waitForSelector('#messages', { 
            state: 'visible', 
            timeout: TEST_TIMEOUT 
        });
        
        // 結果を取得
        const testResult = await page.evaluate(() => {
            const statusDiv = document.getElementById('status');
            const messageList = document.getElementById('messageList');
            const statsContent = document.getElementById('statsContent');
            
            return {
                status: statusDiv.textContent,
                statusClass: statusDiv.className,
                messageCount: messageList.children.length,
                statsContent: statsContent.textContent
            };
        });
        
        console.log('📊 テスト結果:');
        console.log(`  ステータス: ${testResult.status}`);
        console.log(`  メッセージ数: ${testResult.messageCount}件`);
        console.log(`  統計情報: ${testResult.statsContent}`);
        
        // 成功判定
        if (testResult.statusClass.includes('success') && testResult.messageCount > 0) {
            console.log('✅ Gmail新着メッセージ表示テスト成功');
            return true;
        } else {
            console.log('❌ Gmail新着メッセージ表示テスト失敗');
            return false;
        }
        
    } catch (error) {
        console.error('💥 テスト実行中にエラーが発生しました:', error.message);
        console.log('\n🔧 トラブルシューティング:');
        console.log('1. Chrome拡張機能が正しくビルドされているか確認');
        console.log('2. 必要な依存関係がインストールされているか確認');
        console.log('3. ネットワーク接続を確認');
        throw error;
    } finally {
        // クリーンアップ
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    }
}

// 統合テスト実行
async function runIntegrationTest() {
    console.log('🧪 Gmail新着メッセージ表示 統合テスト実行');
    console.log('===========================================');
    
    try {
        const result = await testGmailMessageDisplay();
        
        if (result) {
            console.log('\n🎉 すべてのテストが成功しました！');
            process.exit(0);
        } else {
            console.log('\n❌ テストに失敗しました');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 統合テスト実行中にエラーが発生しました:', error.message);
        process.exit(1);
    }
}

// スクリプトとして実行された場合
if (require.main === module) {
    runIntegrationTest();
}

module.exports = { testGmailMessageDisplay };
