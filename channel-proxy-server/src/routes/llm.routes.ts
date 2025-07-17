import { Router } from 'express';
import { LLMService } from '../services/llm.service';

const router = Router();
const llmService = new LLMService();

// POST /api/llm/generate - LLM返信案生成
router.post('/generate', async (req, res) => {
  console.log('[LLM Routes] 返信生成リクエスト受信');
  
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'promptパラメータが必要です'
      });
    }

    const result = await llmService.generateReply({
      prompt,
      context: context || {}
    });

    res.json(result);
  } catch (error) {
    console.error('[LLM Routes] エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// GET /api/llm/health - ヘルスチェック
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LLM service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 