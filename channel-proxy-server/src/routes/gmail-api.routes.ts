import express, { Router } from 'express';
import { GmailApiService } from '../services/gmail-api.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../types/api.types.js';
import { GmailMessagesRequest, GmailSendRequest } from '../types/gmail.types.js';

const router = Router();
const gmailApiService = new GmailApiService();

// Get messages endpoint
router.get('/messages', 
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const params: GmailMessagesRequest = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        unreadOnly: req.query.unreadOnly === 'true',
        pageToken: req.query.pageToken as string,
      };

      logger.info('Gmail API: Getting messages', params);
      const result = await gmailApiService.getMessages(params);

      if (result.success) {
        logger.info('Gmail API: Messages retrieved successfully', {
          count: result.data?.messages.length || 0,
          hasMore: result.data?.hasMore || false
        });
      } else {
        logger.error('Gmail API: Failed to get messages', { error: result.error });
      }

      res.json(result);
    } catch (error) {
      logger.error('Gmail API: Error in messages endpoint:', error);
      next(new ApiError('Internal server error', 500));
    }
  }
);

// Send message endpoint
router.post('/send', 
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const sendRequest: GmailSendRequest = req.body;

      // Basic validation
      if (!sendRequest.to || !sendRequest.subject || !sendRequest.content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject, content',
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('Gmail API: Sending message', {
        to: sendRequest.to,
        subject: sendRequest.subject,
        contentLength: sendRequest.content.length
      });

      const result = await gmailApiService.sendMessage(sendRequest);

      if (result.success) {
        logger.info('Gmail API: Message sent successfully', {
          messageId: result.data?.messageId
        });
      } else {
        logger.error('Gmail API: Failed to send message', { error: result.error });
      }

      res.json(result);
    } catch (error) {
      logger.error('Gmail API: Error in send endpoint:', error);
      next(new ApiError('Internal server error', 500));
    }
  }
);

// Health check endpoint
router.get('/health',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('Gmail API: Health check requested');
      const health = await gmailApiService.healthCheck();

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        service: 'gmail-api',
        status: health.status,
        timestamp: new Date().toISOString(),
        details: health.details,
      });
    } catch (error) {
      logger.error('Gmail API: Error in health check:', error);
      res.status(503).json({
        service: 'gmail-api',
        status: 'error',
        timestamp: new Date().toISOString(),
        details: { error: 'Health check failed' },
      });
    }
  }
);

// Test endpoint for development
router.get('/test',
  authMiddleware,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info('Gmail API: Test endpoint called');
      
      res.json({
        success: true,
        message: 'Gmail API proxy server is working',
        timestamp: new Date().toISOString(),
        endpoints: {
          messages: 'GET /api/gmail/messages',
          send: 'POST /api/gmail/send',
          health: 'GET /api/gmail/health',
        },
      });
    } catch (error) {
      logger.error('Gmail API: Error in test endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Test endpoint failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router; 