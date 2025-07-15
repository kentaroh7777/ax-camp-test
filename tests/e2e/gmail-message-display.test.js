// Gmail新着メッセージ表示E2Eテスト
// Chrome拡張機能を使用して実際のGmailメッセージを表示します

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testGmailMessageDisplay() {
  let browser;
  let page;

  try {
    console.log('🚀 Gmail新着メッセージ表示E2Eテスト開始');
    
    // Chrome拡張機能のパス
    const extensionPath = join(__dirname, '../../chrome-extension');
    
    // Chromiumブラウザ起動（拡張機能付き）
    console.log('🌐 Chromiumブラウザ起動中...');
    browser = await chromium.launchPersistentContext(join(__dirname, 'temp-user-data'), {
      headless: false,
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath,
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // メインページ取得
    page = browser.pages()[0];
    
    // Gmailページにアクセス
    console.log('📧 Gmailページにアクセス中...');
    await page.goto('https://mail.google.com/');
    
    // ページ読み込み待機
    await page.waitForTimeout(3000);
    
    // 拡張機能のポップアップを開く
    console.log('🔧 拡張機能のポップアップを開く...');
    
    // 拡張機能のアイコンをクリック（通常はツールバーにある）
    try {
      // 拡張機能のIDを取得する必要がある
      const [extensionPage] = await browser.waitForEvent('page');
      
      if (extensionPage) {
        await extensionPage.waitForLoadState('networkidle');
        
        // 統合受信箱ボタンをクリック
        console.log('📥 統合受信箱機能を実行...');
        
        const inboxButton = await extensionPage.locator('button:has-text("確認開始")');
        if (await inboxButton.isVisible()) {
          await inboxButton.click();
          
          // メッセージ取得待機
          await extensionPage.waitForTimeout(5000);
          
          // メッセージ表示確認
          const messageCards = await extensionPage.locator('.message-card');
          const messageCount = await messageCards.count();
          
          console.log(`📨 ${messageCount}件のメッセージが表示されました`);
          
          // 各メッセージの詳細を出力
          for (let i = 0; i < Math.min(messageCount, 5); i++) {
            const messageCard = messageCards.nth(i);
            const sender = await messageCard.locator('.sender').textContent();
            const subject = await messageCard.locator('.subject').textContent();
            const time = await messageCard.locator('.time').textContent();
            
            console.log(`\n--- メッセージ ${i + 1} ---`);
            console.log(`📧 From: ${sender}`);
            console.log(`🏷️  Subject: ${subject}`);
            console.log(`🕐 Time: ${time}`);
          }
          
          // スクリーンショット取得
          await extensionPage.screenshot({ 
            path: 'tests/e2e/screenshots/gmail-messages.png',
            fullPage: true
          });
          
          console.log('📸 スクリーンショットを保存しました: tests/e2e/screenshots/gmail-messages.png');
          
        } else {
          console.log('❌ 統合受信箱ボタンが見つかりません');
        }
      } else {
        console.log('❌ 拡張機能のポップアップが開けません');
      }
      
    } catch (error) {
      console.log('⚠️ 拡張機能の操作中にエラーが発生しました:', error.message);
      
      // 代替手段：GmailページのContent Scriptをテスト
      console.log('🔄 Content Scriptによるメッセージ取得を試行...');
      
      // Gmailページでコンソールを実行
      const result = await page.evaluate(() => {
        // Chrome拡張機能のContent Scriptが注入されているか確認
        if (window.gmailContentScript) {
          return window.gmailContentScript.getMessages();
        }
        return null;
      });
      
      if (result) {
        console.log('📬 Content Scriptからメッセージを取得しました');
        console.log('📊 取得結果:', result);
      } else {
        console.log('❌ Content Scriptが見つかりません');
      }
    }
    
    // 5秒待機してから終了
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('💥 テスト実行中にエラーが発生しました:', error);
    
    // トラブルシューティング情報
    console.log('\n🔧 トラブルシューティング:');
    console.log('1. Chrome拡張機能がビルドされているか確認');
    console.log('2. Gmail認証が完了しているか確認');
    console.log('3. ネットワーク接続を確認');
    console.log('4. セットアップウィザードを実行: npm run auth:gmail');
    
  } finally {
    // クリーンアップ
    if (browser) {
      await browser.close();
    }
    
    console.log('\n✅ Gmail新着メッセージ表示E2Eテスト完了');
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testGmailMessageDisplay().catch(error => {
    console.error('💥 E2Eテストの実行に失敗しました:', error);
    process.exit(1);
  });
} 