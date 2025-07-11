// Core types test definitions
import { describe, it, expect } from 'vitest';
import { 
  ChannelType, 
  MessageStatus, 
  Priority, 
  MessageFormat 
} from '../../../chrome-extension/src/types/core/channel.types';
import type { 
  Message, 
  SendMessageParams, 
  Attachment,
  SendMessageResult,
  GetMessagesResult,
  AuthResult
} from '../../../chrome-extension/src/types/core/message.types';
import type { 
  UserMapping, 
  UserMappingRequest, 
  ResolvedMessage 
} from '../../../chrome-extension/src/types/core/user.types';
import type { 
  ApiError
} from '../../../chrome-extension/src/types/core/api.types';
import {
  isGmailMessage,
  isDiscordMessage,
  isLineMessage,
  isResolvedMessage,
  hasAttachments,
  isUnreadMessage
} from '../../../chrome-extension/src/types/utils/type-guards';

describe('Core型定義テスト', () => {
  describe('Enum definitions', () => {
    it('ChannelType enumが正しく定義されている', () => {
      expect(ChannelType.GMAIL).toBe('gmail');
      expect(ChannelType.DISCORD).toBe('discord');
      expect(ChannelType.LINE).toBe('line');
    });

    it('MessageStatus enumが正しく定義されている', () => {
      expect(MessageStatus.UNREAD).toBe('unread');
      expect(MessageStatus.READ).toBe('read');
      expect(MessageStatus.REPLIED).toBe('replied');
      expect(MessageStatus.ARCHIVED).toBe('archived');
    });

    it('Priority enumが正しく定義されている', () => {
      expect(Priority.LOW).toBe('low');
      expect(Priority.NORMAL).toBe('normal');
      expect(Priority.HIGH).toBe('high');
      expect(Priority.URGENT).toBe('urgent');
    });

    it('MessageFormat enumが正しく定義されている', () => {
      expect(MessageFormat.PLAIN_TEXT).toBe('plain');
      expect(MessageFormat.MARKDOWN).toBe('markdown');
      expect(MessageFormat.HTML).toBe('html');
    });
  });

  describe('Message interface tests', () => {
    it('Message型が適切な構造を持つ', () => {
      const message: Message = {
        id: 'test-id',
        from: 'test@example.com',
        to: 'recipient@example.com',
        content: 'test content',
        timestamp: new Date(),
        isUnread: true,
        channel: ChannelType.GMAIL
      };
      
      expect(message.channel).toBe(ChannelType.GMAIL);
      expect(typeof message.content).toBe('string');
      expect(message.isUnread).toBe(true);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('Message型がオプショナル要素を持つ', () => {
      const messageWithOptionals: Message = {
        id: 'test-id',
        from: 'test@example.com',
        to: 'recipient@example.com',
        content: 'test content',
        timestamp: new Date(),
        isUnread: true,
        channel: ChannelType.DISCORD,
        threadId: 'thread-123',
        replyToId: 'reply-to-456',
        attachments: [],
        raw: { customData: 'test' }
      };
      
      expect(messageWithOptionals.threadId).toBe('thread-123');
      expect(messageWithOptionals.replyToId).toBe('reply-to-456');
      expect(messageWithOptionals.attachments).toBeInstanceOf(Array);
      expect(messageWithOptionals.raw).toEqual({ customData: 'test' });
    });

    it('Attachment型が適切な構造を持つ', () => {
      const attachment: Attachment = {
        id: 'attachment-id',
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'https://example.com/file.pdf'
      };
      
      expect(attachment.name).toBe('test.pdf');
      expect(attachment.type).toBe('application/pdf');
      expect(attachment.size).toBe(1024);
      expect(attachment.url).toBe('https://example.com/file.pdf');
    });

    it('SendMessageParamsが必須フィールドを持つ', () => {
      const params: SendMessageParams = {
        to: 'test@example.com',
        content: 'test message'
      };
      
      expect(params.to).toBeDefined();
      expect(params.content).toBeDefined();
    });

    it('SendMessageParamsがオプショナル要素を持つ', () => {
      const paramsWithOptionals: SendMessageParams = {
        to: 'test@example.com',
        content: 'test message',
        replyTo: 'reply-to-id',
        options: {
          urgent: true,
          silent: false,
          formatting: MessageFormat.MARKDOWN
        }
      };
      
      expect(paramsWithOptionals.replyTo).toBe('reply-to-id');
      expect(paramsWithOptionals.options?.urgent).toBe(true);
      expect(paramsWithOptionals.options?.formatting).toBe(MessageFormat.MARKDOWN);
    });
  });

  describe('API result types', () => {
    it('SendMessageResult型が適切な構造を持つ', () => {
      const successResult: SendMessageResult = {
        success: true,
        messageId: 'msg-123'
      };
      
      expect(successResult.success).toBe(true);
      expect(successResult.messageId).toBe('msg-123');
    });

    it('SendMessageResult型がエラーを持つ', () => {
      const errorResult: SendMessageResult = {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: 'Failed to send message'
        }
      };
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.error?.code).toBe('SEND_FAILED');
      expect(errorResult.error?.message).toBe('Failed to send message');
    });

    it('GetMessagesResult型が適切な構造を持つ', () => {
      const result: GetMessagesResult = {
        success: true,
        messages: [],
        hasMore: false
      };
      
      expect(result.success).toBe(true);
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.hasMore).toBe(false);
    });

    it('AuthResult型が適切な構造を持つ', () => {
      const authResult: AuthResult = {
        success: true,
        token: 'auth-token-123',
        expiresAt: new Date()
      };
      
      expect(authResult.success).toBe(true);
      expect(authResult.token).toBe('auth-token-123');
      expect(authResult.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('User mapping types', () => {
    it('UserMapping型が適切な構造を持つ', () => {
      const userMapping: UserMapping = {
        id: 'user-123',
        name: 'Test User',
        channels: {
          [ChannelType.GMAIL]: {
            email: 'test@gmail.com',
            userId: 'gmail-user-123'
          }
        },
        priority: Priority.NORMAL,
        tags: ['important', 'client'],
        lastActivity: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(userMapping.id).toBe('user-123');
      expect(userMapping.name).toBe('Test User');
      expect(userMapping.channels[ChannelType.GMAIL]?.email).toBe('test@gmail.com');
      expect(userMapping.priority).toBe(Priority.NORMAL);
      expect(userMapping.tags).toEqual(['important', 'client']);
      expect(userMapping.isActive).toBe(true);
    });

    it('UserMappingRequest型が適切な構造を持つ', () => {
      const request: UserMappingRequest = {
        name: 'New User',
        channels: {
          [ChannelType.DISCORD]: {
            username: 'testuser',
            userId: 'discord-123'
          }
        },
        priority: Priority.HIGH,
        tags: ['vip']
      };
      
      expect(request.name).toBe('New User');
      expect(request.channels[ChannelType.DISCORD]?.username).toBe('testuser');
      expect(request.priority).toBe(Priority.HIGH);
      expect(request.tags).toEqual(['vip']);
    });

    it('ResolvedMessage型が適切な構造を持つ', () => {
      const resolvedMessage: ResolvedMessage = {
        id: 'msg-123',
        from: 'test@example.com',
        to: 'recipient@example.com',
        content: 'test content',
        timestamp: new Date(),
        isUnread: true,
        channel: ChannelType.GMAIL,
        priority: Priority.HIGH,
        resolvedUser: {
          id: 'user-123',
          name: 'Test User',
          channels: {},
          priority: Priority.NORMAL,
          tags: [],
          lastActivity: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        relatedMessages: []
      };
      
      expect(resolvedMessage.priority).toBe(Priority.HIGH);
      expect(resolvedMessage.resolvedUser?.id).toBe('user-123');
      expect(resolvedMessage.relatedMessages).toBeInstanceOf(Array);
    });
  });

  describe('Type guard functions', () => {
    const gmailMessage: Message = {
      id: 'msg-1',
      from: 'test@gmail.com',
      to: 'recipient@gmail.com',
      content: 'Gmail message',
      timestamp: new Date(),
      isUnread: true,
      channel: ChannelType.GMAIL
    };

    const discordMessage: Message = {
      id: 'msg-2',
      from: 'user#1234',
      to: 'channel-id',
      content: 'Discord message',
      timestamp: new Date(),
      isUnread: false,
      channel: ChannelType.DISCORD
    };

    const lineMessage: Message = {
      id: 'msg-3',
      from: 'line-user-id',
      to: 'line-channel-id',
      content: 'LINE message',
      timestamp: new Date(),
      isUnread: true,
      channel: ChannelType.LINE
    };

    it('isGmailMessage type guardが正しく動作する', () => {
      expect(isGmailMessage(gmailMessage)).toBe(true);
      expect(isGmailMessage(discordMessage)).toBe(false);
      expect(isGmailMessage(lineMessage)).toBe(false);
    });

    it('isDiscordMessage type guardが正しく動作する', () => {
      expect(isDiscordMessage(gmailMessage)).toBe(false);
      expect(isDiscordMessage(discordMessage)).toBe(true);
      expect(isDiscordMessage(lineMessage)).toBe(false);
    });

    it('isLineMessage type guardが正しく動作する', () => {
      expect(isLineMessage(gmailMessage)).toBe(false);
      expect(isLineMessage(discordMessage)).toBe(false);
      expect(isLineMessage(lineMessage)).toBe(true);
    });

    it('isUnreadMessage type guardが正しく動作する', () => {
      expect(isUnreadMessage(gmailMessage)).toBe(true);
      expect(isUnreadMessage(discordMessage)).toBe(false);
      expect(isUnreadMessage(lineMessage)).toBe(true);
    });

    it('hasAttachments type guardが正しく動作する', () => {
      const messageWithAttachments: Message = {
        ...gmailMessage,
        attachments: [
          {
            id: 'att-1',
            name: 'file.pdf',
            type: 'application/pdf',
            size: 1024
          }
        ]
      };
      
      expect(hasAttachments(messageWithAttachments)).toBe(true);
      expect(hasAttachments(gmailMessage)).toBe(false);
    });

    it('isResolvedMessage type guardが正しく動作する', () => {
      const resolvedMessage: ResolvedMessage = {
        ...gmailMessage,
        priority: Priority.HIGH
      };
      
      expect(isResolvedMessage(resolvedMessage)).toBe(true);
      expect(isResolvedMessage(gmailMessage)).toBe(false);
    });
  });
});