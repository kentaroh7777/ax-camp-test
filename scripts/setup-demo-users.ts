#!/usr/bin/env node
/**
 * デモアプリ用ユーザーマッピング初期化スクリプト
 * 「林健太郎」の複数チャンネルアカウントを紐づけ
 */

import { UserMappingService } from '../chrome-extension/src/services/application/user-mapping.service';
import { ChromeStorageRepository } from '../chrome-extension/src/services/infrastructure/chrome-storage.repository';
import { ChannelType, Priority } from '../chrome-extension/src/types/core/channel.types';
import { UserMappingRequest } from '../chrome-extension/src/types/core/user.types';

async function setupDemoUsers() {
  console.log('🚀 デモユーザーマッピング初期化開始');
  
  // Chrome Storage Repository (Node.js環境用モック)
  const storageRepository = {
    get: async (key: string) => {
      // 初回は空配列を返す
      return [];
    },
    save: async (key: string, data: any) => {
      console.log(`📊 保存データ (${key}):`, JSON.stringify(data, null, 2));
      return Promise.resolve();
    },
    remove: async (key: string) => Promise.resolve(),
    clear: async () => Promise.resolve(),
  };

  const userMappingService = new UserMappingService(storageRepository as any);

  // 林健太郎のマッピング作成
  const hayashiMapping: UserMappingRequest = {
    name: '林健太郎',
    channels: {
      [ChannelType.GMAIL]: {
        email: 'kh@h-fpo.com',
        userId: 'kh@h-fpo.com',
        displayName: '林FP事務所 林健太郎'
      },
      [ChannelType.DISCORD]: {
        username: 'tama4420',
        userId: '1394492451317878804',
        displayName: 'tama4420'
      },
      [ChannelType.LINE]: {
        displayName: '林健太郎',
        userId: 'Uef5b6811e0ea47b39726288d1f867532'
      }
    },
    priority: Priority.HIGH,
    tags: ['FP事務所', 'クライアント', 'デモユーザー']
  };

  try {
    const createdMapping = await userMappingService.createMapping(hayashiMapping);
    console.log('✅ 林健太郎のユーザーマッピングを作成しました');
    console.log('🆔 生成ID:', createdMapping.id);
    console.log('📧 Gmail:', createdMapping.channels[ChannelType.GMAIL]?.email);
    console.log('💬 Discord:', createdMapping.channels[ChannelType.DISCORD]?.username);
    console.log('📱 LINE:', createdMapping.channels[ChannelType.LINE]?.userId);
    
    return createdMapping;
  } catch (error) {
    console.error('❌ ユーザーマッピング作成エラー:', error);
    throw error;
  }
}

// Chrome Storage データ生成
export function generateDemoUserMappingData() {
  const demoMapping = {
    id: 'user-demo-hayashi-kentaro',
    name: '林健太郎',
    channels: {
      [ChannelType.GMAIL]: {
        email: 'kh@h-fpo.com',
        userId: 'kh@h-fpo.com',
        displayName: '林FP事務所 林健太郎'
      },
      [ChannelType.DISCORD]: {
        username: 'tama4420',
        userId: '1394492451317878804',
        displayName: 'tama4420'
      },
      [ChannelType.LINE]: {
        displayName: '林健太郎',
        userId: 'Uef5b6811e0ea47b39726288d1f867532'
      }
    },
    avatar: undefined,
    priority: Priority.HIGH,
    tags: ['FP事務所', 'クライアント', 'デモユーザー'],
    lastActivity: new Date(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('🎭 デモユーザーマッピングデータ生成:');
  console.log(JSON.stringify([demoMapping], null, 2));
  
  return [demoMapping];
}

if (require.main === module) {
  setupDemoUsers().catch(console.error);
} 