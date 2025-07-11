// Message Client Factory tests
// Based on design document testing requirements

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageClientFactory } from '../../../chrome-extension/src/services/channel/base/message-client.factory';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { IAuthTokenManager } from '../../../chrome-extension/src/types/infrastructure/auth.types';
import { GmailService } from '../../../chrome-extension/src/services/channel/gmail/gmail.service';
import { DiscordService } from '../../../chrome-extension/src/services/channel/discord/discord.service';
import { LineService } from '../../../chrome-extension/src/services/channel/line/line.service';

describe('MessageClientFactory', () => {
  let factory: MessageClientFactory;
  let mockAuthTokenManager: IAuthTokenManager;
  
  beforeEach(() => {
    mockAuthTokenManager = {
      saveToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      refreshToken: vi.fn(),
      validateToken: vi.fn(),
    };
    
    factory = new MessageClientFactory(mockAuthTokenManager);
  });
  
  describe('createClient', () => {
    it('should create Gmail client', () => {
      const client = factory.createClient(ChannelType.GMAIL);
      expect(client).toBeInstanceOf(GmailService);
      expect(client.getChannelInfo().type).toBe(ChannelType.GMAIL);
    });
    
    it('should create Discord client', () => {
      const client = factory.createClient(ChannelType.DISCORD);
      expect(client).toBeInstanceOf(DiscordService);
      expect(client.getChannelInfo().type).toBe(ChannelType.DISCORD);
    });
    
    it('should create LINE client', () => {
      const client = factory.createClient(ChannelType.LINE);
      expect(client).toBeInstanceOf(LineService);
      expect(client.getChannelInfo().type).toBe(ChannelType.LINE);
    });
    
    it('should throw error for unsupported channel', () => {
      expect(() => factory.createClient('unsupported' as ChannelType)).toThrow(
        'Unsupported channel type: unsupported'
      );
    });
  });
  
  describe('createAllClients', () => {
    it('should create all channel clients', () => {
      const clients = factory.createAllClients();
      
      expect(clients[ChannelType.GMAIL]).toBeInstanceOf(GmailService);
      expect(clients[ChannelType.DISCORD]).toBeInstanceOf(DiscordService);
      expect(clients[ChannelType.LINE]).toBeInstanceOf(LineService);
    });
    
    it('should return clients with correct channel types', () => {
      const clients = factory.createAllClients();
      
      expect(clients[ChannelType.GMAIL].getChannelInfo().type).toBe(ChannelType.GMAIL);
      expect(clients[ChannelType.DISCORD].getChannelInfo().type).toBe(ChannelType.DISCORD);
      expect(clients[ChannelType.LINE].getChannelInfo().type).toBe(ChannelType.LINE);
    });
  });
});