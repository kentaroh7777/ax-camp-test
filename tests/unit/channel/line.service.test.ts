// LINE Service tests
// Based on design document LINE Proxy integration testing

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LineService } from '../../../chrome-extension/src/services/channel/line/line.service';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { IAuthTokenManager } from '../../../chrome-extension/src/types/infrastructure/auth.types';
import { SendMessageParams, GetMessagesParams } from '../../../chrome-extension/src/types/core/message.types';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('LineService', () => {
  let service: LineService;
  let mockAuthTokenManager: IAuthTokenManager;
  
  beforeEach(() => {
    mockAuthTokenManager = {
      saveToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      refreshToken: vi.fn(),
      validateToken: vi.fn(),
    };
    
    service = new LineService(mockAuthTokenManager);
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  describe('Basic Properties', () => {
    it('should have correct channel type', () => {
      expect(service.getChannelInfo().type).toBe(ChannelType.LINE);
    });
    
    it('should have correct channel name', () => {
      expect(service.getChannelInfo().name).toBe('LINE');
    });
  });
  
  describe('Authentication', () => {
    it('should check authentication status', async () => {
      const mockToken = {
        accessToken: 'channel-access-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      const result = await service.isAuthenticated();
      
      expect(result).toBe(true);
      expect(mockAuthTokenManager.getToken).toHaveBeenCalledWith(ChannelType.LINE);
      expect(mockAuthTokenManager.validateToken).toHaveBeenCalledWith(ChannelType.LINE, mockToken);
    });
    
    it('should return false when no token exists', async () => {
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(null);
      
      const result = await service.isAuthenticated();
      
      expect(result).toBe(false);
    });
    
    it('should authenticate with channel access token', async () => {
      const channelAccessToken = 'valid-channel-access-token';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userId: 'bot-user-id',
          basicId: 'basic-id',
          premiumId: 'premium-id',
          displayName: 'Bot Name',
        }),
      });
      
      const result = await service.authenticate({ channelAccessToken });
      
      expect(result.success).toBe(true);
      expect(result.token).toBe(channelAccessToken);
      expect(mockAuthTokenManager.saveToken).toHaveBeenCalledWith(
        ChannelType.LINE,
        expect.objectContaining({
          accessToken: channelAccessToken,
          tokenType: 'Bearer',
        })
      );
    });
    
    it('should handle authentication error for invalid token', async () => {
      const channelAccessToken = 'invalid-channel-access-token';
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });
      
      const result = await service.authenticate({ channelAccessToken });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LINE_AUTH_ERROR');
    });
    
    it('should handle authentication error for missing token', async () => {
      const result = await service.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LINE_AUTH_ERROR');
      expect(result.error?.message).toBe('LINE Channel Access Token is required');
    });
  });
  
  describe('Send Message', () => {
    it('should send message successfully', async () => {
      const mockToken = {
        accessToken: 'channel-access-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messageId: 'line-msg-123' }),
      });
      
      const params: SendMessageParams = {
        to: 'user-id',
        content: 'Test message',
      };
      
      const result = await service.sendMessage(params);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('line-msg-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/line/message/push'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer channel-access-token',
          },
          body: JSON.stringify({
            to: 'user-id',
            messages: [
              {
                type: 'text',
                text: 'Test message',
              },
            ],
          }),
        })
      );
    });
    
    it('should handle send message error', async () => {
      const mockToken = {
        accessToken: 'channel-access-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });
      
      const params: SendMessageParams = {
        to: 'user-id',
        content: 'Test message',
      };
      
      const result = await service.sendMessage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LINE_SEND_ERROR');
    });
  });
  
  describe('Get Messages', () => {
    it('should get messages successfully', async () => {
      const mockToken = {
        accessToken: 'channel-access-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      const mockMessages = [
        {
          id: 'msg-123',
          timestamp: Date.now(),
          source: { userId: 'user-123' },
          message: { text: 'Hello from LINE' },
        },
      ];
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messages: mockMessages,
          hasMore: false,
        }),
      });
      
      const params: GetMessagesParams = {
        limit: 10,
      };
      
      const result = await service.getMessages(params);
      
      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-123');
      expect(result.messages[0].channel).toBe(ChannelType.LINE);
      expect(result.messages[0].content).toBe('Hello from LINE');
      expect(result.hasMore).toBe(false);
    });
    
    it('should handle get messages error', async () => {
      const mockToken = {
        accessToken: 'channel-access-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });
      
      const params: GetMessagesParams = {
        limit: 10,
      };
      
      const result = await service.getMessages(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LINE_FETCH_ERROR');
    });
    
    it('should handle messages with since parameter', async () => {
      const mockToken = {
        accessToken: 'channel-access-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messages: [],
          hasMore: false,
        }),
      });
      
      const sinceDate = new Date('2023-01-01');
      const params: GetMessagesParams = {
        limit: 10,
        since: sinceDate,
      };
      
      await service.getMessages(params);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`since=${encodeURIComponent(sinceDate.toISOString())}`),
        expect.any(Object)
      );
    });
  });
});