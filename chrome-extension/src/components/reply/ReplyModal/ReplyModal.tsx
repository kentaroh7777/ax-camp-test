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
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  useEffect(() => {
    console.log('[ReplyModal] useEffect呼び出し - visible:', visible, 'message:', message);
    
    if (visible && message) {
      console.log('[ReplyModal] 条件満たすため、返信生成を開始');
      setError(null);
      setReplyContent('');
      setGeneratedReply('');
      setAdditionalPrompt('');
      generateReply();
      fetchRelatedMessages();
    } else {
      console.log('[ReplyModal] 条件を満たさないため、処理をスキップ');
    }
  }, [visible, message]);

  const generateReply = async () => {
    console.log('[ReplyModal] generateReply呼び出し開始');
    console.log('[ReplyModal] message:', message);
    
    if (!message) {
      console.log('[ReplyModal] messageがnullのため、generateReplyを終了');
      return;
    }
    
    console.log('[ReplyModal] 返信生成を開始...');
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
        additionalPrompt: additionalPrompt.trim() || undefined,
      };

      console.log('[ReplyModal] ReplyContextを作成:', context);
      console.log('[ReplyModal] replyAssistantService.generateReply呼び出し...');
      
      const result = await replyAssistantService.generateReply(context);
      
      console.log('[ReplyModal] generateReply結果:', result);
      
      if (result.success) {
        console.log('[ReplyModal] 返信生成成功:', result.reply);
        setGeneratedReply(result.reply);
        setReplyContent(result.reply);
      } else {
        console.error('[ReplyModal] 返信生成失敗:', result.error);
        setError(result.error?.message || 'AI返信の生成に失敗しました');
      }
    } catch (error) {
      console.error('[ReplyModal] generateReplyでエラー:', error);
      setError('返信生成中にエラーが発生しました');
    } finally {
      console.log('[ReplyModal] generateReply処理完了');
      setGenerating(false);
    }
  };

  const generateReplyWithSameUser = async () => {
    console.log('[ReplyModal] generateReplyWithSameUser呼び出し開始');
    console.log('[ReplyModal] message:', message);
    
    if (!message) {
      console.log('[ReplyModal] messageがnullのため、generateReplyWithSameUserを終了');
      return;
    }
    
    console.log('[ReplyModal] 同一人物の返信生成を開始...');
    setGenerating(true);
    setError(null);
    
    try {
      // 同一人物の他チャンネルメッセージを明示的に取得
      let sameUserMessages: Message[] = [];
      if (message.resolvedUser) {
        console.log('[ReplyModal] 同一人物のメッセージを取得中:', message.resolvedUser.name);
        sameUserMessages = await replyAssistantService.getRelatedMessages(
          message.resolvedUser.id,
          message
        );
        console.log('[ReplyModal] 同一人物のメッセージ取得完了:', sameUserMessages.length, '件');
      }

      const context: ReplyContext = {
        originalMessage: message,
        relatedMessages: sameUserMessages,
        userMapping: message.resolvedUser,
        conversationHistory: [],
        userPreferences: {
          tone: 'friendly',
          language: 'ja',
          includeContext: true,
          includeSameUserContext: true,
        },
        additionalPrompt: additionalPrompt.trim() || undefined,
      };

      console.log('[ReplyModal] 同一人物ReplyContextを作成:', context);
      console.log('[ReplyModal] 関連メッセージの詳細:');
      sameUserMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.channel}] from: ${msg.from}, content: "${msg.content}"`);
      });
      console.log('[ReplyModal] 追加プロンプト:', additionalPrompt);
      console.log('[ReplyModal] replyAssistantService.generateReplyWithSameUser呼び出し...');
      
      const result = await replyAssistantService.generateReplyWithSameUser(context);
      
      console.log('[ReplyModal] generateReplyWithSameUser結果:', result);
      
      if (result.success) {
        console.log('[ReplyModal] 同一人物返信生成成功:', result.reply);
        setGeneratedReply(result.reply);
        setReplyContent(result.reply);
        // 関連メッセージも更新
        setRelatedMessages(sameUserMessages);
      } else {
        console.error('[ReplyModal] 同一人物返信生成失敗:', result.error);
        setError(result.error?.message || 'AI同一人物返信の生成に失敗しました');
      }
    } catch (error) {
      console.error('[ReplyModal] generateReplyWithSameUserでエラー:', error);
      setError('同一人物返信生成中にエラーが発生しました');
    } finally {
      console.log('[ReplyModal] generateReplyWithSameUser処理完了');
      setGenerating(false);
    }
  };

  const fetchRelatedMessages = async () => {
    console.log('[ReplyModal] fetchRelatedMessages開始');
    console.log('[ReplyModal] message?.resolvedUser:', message?.resolvedUser);
    
    if (!message?.resolvedUser) {
      console.log('[ReplyModal] resolvedUserが存在しないため、fetchRelatedMessagesを終了');
      return;
    }
    
    try {
      console.log('[ReplyModal] getRelatedMessages呼び出し - userId:', message.resolvedUser.id);
      console.log('[ReplyModal] getRelatedMessages呼び出し - originalMessage:', message);
      
      const related = await replyAssistantService.getRelatedMessages(
        message.resolvedUser.id,
        message
      );
      
      console.log('[ReplyModal] getRelatedMessages結果:', related);
      console.log('[ReplyModal] 関連メッセージ数:', related.length);
      
      setRelatedMessages(related);
      
      if (related.length > 0) {
        console.log('[ReplyModal] 関連メッセージの詳細:');
        related.forEach((msg, index) => {
          console.log(`  ${index + 1}. [${msg.channel}] from: ${msg.from}, content: "${msg.content.substring(0, 50)}..."`);
        });
      } else {
        console.log('[ReplyModal] 関連メッセージが見つかりませんでした');
      }
    } catch (error) {
      console.error('[ReplyModal] 関連メッセージ取得でエラー:', error);
      setError('関連メッセージの取得に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

        {/* Additional Prompt Input */}
        <div className="additional-prompt-section">
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
            追加指示（任意）:
          </Title>
          <TextArea
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            placeholder="AIへの追加指示を入力してください（例：もっとカジュアルに、具体的な提案を含めて、など）"
            rows={2}
            disabled={loading || generating}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={generateReply} 
              loading={generating}
              disabled={loading}
              size="small"
            >
              AI再生成
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={generateReplyWithSameUser} 
              loading={generating}
              disabled={loading || !message?.resolvedUser}
              className="ant-btn-same-user"
              title="同一人物の他チャンネルメッセージを含めてAI返信を生成します"
              size="small"
            >
              AI同一人物再生成
            </Button>
          </div>
        </div>

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