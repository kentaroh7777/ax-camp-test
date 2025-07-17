import React, { useState, useEffect } from 'react';
import { Button, List, Typography, Badge, Space, Card, Spin, Alert } from 'antd';
import { MailOutlined, MessageOutlined, PhoneOutlined, SettingOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons';
import { ReplyAssistantService } from '@/services/application/reply-assistant.service';
import { ResolvedMessage } from '@/types/core/user.types';
import { ChannelType } from '@/types/core/channel.types';
import './UnifiedInbox.styles.css';

const { Title, Text } = Typography;

interface UnifiedInboxProps {
  replyAssistantService: ReplyAssistantService;
  onReplyClick: (message: ResolvedMessage) => void;
  onSettingsClick: () => void;
  onUserMappingClick: () => void;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  replyAssistantService,
  onReplyClick,
  onSettingsClick,
  onUserMappingClick,
}) => {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const handleFetchMessages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await replyAssistantService.fetchAllUnreadMessages();
      if (result.success) {
        setMessages(result.messages);
        setLastFetch(result.lastFetch);
      } else {
        setError(result.error?.message || '未読メッセージの取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setError('メッセージの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    handleFetchMessages();
  }, []);

  const getChannelIcon = (channel: ChannelType) => {
    switch (channel) {
      case ChannelType.GMAIL:
        return <MailOutlined style={{ color: '#ea4335' }} />;
      case ChannelType.DISCORD:
        return <MessageOutlined style={{ color: '#5865f2' }} />;
      case ChannelType.LINE:
        return <PhoneOutlined style={{ color: '#00b900' }} />;
      default:
        return <MessageOutlined />;
    }
  };

  const getChannelDisplayName = (channel: ChannelType) => {
    switch (channel) {
      case ChannelType.GMAIL:
        return 'Gmail';
      case ChannelType.DISCORD:
        return 'Discord';
      case ChannelType.LINE:
        return 'LINE';
      default:
        return channel;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '今';
    if (minutes < 60) return `${minutes}分前`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}日前`;
    
    return timestamp.toLocaleDateString('ja-JP');
  };

  const getMessagePreview = (message: ResolvedMessage) => {
    const maxLength = 100;
    if (message.content.length <= maxLength) {
      return message.content;
    }
    return message.content.substring(0, maxLength) + '...';
  };

  const getMessageTitle = (message: ResolvedMessage) => {
    if (message.channel === ChannelType.GMAIL && message.raw?.subject) {
      return `件名: ${message.raw.subject}`;
    }
    if (message.channel === ChannelType.DISCORD && message.raw?.channelName) {
      return `チャンネル: ${message.raw.channelName}`;
    }
    return null;
  };

  return (
    <div className="unified-inbox">
      <div className="inbox-header">
        <Title level={3} style={{ margin: 0 }}>
          統合受信箱
        </Title>
        <Space>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={handleFetchMessages} 
            loading={loading}
          >
            確認開始
          </Button>
          <Button 
            icon={<SettingOutlined />}
            onClick={onSettingsClick}
          >
            設定
          </Button>
          <Button 
            icon={<UserOutlined />}
            onClick={onUserMappingClick}
          >
            ユーザー紐づけ管理
          </Button>
        </Space>
      </div>

      {error && (
        <Alert 
          message="エラー" 
          description={error} 
          type="error" 
          showIcon 
          style={{ margin: '16px 0' }}
        />
      )}

      {lastFetch && (
        <Text type="secondary" style={{ display: 'block', margin: '8px 0' }}>
          最終更新: {formatTimestamp(lastFetch)}
        </Text>
      )}

      <Spin spinning={loading}>
        {messages.length === 0 && !loading && !error && (
          <Card style={{ textAlign: 'center', margin: '16px 0' }}>
            <Text type="secondary">未読メッセージはありません</Text>
          </Card>
        )}

        <List
          className="message-list"
          dataSource={messages}
          renderItem={(message) => {
            try {
              console.log('UnifiedInbox: Rendering message:', message);
              return (
                <List.Item
                  key={message.id}
                  actions={[
                    <Button 
                      key="reply" 
                      type="primary" 
                      size="small"
                      onClick={() => onReplyClick(message)}
                    >
                      返信
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        count={message.isUnread ? 1 : 0} 
                        size="small"
                        offset={[-3, 3]}
                      >
                        {getChannelIcon(message.channel)}
                      </Badge>
                    }
                    title={
                      <Space>
                        <Text strong>
                          {message.resolvedUser?.name || message.from}
                        </Text>
                        <Text type="secondary">
                          &lt;{getChannelDisplayName(message.channel)}&gt;
                        </Text>
                        <Text type="secondary">
                          {formatTimestamp(message.timestamp)}
                        </Text>
                      </Space>
                    }
                    description={
                      <div className="message-content">
                        {getMessageTitle(message) && (
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>
                            {getMessageTitle(message)}
                          </Text>
                        )}
                        <Text>{getMessagePreview(message)}</Text>
                      </div>
                    }
                  />
                </List.Item>
              );
            } catch (error) {
              console.error('UnifiedInbox: Error rendering message:', error, message);
              return (
                <List.Item key={message.id}>
                  <Text type="danger">メッセージ表示エラー: {error instanceof Error ? error.message : '不明なエラー'}</Text>
                </List.Item>
              );
            }
          }}
        />
      </Spin>
    </div>
  );
};