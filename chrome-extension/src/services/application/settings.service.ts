// Settings Service implementation
// Based on design document Line 703-709

import { ISettingsService, AppSettings } from '../../types/services/settings.types';
import { ChannelType, Priority } from '../../types/core/channel.types';
import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';
import { STORAGE_KEYS } from '../../types/infrastructure/storage.types';

export class SettingsService implements ISettingsService {
  constructor(private storageRepository: IChromeStorageRepository) {}
  
  async getSettings(): Promise<AppSettings> {
    const settings = await this.storageRepository.get<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
    return settings || this.getDefaultSettings();
  }
  
  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...settings,
      // Handle nested object updates
      general: { ...currentSettings.general, ...settings.general },
      notifications: { ...currentSettings.notifications, ...settings.notifications },
      ai: { ...currentSettings.ai, ...settings.ai },
      channels: { ...currentSettings.channels, ...settings.channels },
      ui: { ...currentSettings.ui, ...settings.ui },
    };
    
    await this.storageRepository.save(STORAGE_KEYS.APP_SETTINGS, updatedSettings);
  }
  
  async resetSettings(): Promise<void> {
    await this.storageRepository.save(STORAGE_KEYS.APP_SETTINGS, this.getDefaultSettings());
  }
  
  private getDefaultSettings(): AppSettings {
    return {
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
          maxResults: 50 
        },
        [ChannelType.DISCORD]: { 
          enabled: true 
        },
        [ChannelType.LINE]: { 
          enabled: true, 
          proxyUrl: process.env.LINE_PROXY_URL || '' 
        },
      },
      ui: {
        compactMode: false,
        showAvatars: true,
        groupByUser: true,
        defaultSortOrder: 'timestamp',
      },
    };
  }
}