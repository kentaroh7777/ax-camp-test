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
import { SendMessageParams } from '../../types/core/message.types';
import { ChannelType } from '../../types/core/channel.types';
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
  const messageClientFactory = new MessageClientFactory(chromeStorageRepository);
  const userMappingService = new UserMappingService(chromeStorageRepository);
  const llmService = new LLMIntegrationService(chromeStorageRepository);
  const replyAssistantService = new ReplyAssistantService(
    messageClientFactory,
    userMappingService,
    llmService
  );
  const settingsService = new SettingsService(chromeStorageRepository);

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

// Mount the React component
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PopupApp />)
}

export default PopupApp