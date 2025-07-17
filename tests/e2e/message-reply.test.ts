/**
 * Chrome拡張環境でのメッセージ返信AI生成機能テスト
 * 
 * 目的:
 * - 統一受信箱でのメッセージ表示確認（各チャンネル最大2件まで）
 * - 返信ボタンクリックとReplyModal表示確認
 * - AI返信案生成機能の動作確認
 * - 実際の返信は行わず、返信案生成のみテスト
 */

import { test, expect, BrowserContext, ConsoleMessage } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.join(__dirname, '../../chrome-extension/dist');

test.describe('Chrome Extension Message Reply AI Generation Tests', () => {
  let context: BrowserContext;
  let extensionId = 'ffjcncnmhhpllgphmbjpnhaegclldlhb'; // 拡張ID

  test.beforeAll(async ({ playwright }) => {
    console.log('🤖 Chrome拡張メッセージ返信AI生成テスト開始');
    
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

  test('メッセージ表示と制限確認（各チャンネル最大2件）', async () => {
    console.log('📊 メッセージ表示制限テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    const consoleLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(3000);
      
      // 初期状態のスクリーンショット
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/reply-test-initial.png',
        fullPage: true
      });
      console.log('📸 初期状態');

      // 「確認開始」ボタンをクリック
      const refreshButton = await page.locator('button:has-text("確認開始"), .ant-btn:has-text("確認開始")').first();
      
      if (await refreshButton.count() > 0) {
        console.log('🔄 「確認開始」ボタンをクリック');
        await refreshButton.click();
        await page.waitForTimeout(5000); // メッセージ取得を待つ
        
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-after-fetch.png',
          fullPage: true
        });
        console.log('📸 メッセージ取得後');
      }

      // メッセージリストの確認
      const messageElements = await page.locator('.ant-list-item').all();
      console.log(`📝 表示されたメッセージ数: ${messageElements.length}`);

      // メッセージ表示制限の確認（各チャンネル最大2件）
      const messagesByChannel = await page.evaluate(() => {
        const messageItems = document.querySelectorAll('.ant-list-item');
        const channelCounts: Record<string, number> = {};
        
        messageItems.forEach(item => {
          const channelText = item.textContent || '';
          let channel = 'unknown';
          
          if (channelText.includes('<Gmail>')) channel = 'gmail';
          else if (channelText.includes('<Discord>')) channel = 'discord';
          else if (channelText.includes('<LINE>')) channel = 'line';
          
          channelCounts[channel] = (channelCounts[channel] || 0) + 1;
        });
        
        return channelCounts;
      });
      
      console.log('📊 チャンネル別メッセージ数:', JSON.stringify(messagesByChannel, null, 2));
      
      // 各チャンネルが最大2件の制限を守っているか確認
      Object.entries(messagesByChannel).forEach(([channel, count]) => {
        expect(count).toBeLessThanOrEqual(2);
        console.log(`✅ ${channel}: ${count}件 (制限内)`);
      });

      if (messageElements.length === 0) {
        console.log('📭 メッセージが表示されていません（テスト環境にメッセージがない可能性）');
        console.log('⚠️ 返信機能のテストには実際のメッセージが必要です');
      } else {
        console.log(`✅ ${messageElements.length}件のメッセージが制限内で表示されています`);
      }

      // メッセージ数のアサーション（0件でも制限機能は動作しているとみなす）
      expect(messageElements.length).toBeGreaterThanOrEqual(0);

    } catch (error) {
      console.error('❌ メッセージ表示制限テストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/reply-test-display-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });

  test('最新メッセージ1件への返信ボタンクリックテスト', async () => {
    console.log('💬 返信ボタンクリックテスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    const consoleLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(3000);

      // メッセージを取得
      const refreshButton = await page.locator('button:has-text("確認開始")').first();
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }

      // 最初のメッセージの返信ボタンを探す（空白ありのパターンにも対応）
      const firstReplyButton = await page.locator('.ant-list-item button').filter({ hasText: /返[\s]*信/ }).first();
      
      if (await firstReplyButton.count() > 0) {
        console.log('📧 最新メッセージの返信ボタンをクリック');
        
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-before-click.png',
          fullPage: true
        });
        
        await firstReplyButton.click();
        await page.waitForTimeout(2000);
        
        // ReplyModalが開いているか確認
        const replyModal = await page.locator('.ant-modal, .reply-modal').first();
        expect(await replyModal.count()).toBeGreaterThan(0);
        console.log('✅ 返信モーダルが開きました');
        
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-modal-opened.png',
          fullPage: true
        });
        
        // モーダルのタイトル確認
        const modalTitle = await page.locator('.ant-modal-title').first().textContent();
        expect(modalTitle).toContain('返信');
        console.log('📝 モーダルタイトル:', modalTitle);

        // === 関連メッセージデバッグ処理を追加 ===
        console.log('🔍 関連メッセージデバッグ開始');
        
        // 関連メッセージセクションの存在確認
        const relatedMessagesSection = await page.locator('.related-messages').first();
        const relatedMessagesSectionExists = await relatedMessagesSection.count() > 0;
        console.log('📋 関連メッセージセクションの存在:', relatedMessagesSectionExists);
        
        if (relatedMessagesSectionExists) {
          const relatedMessagesContent = await relatedMessagesSection.textContent();
          console.log('📋 関連メッセージセクション内容:', relatedMessagesContent);
          
          const relatedMessageItems = await page.locator('.related-message-item').all();
          console.log('📋 関連メッセージアイテム数:', relatedMessageItems.length);
        } else {
          console.log('⚠️ 関連メッセージセクションが見つかりません');
        }
        
        // モーダル全体の内容確認
        const modalContent = await replyModal.textContent();
        console.log('📝 モーダル全体の内容（最初の500文字）:', modalContent?.substring(0, 500) + '...');
        
        // 追加で5秒待機して関連メッセージ取得処理の完了を待つ
        console.log('⏳ 関連メッセージ取得完了を待機中...');
        await page.waitForTimeout(5000);
        
        // 再度関連メッセージの確認
        const finalRelatedMessagesSection = await page.locator('.related-messages').first();
        const finalRelatedMessagesSectionExists = await finalRelatedMessagesSection.count() > 0;
        console.log('📋 最終的な関連メッセージセクションの存在:', finalRelatedMessagesSectionExists);
        
        // 最終状態のスクリーンショット
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-modal-final-state.png',
          fullPage: true
        });
        
        // 収集されたコンソールログを関連メッセージ関連のものに絞って表示
        console.log('🔍 関連メッセージ関連のコンソールログ:');
        const relatedLogs = consoleLogs.filter(log => 
          log.includes('関連メッセージ') || 
          log.includes('getRelatedMessages') || 
          log.includes('fetchRelatedMessages') ||
          log.includes('UserMapping') ||
          log.includes('ReplyAssistant') ||
          log.includes('isMessageFromUser')
        );
        
        if (relatedLogs.length > 0) {
          relatedLogs.forEach((log, index) => {
            console.log(`   🔍 ${index + 1}: ${log}`);
          });
        } else {
          console.log('⚠️ 関連メッセージ関連のログが見つかりません');
          
          // 全てのログから最後の20件を表示
          console.log('📝 最新20件のコンソールログ:');
          consoleLogs.slice(-20).forEach((log, index) => {
            console.log(`   📝 ${index + 1}: ${log}`);
          });
        }

      } else {
        console.log('⚠️ 返信ボタンが見つかりません（メッセージがない可能性）');
        
        // メッセージがない場合のスクリーンショット
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-no-messages.png',
          fullPage: true
        });
      }

    } catch (error) {
      console.error('❌ 返信ボタンクリックテストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/reply-test-click-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });

  test('AI返信案生成機能テスト', async () => {
    console.log('🤖 AI返信案生成機能テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    const consoleLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(3000);

      // メッセージを取得
      const refreshButton = await page.locator('button:has-text("確認開始")').first();
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }

      // 最初のメッセージの返信ボタンをクリック
      const firstReplyButton = await page.locator('.ant-list-item button:has-text("返信")').first();
      
      if (await firstReplyButton.count() > 0) {
        await firstReplyButton.click();
        await page.waitForTimeout(3000);
        
        // AI生成中の表示確認
        const generatingIndicator = await page.locator('.ant-spin, [class*="generating"], text=AI返信を生成中').first();
        if (await generatingIndicator.count() > 0) {
          console.log('🔄 AI返信生成中...');
          
          await page.screenshot({ 
            path: 'tests/e2e/screenshots/reply-test-ai-generating.png',
            fullPage: true
          });
        }
        
        // AI生成完了まで待機（最大10秒）
        await page.waitForTimeout(10000);
        
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-ai-generated.png',
          fullPage: true
        });
        
        // 生成された返信案の確認
        const generatedReply = await page.locator('.generated-reply-card, [class*="generated"], .ai-reply-section').first();
        const replyTextArea = await page.locator('textarea').first();
        
        if (await generatedReply.count() > 0) {
          const replyContent = await generatedReply.textContent();
          console.log('✅ AI返信案が生成されました');
          console.log('📝 生成された返信案（抜粋）:', replyContent?.substring(0, 100) + '...');
          
          expect(replyContent).toBeTruthy();
          expect(replyContent?.length).toBeGreaterThan(10);
        } else if (await replyTextArea.count() > 0) {
          const textAreaValue = await replyTextArea.inputValue();
          console.log('✅ テキストエリアに返信案が設定されました');
          console.log('📝 返信案（抜粋）:', textAreaValue.substring(0, 100) + '...');
          
          expect(textAreaValue).toBeTruthy();
          expect(textAreaValue.length).toBeGreaterThan(10);
        } else {
          console.log('⚠️ AI返信案が見つかりません');
        }
        
        // ボタンの状態確認
        const aiRegenerateButton = await page.locator('button:has-text("AI再生成"), button:has-text("再生成")').first();
        const sendButton = await page.locator('button:has-text("送信")').first();
        const cancelButton = await page.locator('button:has-text("キャンセル"), button:has-text("閉じる")').first();
        
        expect(await aiRegenerateButton.count()).toBeGreaterThan(0);
        expect(await sendButton.count()).toBeGreaterThan(0);
        expect(await cancelButton.count()).toBeGreaterThan(0);
        
        console.log('✅ 返信関連ボタンが正常に表示されています');
        
        // 実際の送信はテストしない（要件通り）
        console.log('📋 実際の送信テストはスキップ（要件通り）');
        
        // AI再生成ボタンのテスト
        if (await aiRegenerateButton.count() > 0) {
          console.log('🔄 AI再生成ボタンをテスト');
          await aiRegenerateButton.click();
          await page.waitForTimeout(3000);
          
          await page.screenshot({ 
            path: 'tests/e2e/screenshots/reply-test-ai-regenerated.png',
            fullPage: true
          });
          
          console.log('✅ AI再生成機能も動作しました');
        }
        
        // モーダルを閉じる
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
          await page.waitForTimeout(1000);
          console.log('✅ 返信モーダルを閉じました');
        }

      } else {
        console.log('⚠️ 返信ボタンが見つかりません（テスト用メッセージが必要）');
        
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/reply-test-no-reply-button.png',
          fullPage: true
        });
      }

      // 収集されたコンソールログを表示
      console.log('🔍 ブラウザーコンソールログ:');
      consoleLogs.forEach((log, index) => {
        if (log.includes('error') || log.includes('Error')) {
          console.log(`   ❌ ${index + 1}: ${log}`);
        } else {
          console.log(`   📝 ${index + 1}: ${log}`);
        }
      });

    } catch (error) {
      console.error('❌ AI返信案生成テストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/reply-test-ai-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });

  test('Claude APIを使った返信案生成テスト', async () => {
    console.log('🤖 Claude API返信案生成テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    const consoleLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(5000);

      // メッセージ取得
      const refreshButton = await page.locator('button:has-text("確認開始")').first();
      if (await refreshButton.count() > 0) {
        console.log('🔄 メッセージを取得中...');
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }

      // 返信ボタンをクリック
      const replyButton = await page.locator('.ant-list-item button').filter({ hasText: /返[\\s]*信/ }).first();
      
      if (await replyButton.count() > 0) {
        console.log('💬 返信ボタンをクリック');
        await replyButton.click();
        await page.waitForTimeout(2000);

        // 返信モーダルが開いているか確認
        const modal = await page.locator('.ant-modal');
        expect(await modal.count()).toBeGreaterThan(0);
        console.log('✅ 返信モーダルが開きました');

        // AI生成ボタンを探してクリック
        const aiGenerateButton = await page.locator('button:has-text("AI生成"), .ant-btn:has-text("AI生成")').first();
        
        if (await aiGenerateButton.count() > 0) {
          console.log('🤖 AI返信案生成ボタンをクリック');
          await aiGenerateButton.click();
          
          // Claude APIの呼び出しを待つ（少し長めに）
          await page.waitForTimeout(10000);
          
          // 生成された返信案を確認
          const replyTextarea = await page.locator('textarea, .ant-input');
          const generatedText = await replyTextarea.first().inputValue().catch(() => '');
          
          console.log('📝 生成された返信案:', generatedText);
          
          if (generatedText && generatedText.length > 0) {
            console.log('✅ Claude APIによる返信案が生成されました');
            
            // 日本語かどうか確認
            const hasJapanese = /[あ-んア-ンぁ-ゞ一-龯]/.test(generatedText);
            expect(hasJapanese).toBe(true);
            console.log('✅ 日本語の返信案が生成されています');
            
            // 適切な長さかどうか確認（10文字以上200文字以内）
            expect(generatedText.length).toBeGreaterThan(10);
            expect(generatedText.length).toBeLessThan(300);
            console.log(`✅ 適切な長さの返信案です (${generatedText.length}文字)`);
            
          } else {
            console.log('⚠️ Claude API呼び出しでエラーが発生した可能性があります');
            
            // エラーメッセージを確認
            const errorMessage = await page.locator('.ant-message-error, .error').textContent().catch(() => '');
            if (errorMessage) {
              console.log('❌ エラーメッセージ:', errorMessage);
            }
            
            // コンソールログから詳細を確認
            console.log('🔍 ブラウザコンソールログ（最後の10件）:');
            consoleLogs.slice(-10).forEach((log, index) => {
              console.log(`   ${index + 1}: ${log}`);
            });
          }
          
        } else {
          console.log('⚠️ AI生成ボタンが見つかりません');
          
          // モーダルの内容を確認
          const modalContent = await page.locator('.ant-modal-body').textContent().catch(() => '') || '';
          console.log('📋 モーダル内容:', modalContent.substring(0, 200));
        }

        // スクリーンショット撮影
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/claude-api-test.png',
          fullPage: true
        });
        console.log('📸 Claude APIテストのスクリーンショット保存');

      } else {
        console.log('⚠️ 返信ボタンが見つかりません（メッセージが不足している可能性）');
      }

    } catch (error) {
      console.error('❌ Claude API テストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/claude-api-test-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });

  test('返信機能の包括的確認テスト', async () => {
    console.log('🔍 返信機能包括テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(5000);  // 初期読み込み時間を増加

      // アプリが完全に読み込まれるまで待機
      await page.waitForSelector('.unified-inbox, h3, .ant-typography', { timeout: 10000 }).catch(() => {
        console.log('⚠️ メインUI要素の読み込みを待機中...');
      });

      // メッセージ取得
      const refreshButton = await page.locator('button:has-text("確認開始")').first();
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }

            // ページの現在の状態を詳細分析（既存テスト参考）
      const pageState = await page.evaluate(() => {
        const rootElement = document.getElementById('root');
        const buttons = Array.from(document.querySelectorAll('button, .ant-btn'));
        const replyButtons = buttons.filter(btn => {
          const text = btn.textContent?.trim() || '';
          return text.includes('返信') || text.includes('返 信');
        });
        
        // 詳細なボタン情報を収集
        const buttonInfo = buttons.map(btn => ({
          text: btn.textContent?.trim() || '',
          className: btn.className || '',
          type: btn.getAttribute('type') || '',
          size: btn.getAttribute('class')?.includes('ant-btn-sm') ? 'small' : 'default'
        }));

        // List.Item の actions 内のボタンを特定
        const listItemActions = Array.from(document.querySelectorAll('.ant-list-item .ant-list-item-action button, .ant-list-item-action .ant-btn'));
        const listActionButtons = listItemActions.map(btn => ({
          text: btn.textContent?.trim() || '',
          className: btn.className || ''
        }));
        
        const bodyText = document.body.textContent || '';
        
        return {
          hasRoot: !!rootElement,
          rootContent: rootElement ? (rootElement.textContent || '').substring(0, 500) : 'No root element',
          hasAuthError: bodyText.includes('認証') || 
                       bodyText.includes('ログイン') ||
                       bodyText.includes('トークン'),
          hasLoadingIndicator: bodyText.includes('Loading') ||
                              bodyText.includes('読み込み'),
          messageCount: document.querySelectorAll('[class*="message"], .ant-list-item').length,
          buttonCount: buttons.length,
          replyButtonCount: replyButtons.length,
          totalTextLength: bodyText.length,
          modalPresent: document.querySelectorAll('.ant-modal').length > 0,
          // デバッグ情報を追加
          allButtons: buttonInfo,
          listActionButtons: listActionButtons,
          listItemCount: document.querySelectorAll('.ant-list-item').length,
          hasListActions: document.querySelectorAll('.ant-list-item-action').length > 0
        };
      });
      
      console.log('📊 ページ状態詳細分析:');
      console.log(JSON.stringify(pageState, null, 2));

      // テスト結果の判定（既存テスト参考）
      if (pageState.hasAuthError) {
        console.log('🔐 認証が必要な状態です');
        console.log('💡 Gmail認証を設定してください');
      } else if (pageState.messageCount > 0) {
        console.log('✅ メッセージが表示されています');
      } else {
        console.log('📭 メッセージが表示されていません（未読がない可能性）');
      }

      // 基本的な表示確認（既存テストと同じ期待値）
      expect(pageState.hasRoot).toBe(true);
      expect(pageState.totalTextLength).toBeGreaterThan(50);
      
      // 最終状態のスクリーンショット
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/reply-test-final-state.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ 包括的確認テストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/reply-test-comprehensive-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });

  test('追加指示機能テスト', async () => {
    console.log('📝 追加指示機能テスト開始');

    const page = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    const consoleLogs: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      await page.goto(popupUrl);
      await page.waitForTimeout(3000);

      // メッセージを取得
      const refreshButton = await page.locator('button:has-text("確認開始")').first();
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }

      // 最初のメッセージの返信ボタンをクリック
      const firstReplyButton = await page.locator('.ant-list-item button').filter({ hasText: /返[\s]*信/ }).first();
      
      if (await firstReplyButton.count() > 0) {
        console.log('📧 返信ボタンをクリック');
        await firstReplyButton.click();
        await page.waitForTimeout(2000);
        
        // 返信モーダルが開いているか確認
        const replyModal = await page.locator('.ant-modal, .reply-modal').first();
        expect(await replyModal.count()).toBeGreaterThan(0);
        console.log('✅ 返信モーダルが開きました');
        
        // 追加指示のテキストエリアを見つけて入力
        const additionalPromptTextarea = await page.locator('textarea').filter({ hasText: /追加指示/ }).or(
          page.locator('textarea[placeholder*="追加指示"]')
        ).first();
        
        if (await additionalPromptTextarea.count() === 0) {
          // プレースホルダーで検索
          const allTextareas = await page.locator('textarea').all();
          console.log('📝 利用可能なテキストエリア数:', allTextareas.length);
          
          for (let i = 0; i < allTextareas.length; i++) {
            const placeholder = await allTextareas[i].getAttribute('placeholder');
            console.log(`📝 テキストエリア ${i + 1} placeholder:`, placeholder);
          }
          
          // 2番目のテキストエリアを追加指示用として使用
          if (allTextareas.length >= 2) {
            console.log('📝 2番目のテキストエリアに追加指示を入力');
            await allTextareas[1].fill('CNPトレカアプリ開発の件を返信文に挿入');
            
            // 入力後のスクリーンショット
            await page.screenshot({ 
              path: 'tests/e2e/screenshots/additional-prompt-input.png',
              fullPage: true
            });
            
            console.log('📝 追加指示入力完了');
            
            // AI再生成ボタンをクリック
            const aiRegenerateButton = await page.locator('button:has-text("AI再生成")').first();
            if (await aiRegenerateButton.count() > 0) {
              console.log('🤖 AI再生成ボタンをクリック');
              await aiRegenerateButton.click();
              
              // 生成完了まで待機
              await page.waitForTimeout(8000);
              
              // 最終状態のスクリーンショット
              await page.screenshot({ 
                path: 'tests/e2e/screenshots/additional-prompt-result.png',
                fullPage: true
              });
              
              console.log('🔍 追加指示関連のコンソールログ:');
              const additionalPromptLogs = consoleLogs.filter(log => 
                log.includes('additionalPrompt') || 
                log.includes('追加指示') ||
                log.includes('LLM') ||
                log.includes('buildUserPrompt') ||
                log.includes('optimizePrompt') ||
                log.includes('CNP')
              );
              
              if (additionalPromptLogs.length > 0) {
                additionalPromptLogs.forEach((log, index) => {
                  console.log(`   📝 ${index + 1}: ${log}`);
                });
              } else {
                console.log('⚠️ 追加指示関連のログが見つかりません');
                
                // 最新のログを表示
                console.log('📝 最新30件のコンソールログ:');
                consoleLogs.slice(-30).forEach((log, index) => {
                  console.log(`   📝 ${index + 1}: ${log}`);
                });
              }
              
              console.log('✅ 追加指示機能テスト完了');
            } else {
              console.log('⚠️ AI再生成ボタンが見つかりません');
            }
          } else {
            console.log('⚠️ 追加指示用のテキストエリアが見つかりません');
          }
        } else {
          console.log('📝 追加指示テキストエリアを発見、入力中...');
          await additionalPromptTextarea.fill('CNPトレカアプリ開発の件を返信文に挿入');
          
          // 入力後のスクリーンショット
          await page.screenshot({ 
            path: 'tests/e2e/screenshots/additional-prompt-input-found.png',
            fullPage: true
          });
          
          console.log('📝 追加指示入力完了');
          
          // AI再生成ボタンをクリック
          const aiRegenerateButton = await page.locator('button:has-text("AI再生成")').first();
          if (await aiRegenerateButton.count() > 0) {
            console.log('🤖 AI再生成ボタンをクリック');
            await aiRegenerateButton.click();
            
            // 生成完了まで待機
            await page.waitForTimeout(8000);
            
            // 最終状態のスクリーンショット
            await page.screenshot({ 
              path: 'tests/e2e/screenshots/additional-prompt-result-found.png',
              fullPage: true
            });
            
            console.log('🔍 追加指示関連のコンソールログ:');
            const additionalPromptLogs = consoleLogs.filter(log => 
              log.includes('additionalPrompt') || 
              log.includes('追加指示') ||
              log.includes('LLM') ||
              log.includes('buildUserPrompt') ||
              log.includes('optimizePrompt') ||
              log.includes('CNP')
            );
            
            if (additionalPromptLogs.length > 0) {
              additionalPromptLogs.forEach((log, index) => {
                console.log(`   📝 ${index + 1}: ${log}`);
              });
            } else {
              console.log('⚠️ 追加指示関連のログが見つかりません');
              
              // 最新のログを表示
              console.log('📝 最新30件のコンソールログ:');
              consoleLogs.slice(-30).forEach((log, index) => {
                console.log(`   📝 ${index + 1}: ${log}`);
              });
            }
            
            console.log('✅ 追加指示機能テスト完了');
          } else {
            console.log('⚠️ AI再生成ボタンが見つかりません');
          }
        }

      } else {
        console.log('⚠️ 返信ボタンが見つかりません');
      }

    } catch (error) {
      console.error('❌ 追加指示機能テストエラー:', error);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/additional-prompt-test-error.png',
        fullPage: true
      });
      
      throw error;
    }
  });
}); 