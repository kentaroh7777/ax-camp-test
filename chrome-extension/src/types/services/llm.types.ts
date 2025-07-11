// LLM integration service type definitions
// Based on design document Line 634-644

import { ReplyContext } from './reply-assistant.types';

// LLM integration service interface
export interface ILLMIntegrationService {
  // Generate reply
  generateReply(prompt: string, context: any): Promise<string>;
  
  // Optimize prompt
  optimizePrompt(context: ReplyContext): string;
  
  // Get usage statistics
  getUsageStats(): Promise<LLMUsageStats>;
}

// LLM usage statistics
export interface LLMUsageStats {
  totalRequests: number;
  totalTokens: number;
  successRate: number;
  averageResponseTime: number;
  monthlyCost: number;
  lastUpdated: Date;
}