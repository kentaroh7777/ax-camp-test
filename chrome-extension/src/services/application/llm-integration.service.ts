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
    const { originalMessage, relatedMessages, userMapping, userPreferences, additionalPrompt } = context;
    
    console.log('[LLM] optimizePrompt開始');
    console.log('[LLM] additionalPrompt:', additionalPrompt);
    
    let prompt = `# メッセージ返信生成タスク\n\n`;
    prompt += `以下のメッセージに対する**${userPreferences.tone}**な返信を生成してください。\n\n`;
    
    prompt += `## 元メッセージ\n\n`;
    prompt += `- **送信者**: ${originalMessage.from}\n`;
    prompt += `- **チャンネル**: ${originalMessage.channel}\n`;
    prompt += `- **内容**:\n\n`;
    prompt += `\`\`\`\n${originalMessage.content}\n\`\`\`\n\n`;
    
    if (userMapping) {
      prompt += `## ユーザー情報\n\n`;
      prompt += `- **名前**: ${userMapping.name}\n`;
      prompt += `- **タグ**: ${userMapping.tags.join(', ')}\n`;
      prompt += `- **優先度**: ${userMapping.priority}\n\n`;
    }
    
    if (relatedMessages.length > 0) {
      prompt += `## 関連メッセージ\n\n`;
      prompt += `同一人物からの他チャンネルでの最近のメッセージ：\n\n`;
      relatedMessages.forEach((msg, index) => {
        prompt += `${index + 1}. **[${msg.channel}]** ${msg.content}\n`;
      });
      prompt += `\n`;
    }
    
    if (userPreferences.includeContext && context.conversationHistory.length > 0) {
      prompt += `## 会話履歴\n\n`;
      context.conversationHistory.slice(-3).forEach((msg, index) => {
        prompt += `${index + 1}. **${msg.from}**: ${msg.content}\n`;
      });
      prompt += `\n`;
    }
    
    // 追加指示がある場合は重要度を高めて処理
    if (additionalPrompt && additionalPrompt.trim()) {
      console.log('[LLM] 追加指示を追加:', additionalPrompt.trim());
      prompt += `## ⚠️ 重要な追加指示\n\n`;
      prompt += `> ${additionalPrompt.trim()}\n\n`;
      prompt += `**必ず上記の追加指示に従って返信案を作成してください。**\n\n`;
    }
    
    prompt += `## 返信要件\n\n`;
    prompt += `- **言語**: ${userPreferences.language}\n`;
    prompt += `- **チャンネル**: ${originalMessage.channel}に適した形式\n`;
    prompt += `- **トーン**: ${userPreferences.tone}\n`;
    prompt += `- **文字数**: 簡潔で要点を抑えた内容（200文字以内推奨）\n\n`;
    
    prompt += `## 出力形式\n\n`;
    prompt += `返信案のテキストのみを出力してください（説明や補足は不要）。`;
    
    console.log('[LLM] 生成されたプロンプト:');
    console.log(prompt);
    
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
- LINE: 親しみやすく簡潔な表現（絵文字使用可）`;
  }

  private buildUserPrompt(prompt: string, context: any): string {
    console.log('[LLM] buildUserPrompt開始');
    console.log('[LLM] 受信したprompt:', prompt);
    
    // プロンプトをそのまま返す（余計な編集はしない）
    return prompt;
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