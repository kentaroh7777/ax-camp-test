import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SettingsModal } from '../../../chrome-extension/src/components/settings/SettingsModal/SettingsModal';
import { SettingsService } from '../../../chrome-extension/src/services/application/settings.service';
import { AppSettings } from '../../../chrome-extension/src/types/services/settings.types';
import { ChannelType, Priority } from '../../../chrome-extension/src/types/core/channel.types';

// Mock the SettingsService
const mockSettingsService = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
} as unknown as SettingsService;

const mockSettings: AppSettings = {
  general: {
    language: 'ja',
    theme: 'light',
    autoFetch: true,
    fetchInterval: 5,
    maxMessageHistory: 1000,
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    priorities: [Priority.HIGH, Priority.URGENT],
  },
  ai: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 500,
  },
  channels: {
    [ChannelType.GMAIL]: {
      enabled: true,
      maxResults: 50,
    },
    [ChannelType.DISCORD]: {
      enabled: true,
    },
    [ChannelType.LINE]: {
      enabled: true,
      proxyUrl: 'http://localhost:3000',
    },
  },
  ui: {
    compactMode: false,
    showAvatars: true,
    groupByUser: true,
    defaultSortOrder: 'timestamp',
  },
};

describe('SettingsModal', () => {
  const mockOnCancel = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when visible', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('設定')).toBeInTheDocument();
      expect(screen.getByText('一般')).toBeInTheDocument();
      expect(screen.getByText('通知')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('チャンネル')).toBeInTheDocument();
      expect(screen.getByText('UI')).toBeInTheDocument();
    });
  });

  it('does not render modal when not visible', () => {
    render(
      <SettingsModal
        visible={false}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('設定')).not.toBeInTheDocument();
  });

  it('loads settings on mount', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(mockSettingsService.getSettings).toHaveBeenCalled();
    });
  });

  it('handles save button click', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(mockSettingsService.updateSettings).mockResolvedValue();

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockSettingsService.updateSettings).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  it('handles cancel button click', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);
    });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles reset button click', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(mockSettingsService.resetSettings).mockResolvedValue();

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const resetButton = screen.getByText('リセット');
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(mockSettingsService.resetSettings).toHaveBeenCalled();
      expect(mockSettingsService.getSettings).toHaveBeenCalledTimes(2); // Once on mount, once after reset
    });
  });

  it('displays general settings tab', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('言語')).toBeInTheDocument();
      expect(screen.getByText('テーマ')).toBeInTheDocument();
      expect(screen.getByText('自動取得')).toBeInTheDocument();
      expect(screen.getByText('取得間隔（分）')).toBeInTheDocument();
      expect(screen.getByText('最大メッセージ履歴')).toBeInTheDocument();
    });
  });

  it('displays notification settings tab', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const notificationTab = screen.getByText('通知');
      fireEvent.click(notificationTab);
    });

    await waitFor(() => {
      expect(screen.getByText('通知を有効にする')).toBeInTheDocument();
      expect(screen.getByText('通知音')).toBeInTheDocument();
      expect(screen.getByText('デスクトップ通知')).toBeInTheDocument();
    });
  });

  it('displays AI settings tab', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const aiTab = screen.getByText('AI');
      fireEvent.click(aiTab);
    });

    await waitFor(() => {
      expect(screen.getByText('AIプロバイダー')).toBeInTheDocument();
      expect(screen.getByText('AIモデル')).toBeInTheDocument();
      expect(screen.getByText('温度')).toBeInTheDocument();
      expect(screen.getByText('最大トークン数')).toBeInTheDocument();
    });
  });

  it('displays channel settings tab', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const channelTab = screen.getByText('チャンネル');
      fireEvent.click(channelTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Gmail')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
      expect(screen.getByText('LINE')).toBeInTheDocument();
      expect(screen.getByText('Gmail 最大取得数')).toBeInTheDocument();
      expect(screen.getByText('LINE プロキシURL')).toBeInTheDocument();
    });
  });

  it('displays UI settings tab', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const uiTab = screen.getByText('UI');
      fireEvent.click(uiTab);
    });

    await waitFor(() => {
      expect(screen.getByText('コンパクトモード')).toBeInTheDocument();
      expect(screen.getByText('アバター表示')).toBeInTheDocument();
      expect(screen.getByText('ユーザー別グループ化')).toBeInTheDocument();
      expect(screen.getByText('デフォルトソート順')).toBeInTheDocument();
    });
  });

  it('handles settings loading error', async () => {
    vi.mocked(mockSettingsService.getSettings).mockRejectedValue(new Error('Settings load error'));

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('設定の読み込みに失敗しました')).toBeInTheDocument();
    });
  });

  it('handles settings save error', async () => {
    vi.mocked(mockSettingsService.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(mockSettingsService.updateSettings).mockRejectedValue(new Error('Save error'));

    render(
      <SettingsModal
        visible={true}
        settingsService={mockSettingsService}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('設定の保存に失敗しました')).toBeInTheDocument();
    });
  });
});