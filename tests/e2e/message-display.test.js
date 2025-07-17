/**
 * Chrome拡張環境での実際のメッセージ受信・表示テスト
 * 
 * 目的:
 * - 統一受信箱での実際のメッセージ表示確認
 * - 認証状態の確認
 * - メッセージ取得機能の動作確認
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.join(__dirname, '../../chrome-extension/dist');

test.describe('Chrome Extension Message Display Tests', () => {
  let context;
  let extensionId = 'ffjcncnmhhpllgphmbjpnhaegclldlhb'; // 前回のテストで判明したID

  test.beforeAll(async ({ playwright }) => {
    console.log('📨 Chrome拡張メッセージ表示テスト開始');
    
    context = await playwright.chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security'
      ],
      viewport: { width: 1280, height: 720 }
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('統一受信箱でのメッセージ表示テスト', async () => {
    console.log('📧 統一受信箱メッセージ表示テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    // コンソールログを収集
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      // ポップアップを開く
      await page.goto(popupUrl);
      await page.waitForTimeout(3000);
      
      // 初期状態のスクリーンショット
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/message-test-initial.png',
        fullPage: true
      });
      console.log('📸 初期状態');

      // Chrome拡張のストレージ状態を確認
      const storageState = await page.evaluate(async () => {
        try {
          // Chrome拡張のストレージAPIを使用
          const storage = await chrome.storage.local.get(null);
          return {
            hasStorage: true,
            storageKeys: Object.keys(storage),
            storageSize: JSON.stringify(storage).length,
            authTokens: storage.authTokens || null
          };
        } catch (error) {
          return {
            hasStorage: false,
            error: error.message
          };
        }
      });
      
      console.log('💾 ストレージ状態:', JSON.stringify(storageState, null, 2));

      // 「確認開始」ボタンを探してクリック
      const refreshButton = await page.locator('button:has-text("確認開始"), .ant-btn:has-text("確認開始")').first();
      
      if (await refreshButton.count() > 0) {
        console.log('🔄 「確認開始」ボタンをクリック');
        await refreshButton.click();
        await page.waitForTimeout(5000); // メッセージ取得を待つ
        
        // 確認開始後のスクリーンショット
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/message-test-after-refresh.png',
          fullPage: true
        });
        console.log('📸 確認開始後');
      } else {
        console.log('⚠️ 「確認開始」ボタンが見つかりません');
      }

      // メッセージリストの確認
      const messageElements = await page.locator('.ant-list-item, [class*="message"], [class*="inbox"]').all();
      console.log(`📝 メッセージ要素数: ${messageElements.length}`);

      // 認証エラーの確認
      const errorMessages = await page.locator('.ant-message-error, .error-message, [class*="error"]').all();
      if (errorMessages.length > 0) {
        console.log('❌ エラーメッセージが表示されています');
        for (let i = 0; i < errorMessages.length; i++) {
          const errorText = await errorMessages[i].textContent();
          console.log(`   エラー ${i + 1}: ${errorText}`);
        }
      }

      // 収集されたコンソールログを表示
      console.log('🔍 ブラウザーコンソールログ:');
      consoleLogs.forEach((log, index) => {
        console.log(`   ${index + 1}: ${log}`);
      });

      // ページの現在の状態を詳細分析
      const pageState = await page.evaluate(() => {
        const rootElement = document.getElementById('root');
        return {
          hasRoot: !!rootElement,
          rootContent: rootElement ? rootElement.textContent.substring(0, 500) : 'No root element',
          hasAuthError: document.body.textContent.includes('認証') || 
                       document.body.textContent.includes('ログイン') ||
                       document.body.textContent.includes('トークン'),
          hasLoadingIndicator: document.body.textContent.includes('Loading') ||
                              document.body.textContent.includes('読み込み'),
          messageCount: document.querySelectorAll('[class*="message"], .ant-list-item').length,
          buttonCount: document.querySelectorAll('button, .ant-btn').length,
          totalTextLength: document.body.textContent.length
        };
      });
      
      console.log('📊 ページ状態詳細分析:');
      console.log(JSON.stringify(pageState, null, 2));

      // 最終状態のスクリーンショット
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/message-test-final-state.png',
        fullPage: true
      });

      // テスト結果の判定
      if (pageState.hasAuthError) {
        console.log('🔐 認証が必要な状態です');
        console.log('💡 Gmail認証を設定してください');
      } else if (pageState.messageCount > 0) {
        console.log('✅ メッセージが表示されています');
      } else {
        console.log('📭 メッセージが表示されていません（未読がない可能性）');
      }

      // 基本的な表示確認
      expect(pageState.hasRoot).toBe(true);
      expect(pageState.totalTextLength).toBeGreaterThan(50);

    } catch (error) {
      console.error('❌ メッセージ表示テストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/message-test-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });

  test('Chrome拡張での認証状態確認', async () => {
    console.log('🔐 認証状態確認テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(3000);

      // 設定ボタンをクリックして認証設定を確認
      const settingsButton = await page.locator('button:has-text("設定"), .ant-btn:has-text("設定")').first();
      
      if (await settingsButton.count() > 0) {
        console.log('⚙️ 設定ボタンをクリック');
        await settingsButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/auth-test-settings-modal.png',
          fullPage: true
        });
        console.log('📸 設定モーダル');

        // 認証設定の状態を確認
        const authSettings = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          return {
            hasGmailSettings: bodyText.includes('Gmail') || bodyText.includes('Google'),
            hasDiscordSettings: bodyText.includes('Discord'),
            hasLineSettings: bodyText.includes('LINE'),
            hasTokenSettings: bodyText.includes('Token') || bodyText.includes('トークン'),
            modalVisible: document.querySelector('.ant-modal, [class*="modal"]') !== null
          };
        });
        
        console.log('🔍 認証設定状態:', JSON.stringify(authSettings, null, 2));

        // 設定モーダルを閉じる
        const closeButton = await page.locator('.ant-modal-close, button:has-text("キャンセル"), button:has-text("閉じる")').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(1000);
        }
      } else {
        console.log('⚠️ 設定ボタンが見つかりません');
      }

      // 認証状態の直接確認
      const directAuthCheck = await page.evaluate(async () => {
        try {
          // Chrome拡張環境での認証状態確認
          const storage = await chrome.storage.local.get(['authTokens', 'settings']);
          return {
            hasAuthTokens: !!storage.authTokens,
            authTokenKeys: storage.authTokens ? Object.keys(storage.authTokens) : [],
            hasSettings: !!storage.settings
          };
        } catch (error) {
          return {
            error: error.message,
            chromeApiAvailable: typeof chrome !== 'undefined'
          };
        }
      });
      
      console.log('📋 直接認証確認結果:', JSON.stringify(directAuthCheck, null, 2));

      await page.screenshot({ 
        path: 'tests/e2e/screenshots/auth-test-final.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ 認証確認エラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/auth-test-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });
}); 