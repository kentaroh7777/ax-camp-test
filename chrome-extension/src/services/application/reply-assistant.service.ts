// Reply Assistant Service implementation
// Based on design document Line 646-677

import { IReplyAssistantService, UnifiedInboxResult, ReplyContext, ReplyGenerationResult } from '../../types/services/reply-assistant.types';
import { MessageClientFactory } from '../channel/base/message-client.factory';
import { IUserMappingService } from '../../types/services/user-mapping.types';
import { ILLMIntegrationService } from '../../types/services/llm.types';
import { ChannelType } from '../../types/core/channel.types';
import { Message } from '../../types/core/message.types';
import { ChannelFetchResult } from '../../types/services/reply-assistant.types';
import { ResolvedMessage } from '../../types/core/user.types';

export class ReplyAssistantService implements IReplyAssistantService {
  constructor(
    private messageClientFactory: MessageClientFactory,
    private userMappingService: IUserMappingService,
    private llmService: ILLMIntegrationService
  ) {}
  
  async fetchAllUnreadMessages(): Promise<UnifiedInboxResult> {
    const allClients = this.messageClientFactory.createAllClients();
    const channels = Object.keys(allClients) as ChannelType[];
    
    // Parallel processing for all channels
    const fetchResults = await Promise.allSettled(
      channels.map(async (channel) => {
        const client = allClients[channel];
        const isAuthenticated = await client.isAuthenticated();
        
        if (!isAuthenticated) {
          return { 
            channel, 
            success: false, 
            messages: [], 
            error: 'Not authenticated' 
          };
        }
        
        const result = await client.getMessages({ 
          unreadOnly: true, 
          limit: 50 
        });
        
        return {
          channel,
          success: result.success,
          messages: result.messages || [],
          error: result.error?.message,
        };
      })
    );
    
    // Combine results
    const allMessages: Message[] = [];
    const channelResults: Record<ChannelType, ChannelFetchResult> = {} as any;
    
    fetchResults.forEach((result, index) => {
      const channel = channels[index];
      const fetchResult = result.status === 'fulfilled' ? result.value : { 
        channel, 
        success: false, 
        messages: [], 
        error: 'Fetch failed' 
      };
      
      channelResults[channel] = {
        success: fetchResult.success,
        messageCount: fetchResult.messages.length,
        error: fetchResult.error ? { 
          code: 'FETCH_ERROR', 
          message: fetchResult.error 
        } : undefined,
        fetchTime: 0,
      };
      
      if (fetchResult.success) {
        allMessages.push(...fetchResult.messages);
      }
    });
    
    // Resolve user mappings
    const resolvedMessages = await this.userMappingService.resolveUserMappings(allMessages);
    
    return {
      success: true,
      messages: resolvedMessages,
      channelResults,
      totalUnread: allMessages.length,
      lastFetch: new Date(),
    };
  }
  
  async generateReply(context: ReplyContext): Promise<ReplyGenerationResult> {
    try {
      const optimizedPrompt = this.llmService.optimizePrompt(context);
      const reply = await this.llmService.generateReply(optimizedPrompt, context);
      
      return {
        success: true,
        reply,
        confidence: 0.85,
        tokensUsed: Math.ceil(reply.length / 4), // Approximation
      };
    } catch (error) {
      return {
        success: false,
        reply: '',
        confidence: 0,
        tokensUsed: 0,
        error: {
          code: 'REPLY_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async getRelatedMessages(userId: string, originalMessage: Message): Promise<Message[]> {
    const userMapping = await this.userMappingService.getMapping(userId);
    if (!userMapping) return [];
    
    const relatedMessages: Message[] = [];
    const allClients = this.messageClientFactory.createAllClients();
    
    // Search related messages from each channel
    for (const [channel, channelInfo] of Object.entries(userMapping.channels)) {
      const client = allClients[channel as ChannelType];
      if (!client || !await client.isAuthenticated()) continue;
      
      const result = await client.getMessages({ 
        limit: 5,
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Past 7 days
      });
      
      if (result.success) {
        const userMessages = result.messages.filter(msg => 
          this.isMessageFromUser(msg, channelInfo)
        );
        relatedMessages.push(...userMessages);
      }
    }
    
    return relatedMessages.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
  
  private isMessageFromUser(message: Message, channelInfo: any): boolean {
    switch (message.channel) {
      case ChannelType.GMAIL:
        return message.from.includes(channelInfo.email);
      case ChannelType.DISCORD:
        return message.from.includes(channelInfo.username);
      case ChannelType.LINE:
        return message.from === channelInfo.userId;
      default:
        return false;
    }
  }
}