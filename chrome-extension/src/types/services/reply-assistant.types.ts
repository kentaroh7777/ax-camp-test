// Reply assistant service type definitions
// Based on design document Line 607-617

import { Message } from '../core/message.types';
import { ResolvedMessage, UserMapping } from '../core/user.types';
import { ApiError } from '../core/api.types';

// Reply assistant service interface
export interface IReplyAssistantService {
  // Fetch all unread messages from all channels
  fetchAllUnreadMessages(): Promise<UnifiedInboxResult>;
  
  // Generate AI reply suggestion
  generateReply(context: ReplyContext): Promise<ReplyGenerationResult>;
  
  // Get related messages
  getRelatedMessages(userId: string, originalMessage: Message): Promise<Message[]>;
}

// Unified inbox result
export interface UnifiedInboxResult {
  success: boolean;
  messages: ResolvedMessage[];
  channelResults: {
    [channelType: string]: ChannelFetchResult;
  };
  totalUnread: number;
  lastFetch: Date;
  error?: ApiError;
}

// Channel fetch result
export interface ChannelFetchResult {
  success: boolean;
  messageCount: number;
  error?: ApiError;
  fetchTime: number; // milliseconds
}

// Reply context
export interface ReplyContext {
  originalMessage: Message;
  relatedMessages: Message[];
  userMapping?: UserMapping;
  conversationHistory: Message[];
  userPreferences: {
    tone: 'formal' | 'casual' | 'friendly';
    language: string;
    includeContext: boolean;
  };
}

// Reply generation result
export interface ReplyGenerationResult {
  success: boolean;
  reply: string;
  confidence: number; // 0-1 confidence score
  alternatives?: string[]; // Alternative suggestions
  tokensUsed: number;
  error?: ApiError;
}