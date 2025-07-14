// User Mapping Service implementation
// Based on design document Line 678-694

import { IUserMappingService } from '../../types/services/user-mapping.types';
import { UserMapping, UserMappingRequest, ResolvedMessage } from '../../types/core/user.types';
import { Message } from '../../types/core/message.types';
import { ChannelType, Priority } from '../../types/core/channel.types';
import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';
import { STORAGE_KEYS } from '../../types/infrastructure/storage.types';

export class UserMappingService implements IUserMappingService {
  constructor(private storageRepository: IChromeStorageRepository) {}
  
  async createMapping(mapping: UserMappingRequest): Promise<UserMapping> {
    const userMapping: UserMapping = {
      id: this.generateId(),
      name: mapping.name,
      channels: mapping.channels,
      avatar: mapping.avatar,
      priority: mapping.priority || Priority.NORMAL,
      tags: mapping.tags || [],
      lastActivity: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const existingMappings = await this.getAllMappings();
    existingMappings.push(userMapping);
    
    await this.storageRepository.save(STORAGE_KEYS.USER_MAPPINGS, existingMappings);
    return userMapping;
  }
  
  async getMapping(userId: string): Promise<UserMapping | null> {
    const mappings = await this.getAllMappings();
    return mappings.find(mapping => mapping.id === userId) || null;
  }
  
  async resolveUserMappings(messages: Message[]): Promise<ResolvedMessage[]> {
    const mappings = await this.getAllMappings();
    
    return messages.map(message => {
      const resolvedUser = this.findUserMappingForMessage(message, mappings);
      return {
        ...message,
        resolvedUser,
        relatedMessages: [],
        priority: resolvedUser?.priority || Priority.NORMAL,
      };
    });
  }
  
  async getAllMappings(): Promise<UserMapping[]> {
    const mappings = await this.storageRepository.get<UserMapping[]>(STORAGE_KEYS.USER_MAPPINGS);
    return mappings || [];
  }
  
  private findUserMappingForMessage(message: Message, mappings: UserMapping[]): UserMapping | undefined {
    return mappings.find(mapping => {
      const channelInfo = mapping.channels[message.channel];
      if (!channelInfo) return false;
      
      switch (message.channel) {
        case ChannelType.GMAIL:
          return 'email' in channelInfo && message.from.includes(channelInfo.email);
        case ChannelType.DISCORD:
          return 'username' in channelInfo && message.from.includes(channelInfo.username);
        case ChannelType.LINE:
          return 'userId' in channelInfo && message.from === channelInfo.userId;
        default:
          return false;
      }
    });
  }
  
  private generateId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}