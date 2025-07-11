import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UnifiedInbox } from '../../../chrome-extension/src/components/inbox/UnifiedInbox/UnifiedInbox';
import { ReplyAssistantService } from '../../../chrome-extension/src/services/application/reply-assistant.service';
import { ResolvedMessage } from '../../../chrome-extension/src/types/core/user.types';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { Priority } from '../../../chrome-extension/src/types/core/channel.types';

// Mock the ReplyAssistantService
const mockReplyAssistantService = {
  fetchAllUnreadMessages: vi.fn(),
} as unknown as ReplyAssistantService;

const mockMessage: ResolvedMessage = {
  id: 'msg-1',
  from: 'test@example.com',
  to: 'recipient@example.com',
  content: 'Test message content',
  timestamp: new Date('2023-12-01T10:00:00Z'),
  isUnread: true,
  channel: ChannelType.GMAIL,
  priority: Priority.NORMAL,
  resolvedUser: {
    id: 'user-1',
    name: 'Test User',
    channels: {},
    avatar: 'https://example.com/avatar.jpg',
    priority: Priority.NORMAL,
    tags: [],
    lastActivity: new Date('2023-12-01T09:00:00Z'),
    isActive: true,
    createdAt: new Date('2023-11-01T00:00:00Z'),
    updatedAt: new Date('2023-12-01T09:00:00Z'),
  },
  raw: {
    subject: 'Test Subject',
  },
};

describe('UnifiedInbox', () => {
  const mockOnReplyClick = vi.fn();
  const mockOnSettingsClick = vi.fn();
  const mockOnUserMappingClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders inbox header correctly', () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: true,
      messages: [],
      channelResults: {},
      totalUnread: 0,
      lastFetch: new Date(),
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    expect(screen.getByText('統合受信箱')).toBeInTheDocument();
    expect(screen.getByText('確認開始')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('ユーザー紐づけ管理')).toBeInTheDocument();
  });

  it('displays messages when loaded', async () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: true,
      messages: [mockMessage],
      channelResults: {},
      totalUnread: 1,
      lastFetch: new Date(),
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test message content')).toBeInTheDocument();
      expect(screen.getByText('件名: Test Subject')).toBeInTheDocument();
    });
  });

  it('handles reply button click', async () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: true,
      messages: [mockMessage],
      channelResults: {},
      totalUnread: 1,
      lastFetch: new Date(),
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    await waitFor(() => {
      const replyButton = screen.getByText('返信');
      fireEvent.click(replyButton);
    });

    expect(mockOnReplyClick).toHaveBeenCalledWith(mockMessage);
  });

  it('handles settings button click', () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: true,
      messages: [],
      channelResults: {},
      totalUnread: 0,
      lastFetch: new Date(),
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    const settingsButton = screen.getByText('設定');
    fireEvent.click(settingsButton);

    expect(mockOnSettingsClick).toHaveBeenCalled();
  });

  it('handles refresh button click', async () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: true,
      messages: [],
      channelResults: {},
      totalUnread: 0,
      lastFetch: new Date(),
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    const refreshButton = screen.getByText('確認開始');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockReplyAssistantService.fetchAllUnreadMessages).toHaveBeenCalledTimes(2); // Once on mount, once on click
    });
  });

  it('displays error message when fetch fails', async () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: false,
      messages: [],
      channelResults: {},
      totalUnread: 0,
      lastFetch: new Date(),
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch messages',
      },
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch messages')).toBeInTheDocument();
    });
  });

  it('displays empty state when no messages', async () => {
    vi.mocked(mockReplyAssistantService.fetchAllUnreadMessages).mockResolvedValue({
      success: true,
      messages: [],
      channelResults: {},
      totalUnread: 0,
      lastFetch: new Date(),
    });

    render(
      <UnifiedInbox
        replyAssistantService={mockReplyAssistantService}
        onReplyClick={mockOnReplyClick}
        onSettingsClick={mockOnSettingsClick}
        onUserMappingClick={mockOnUserMappingClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('未読メッセージはありません')).toBeInTheDocument();
    });
  });
});