// Chrome拡張環境変数テスト (修正版)
import { test, expect } from '@playwright/test';

test.describe('Chrome Extension Environment Variables Test', () => {
  let page;
  let extensionId;

  test.beforeAll(async ({ context }) => {
    // Chrome拡張を読み込み
    const pathToExtension = './chrome-extension/dist';
    const browserContext = await context.browser().newContext({
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    page = await browserContext.newPage();
    
    // 拡張機能IDを取得
    await page.goto('chrome://extensions');
    await page.waitForTimeout(2000);
    
    const extensionCards = await page.locator('.extension-list-item-wrapper').all();
    for (const card of extensionCards) {
      const nameElement = await card.locator('[slot="name"]');
      if (await nameElement.count() > 0) {
        const name = await nameElement.textContent();
        if (name && name.includes('Multi-Channel Reply Assistant')) {
          const idElement = await card.locator('#extension-id');
          if (await idElement.count() > 0) {
            extensionId = await idElement.textContent();
            break;
          }
        }
      }
    }
    
    console.log('Extension ID:', extensionId);
    expect(extensionId).toBeDefined();
  });

  test('should have environment variables properly injected by webpack', async () => {
    console.log('🔧 環境変数テスト開始');
    
    // ポップアップページを開く
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    console.log('Opening popup URL:', popupUrl);
    
    await page.goto(popupUrl);
    await page.waitForTimeout(3000);
    
    // 環境変数をブラウザコンソールで確認
    const environmentCheck = await page.evaluate(() => {
      return {
        nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'process.env undefined',
        proxyServerUrl: typeof process !== 'undefined' ? process.env.PROXY_SERVER_URL : 'process.env undefined',
        processExists: typeof process !== 'undefined',
        windowLocation: window.location.href,
        userAgent: navigator.userAgent
      };
    });
    
    console.log('🔍 Environment Check Results:');
    console.log('- NODE_ENV:', environmentCheck.nodeEnv);
    console.log('- PROXY_SERVER_URL:', environmentCheck.proxyServerUrl);
    console.log('- process exists:', environmentCheck.processExists);
    console.log('- Window location:', environmentCheck.windowLocation);
    
    // ネットワーク要求監視開始
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });
    
    // ポップアップUIの確認
    const title = await page.locator('h4').textContent();
    console.log('✅ Popup title:', title);
    expect(title).toContain('Multi-Channel Reply Assistant');
    
    // 統一受信箱の読み込み待機
    await page.waitForSelector('[data-testid="unified-inbox"]', { timeout: 10000 });
    console.log('✅ UnifiedInbox component loaded');
    
    // 少し待ってからネットワーク要求をチェック
    await page.waitForTimeout(5000);
    
    console.log('\n📡 Network Requests Analysis:');
    console.log('Total requests made:', networkRequests.length);
    
    const proxyRequests = networkRequests.filter(req => 
      req.url.includes('localhost:3000') || req.url.includes('127.0.0.1:3000')
    );
    
    console.log('Proxy server requests:', proxyRequests.length);
    if (proxyRequests.length > 0) {
      console.log('✅ Proxy requests found:');
      proxyRequests.forEach(req => {
        console.log(`  - ${req.method} ${req.url}`);
      });
    } else {
      console.log('❌ No proxy server requests detected');
      console.log('📋 All network requests:');
      networkRequests.forEach(req => {
        console.log(`  - ${req.method} ${req.url}`);
      });
    }
    
    // Service Worker環境での環境変数確認
    const serviceWorkerCheck = await page.evaluate(async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            hasServiceWorker: !!registration,
            registrationScope: registration?.scope || 'none'
          };
        }
        return { hasServiceWorker: false };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n🛠️ Service Worker Check:', serviceWorkerCheck);
    
    // Chrome拡張のバックグラウンドページでの環境変数確認
    try {
      const backgroundPage = await page.context().newPage();
      await backgroundPage.goto(`chrome-extension://${extensionId}/background/service-worker.js`);
      console.log('✅ Background page accessible');
    } catch (error) {
      console.log('⚠️ Background page not accessible:', error.message);
    }
    
    // テスト結果の判定
    if (environmentCheck.processExists && environmentCheck.proxyServerUrl === 'http://localhost:3000') {
      console.log('\n🎉 SUCCESS: Environment variables properly injected!');
      console.log('✅ PROXY_SERVER_URL correctly set to:', environmentCheck.proxyServerUrl);
    } else {
      console.log('\n❌ ISSUE: Environment variables not properly injected');
      console.log('- Expected PROXY_SERVER_URL: http://localhost:3000');
      console.log('- Actual PROXY_SERVER_URL:', environmentCheck.proxyServerUrl);
      
      if (!environmentCheck.processExists) {
        console.log('- Issue: process object not available in Chrome extension context');
      }
    }
    
    // Assertion
    expect(environmentCheck.proxyServerUrl).toBe('http://localhost:3000');
  });
}); 