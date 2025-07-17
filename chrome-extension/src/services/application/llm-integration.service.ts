// LLM Integration Service implementation
// Based on design document Line 695-702

import { ILLMIntegrationService, LLMUsageStats } from '../../types/services/llm.types';
import { ReplyContext } from '../../types/services/reply-assistant.types';
import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';
import { STORAGE_KEYS } from '../../types/infrastructure/storage.types';

export class LLMIntegrationService implements ILLMIntegrationService {
  private usageStats: LLMUsageStats;
  
  constructor(private storageRepository: IChromeStorageRepository) {
    this.usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      successRate: 1.0,
      averageResponseTime: 0,
      monthlyCost: 0,
      lastUpdated: new Date(),
    };
  }
  
  async generateReply(prompt: string, context: any): Promise<string> {
    const startTime = Date.now();
    
    try {
      // プロキシサーバー経由でLLM生成
      const reply = await this.generateReplyViaProxy(prompt, context);
      
      // Update usage statistics
      const responseTime = Date.now() - startTime;
      const estimatedTokens = Math.ceil(reply.length / 4); // Rough token estimation
      await this.updateUsageStats(true, responseTime, estimatedTokens);
      
      return reply;
    } catch (error) {
      console.error('LLM生成エラー:', error);
      // エラー時はフォールバックとしてモック生成を使用
      const fallbackReply = await this.mockLLMGeneration(prompt, context);
      const responseTime = Date.now() - startTime;
      await this.updateUsageStats(false, responseTime, 0);
      return fallbackReply;
    }
  }
  
  optimizePrompt(context: ReplyContext): string {
    const { originalMessage, relatedMessages, userMapping, userPreferences } = context;
    
    let prompt = `Please generate a ${userPreferences.tone} reply to the following message:\n\n`;
    prompt += `Original Message:\n`;
    prompt += `From: ${originalMessage.from}\n`;
    prompt += `Channel: ${originalMessage.channel}\n`;
    prompt += `Content: ${originalMessage.content}\n\n`;
    
    if (userMapping) {
      prompt += `User Information:\n`;
      prompt += `Name: ${userMapping.name}\n`;
      prompt += `Tags: ${userMapping.tags.join(', ')}\n`;
      prompt += `Priority: ${userMapping.priority}\n\n`;
    }
    
    if (relatedMessages.length > 0) {
      prompt += `Related Messages:\n`;
      relatedMessages.forEach((msg, index) => {
        prompt += `${index + 1}. ${msg.content}\n`;
      });
      prompt += `\n`;
    }
    
    if (userPreferences.includeContext && context.conversationHistory.length > 0) {
      prompt += `Conversation History:\n`;
      context.conversationHistory.slice(-3).forEach((msg, index) => {
        prompt += `${index + 1}. ${msg.from}: ${msg.content}\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `Please respond in ${userPreferences.language}.\n`;
    prompt += `Keep the response appropriate for ${originalMessage.channel} channel.`;
    
    return prompt;
  }
  
  async getUsageStats(): Promise<LLMUsageStats> {
    const storedStats = await this.storageRepository.get<LLMUsageStats>(STORAGE_KEYS.USAGE_STATS);
    return storedStats || this.usageStats;
  }
  
  private async generateReplyViaProxy(prompt: string, context: any): Promise<string> {
    const proxyUrl = process.env.PROXY_SERVER_URL || 'http://localhost:3000';
    console.log('[LLM] プロキシサーバー経由でLLM生成開始');
    console.log('[LLM] プロキシサーバーURL:', proxyUrl);

    const requestBody = {
      prompt: this.buildUserPrompt(prompt, context),
      context: {
        originalMessage: context?.originalMessage ? {
          from: context.originalMessage.from,
          channel: context.originalMessage.channel,
          content: context.originalMessage.content
        } : undefined,
        userPreferences: context?.userPreferences || {
          tone: 'friendly',
          language: 'ja',
          includeContext: true
        }
      }
    };

    console.log('[LLM] プロキシサーバーにリクエスト送信中...');
    console.log('[LLM] リクエスト本文:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${proxyUrl}/api/llm/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[LLM] プロキシサーバー レスポンス状態:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM] プロキシサーバー エラー:', response.status, errorText);
      throw new Error(`プロキシサーバー エラー: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[LLM] プロキシサーバー レスポンス:', JSON.stringify(data, null, 2));
    
    if (!data.success || !data.reply) {
      console.error('[LLM] 無効なレスポンス:', data);
      throw new Error(data.error || 'プロキシサーバーから有効な応答が得られませんでした');
    }

    const generatedText = data.reply.trim();
    console.log('[LLM] 生成された返信案:', generatedText);
    return generatedText;
  }

  private buildSystemPrompt(context: any): string {
    return `あなたは日本語でビジネスメールや各種メッセージの返信案を作成するアシスタントです。

以下の指針に従って返信案を作成してください：

1. 丁寧で自然な日本語を使用
2. メッセージの内容や文脈に適した返信を生成
3. 簡潔で要点を抑えた内容
4. ビジネスシーンに適した敬語の使用
5. 相手との関係性を考慮した適切な敬語レベル

メッセージのチャンネル別の特徴：
- Gmail: フォーマルなビジネスメール調
- Discord: 少しカジュアルだが丁寧な口調
- LINE: 親しみやすく簡潔な表現（絵文字使用可）

返信案は200文字以内で簡潔に作成してください。`;
  }

  private buildUserPrompt(prompt: string, context: any): string {
    let userPrompt = '以下のメッセージに対する適切な返信案を日本語で作成してください。\n\n';
    
    if (context?.originalMessage) {
      const message = context.originalMessage;
      userPrompt += `**受信メッセージ情報:**\n`;
      userPrompt += `送信者: ${message.from || '不明'}\n`;
      userPrompt += `チャンネル: ${message.channel || '不明'}\n`;
      userPrompt += `内容: ${message.content || prompt}\n\n`;
    } else {
      userPrompt += `**メッセージ内容:**\n${prompt}\n\n`;
    }
    
    userPrompt += '適切な返信案を作成してください。';
    
    return userPrompt;
  }

  private async mockLLMGeneration(prompt: string, context: any): Promise<string> {
    // Mock implementation - simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
    
    // 日本語の返信案テンプレート
    const replies = [
      "メッセージありがとうございます。内容を確認して、改めてご連絡いたします。",
      "お疲れ様です。いただいたメッセージについて検討させていただき、後日回答いたします。",
      "ご連絡いただきありがとうございます。詳細を確認してから返信させていただきます。",
      "メッセージを拝見いたしました。対応についてお時間をいただければと思います。",
      "お忙しい中ご連絡いただきありがとうございます。確認後、改めてお返事いたします。",
      "承知いたしました。内容について検討して、近日中にお返事させていただきます。",
      "メッセージありがとうございます。適切に対応させていただきますので、少々お待ちください。"
    ];
    
    // コンテキストに基づいて適切な返信を選択
    if (context?.originalMessage) {
      const message = context.originalMessage;
      const content = message.content?.toLowerCase() || '';
      
      // メッセージの内容に応じた返信パターン
      if (content.includes('急ぎ') || content.includes('至急') || content.includes('緊急')) {
        return "緊急のご連絡ありがとうございます。優先的に対応させていただきますので、少々お待ちください。";
      }
      
      if (content.includes('質問') || content.includes('教えて') || content.includes('どう')) {
        return "ご質問いただきありがとうございます。詳しく調べてお答えしますので、お時間をいただければと思います。";
      }
      
      if (content.includes('ありがとう') || content.includes('感謝')) {
        return "こちらこそありがとうございます。引き続きよろしくお願いいたします。";
      }
      
      if (content.includes('会議') || content.includes('ミーティング') || content.includes('打ち合わせ')) {
        return "会議の件について承知いたしました。詳細を確認して調整いたします。";
      }
      
      // チャンネル別の返信パターン
      if (message.channel === 'gmail') {
        return "メールありがとうございます。内容を確認して、適切に対応させていただきます。";
      } else if (message.channel === 'discord') {
        return "メッセージありがとうございます！確認して返信しますね。";
      } else if (message.channel === 'line') {
        return "メッセージありがとうございます😊 確認してお返事しますね！";
      }
    }
    
    return replies[Math.floor(Math.random() * replies.length)];
  }
  
  private async updateUsageStats(success: boolean, responseTime: number, tokensUsed: number): Promise<void> {
    const currentStats = await this.getUsageStats();
    
    const updatedStats: LLMUsageStats = {
      totalRequests: currentStats.totalRequests + 1,
      totalTokens: currentStats.totalTokens + tokensUsed,
      successRate: success 
        ? ((currentStats.successRate * currentStats.totalRequests) + 1) / (currentStats.totalRequests + 1)
        : (currentStats.successRate * currentStats.totalRequests) / (currentStats.totalRequests + 1),
      averageResponseTime: ((currentStats.averageResponseTime * currentStats.totalRequests) + responseTime) / (currentStats.totalRequests + 1),
      monthlyCost: currentStats.monthlyCost + (tokensUsed * 0.0001), // Rough estimation
      lastUpdated: new Date(),
    };
    
    await this.storageRepository.save(STORAGE_KEYS.USAGE_STATS, updatedStats);
    this.usageStats = updatedStats;
  }
}