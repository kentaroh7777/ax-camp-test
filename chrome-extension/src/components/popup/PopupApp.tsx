import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout, Typography, message } from 'antd';
import { UnifiedInbox } from '../inbox/UnifiedInbox/UnifiedInbox';
import { ReplyModal } from '../reply/ReplyModal/ReplyModal';
import { SettingsModal } from '../settings/SettingsModal/SettingsModal';
import { ResolvedMessage } from '../../types/core/user.types';
import { ReplyAssistantService } from '../../services/application/reply-assistant.service';
import { SettingsService } from '../../services/application/settings.service';
import { UserMappingService } from '../../services/application/user-mapping.service';
import { LLMIntegrationService } from '../../services/application/llm-integration.service';
import { MessageClientFactory } from '../../services/channel/base/message-client.factory';
import { ChromeStorageRepository } from '../../services/infrastructure/chrome-storage.repository';
import { AuthTokenManager } from '../../services/infrastructure/auth-token.manager';
import { SendMessageParams } from '../../types/core/message.types';
import { ChannelType, Priority } from '../../types/core/channel.types';
import './PopupApp.styles.css';

const { Content } = Layout;
const { Title } = Typography;

interface PopupAppProps {}

const PopupApp: React.FC<PopupAppProps> = () => {
  const [selectedMessage, setSelectedMessage] = useState<ResolvedMessage | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserMappingModal, setShowUserMappingModal] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Initialize services
  const chromeStorageRepository = new ChromeStorageRepository();
  const authTokenManager = new AuthTokenManager(chromeStorageRepository);
  const messageClientFactory = new MessageClientFactory(authTokenManager);
  const userMappingService = new UserMappingService(chromeStorageRepository);
  const llmService = new LLMIntegrationService(chromeStorageRepository);
  const replyAssistantService = new ReplyAssistantService(
    messageClientFactory,
    userMappingService,
    llmService
  );
  const settingsService = new SettingsService(chromeStorageRepository);

  // デモユーザーマッピング自動初期化
  useEffect(() => {
    const initializeDemoUserMapping = async () => {
      try {
        console.log('🎭 デモユーザーマッピング初期化チェック開始');
        
        const existingMappings = await userMappingService.getAllMappings();
        console.log('📊 既存マッピング数:', existingMappings.length);
        
        // 林健太郎のマッピングが存在するかチェック
        const hayashiMapping = existingMappings.find(mapping => 
          mapping.name === '林健太郎' || 
          mapping.channels[ChannelType.GMAIL]?.email === 'kh@h-fpo.com'
        );
        
        if (!hayashiMapping) {
          console.log('🏗️ 林健太郎のデモユーザーマッピングを作成中...');
          
          const demoMapping = {
            name: '林健太郎',
            channels: {
              [ChannelType.GMAIL]: {
                email: 'kh@h-fpo.com',
                userId: 'kh@h-fpo.com',
                displayName: '林FP事務所 林健太郎'
              },
              [ChannelType.DISCORD]: {
                username: 'tama4420',
                userId: '1394492451317878804',
                displayName: 'tama4420'
              },
              [ChannelType.LINE]: {
                displayName: '林健太郎',
                userId: 'Uef5b6811e0ea47b39726288d1f867532'
              }
            },
            priority: Priority.HIGH,
            tags: ['FP事務所', 'クライアント', 'デモユーザー']
          };
          
          const createdMapping = await userMappingService.createMapping(demoMapping);
          console.log('✅ デモユーザーマッピングを作成しました:', createdMapping.id);
          console.log('📧 Gmail:', createdMapping.channels[ChannelType.GMAIL]?.email);
          console.log('💬 Discord:', createdMapping.channels[ChannelType.DISCORD]?.username);
          console.log('📱 LINE:', createdMapping.channels[ChannelType.LINE]?.userId);
          
          messageApi.success('デモユーザー「林健太郎」のアカウント紐づけを初期化しました');
        } else {
          console.log('ℹ️ 林健太郎のユーザーマッピングは既に存在します:', hayashiMapping.id);
        }
      } catch (error) {
        console.error('❌ デモユーザーマッピング初期化エラー:', error);
        messageApi.error('デモユーザーマッピングの初期化に失敗しました');
      }
    };
    
    // 少し遅延してから実行（他の初期化処理の後）
    const timer = setTimeout(initializeDemoUserMapping, 1000);
    return () => clearTimeout(timer);
  }, [userMappingService, messageApi]);

  const handleReplyClick = (message: ResolvedMessage) => {
    setSelectedMessage(message);
    setShowReplyModal(true);
  };

  const handleSendReply = async (content: string, message: ResolvedMessage) => {
    try {
      const allClients = messageClientFactory.createAllClients();
      const client = allClients[message.channel];
      
      if (!client) {
        throw new Error(`Client for channel ${message.channel} not found`);
      }

      const sendParams: SendMessageParams = {
        to: message.from,
        content: content,
        replyTo: message.id,
      };

      const result = await client.sendMessage(sendParams);
      
      if (result.success) {
        messageApi.success('返信を送信しました');
        setShowReplyModal(false);
        setSelectedMessage(null);
      } else {
        throw new Error(result.error?.message || '返信の送信に失敗しました');
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      messageApi.error(error instanceof Error ? error.message : '返信の送信に失敗しました');
      throw error;
    }
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleUserMappingClick = () => {
    setShowUserMappingModal(true);
  };

  const handleSettingsSave = () => {
    messageApi.success('設定を保存しました');
  };

  return (
    <Layout className="popup-app">
      {contextHolder}
      <Content className="popup-content">
        <div className="popup-header">
          <Title level={4} style={{ margin: 0 }}>
            Multi-Channel Reply Assistant
          </Title>
        </div>

        <UnifiedInbox
          replyAssistantService={replyAssistantService}
          onReplyClick={handleReplyClick}
          onSettingsClick={handleSettingsClick}
          onUserMappingClick={handleUserMappingClick}
        />

        <ReplyModal
          visible={showReplyModal}
          message={selectedMessage}
          replyAssistantService={replyAssistantService}
          onSend={handleSendReply}
          onCancel={() => {
            setShowReplyModal(false);
            setSelectedMessage(null);
          }}
        />

        <SettingsModal
          visible={showSettingsModal}
          settingsService={settingsService}
          onSave={handleSettingsSave}
          onCancel={() => setShowSettingsModal(false)}
        />

        {/* User Mapping Modal - Placeholder for now */}
        {showUserMappingModal && (
          <div>
            {/* UserMappingManager component would go here */}
            <button onClick={() => setShowUserMappingModal(false)}>
              Close User Mapping
            </button>
          </div>
        )}
      </Content>
    </Layout>
  );
};

// Chrome拡張機能環境での安全なReact初期化
const initializeApp = () => {
  console.log('[POPUP] App initialization started');
  const container = document.getElementById('root');
  if (!container) {
    console.error('[POPUP] Root element not found');
    return;
  }
  console.log('[POPUP] Root element found');

  // Chrome runtime 確認（React初期化前に実行）
  const isChromeExtensionEnv = typeof chrome !== 'undefined' && 
                               !!chrome.runtime && 
                               !!chrome.runtime.id;

  console.log('[POPUP] Chrome extension environment:', isChromeExtensionEnv);

  if (isChromeExtensionEnv) {
    try {
      console.log('[POPUP] Creating React root...');
      const root = createRoot(container);
      console.log('[POPUP] Rendering PopupApp...');
      root.render(<PopupApp />);
      console.log('[POPUP] PopupApp rendered successfully');
    } catch (error) {
      console.error('[POPUP] Failed to initialize React app:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: red;">
          <h3>React初期化エラー</h3>
          <p>エラー: ${errorMessage}</p>
          <p>Stack: ${error instanceof Error ? error.stack : 'No stack available'}</p>
          <button onclick="location.reload()">再読み込み</button>
        </div>
      `;
    }
  } else {
    // 非拡張機能環境での警告表示（Reactを使わない）
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui;">
        <h3 style="color: #1890ff; margin-bottom: 16px;">Chrome拡張機能環境が必要です</h3>
        <p style="margin-bottom: 16px;">このポップアップはChrome拡張機能として動作します。</p>
        <p style="color: #666; font-size: 14px;">
          Chrome拡張機能管理画面で「パッケージ化されていない拡張機能を読み込む」から<br/>
          このディレクトリを選択してください。
        </p>
      </div>
    `;
  }
};

// DOMContentLoaded または即座に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

export default PopupApp