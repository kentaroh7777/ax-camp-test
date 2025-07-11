// LLM Integration Service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMIntegrationService } from '../../../chrome-extension/src/services/application/llm-integration.service';
import { IChromeStorageRepository } from '../../../chrome-extension/src/types/infrastructure/storage.types';
import { ReplyContext } from '../../../chrome-extension/src/types/services/reply-assistant.types';
import { ChannelType, Priority } from '../../../chrome-extension/src/types/core/channel.types';
import { Message } from '../../../chrome-extension/src/types/core/message.types';
import { UserMapping } from '../../../chrome-extension/src/types/core/user.types';

// Mock dependencies
const mockStorageRepository = {
  save: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  getAll: vi.fn(),
  exists: vi.fn(),
} as any;

describe('LLMIntegrationService', () => {
  let service: LLMIntegrationService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new LLMIntegrationService(mockStorageRepository);
  });
  
  describe('generateReply', () => {
    it('should generate a reply using mock LLM', async () => {
      mockStorageRepository.get.mockResolvedValue(null);
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      const result = await service.generateReply('Test prompt', {});
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
    
    it('should update usage statistics after generation', async () => {
      mockStorageRepository.get.mockResolvedValue({
        totalRequests: 5,
        totalTokens: 100,
        successRate: 1.0,
        averageResponseTime: 1000,
        monthlyCost: 0.5,
        lastUpdated: new Date(),
      });
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      await service.generateReply('Test prompt', {});
      
      expect(mockStorageRepository.save).toHaveBeenCalled();
      const savedStats = mockStorageRepository.save.mock.calls[0][1];
      expect(savedStats.totalRequests).toBe(6);
      expect(savedStats.totalTokens).toBeGreaterThan(100);
    });
  });
  
  describe('optimizePrompt', () => {
    it('should optimize prompt with all context information', () => {
      const mockUserMapping: UserMapping = {
        id: 'user1',
        name: 'Test User',
        channels: {
          [ChannelType.GMAIL]: {
            email: 'test@example.com',
            userId: 'user1',
          },
        },
        avatar: undefined,
        priority: Priority.HIGH,
        tags: ['important', 'client'],
        lastActivity: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockContext: ReplyContext = {
        originalMessage: {
          id: '1',
          from: 'test@example.com',
          to: 'user@example.com',
          content: 'Hello, can you help me?',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
        relatedMessages: [
          {
            id: '2',
            from: 'test@example.com',
            to: 'user@example.com',
            content: 'Previous message',
            timestamp: new Date(),
            isUnread: false,
            channel: ChannelType.GMAIL,
          },
        ],
        userMapping: mockUserMapping,
        conversationHistory: [
          {
            id: '3',
            from: 'user@example.com',
            to: 'test@example.com',
            content: 'Sure, I can help',
            timestamp: new Date(),
            isUnread: false,
            channel: ChannelType.GMAIL,
          },
        ],
        userPreferences: {
          tone: 'formal',
          language: 'en',
          includeContext: true,
        },
      };
      
      const result = service.optimizePrompt(mockContext);
      
      expect(result).toContain('Hello, can you help me?');
      expect(result).toContain('Test User');
      expect(result).toContain('important, client');
      expect(result).toContain('Previous message');
      expect(result).toContain('Sure, I can help');
      expect(result).toContain('formal');
      expect(result).toContain('en');
      expect(result).toContain('gmail');
    });
    
    it('should handle context without user mapping', () => {
      const mockContext: ReplyContext = {
        originalMessage: {
          id: '1',
          from: 'unknown@example.com',
          to: 'user@example.com',
          content: 'Test message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
        relatedMessages: [],
        conversationHistory: [],
        userPreferences: {
          tone: 'casual',
          language: 'ja',
          includeContext: false,
        },
      };
      
      const result = service.optimizePrompt(mockContext);
      
      expect(result).toContain('Test message');
      expect(result).toContain('casual');
      expect(result).toContain('ja');
      expect(result).not.toContain('User Information');
      expect(result).not.toContain('Conversation History');
    });
  });
  
  describe('getUsageStats', () => {
    it('should return stored usage statistics', async () => {
      const mockStats = {
        totalRequests: 10,
        totalTokens: 500,
        successRate: 0.9,
        averageResponseTime: 1200,
        monthlyCost: 2.5,
        lastUpdated: new Date(),
      };
      
      mockStorageRepository.get.mockResolvedValue(mockStats);
      
      const result = await service.getUsageStats();
      
      expect(result).toEqual(mockStats);
    });
    
    it('should return default statistics when no stored data', async () => {
      mockStorageRepository.get.mockResolvedValue(null);
      
      const result = await service.getUsageStats();
      
      expect(result.totalRequests).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.successRate).toBe(1.0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.monthlyCost).toBe(0);
    });
  });
});