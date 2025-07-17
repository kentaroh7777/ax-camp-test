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
        
        console.log(`ReplyAssistantService: ${channel} isAuthenticated:`, isAuthenticated);
        console.log(`ReplyAssistantService: PROXY_AUTH_ENABLE:`, process.env.PROXY_AUTH_ENABLE);
        
        if (!isAuthenticated) {
          console.log(`ReplyAssistantService: ${channel} not authenticated, skipping`);
          return { 
            channel, 
            success: false, 
            messages: [], 
            error: 'Not authenticated' 
          };
        }
        
        console.log(`ReplyAssistantService: ${channel} fetching messages...`);
        
        const result = await client.getMessages({ 
          unreadOnly: true, 
          limit: 2  // 各チャンネル最大2件に制限
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

  async generateReplyWithSameUser(context: ReplyContext): Promise<ReplyGenerationResult> {
    try {
      // 同一人物のコンテキストを強化したプロンプトを生成
      const enhancedPrompt = this.llmService.optimizePrompt(context);
      const reply = await this.llmService.generateReply(enhancedPrompt, context);
      
      return {
        success: true,
        reply,
        confidence: 0.90, // 同一人物コンテキストがあるため信頼度を高く設定
        tokensUsed: Math.ceil(reply.length / 4), // Approximation
      };
    } catch (error) {
      return {
        success: false,
        reply: '',
        confidence: 0,
        tokensUsed: 0,
        error: {
          code: 'SAME_USER_REPLY_GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  
  async getRelatedMessages(userId: string, originalMessage: Message): Promise<Message[]> {
    console.log('[ReplyAssistant] getRelatedMessages開始 - userId:', userId);
    console.log('[ReplyAssistant] originalMessage:', originalMessage);
    
    const userMapping = await this.userMappingService.getMapping(userId);
    console.log('[ReplyAssistant] userMapping取得結果:', userMapping);
    
    if (!userMapping) {
      console.log('[ReplyAssistant] userMappingが見つからないため、空配列を返す');
      return [];
    }
    
    const relatedMessages: Message[] = [];
    const allClients = this.messageClientFactory.createAllClients();
    console.log('[ReplyAssistant] 利用可能なクライアント:', Object.keys(allClients));
    console.log('[ReplyAssistant] userMappingのチャンネル:', Object.keys(userMapping.channels));
    
    // Search related messages from each channel
    for (const [channel, channelInfo] of Object.entries(userMapping.channels)) {
      console.log(`[ReplyAssistant] チャンネル ${channel} の処理開始`);
      console.log(`[ReplyAssistant] channelInfo:`, channelInfo);
      
      const client = allClients[channel as ChannelType];
      if (!client) {
        console.log(`[ReplyAssistant] ${channel} のクライアントが見つかりません`);
        continue;
      }
      
      const isAuthenticated = await client.isAuthenticated();
      console.log(`[ReplyAssistant] ${channel} の認証状態:`, isAuthenticated);
      
      if (!isAuthenticated) {
        console.log(`[ReplyAssistant] ${channel} が認証されていないため、スキップ`);
        continue;
      }
      
      console.log(`[ReplyAssistant] ${channel} からメッセージを取得中...`);
      const result = await client.getMessages({ 
        limit: 5,
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Past 7 days
      });
      
      console.log(`[ReplyAssistant] ${channel} メッセージ取得結果:`, result);
      
      if (result.success) {
        console.log(`[ReplyAssistant] ${channel} から ${result.messages.length} 件のメッセージを取得`);
        
        const userMessages = result.messages.filter(msg => {
          const isFromUser = this.isMessageFromUser(msg, channelInfo);
          console.log(`[ReplyAssistant] メッセージ判定 - from: ${msg.from}, isFromUser: ${isFromUser}`);
          return isFromUser;
        });
        
        console.log(`[ReplyAssistant] ${channel} でユーザーからの ${userMessages.length} 件のメッセージを特定`);
        relatedMessages.push(...userMessages);
      } else {
        console.log(`[ReplyAssistant] ${channel} メッセージ取得失敗:`, result.error);
      }
    }
    
    const sortedMessages = relatedMessages.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    console.log(`[ReplyAssistant] 最終的に ${sortedMessages.length} 件の関連メッセージを返す`);
    return sortedMessages;
  }
  
  private isMessageFromUser(message: Message, channelInfo: any): boolean {
    console.log(`[ReplyAssistant] isMessageFromUser判定開始 - channel: ${message.channel}, from: ${message.from}`);
    console.log(`[ReplyAssistant] channelInfo:`, channelInfo);
    
    switch (message.channel) {
      case ChannelType.GMAIL:
        const gmailMatch = message.from.includes(channelInfo.email);
        console.log(`[ReplyAssistant] Gmail判定 - ${message.from} includes ${channelInfo.email}: ${gmailMatch}`);
        return gmailMatch;
      case ChannelType.DISCORD:
        const discordMatch = message.from.includes(channelInfo.username);
        console.log(`[ReplyAssistant] Discord判定 - ${message.from} includes ${channelInfo.username}: ${discordMatch}`);
        return discordMatch;
      case ChannelType.LINE:
        const lineMatch = message.from === channelInfo.userId;
        console.log(`[ReplyAssistant] LINE判定 - ${message.from} === ${channelInfo.userId}: ${lineMatch}`);
        return lineMatch;
      default:
        console.log(`[ReplyAssistant] 未知のチャンネル: ${message.channel}`);
        return false;
    }
  }
}