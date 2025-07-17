import fetch from 'node-fetch';

export interface LLMGenerationRequest {
  prompt: string;
  context: {
    originalMessage?: {
      from: string;
      channel: string;
      content: string;
    };
    userPreferences?: {
      tone: string;
      language: string;
      includeContext: boolean;
    };
  };
}

export interface LLMGenerationResponse {
  success: boolean;
  reply?: string;
  error?: string;
  tokensUsed?: number;
}

export class LLMService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY環境変数が設定されていません');
    }
  }

  async generateReply(request: LLMGenerationRequest): Promise<LLMGenerationResponse> {
    console.log('[LLM Service] 返信生成リクエスト受信:', request);

    if (!this.apiKey) {
      console.error('[LLM Service] APIキーが設定されていません');
      return {
        success: false,
        error: 'APIキーが設定されていません'
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.context);
      const userPrompt = this.buildUserPrompt(request.prompt, request.context);

      const requestBody = {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      };

      console.log('[LLM Service] Claude APIにリクエスト送信...');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[LLM Service] Claude API レスポンス状態:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLM Service] Claude API エラー:', response.status, errorText);
        return {
          success: false,
          error: `Claude API エラー: ${response.status}`
        };
      }

      const data = await response.json() as any;
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('[LLM Service] 無効なレスポンス構造:', data);
        return {
          success: false,
          error: 'Claude APIから有効な応答が得られませんでした'
        };
      }

      const rawReply = data.content[0].text.trim();
      const cleanedReply = this.cleanReplyText(rawReply);
      const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;

      console.log('[LLM Service] 返信生成成功:', cleanedReply);

      return {
        success: true,
        reply: cleanedReply,
        tokensUsed: tokensUsed
      };

    } catch (error) {
      console.error('[LLM Service] エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  private buildSystemPrompt(context: any): string {
    return `あなたは日本語でビジネスメールや各種メッセージの返信案を作成するアシスタントです。

重要な指示：
- 返信文のみを出力してください
- 「以下のような返信案を作成しました」などの説明文は一切含めないでください
- 「このメールは〜に配慮して作成しています」などの解説も不要です
- マークダウンのコードブロック（\`\`\`）も使用しないでください

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
    
    userPrompt += '注意：返信文のみを出力してください。説明文や解説は一切不要です。';
    
    return userPrompt;
  }

  private cleanReplyText(text: string): string {
    let cleaned = text.trim();
    
    // 不要な説明文を除去
    const unwantedPatterns = [
      /以下のような返信案を作成しました：?\s*/gi,
      /このメールは.*に配慮して作成しています.*$/gm,
      /以下の点に配慮して作成しています：?\s*[\s\S]*$/gi,
      /```[\s\S]*?```/g, // マークダウンコードブロックを除去
      /^.*返信案.*：?\s*/gm, // 「返信案」を含む説明行を除去
      /^.*以下.*：?\s*/gm,   // 「以下」で始まる説明行を除去
    ];
    
    unwantedPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // 余分な改行や空白を整理
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n') // 3つ以上の連続改行を2つに
      .replace(/^\s+|\s+$/g, '')  // 前後の空白を除去
      .trim();
    
    return cleaned;
  }
} 