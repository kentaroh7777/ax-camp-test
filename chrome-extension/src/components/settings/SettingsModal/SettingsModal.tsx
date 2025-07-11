import React, { useState, useEffect } from 'react';
import { Modal, Form, Switch, Select, Input, Button, Tabs, Card, Alert, Spin } from 'antd';
import { SettingOutlined, SaveOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { SettingsService } from '@/services/application/settings.service';
import { AppSettings } from '@/types/services/settings.types';
import { ChannelType } from '@/types/core/channel.types';
import './SettingsModal.styles.css';

const { Option } = Select;
const { TextArea } = Input;

interface SettingsModalProps {
  visible: boolean;
  settingsService: SettingsService;
  onCancel: () => void;
  onSave?: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settingsService,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    setInitialLoading(true);
    setError(null);
    
    try {
      const settings = await settingsService.getSettings();
      setCurrentSettings(settings);
      form.setFieldsValue(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('設定の読み込みに失敗しました');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const values = await form.validateFields();
      await settingsService.updateSettings(values);
      
      if (onSave) {
        onSave(values);
      }
      
      onCancel();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await settingsService.resetSettings();
      await loadSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setError('設定のリセットに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generalSettings = (
    <Card title="一般設定" size="small">
      <Form.Item 
        name={['general', 'language']} 
        label="言語"
        rules={[{ required: true, message: '言語を選択してください' }]}
      >
        <Select>
          <Option value="ja">日本語</Option>
          <Option value="en">English</Option>
        </Select>
      </Form.Item>

      <Form.Item name={['general', 'theme']} label="テーマ">
        <Select>
          <Option value="light">ライト</Option>
          <Option value="dark">ダーク</Option>
          <Option value="auto">自動</Option>
        </Select>
      </Form.Item>

      <Form.Item name={['general', 'autoFetch']} label="自動取得" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['general', 'fetchInterval']} label="取得間隔（分）">
        <Input type="number" min={1} max={60} />
      </Form.Item>

      <Form.Item name={['general', 'maxMessageHistory']} label="最大メッセージ履歴">
        <Input type="number" min={100} max={10000} />
      </Form.Item>
    </Card>
  );

  const notificationSettings = (
    <Card title="通知設定" size="small">
      <Form.Item name={['notifications', 'enabled']} label="通知を有効にする" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['notifications', 'sound']} label="通知音" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['notifications', 'desktop']} label="デスクトップ通知" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Card>
  );

  const aiSettings = (
    <Card title="AI設定" size="small">
      <Form.Item name={['ai', 'provider']} label="AIプロバイダー">
        <Select>
          <Option value="openai">OpenAI</Option>
          <Option value="anthropic">Anthropic</Option>
          <Option value="google">Google</Option>
        </Select>
      </Form.Item>

      <Form.Item name={['ai', 'model']} label="AIモデル">
        <Select>
          <Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Option>
          <Option value="gpt-4">GPT-4</Option>
          <Option value="claude-3-haiku">Claude 3 Haiku</Option>
          <Option value="claude-3-sonnet">Claude 3 Sonnet</Option>
        </Select>
      </Form.Item>

      <Form.Item name={['ai', 'temperature']} label="温度">
        <Input type="number" min={0} max={2} step={0.1} />
      </Form.Item>

      <Form.Item name={['ai', 'maxTokens']} label="最大トークン数">
        <Input type="number" min={100} max={4000} />
      </Form.Item>
    </Card>
  );

  const channelSettings = (
    <Card title="チャンネル設定" size="small">
      <Form.Item name={['channels', ChannelType.GMAIL, 'enabled']} label="Gmail" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['channels', ChannelType.GMAIL, 'maxResults']} label="Gmail 最大取得数">
        <Input type="number" min={1} max={100} />
      </Form.Item>

      <Form.Item name={['channels', ChannelType.DISCORD, 'enabled']} label="Discord" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['channels', ChannelType.LINE, 'enabled']} label="LINE" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['channels', ChannelType.LINE, 'proxyUrl']} label="LINE プロキシURL">
        <Input placeholder="http://localhost:3000" />
      </Form.Item>
    </Card>
  );

  const uiSettings = (
    <Card title="UI設定" size="small">
      <Form.Item name={['ui', 'compactMode']} label="コンパクトモード" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['ui', 'showAvatars']} label="アバター表示" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['ui', 'groupByUser']} label="ユーザー別グループ化" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name={['ui', 'defaultSortOrder']} label="デフォルトソート順">
        <Select>
          <Option value="timestamp">日時順</Option>
          <Option value="sender">送信者順</Option>
          <Option value="channel">チャンネル順</Option>
        </Select>
      </Form.Item>
    </Card>
  );

  const tabItems = [
    {
      key: 'general',
      label: '一般',
      children: generalSettings,
    },
    {
      key: 'notifications',
      label: '通知',
      children: notificationSettings,
    },
    {
      key: 'ai',
      label: 'AI',
      children: aiSettings,
    },
    {
      key: 'channels',
      label: 'チャンネル',
      children: channelSettings,
    },
    {
      key: 'ui',
      label: 'UI',
      children: uiSettings,
    },
  ];

  return (
    <Modal
      title={
        <>
          <SettingOutlined /> 設定
        </>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      className="settings-modal"
      footer={[
        <Button 
          key="reset" 
          icon={<ReloadOutlined />}
          onClick={handleReset} 
          loading={loading}
        >
          リセット
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
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
        >
          保存
        </Button>,
      ]}
    >
      <Spin spinning={initialLoading}>
        {error && (
          <Alert 
            message="エラー" 
            description={error} 
            type="error" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        )}

        <Form 
          form={form} 
          layout="vertical"
          className="settings-form"
        >
          <Tabs items={tabItems} />
        </Form>
      </Spin>
    </Modal>
  );
};