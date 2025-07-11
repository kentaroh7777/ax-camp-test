import express, { Router } from 'express';
import { LineApiService } from '../services/line-api.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { logger } from '../utils/logger';
import { ApiError } from '../types/api.types';

const router = Router();
const lineApiService = new LineApiService();

// Message sending proxy
router.post('/message/push', 
  authMiddleware,
  validationMiddleware('sendMessage'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Push message request', {
        to: req.body.to,
        messagesCount: req.body.messages?.length || 0,
      });

      const result = await lineApiService.sendMessage(
        req.body,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Multicast message proxy
router.post('/message/multicast',
  authMiddleware,
  validationMiddleware('sendMulticastMessage'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Multicast message request', {
        toCount: req.body.to?.length || 0,
        messagesCount: req.body.messages?.length || 0,
      });

      const result = await lineApiService.sendMulticastMessage(
        req.body,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Broadcast message proxy
router.post('/message/broadcast',
  authMiddleware,
  validationMiddleware('sendBroadcastMessage'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Broadcast message request', {
        messagesCount: req.body.messages?.length || 0,
      });

      const result = await lineApiService.sendBroadcastMessage(
        req.body,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reply message proxy
router.post('/message/reply',
  authMiddleware,
  validationMiddleware('replyMessage'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Reply message request', {
        replyToken: req.body.replyToken?.substring(0, 10) + '...',
        messagesCount: req.body.messages?.length || 0,
      });

      const result = await lineApiService.replyMessage(
        req.body,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get bot info proxy
router.get('/bot/info',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Get bot info request');

      const result = await lineApiService.getBotInfo(
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get profile proxy
router.get('/profile/:userId',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { userId } = req.params;
      logger.info('LINE API: Get profile request', { userId });

      const result = await lineApiService.getProfile(
        userId,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get group/room member profile proxy
router.get('/group/:groupId/member/:userId',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { groupId, userId } = req.params;
      logger.info('LINE API: Get group member profile request', { groupId, userId });

      const result = await lineApiService.getGroupMemberProfile(
        groupId,
        userId,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get group/room member IDs proxy
router.get('/group/:groupId/members/ids',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { groupId } = req.params;
      const { start } = req.query;
      
      logger.info('LINE API: Get group member IDs request', { groupId, start });

      const result = await lineApiService.getGroupMemberIds(
        groupId,
        start as string,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Leave group/room proxy
router.post('/group/:groupId/leave',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { groupId } = req.params;
      logger.info('LINE API: Leave group request', { groupId });

      const result = await lineApiService.leaveGroup(
        groupId,
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get content proxy (for images, videos, audio)
router.get('/content/:messageId',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { messageId } = req.params;
      logger.info('LINE API: Get content request', { messageId });

      const result = await lineApiService.getContent(
        messageId,
        req.headers.authorization!
      );

      // Forward the content with proper headers
      res.set({
        'Content-Type': result.contentType,
        'Content-Length': result.contentLength,
      });
      
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

// Get quota proxy
router.get('/quota',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Get quota request');

      const result = await lineApiService.getQuota(
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get quota consumption proxy
router.get('/quota/consumption',
  authMiddleware,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      logger.info('LINE API: Get quota consumption request');

      const result = await lineApiService.getQuotaConsumption(
        req.headers.authorization!
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as lineApiRoutes };