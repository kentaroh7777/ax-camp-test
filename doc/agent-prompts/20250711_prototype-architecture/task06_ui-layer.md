# Task 6: UI Layer (React Components)

## 概要
統合受信箱、返信モーダル、設定画面などのReactコンポーネントを実装する。Task5のApplication Service Layerを利用してユーザーインタフェースを構築し、Chrome拡張機能の統一UI体験を提供する。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 6.3 統合UI設計、8.2.2 ソースコード構成 - React Components
- **参照行数**: Line 390-450, 1176-1217

### 設計書詳細の具体的反映

#### 統合受信箱インタフェース（設計書Line 390-415から転記）
```
┌─────────────────────────────────────────────────────────┐
│                    統合受信箱                           │
├─────────────────────────────────────────────────────────┤
│  [確認開始] [設定] [ユーザー紐づけ管理]                 │
├─────────────────────────────────────────────────────────┤
│  📧 田中太郎 <Gmail>        2分前                       │
│  件名: プロジェクトについて                             │
│  内容: 明日の会議の件で...                [返信]        │
├─────────────────────────────────────────────────────────┤
│  💬 tanaka_discord <Discord>   5分前                    │
│  チャンネル: #general                                   │
│  内容: 今日のタスクは...      [返信]                    │
├─────────────────────────────────────────────────────────┤
│  📱 田中太郎 <LINE>           10分前                    │
│  内容: お疲れさまです！       [返信]                    │
└─────────────────────────────────────────────────────────┘
```

#### 統一返信モーダル（設計書Line 416-450から転記）
```
┌─────────────────────────────────────────────────────────┐
│                    返信作成                             │
├─────────────────────────────────────────────────────────┤
│  返信先: 田中太郎 (Gmail)                               │
│  元メッセージ: プロジェクトについて                     │
├─────────────────────────────────────────────────────────┤
│  他チャンネルの関連メッセージ:                          │
│  • Discord: 今日のタスクは... (5分前)                  │
│  • LINE: お疲れさまです！ (10分前)                     │
├─────────────────────────────────────────────────────────┤
│  AI生成返信案:                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ お疲れさまです。                                   │ │
│  │ プロジェクトの件、了解いたしました。               │ │
│  │ 明日の会議で詳細を確認させていただきます。         │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│              [AI再生成] [編集] [送信] [キャンセル]      │
└─────────────────────────────────────────────────────────┘
```

#### React Components構成（設計書Line 1176-1217から転記）
```
src/components/
├── common/                           # 共通コンポーネント
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.types.ts
│   │   └── Button.styles.css
│   ├── Modal/
│   │   ├── Modal.tsx
│   │   ├── Modal.types.ts
│   │   └── Modal.styles.css
│   └── LoadingSpinner/
│       ├── LoadingSpinner.tsx
│       └── LoadingSpinner.styles.css
│
├── inbox/                           # 受信箱関連
│   ├── UnifiedInbox/
│   │   ├── UnifiedInbox.tsx         # 統合受信箱
│   │   ├── UnifiedInbox.types.ts
│   │   └── UnifiedInbox.styles.css
│   ├── MessageCard/
│   │   ├── MessageCard.tsx          # メッセージカード
│   │   ├── MessageCard.types.ts
│   │   └── MessageCard.styles.css
│   └── ChannelIndicator/
│       ├── ChannelIndicator.tsx     # チャンネル表示
│       └── ChannelIndicator.styles.css
│
├── reply/                           # 返信関連
│   ├── ReplyModal/
│   │   ├── ReplyModal.tsx           # 返信モーダル
│   │   ├── ReplyModal.types.ts
│   │   └── ReplyModal.styles.css
│   ├── ReplyEditor/
│   │   ├── ReplyEditor.tsx          # 返信エディタ
│   │   └── ReplyEditor.styles.css
│   └── ContextPanel/
│       ├── ContextPanel.tsx         # コンテキストパネル
│       └── ContextPanel.styles.css
│
├── settings/                        # 設定関連
│   ├── SettingsModal/
│   │   ├── SettingsModal.tsx        # 設定モーダル
│   │   └── SettingsModal.styles.css
│   ├── ChannelSettings/
│   │   ├── ChannelSettings.tsx      # チャンネル設定
│   │   └── ChannelSettings.styles.css
│   └── UserMappingManager/
│       ├── UserMappingManager.tsx   # ユーザー紐づけ管理
│       └── UserMappingManager.styles.css
│
└── popup/                           # ポップアップ
    ├── PopupApp.tsx                 # ポップアップメインアプリ
    ├── QuickStats.tsx               # クイック統計表示
    └── ActionButtons.tsx            # アクションボタン群
```

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- **前提条件**: Task5 (Application Service Layer) - ビジネスロジック利用に必要

### 成果物
- `chrome-extension/src/components/inbox/UnifiedInbox/UnifiedInbox.tsx` - 統合受信箱
- `chrome-extension/src/components/reply/ReplyModal/ReplyModal.tsx` - 返信モーダル
- `chrome-extension/src/components/settings/SettingsModal/SettingsModal.tsx` - 設定モーダル
- `chrome-extension/src/components/popup/PopupApp.tsx` - ポップアップアプリ

### テスト成果物【必須】
- **テストファイル**: `tests/unit/components/UnifiedInbox.test.tsx`
- **テストファイル**: `tests/unit/components/ReplyModal.test.tsx`
- **テストファイル**: `tests/unit/components/SettingsModal.test.tsx`

## 実装要件
### 【必須制約】React + Ant Design
- **Ant Design使用**: UIコンポーネントライブラリとしてAnt Design必須
- **TypeScript**: 全コンポーネントでTypeScript使用必須
- **Application Service連携**: Task5のサービス層との連携必須

## 実装ガイド【設計書詳細反映必須】

### ステップ1: 統合受信箱コンポーネント実装
**【設計書Line 390-415 対応】**
```typescript
// chrome-extension/src/components/inbox/UnifiedInbox/UnifiedInbox.tsx
import React, { useState, useEffect } from 'react';
import { Button, List, Typography, Badge, Space } from 'antd';
import { MailOutlined, MessageOutlined, PhoneOutlined } from '@ant-design/icons';
import { ReplyAssistantService } from '@/services/application/reply-assistant.service';
import { ResolvedMessage } from '@/types/core/message.types';

interface UnifiedInboxProps {
  replyAssistantService: ReplyAssistantService;
  onReplyClick: (message: ResolvedMessage) => void;
  onSettingsClick: () => void;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  replyAssistantService,
  onReplyClick,
  onSettingsClick,
}) => {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFetchMessages = async () => {
    setLoading(true);
    try {
      const result = await replyAssistantService.fetchAllUnreadMessages();
      if (result.success) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'gmail': return <MailOutlined />;
      case 'discord': return <MessageOutlined />;
      case 'line': return <PhoneOutlined />;
      default: return <MessageOutlined />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    return `${Math.floor(hours / 24)}日前`;
  };

  return (
    <div className="unified-inbox">
      <div className="inbox-header">
        <Typography.Title level={3}>統合受信箱</Typography.Title>
        <Space>
          <Button onClick={handleFetchMessages} loading={loading}>
            確認開始
          </Button>
          <Button onClick={onSettingsClick}>設定</Button>
          <Button>ユーザー紐づけ管理</Button>
        </Space>
      </div>

      <List
        dataSource={messages}
        renderItem={(message) => (
          <List.Item
            actions={[
              <Button key="reply" onClick={() => onReplyClick(message)}>
                返信
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={
                <Badge count={message.isUnread ? 1 : 0} size="small">
                  {getChannelIcon(message.channel)}
                </Badge>
              }
              title={
                <Space>
                  <span>{message.resolvedUser?.name || message.from}</span>
                  <Typography.Text type="secondary">
                    &lt;{message.channel}&gt;
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {formatTimestamp(message.timestamp)}
                  </Typography.Text>
                </Space>
              }
              description={
                <div>
                  {message.channel === 'gmail' && (
                    <Typography.Text strong>
                      件名: {message.raw?.subject || 'No subject'}
                    </Typography.Text>
                  )}
                  {message.channel === 'discord' && (
                    <Typography.Text type="secondary">
                      チャンネル: {message.raw?.channelName || '#general'}
                    </Typography.Text>
                  )}
                  <div>
                    内容: {message.content.substring(0, 100)}
                    {message.content.length > 100 && '...'}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};
```

### ステップ2: 返信モーダルコンポーネント実装
**【設計書Line 416-450 対応】**
```typescript
// chrome-extension/src/components/reply/ReplyModal/ReplyModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Typography, Space, Divider, Card } from 'antd';
import { ReplyAssistantService } from '@/services/application/reply-assistant.service';
import { ResolvedMessage, ReplyContext } from '@/types/core/message.types';

interface ReplyModalProps {
  visible: boolean;
  message: ResolvedMessage | null;
  replyAssistantService: ReplyAssistantService;
  onSend: (content: string) => Promise<void>;
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

  useEffect(() => {
    if (visible && message) {
      generateReply();
      fetchRelatedMessages();
    }
  }, [visible, message]);

  const generateReply = async () => {
    if (!message) return;
    
    setLoading(true);
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
      }
    } catch (error) {
      console.error('Failed to generate reply:', error);
    } finally {
      setLoading(false);
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
    if (!replyContent.trim()) return;
    
    setLoading(true);
    try {
      await onSend(replyContent);
      setReplyContent('');
      setGeneratedReply('');
      onCancel();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="返信作成"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="regenerate" onClick={generateReply} loading={loading}>
          AI再生成
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          キャンセル
        </Button>,
        <Button
          key="send"
          type="primary"
          onClick={handleSend}
          loading={loading}
          disabled={!replyContent.trim()}
        >
          送信
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Typography.Text strong>
            返信先: {message?.resolvedUser?.name || message?.from} ({message?.channel})
          </Typography.Text>
          <br />
          <Typography.Text type="secondary">
            元メッセージ: {message?.content.substring(0, 50)}...
          </Typography.Text>
        </div>

        {relatedMessages.length > 0 && (
          <div>
            <Typography.Text strong>他チャンネルの関連メッセージ:</Typography.Text>
            {relatedMessages.map((msg, index) => (
              <div key={index} style={{ marginLeft: 16 }}>
                • {msg.channel}: {msg.content.substring(0, 30)}... 
                ({new Date(msg.timestamp).toLocaleString()})
              </div>
            ))}
          </div>
        )}

        <Divider />

        <div>
          <Typography.Text strong>AI生成返信案:</Typography.Text>
          <Card style={{ marginTop: 8 }}>
            <Typography.Paragraph>{generatedReply}</Typography.Paragraph>
          </Card>
        </div>

        <Input.TextArea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="返信内容を入力または編集してください"
          rows={4}
          style={{ marginTop: 16 }}
        />
      </Space>
    </Modal>
  );
};
```

### ステップ3: 設定モーダルコンポーネント実装
```typescript
// chrome-extension/src/components/settings/SettingsModal/SettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Switch, Select, Input, Button } from 'antd';
import { SettingsService } from '@/services/application/settings.service';
import { AppSettings } from '@/types/core/settings.types';

interface SettingsModalProps {
  visible: boolean;
  settingsService: SettingsService;
  onCancel: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settingsService,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      form.setFieldsValue(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      await settingsService.updateSettings(values);
      onCancel();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="設定"
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          キャンセル
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={loading}>
          保存
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item name={['general', 'theme']} label="テーマ">
          <Select>
            <Select.Option value="light">ライト</Select.Option>
            <Select.Option value="dark">ダーク</Select.Option>
            <Select.Option value="auto">自動</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name={['general', 'autoFetch']} label="自動取得" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name={['notifications', 'enabled']} label="通知" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name={['ai', 'provider']} label="AIプロバイダー">
          <Select>
            <Select.Option value="openai">OpenAI</Select.Option>
            <Select.Option value="anthropic">Anthropic</Select.Option>
            <Select.Option value="google">Google</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name={['channels', 'gmail', 'enabled']} label="Gmail" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name={['channels', 'discord', 'enabled']} label="Discord" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name={['channels', 'line', 'enabled']} label="LINE" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

### ステップ4: ポップアップアプリ実装
```typescript
// chrome-extension/src/components/popup/PopupApp.tsx
import React, { useState } from 'react';
import { Layout, Typography } from 'antd';
import { UnifiedInbox } from '../inbox/UnifiedInbox/UnifiedInbox';
import { ReplyModal } from '../reply/ReplyModal/ReplyModal';
import { SettingsModal } from '../settings/SettingsModal/SettingsModal';
// サービス層のインポート...

export const PopupApp: React.FC = () => {
  const [selectedMessage, setSelectedMessage] = useState<ResolvedMessage | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // サービス層の初期化...

  const handleReplyClick = (message: ResolvedMessage) => {
    setSelectedMessage(message);
    setShowReplyModal(true);
  };

  const handleSendReply = async (content: string) => {
    // 返信送信処理...
  };

  return (
    <Layout style={{ minHeight: 600, width: 800 }}>
      <Layout.Content style={{ padding: 16 }}>
        <UnifiedInbox
          replyAssistantService={replyAssistantService}
          onReplyClick={handleReplyClick}
          onSettingsClick={() => setShowSettingsModal(true)}
        />

        <ReplyModal
          visible={showReplyModal}
          message={selectedMessage}
          replyAssistantService={replyAssistantService}
          onSend={handleSendReply}
          onCancel={() => setShowReplyModal(false)}
        />

        <SettingsModal
          visible={showSettingsModal}
          settingsService={settingsService}
          onCancel={() => setShowSettingsModal(false)}
        />
      </Layout.Content>
    </Layout>
  );
};
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] 統合受信箱でのメッセージ表示が正常動作
- [ ] 返信モーダルでのAI返信生成が正常動作
- [ ] 設定モーダルでの設定変更が正常動作
- [ ] ポップアップアプリの統合動作が正常

### 技術検証
- [ ] React + TypeScript でコンパイル成功
- [ ] Ant Design コンポーネントが正常動作
- [ ] vitestによるComponentテスト実行成功

### 設計書詳細反映検証【新規必須】
- [x] 設計書の統合受信箱インタフェースが完全に実装済み
- [x] 設計書の統一返信モーダルが完全に実装済み
- [x] 設計書のReact Components構成が完全に反映済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み

## 注意事項
### 【厳守事項】
- Ant Design UIコンポーネントの使用必須
- TypeScript strict mode準拠必須
- Application Service Layerとの適切な連携必須
- **【新規】設計書詳細完全反映ルールを必ず遵守すること** 