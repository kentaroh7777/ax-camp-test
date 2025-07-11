// User Mapping Service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserMappingService } from '../../../chrome-extension/src/services/application/user-mapping.service';
import { IChromeStorageRepository } from '../../../chrome-extension/src/types/infrastructure/storage.types';
import { ChannelType, Priority } from '../../../chrome-extension/src/types/core/channel.types';
import { UserMapping, UserMappingRequest } from '../../../chrome-extension/src/types/core/user.types';
import { Message } from '../../../chrome-extension/src/types/core/message.types';

// Mock dependencies
const mockStorageRepository = {
  save: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  getAll: vi.fn(),
  exists: vi.fn(),
} as any;

describe('UserMappingService', () => {
  let service: UserMappingService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserMappingService(mockStorageRepository);
  });
  
  describe('createMapping', () => {
    it('should create a new user mapping', async () => {
      const mockRequest: UserMappingRequest = {
        name: 'Test User',
        channels: {
          [ChannelType.GMAIL]: {
            email: 'test@example.com',
            userId: 'user1',
          },
        },
        priority: Priority.HIGH,
        tags: ['important'],
      };
      
      const existingMappings: UserMapping[] = [];
      mockStorageRepository.get.mockResolvedValue(existingMappings);
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      const result = await service.createMapping(mockRequest);
      
      expect(result.name).toBe(mockRequest.name);
      expect(result.channels).toEqual(mockRequest.channels);
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.tags).toEqual(['important']);
      expect(result.isActive).toBe(true);
      expect(result.id).toBeDefined();
      expect(mockStorageRepository.save).toHaveBeenCalled();
    });
    
    it('should use default priority when not specified', async () => {
      const mockRequest: UserMappingRequest = {
        name: 'Test User',
        channels: {
          [ChannelType.GMAIL]: {
            email: 'test@example.com',
            userId: 'user1',
          },
        },
      };
      
      mockStorageRepository.get.mockResolvedValue([]);
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      const result = await service.createMapping(mockRequest);
      
      expect(result.priority).toBe(Priority.NORMAL);
      expect(result.tags).toEqual([]);
    });
  });
  
  describe('getMapping', () => {
    it('should return user mapping by ID', async () => {
      const mockMapping: UserMapping = {
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
      
      mockStorageRepository.get.mockResolvedValue([mockMapping]);
      
      const result = await service.getMapping('user1');
      
      expect(result).toEqual(mockMapping);
    });
    
    it('should return null when mapping not found', async () => {
      mockStorageRepository.get.mockResolvedValue([]);
      
      const result = await service.getMapping('nonexistent');
      
      expect(result).toBeNull();
    });
  });
  
  describe('resolveUserMappings', () => {
    it('should resolve user mappings for messages', async () => {
      const mockMapping: UserMapping = {
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
          content: 'Test message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
        {
          id: '2',
          from: 'unknown@example.com',
          to: 'user@example.com',
          content: 'Another message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.GMAIL,
        },
      ];
      
      mockStorageRepository.get.mockResolvedValue([mockMapping]);
      
      const result = await service.resolveUserMappings(mockMessages);
      
      expect(result).toHaveLength(2);
      expect(result[0].resolvedUser).toEqual(mockMapping);
      expect(result[0].priority).toBe(Priority.HIGH);
      expect(result[1].resolvedUser).toBeUndefined();
      expect(result[1].priority).toBe(Priority.NORMAL);
    });
    
    it('should handle messages from different channels', async () => {
      const mockMapping: UserMapping = {
        id: 'user1',
        name: 'Test User',
        channels: {
          [ChannelType.DISCORD]: {
            username: 'testuser',
            userId: 'discord123',
          },
          [ChannelType.LINE]: {
            displayName: 'Test User',
            userId: 'line456',
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
          from: 'testuser#1234',
          to: 'channel',
          content: 'Discord message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.DISCORD,
        },
        {
          id: '2',
          from: 'line456',
          to: 'bot',
          content: 'LINE message',
          timestamp: new Date(),
          isUnread: true,
          channel: ChannelType.LINE,
        },
      ];
      
      mockStorageRepository.get.mockResolvedValue([mockMapping]);
      
      const result = await service.resolveUserMappings(mockMessages);
      
      expect(result).toHaveLength(2);
      expect(result[0].resolvedUser).toEqual(mockMapping);
      expect(result[1].resolvedUser).toEqual(mockMapping);
    });
  });
  
  describe('getAllMappings', () => {
    it('should return all user mappings', async () => {
      const mockMappings: UserMapping[] = [
        {
          id: 'user1',
          name: 'Test User 1',
          channels: {},
          avatar: undefined,
          priority: Priority.NORMAL,
          tags: [],
          lastActivity: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user2',
          name: 'Test User 2',
          channels: {},
          avatar: undefined,
          priority: Priority.HIGH,
          tags: [],
          lastActivity: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockStorageRepository.get.mockResolvedValue(mockMappings);
      
      const result = await service.getAllMappings();
      
      expect(result).toEqual(mockMappings);
    });
    
    it('should return empty array when no mappings exist', async () => {
      mockStorageRepository.get.mockResolvedValue(null);
      
      const result = await service.getAllMappings();
      
      expect(result).toEqual([]);
    });
  });
});