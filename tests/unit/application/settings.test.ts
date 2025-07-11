// Settings Service unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from '../../../chrome-extension/src/services/application/settings.service';
import { IChromeStorageRepository } from '../../../chrome-extension/src/types/infrastructure/storage.types';
import { AppSettings } from '../../../chrome-extension/src/types/services/settings.types';
import { ChannelType, Priority } from '../../../chrome-extension/src/types/core/channel.types';

// Mock dependencies
const mockStorageRepository = {
  save: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  getAll: vi.fn(),
  exists: vi.fn(),
} as any;

describe('SettingsService', () => {
  let service: SettingsService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService(mockStorageRepository);
  });
  
  describe('getSettings', () => {
    it('should return stored settings', async () => {
      const mockSettings: AppSettings = {
        general: {
          language: 'en',
          theme: 'dark',
          autoFetch: false,
          fetchInterval: 10,
          maxMessageHistory: 500,
        },
        notifications: {
          enabled: false,
          sound: false,
          desktop: false,
          priorities: [Priority.URGENT],
        },
        ai: {
          provider: 'anthropic',
          model: 'claude-3-haiku',
          temperature: 0.5,
          maxTokens: 1000,
        },
        channels: {
          [ChannelType.GMAIL]: {
            enabled: false,
            maxResults: 25,
          },
          [ChannelType.DISCORD]: {
            enabled: false,
          },
          [ChannelType.LINE]: {
            enabled: false,
            proxyUrl: 'https://custom-proxy.com',
          },
        },
        ui: {
          compactMode: true,
          showAvatars: false,
          groupByUser: false,
          defaultSortOrder: 'priority',
        },
      };
      
      mockStorageRepository.get.mockResolvedValue(mockSettings);
      
      const result = await service.getSettings();
      
      expect(result).toEqual(mockSettings);
    });
    
    it('should return default settings when no stored settings', async () => {
      mockStorageRepository.get.mockResolvedValue(null);
      
      const result = await service.getSettings();
      
      expect(result.general.language).toBe('ja');
      expect(result.general.theme).toBe('auto');
      expect(result.general.autoFetch).toBe(true);
      expect(result.notifications.enabled).toBe(true);
      expect(result.ai.provider).toBe('openai');
      expect(result.channels[ChannelType.GMAIL].enabled).toBe(true);
      expect(result.ui.compactMode).toBe(false);
    });
  });
  
  describe('updateSettings', () => {
    it('should update settings with partial data', async () => {
      const currentSettings: AppSettings = {
        general: {
          language: 'ja',
          theme: 'auto',
          autoFetch: true,
          fetchInterval: 5,
          maxMessageHistory: 1000,
        },
        notifications: {
          enabled: true,
          sound: true,
          desktop: true,
          priorities: [Priority.HIGH, Priority.URGENT],
        },
        ai: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500,
        },
        channels: {
          [ChannelType.GMAIL]: {
            enabled: true,
            maxResults: 50,
          },
          [ChannelType.DISCORD]: {
            enabled: true,
          },
          [ChannelType.LINE]: {
            enabled: true,
            proxyUrl: '',
          },
        },
        ui: {
          compactMode: false,
          showAvatars: true,
          groupByUser: true,
          defaultSortOrder: 'timestamp',
        },
      };
      
      mockStorageRepository.get.mockResolvedValue(currentSettings);
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      const updateData = {
        general: {
          language: 'en',
          theme: 'dark' as const,
        },
        ai: {
          temperature: 0.8,
        },
      };
      
      await service.updateSettings(updateData);
      
      expect(mockStorageRepository.save).toHaveBeenCalled();
      const savedSettings = mockStorageRepository.save.mock.calls[0][1];
      
      expect(savedSettings.general.language).toBe('en');
      expect(savedSettings.general.theme).toBe('dark');
      expect(savedSettings.general.autoFetch).toBe(true); // preserved
      expect(savedSettings.ai.temperature).toBe(0.8);
      expect(savedSettings.ai.provider).toBe('openai'); // preserved
      expect(savedSettings.notifications).toEqual(currentSettings.notifications); // preserved
    });
    
    it('should handle nested object updates correctly', async () => {
      const currentSettings: AppSettings = {
        general: {
          language: 'ja',
          theme: 'auto',
          autoFetch: true,
          fetchInterval: 5,
          maxMessageHistory: 1000,
        },
        notifications: {
          enabled: true,
          sound: true,
          desktop: true,
          priorities: [Priority.HIGH],
        },
        ai: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500,
        },
        channels: {
          [ChannelType.GMAIL]: {
            enabled: true,
            maxResults: 50,
          },
          [ChannelType.DISCORD]: {
            enabled: true,
          },
          [ChannelType.LINE]: {
            enabled: true,
            proxyUrl: '',
          },
        },
        ui: {
          compactMode: false,
          showAvatars: true,
          groupByUser: true,
          defaultSortOrder: 'timestamp',
        },
      };
      
      mockStorageRepository.get.mockResolvedValue(currentSettings);
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      const updateData = {
        notifications: {
          enabled: false,
          priorities: [Priority.URGENT],
        },
      };
      
      await service.updateSettings(updateData);
      
      const savedSettings = mockStorageRepository.save.mock.calls[0][1];
      
      expect(savedSettings.notifications.enabled).toBe(false);
      expect(savedSettings.notifications.priorities).toEqual([Priority.URGENT]);
      expect(savedSettings.notifications.sound).toBe(true); // preserved
      expect(savedSettings.notifications.desktop).toBe(true); // preserved
    });
  });
  
  describe('resetSettings', () => {
    it('should reset settings to default values', async () => {
      mockStorageRepository.save.mockResolvedValue(undefined);
      
      await service.resetSettings();
      
      expect(mockStorageRepository.save).toHaveBeenCalled();
      const savedSettings = mockStorageRepository.save.mock.calls[0][1];
      
      expect(savedSettings.general.language).toBe('ja');
      expect(savedSettings.general.theme).toBe('auto');
      expect(savedSettings.general.autoFetch).toBe(true);
      expect(savedSettings.notifications.enabled).toBe(true);
      expect(savedSettings.ai.provider).toBe('openai');
      expect(savedSettings.channels[ChannelType.GMAIL].enabled).toBe(true);
      expect(savedSettings.ui.compactMode).toBe(false);
    });
  });
});