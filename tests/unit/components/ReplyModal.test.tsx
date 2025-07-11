import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReplyModal } from '../../../chrome-extension/src/components/reply/ReplyModal/ReplyModal';
import { ReplyAssistantService } from '../../../chrome-extension/src/services/application/reply-assistant.service';
import { ResolvedMessage } from '../../../chrome-extension/src/types/core/user.types';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { Priority } from '../../../chrome-extension/src/types/core/channel.types';

// Mock the ReplyAssistantService
const mockReplyAssistantService = {
  generateReply: vi.fn(),
  getRelatedMessages: vi.fn(),
} as unknown as ReplyAssistantService;

const mockMessage: ResolvedMessage = {
  id: 'msg-1',
  from: 'test@example.com',
  to: 'recipient@example.com',
  content: 'Test message content for reply',
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

describe('ReplyModal', () => {
  const mockOnSend = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when visible', () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'Generated reply content',
      confidence: 0.85,
      tokensUsed: 150,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('返信作成')).toBeInTheDocument();
    expect(screen.getByText('返信先: Test User')).toBeInTheDocument();
    expect(screen.getByText('AI生成返信案:')).toBeInTheDocument();
  });

  it('does not render modal when not visible', () => {
    render(
      <ReplyModal
        visible={false}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('返信作成')).not.toBeInTheDocument();
  });

  it('generates AI reply when modal opens', async () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'AI generated reply',
      confidence: 0.9,
      tokensUsed: 120,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('AI generated reply')).toBeInTheDocument();
    });

    expect(mockReplyAssistantService.generateReply).toHaveBeenCalledWith({
      originalMessage: mockMessage,
      relatedMessages: [],
      userMapping: mockMessage.resolvedUser,
      conversationHistory: [],
      userPreferences: {
        tone: 'friendly',
        language: 'ja',
        includeContext: true,
      },
    });
  });

  it('handles reply text editing', async () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'Initial reply',
      confidence: 0.8,
      tokensUsed: 100,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const textArea = screen.getByPlaceholderText('返信内容を入力または編集してください');
      fireEvent.change(textArea, { target: { value: 'Modified reply content' } });
    });

    const textArea = screen.getByPlaceholderText('返信内容を入力または編集してください');
    expect(textArea).toHaveValue('Modified reply content');
  });

  it('handles send button click', async () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'Reply to send',
      confidence: 0.85,
      tokensUsed: 150,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const sendButton = screen.getByText('送信');
      fireEvent.click(sendButton);
    });

    expect(mockOnSend).toHaveBeenCalledWith('Reply to send', mockMessage);
  });

  it('handles cancel button click', () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'Reply content',
      confidence: 0.8,
      tokensUsed: 100,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles AI regeneration', async () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'First reply',
      confidence: 0.8,
      tokensUsed: 100,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('First reply')).toBeInTheDocument();
    });

    // Mock second generation
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'Regenerated reply',
      confidence: 0.9,
      tokensUsed: 120,
    });

    const regenerateButton = screen.getByText('AI再生成');
    fireEvent.click(regenerateButton);

    await waitFor(() => {
      expect(screen.getByText('Regenerated reply')).toBeInTheDocument();
    });
  });

  it('displays error when AI generation fails', async () => {
    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: false,
      reply: '',
      confidence: 0,
      tokensUsed: 0,
      error: {
        code: 'AI_ERROR',
        message: 'AI generation failed',
      },
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('AI generation failed')).toBeInTheDocument();
    });
  });

  it('displays related messages when available', async () => {
    const relatedMessage = {
      id: 'related-1',
      from: 'test@example.com',
      to: 'recipient@example.com',
      content: 'Related message content',
      timestamp: new Date('2023-12-01T09:00:00Z'),
      isUnread: false,
      channel: ChannelType.DISCORD,
      threadId: 'thread-1',
    };

    vi.mocked(mockReplyAssistantService.generateReply).mockResolvedValue({
      success: true,
      reply: 'Reply with context',
      confidence: 0.9,
      tokensUsed: 150,
    });

    vi.mocked(mockReplyAssistantService.getRelatedMessages).mockResolvedValue([relatedMessage]);

    render(
      <ReplyModal
        visible={true}
        message={mockMessage}
        replyAssistantService={mockReplyAssistantService}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('他チャンネルの関連メッセージ:')).toBeInTheDocument();
      expect(screen.getByText(/Discord:/)).toBeInTheDocument();
    });
  });
});