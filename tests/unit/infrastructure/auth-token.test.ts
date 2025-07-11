// Auth Token Manager unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthTokenManager } from '../../../chrome-extension/src/services/infrastructure/auth-token.manager';
import { IChromeStorageRepository } from '../../../chrome-extension/src/types/infrastructure/storage.types';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { AuthToken } from '../../../chrome-extension/src/types/infrastructure/auth.types';

// Mock fetch globally
global.fetch = vi.fn();

describe('AuthTokenManager', () => {
  let authTokenManager: AuthTokenManager;
  let mockStorageRepository: IChromeStorageRepository;

  beforeEach(() => {
    mockStorageRepository = {
      save: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      getAll: vi.fn(),
      exists: vi.fn(),
    };

    authTokenManager = new AuthTokenManager(mockStorageRepository);
    vi.clearAllMocks();
  });

  describe('saveToken', () => {
    it('should save token for a channel', async () => {
      const channel = ChannelType.GMAIL;
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({});

      await authTokenManager.saveToken(channel, token);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'auth_tokens',
        { [channel]: token }
      );
    });

    it('should merge with existing tokens', async () => {
      const existingTokens = {
        [ChannelType.DISCORD]: {
          accessToken: 'discord-token',
          expiresAt: new Date(),
          tokenType: 'Bearer',
        },
      };

      const newToken: AuthToken = {
        accessToken: 'gmail-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue(existingTokens);

      await authTokenManager.saveToken(ChannelType.GMAIL, newToken);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'auth_tokens',
        {
          ...existingTokens,
          [ChannelType.GMAIL]: newToken,
        }
      );
    });

    it('should handle null existing tokens', async () => {
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue(null);

      await authTokenManager.saveToken(ChannelType.LINE, token);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'auth_tokens',
        { [ChannelType.LINE]: token }
      );
    });
  });

  describe('getToken', () => {
    it('should get token for a channel', async () => {
      const channel = ChannelType.GMAIL;
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ [channel]: token });

      const result = await authTokenManager.getToken(channel);

      expect(result).toEqual(token);
    });

    it('should return null when token does not exist', async () => {
      const channel = ChannelType.GMAIL;

      mockStorageRepository.get = vi.fn().mockResolvedValue({});

      const result = await authTokenManager.getToken(channel);

      expect(result).toBeNull();
    });

    it('should return null when storage returns null', async () => {
      const channel = ChannelType.DISCORD;

      mockStorageRepository.get = vi.fn().mockResolvedValue(null);

      const result = await authTokenManager.getToken(channel);

      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should remove token for a channel', async () => {
      const existingTokens = {
        [ChannelType.GMAIL]: {
          accessToken: 'gmail-token',
          expiresAt: new Date(),
          tokenType: 'Bearer',
        },
        [ChannelType.DISCORD]: {
          accessToken: 'discord-token',
          expiresAt: new Date(),
          tokenType: 'Bearer',
        },
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue(existingTokens);

      await authTokenManager.removeToken(ChannelType.GMAIL);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'auth_tokens',
        { [ChannelType.DISCORD]: existingTokens[ChannelType.DISCORD] }
      );
    });

    it('should handle removing non-existent token', async () => {
      mockStorageRepository.get = vi.fn().mockResolvedValue({});

      await authTokenManager.removeToken(ChannelType.GMAIL);

      expect(mockStorageRepository.save).toHaveBeenCalledWith('auth_tokens', {});
    });
  });

  describe('refreshToken', () => {
    it('should throw error when token does not exist', async () => {
      mockStorageRepository.get = vi.fn().mockResolvedValue({});

      await expect(authTokenManager.refreshToken(ChannelType.GMAIL))
        .rejects.toThrow('No token found for channel: gmail');
    });

    it('should throw error for Discord channel', async () => {
      const token: AuthToken = {
        accessToken: 'discord-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ [ChannelType.DISCORD]: token });

      await expect(authTokenManager.refreshToken(ChannelType.DISCORD))
        .rejects.toThrow('Discord does not support token refresh');
    });

    it('should refresh Gmail token successfully', async () => {
      const existingToken: AuthToken = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() - 1000),
        tokenType: 'Bearer',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'new-access-token',
          expires_in: 3600,
        }),
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ [ChannelType.GMAIL]: existingToken });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authTokenManager.refreshToken(ChannelType.GMAIL);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(mockStorageRepository.save).toHaveBeenCalled();
    });

    it('should throw error when Gmail refresh fails', async () => {
      const existingToken: AuthToken = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      const mockResponse = {
        ok: false,
        status: 400,
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ [ChannelType.GMAIL]: existingToken });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(authTokenManager.refreshToken(ChannelType.GMAIL))
        .rejects.toThrow('Failed to refresh Gmail token');
    });

    it('should throw error when Gmail token has no refresh token', async () => {
      const existingToken: AuthToken = {
        accessToken: 'old-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ [ChannelType.GMAIL]: existingToken });

      await expect(authTokenManager.refreshToken(ChannelType.GMAIL))
        .rejects.toThrow('No refresh token available for Gmail');
    });

    it('should return LINE token as is', async () => {
      const existingToken: AuthToken = {
        accessToken: 'line-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ [ChannelType.LINE]: existingToken });

      const result = await authTokenManager.refreshToken(ChannelType.LINE);

      expect(result).toEqual(existingToken);
    });

    it('should throw error for unsupported channel', async () => {
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(),
        tokenType: 'Bearer',
      };

      mockStorageRepository.get = vi.fn().mockResolvedValue({ 'unsupported': token });

      await expect(authTokenManager.refreshToken('unsupported' as ChannelType))
        .rejects.toThrow('Unsupported channel: unsupported');
    });
  });

  describe('validateToken', () => {
    it('should return false for expired token', async () => {
      const expiredToken: AuthToken = {
        accessToken: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        tokenType: 'Bearer',
      };

      const result = await authTokenManager.validateToken(ChannelType.GMAIL, expiredToken);

      expect(result).toBe(false);
    });

    it('should validate Gmail token successfully', async () => {
      const token: AuthToken = {
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      const mockResponse = { ok: true };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authTokenManager.validateToken(ChannelType.GMAIL, token);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v1/tokeninfo',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' },
        }
      );
    });

    it('should validate Discord token successfully', async () => {
      const token: AuthToken = {
        accessToken: 'https://discord.com/api/webhooks/123/abc',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      const mockResponse = { ok: true };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authTokenManager.validateToken(ChannelType.DISCORD, token);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/abc',
        { method: 'GET' }
      );
    });

    it('should validate LINE token successfully', async () => {
      const token: AuthToken = {
        accessToken: 'line-channel-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      const mockResponse = { ok: true };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authTokenManager.validateToken(ChannelType.LINE, token);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/info',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer line-channel-token' },
        }
      );
    });

    it('should return false when validation fails', async () => {
      const token: AuthToken = {
        accessToken: 'invalid-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      const mockResponse = { ok: false };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authTokenManager.validateToken(ChannelType.GMAIL, token);

      expect(result).toBe(false);
    });

    it('should return false when fetch throws error', async () => {
      const token: AuthToken = {
        accessToken: 'error-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await authTokenManager.validateToken(ChannelType.GMAIL, token);

      expect(result).toBe(false);
    });

    it('should return false for unsupported channel', async () => {
      const token: AuthToken = {
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer',
      };

      const result = await authTokenManager.validateToken('unsupported' as ChannelType, token);

      expect(result).toBe(false);
    });
  });
});