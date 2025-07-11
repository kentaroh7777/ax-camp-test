// Gmail Service tests
// Based on design document Gmail API integration testing

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailService } from '../../../chrome-extension/src/services/channel/gmail/gmail.service';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { IAuthTokenManager } from '../../../chrome-extension/src/types/infrastructure/auth.types';
import { SendMessageParams, GetMessagesParams } from '../../../chrome-extension/src/types/core/message.types';

// Mock Chrome API
const mockChrome = {
  identity: {
    getRedirectURL: vi.fn(() => 'https://extension-id.chromiumapp.org/'),
    launchWebAuthFlow: vi.fn(),
  },
};

// @ts-ignore
globalThis.chrome = mockChrome;

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('GmailService', () => {
  let service: GmailService;
  let mockAuthTokenManager: IAuthTokenManager;
  
  beforeEach(() => {
    mockAuthTokenManager = {
      saveToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      refreshToken: vi.fn(),
      validateToken: vi.fn(),
    };
    
    service = new GmailService(mockAuthTokenManager);
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  describe('Basic Properties', () => {
    it('should have correct channel type', () => {
      expect(service.getChannelInfo().type).toBe(ChannelType.GMAIL);
    });
    
    it('should have correct channel name', () => {
      expect(service.getChannelInfo().name).toBe('Gmail');
    });
  });
  
  describe('Authentication', () => {
    it('should check authentication status', async () => {
      const mockToken = {
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      const result = await service.isAuthenticated();
      
      expect(result).toBe(true);
      expect(mockAuthTokenManager.getToken).toHaveBeenCalledWith(ChannelType.GMAIL);
      expect(mockAuthTokenManager.validateToken).toHaveBeenCalledWith(ChannelType.GMAIL, mockToken);
    });
    
    it('should return false when no token exists', async () => {
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(null);
      
      const result = await service.isAuthenticated();
      
      expect(result).toBe(false);
    });
    
    it('should handle authentication flow', async () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?code=test';
      const mockTokenData = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        scope: 'gmail.readonly gmail.send',
      };
      
      mockChrome.identity.launchWebAuthFlow.mockResolvedValue(
        'https://extension-id.chromiumapp.org/?code=auth-code'
      );
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenData),
      });
      
      const result = await service.authenticate();
      
      expect(result.success).toBe(true);
      expect(result.token).toBe('new-access-token');
      expect(mockAuthTokenManager.saveToken).toHaveBeenCalledWith(
        ChannelType.GMAIL,
        expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'Bearer',
        })
      );
    });
  });
  
  describe('Send Message', () => {
    it('should send message successfully', async () => {
      const mockToken = {
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'message-id-123' }),
      });
      
      const params: SendMessageParams = {
        to: 'test@example.com',
        content: 'Test message',
      };
      
      const result = await service.sendMessage(params);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages/send'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
    
    it('should handle send message error', async () => {
      const mockToken = {
        accessToken: 'test-token',
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
        to: 'test@example.com',
        content: 'Test message',
      };
      
      const result = await service.sendMessage(params);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GMAIL_SEND_ERROR');
    });
  });
  
  describe('Get Messages', () => {
    it('should get messages successfully', async () => {
      const mockToken = {
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer' as const,
      };
      
      mockAuthTokenManager.getToken = vi.fn().mockResolvedValue(mockToken);
      mockAuthTokenManager.validateToken = vi.fn().mockResolvedValue(true);
      
      const mockMessage = {
        id: 'msg-123',
        threadId: 'thread-123',
        labelIds: ['INBOX'],
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Test Subject' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          body: { data: btoa('Test message content') },
        },
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            messages: [{ id: 'msg-123' }],
            nextPageToken: 'next-token',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessage),
        });
      
      const params: GetMessagesParams = {
        limit: 10,
        unreadOnly: false,
      };
      
      const result = await service.getMessages(params);
      
      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-123');
      expect(result.hasMore).toBe(true);
      expect(result.nextToken).toBe('next-token');
    });
    
    it('should handle get messages error', async () => {
      const mockToken = {
        accessToken: 'test-token',
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
      expect(result.error?.code).toBe('GMAIL_FETCH_ERROR');
    });
  });
});