// Reply Assistant Service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplyAssistantService } from '../../../chrome-extension/src/services/application/reply-assistant.service';
import { MessageClientFactory } from '../../../chrome-extension/src/services/channel/base/message-client.factory';
import { IUserMappingService } from '../../../chrome-extension/src/types/services/user-mapping.types';
import { ILLMIntegrationService } from '../../../chrome-extension/src/types/services/llm.types';
import { ChannelType, Priority } from '../../../chrome-extension/src/types/core/channel.types';
import { Message } from '../../../chrome-extension/src/types/core/message.types';
import { ResolvedMessage } from '../../../chrome-extension/src/types/core/user.types';

// Mock dependencies
const mockMessageClientFactory = {
  createAllClients: vi.fn(),
} as any;

const mockUserMappingService = {
  resolveUserMappings: vi.fn(),
  getMapping: vi.fn(),
} as any;

const mockLLMService = {
  optimizePrompt: vi.fn(),
  generateReply: vi.fn(),
} as any;

const mockClient = {
  isAuthenticated: vi.fn(),
  getMessages: vi.fn(),
};

describe('ReplyAssistantService', () => {
  let service: ReplyAssistantService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReplyAssistantService(
      mockMessageClientFactory,
      mockUserMappingService,
      mockLLMService
    );
  });
  
  describe('fetchAllUnreadMessages', () => {
    it('should fetch unread messages from all channels', async () => {
      const mockMessages: Message[] = [
        {
          id: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          content: 'Test message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
      ];
      
      const mockResolvedMessages: ResolvedMessage[] = [
        {
          ...mockMessages[0],
          priority: Priority.NORMAL,
        },
      ];
      
      mockMessageClientFactory.createAllClients.mockReturnValue({
        [ChannelType.GMAIL]: mockClient,
        [ChannelType.DISCORD]: mockClient,
        [ChannelType.LINE]: mockClient,
      });
      
      mockClient.isAuthenticated.mockResolvedValue(true);
      mockClient.getMessages.mockResolvedValue({
        success: true,
        messages: mockMessages,
      });
      
      mockUserMappingService.resolveUserMappings.mockResolvedValue(mockResolvedMessages);
      
      const result = await service.fetchAllUnreadMessages();
      
      expect(result.success).toBe(true);
      expect(result.messages).toEqual(mockResolvedMessages);
      expect(result.totalUnread).toBe(3); // 1 message from each channel
      expect(mockUserMappingService.resolveUserMappings).toHaveBeenCalled();
    });
    
    it('should handle authentication failure', async () => {
      mockMessageClientFactory.createAllClients.mockReturnValue({
        [ChannelType.GMAIL]: mockClient,
        [ChannelType.DISCORD]: mockClient,
        [ChannelType.LINE]: mockClient,
      });
      
      mockClient.isAuthenticated.mockResolvedValue(false);
      mockUserMappingService.resolveUserMappings.mockResolvedValue([]);
      
      const result = await service.fetchAllUnreadMessages();
      
      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0);
      expect(result.channelResults[ChannelType.GMAIL].success).toBe(false);
    });
  });
  
  describe('generateReply', () => {
    it('should generate a reply successfully', async () => {
      const mockContext = {
        originalMessage: {
          id: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          content: 'Test message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
        relatedMessages: [],
        conversationHistory: [],
        userPreferences: {
          tone: 'formal' as const,
          language: 'en',
          includeContext: false,
        },
      };
      
      const mockPrompt = 'Optimized prompt';
      const mockReply = 'Generated reply';
      
      mockLLMService.optimizePrompt.mockReturnValue(mockPrompt);
      mockLLMService.generateReply.mockResolvedValue(mockReply);
      
      const result = await service.generateReply(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.reply).toBe(mockReply);
      expect(result.confidence).toBe(0.85);
      expect(mockLLMService.optimizePrompt).toHaveBeenCalledWith(mockContext);
      expect(mockLLMService.generateReply).toHaveBeenCalledWith(mockPrompt, mockContext);
    });
    
    it('should handle reply generation error', async () => {
      const mockContext = {
        originalMessage: {
          id: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          content: 'Test message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
        relatedMessages: [],
        conversationHistory: [],
        userPreferences: {
          tone: 'formal' as const,
          language: 'en',
          includeContext: false,
        },
      };
      
      mockLLMService.optimizePrompt.mockReturnValue('prompt');
      mockLLMService.generateReply.mockRejectedValue(new Error('LLM API error'));
      
      const result = await service.generateReply(mockContext);
      
      expect(result.success).toBe(false);
      expect(result.reply).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.error?.code).toBe('REPLY_GENERATION_ERROR');
    });
  });
  
  describe('getRelatedMessages', () => {
    it('should return related messages for a user', async () => {
      const mockUserMapping = {
        id: 'user1',
        name: 'Test User',
        channels: {
          [ChannelType.GMAIL]: {
            email: 'test@example.com',
            userId: 'user1',
          },
        },
        avatar: undefined,
        priority: Priority.NORMAL,
        tags: [],
        lastActivity: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockMessages: Message[] = [
        {
          id: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          content: 'Related message',
          timestamp: new Date(),
          isUnread: false,
          channel: ChannelType.GMAIL,
        },
      ];
      
      const mockOriginalMessage: Message = {
        id: '2',
        from: 'test@example.com',
        to: 'user@example.com',
        content: 'Original message',
        timestamp: new Date(),
        isUnread: true,
        channel: ChannelType.GMAIL,
      };
      
      mockUserMappingService.getMapping.mockResolvedValue(mockUserMapping);
      mockMessageClientFactory.createAllClients.mockReturnValue({
        [ChannelType.GMAIL]: mockClient,
        [ChannelType.DISCORD]: mockClient,
        [ChannelType.LINE]: mockClient,
      });
      
      mockClient.isAuthenticated.mockResolvedValue(true);
      mockClient.getMessages.mockResolvedValue({
        success: true,
        messages: mockMessages,
      });
      
      const result = await service.getRelatedMessages('user1', mockOriginalMessage);
      
      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('test@example.com');
      expect(mockUserMappingService.getMapping).toHaveBeenCalledWith('user1');
    });
    
    it('should return empty array when user mapping not found', async () => {
      const mockOriginalMessage: Message = {
        id: '1',
        from: 'test@example.com',
        to: 'user@example.com',
        content: 'Test message',
        timestamp: new Date(),
        isUnread: true,
        channel: ChannelType.GMAIL,
      };
      
      mockUserMappingService.getMapping.mockResolvedValue(null);
      
      const result = await service.getRelatedMessages('user1', mockOriginalMessage);
      
      expect(result).toHaveLength(0);
    });
  });
});