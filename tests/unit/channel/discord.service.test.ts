// Discord Service tests
// Based on design document Discord Webhook integration testing

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordService } from '../../../chrome-extension/src/services/channel/discord/discord.service';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { IAuthTokenManager } from '../../../chrome-extension/src/types/infrastructure/auth.types';
import { SendMessageParams, GetMessagesParams } from '../../../chrome-extension/src/types/core/message.types';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('DiscordService', () => {
  let service: DiscordService;
  let mockAuthTokenManager: IAuthTokenManager;
  
  beforeEach(() => {
    mockAuthTokenManager = {
      saveToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      refreshToken: vi.fn(),
      validateToken: vi.fn(),
    };
    
    service = new DiscordService(mockAuthTokenManager);
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  describe('Basic Properties', () => {
    it('should have correct channel type', () => {
      expect(service.getChannelInfo().type).toBe(ChannelType.DISCORD);
    });
    
    it('should have correct channel name', () => {
      expect(service.getChannelInfo().name).toBe('Discord');
    });
  });
  
  describe('Authentication', () => {
    it('should check authentication status', async () => {
      const mockToken = {
        accessToken: 'https://discord.com/api/webhooks/123/abc',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      const result = await service.isAuthenticated();
      
      expect(result).toBe(true);
      expect(mockAuthTokenManager.getToken).toHaveBeenCalledWith(ChannelType.DISCORD);
      expect(mockAuthTokenManager.validateToken).toHaveBeenCalledWith(ChannelType.DISCORD, mockToken);
    });
    
    it('should return false when no token exists', async () => {
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(null);
      
      const result = await service.isAuthenticated();
      
      expect(result).toBe(false);
    });
    
    it('should authenticate with webhook URL', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
      
      mockFetch.mockResolvedValue({
        ok: true,
      });
      
      const result = await service.authenticate({ webhookUrl });
      
      expect(result.success).toBe(true);
      expect(result.token).toBe(webhookUrl);
      expect(mockAuthTokenManager.saveToken).toHaveBeenCalledWith(
        ChannelType.DISCORD,
        expect.objectContaining({
          accessToken: webhookUrl,
          tokenType: 'Bearer',
        })
      );
    });
    
    it('should handle authentication error for invalid webhook', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/invalid';
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });
      
      const result = await service.authenticate({ webhookUrl });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISCORD_AUTH_ERROR');
    });
    
    it('should handle authentication error for missing webhook URL', async () => {
      const result = await service.authenticate();
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISCORD_AUTH_ERROR');
      expect(result.error?.message).toBe('Discord Webhook URL is required');
    });
  });
  
  describe('Send Message', () => {
    it('should send message successfully', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
      
      const mockToken = {
        accessToken: webhookUrl,
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      
      const params: SendMessageParams = {
        to: 'channel-id',
        content: 'Test message',
      };
      
      const result = await service.sendMessage(params);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('discord-webhook-sent');
      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: 'Test message',
            username: 'Multi-Channel Assistant',
            avatar_url: undefined,
          }),
        })
      );
    });
    
    it('should handle send message error', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
      
      const mockToken = {
        accessToken: webhookUrl,
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
        to: 'channel-id',
        content: 'Test message',
      };
      
      const result = await service.sendMessage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISCORD_SEND_ERROR');
    });
  });
  
  describe('Get Messages', () => {
    it('should return empty messages (webhook limitation)', async () => {
      const params: GetMessagesParams = {
        limit: 10,
      };
      
      const result = await service.getMessages(params);
      
      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});