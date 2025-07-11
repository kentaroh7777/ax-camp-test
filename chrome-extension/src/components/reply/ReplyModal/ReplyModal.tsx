import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Typography, Space, Divider, Card, Alert, Spin } from 'antd';
import { ReloadOutlined, SendOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { ReplyAssistantService } from '@/services/application/reply-assistant.service';
import { ResolvedMessage } from '@/types/core/user.types';
import { Message } from '@/types/core/message.types';
import { ReplyContext } from '@/types/services/reply-assistant.types';
import { ChannelType } from '@/types/core/channel.types';
import './ReplyModal.styles.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ReplyModalProps {
  visible: boolean;
  message: ResolvedMessage | null;
  replyAssistantService: ReplyAssistantService;
  onSend: (content: string, message: ResolvedMessage) => Promise<void>;
  onCancel: () => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({
  visible,
  message,
  replyAssistantService,
  onSend,
  onCancel,
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [generatedReply, setGeneratedReply] = useState('');
  const [relatedMessages, setRelatedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && message) {
      setError(null);
      setReplyContent('');
      setGeneratedReply('');
      generateReply();
      fetchRelatedMessages();
    }
  }, [visible, message]);

  const generateReply = async () => {
    if (!message) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const context: ReplyContext = {
        originalMessage: message,
        relatedMessages: relatedMessages,
        userMapping: message.resolvedUser,
        conversationHistory: [],
        userPreferences: {
          tone: 'friendly',
          language: 'ja',
          includeContext: true,
        },
      };

      const result = await replyAssistantService.generateReply(context);
      if (result.success) {
        setGeneratedReply(result.reply);
        setReplyContent(result.reply);
      } else {
        setError(result.error?.message || 'AI返信の生成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to generate reply:', error);
      setError('返信生成中にエラーが発生しました');
    } finally {
      setGenerating(false);
    }
  };

  const fetchRelatedMessages = async () => {
    if (!message?.resolvedUser) return;
    
    try {
      const related = await replyAssistantService.getRelatedMessages(
        message.resolvedUser.id,
        message
      );
      setRelatedMessages(related);
    } catch (error) {
      console.error('Failed to fetch related messages:', error);
    }
  };

  const handleSend = async () => {
    if (!replyContent.trim() || !message) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onSend(replyContent, message);
      setReplyContent('');
      setGeneratedReply('');
      setRelatedMessages([]);
      onCancel();
    } catch (error) {
      console.error('Failed to send reply:', error);
      setError('返信の送信に失敗しました');
    } finally {
      setLoading(false);
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
    
    return timestamp.toLocaleDateString('ja-JP');
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

  const getMessagePreview = (content: string, maxLength: number = 30) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>返信作成</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      className="reply-modal"
      footer={[
        <Button 
          key="regenerate" 
          icon={<ReloadOutlined />}
          onClick={generateReply} 
          loading={generating}
          disabled={loading}
        >
          AI再生成
        </Button>,
        <Button 
          key="cancel" 
          icon={<CloseOutlined />}
          onClick={onCancel}
          disabled={loading}
        >
          キャンセル
        </Button>,
        <Button
          key="send"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!replyContent.trim() || generating}
        >
          送信
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Original Message Info */}
        <Card size="small" className="original-message-info">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div>
              <Text strong>
                返信先: {message?.resolvedUser?.name || message?.from}
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({getChannelDisplayName(message?.channel || ChannelType.GMAIL)})
              </Text>
            </div>
            <div>
              <Text type="secondary">
                元メッセージ: {getMessagePreview(message?.content || '', 50)}
              </Text>
            </div>
          </Space>
        </Card>

        {/* Related Messages */}
        {relatedMessages.length > 0 && (
          <Card size="small" className="related-messages">
            <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
              他チャンネルの関連メッセージ:
            </Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {relatedMessages.slice(0, 3).map((msg, index) => (
                <div key={index} className="related-message-item">
                  <Text>
                    • {getChannelDisplayName(msg.channel)}: {getMessagePreview(msg.content)}
                  </Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({formatTimestamp(msg.timestamp)})
                  </Text>
                </div>
              ))}
            </Space>
          </Card>
        )}

        <Divider />

        {/* AI Generated Reply */}
        <div className="ai-reply-section">
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            AI生成返信案:
          </Title>
          
          {generating && (
            <Card style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">AI返信を生成中...</Text>
              </div>
            </Card>
          )}

          {generatedReply && !generating && (
            <Card className="generated-reply-card">
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {generatedReply}
              </Paragraph>
            </Card>
          )}

          {error && (
            <Alert 
              message="エラー" 
              description={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 16 }}
            />
          )}
        </div>

        {/* Reply Editor */}
        <div className="reply-editor">
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            返信内容:
          </Title>
          <TextArea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="返信内容を入力または編集してください"
            rows={6}
            disabled={loading}
          />
          <div className="character-count">
            <Text type="secondary">
              {replyContent.length} 文字
            </Text>
          </div>
        </div>
      </Space>
    </Modal>
  );
};