import { Router } from 'express';
import { WebhookService } from '../services/webhook.service';
import { webhookAuthMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware, validateWebhookSignature } from '../middleware/validation.middleware';
import { webhookRateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const webhookService = new WebhookService();

// Apply webhook-specific rate limiting
router.use(webhookRateLimitMiddleware);

// LINE webhook endpoint
router.post('/',
  validateWebhookSignature,
  webhookAuthMiddleware,
  validationMiddleware('webhook'),
  asyncHandler(async (req, res) => {
    const signature = (req as any).webhookSignature;
    const body = (req as any).webhookBody;
    const channelSecret = (req as any).lineChannelSecret;

    logger.info('LINE webhook received', {
      destination: req.body.destination,
      eventsCount: req.body.events?.length || 0,
      timestamp: new Date().toISOString(),
    });

    try {
      // Verify webhook signature
      const isValidSignature = await webhookService.verifySignature(
        body,
        signature,
        channelSecret
      );

      if (!isValidSignature) {
        logger.warn('Invalid webhook signature', {
          destination: req.body.destination,
          signature: signature.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          timestamp: new Date().toISOString(),
        });
      }

      // Process webhook events
      const result = await webhookService.processWebhook(req.body);

      // Log successful processing
      logger.info('LINE webhook processed successfully', {
        destination: req.body.destination,
        eventsProcessed: result.processedEvents,
        totalEvents: req.body.events?.length || 0,
        processingTime: result.processingTime,
        timestamp: new Date().toISOString(),
      });

      // Respond to LINE with 200 OK
      res.status(200).json({
        success: true,
        processed: result.processedEvents,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        destination: req.body.destination,
        eventsCount: req.body.events?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Still respond with 200 to LINE to avoid retries
      res.status(200).json({
        success: false,
        error: 'Processing failed',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// Webhook verification endpoint (for LINE Bot setup)
router.get('/verify',
  asyncHandler(async (req, res) => {
    const { hub_challenge, hub_verify_token } = req.query;

    logger.info('Webhook verification requested', {
      hasChallenge: !!hub_challenge,
      hasVerifyToken: !!hub_verify_token,
      timestamp: new Date().toISOString(),
    });

    // For LINE, we typically don't use verify tokens like Facebook
    // This endpoint can be used for other webhook verification needs
    if (hub_challenge) {
      res.status(200).send(hub_challenge);
    } else {
      res.status(200).json({
        success: true,
        message: 'Webhook endpoint is ready',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// Webhook status endpoint
router.get('/status',
  asyncHandler(async (req, res) => {
    const status = await webhookService.getWebhookStatus();

    res.status(200).json({
      success: true,
      webhook: status,
      timestamp: new Date().toISOString(),
    });
  })
);

// Webhook events history endpoint
router.get('/events',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const eventType = req.query.type as string;

    const events = await webhookService.getWebhookEvents({
      limit,
      offset,
      eventType,
    });

    res.status(200).json({
      success: true,
      events: events.events,
      total: events.total,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });
  })
);

// Webhook statistics endpoint
router.get('/stats',
  asyncHandler(async (req, res) => {
    const period = req.query.period as string || '24h';
    const stats = await webhookService.getWebhookStatistics(period);

    res.status(200).json({
      success: true,
      statistics: stats,
      period,
      timestamp: new Date().toISOString(),
    });
  })
);

// Manual webhook replay endpoint (for debugging)
router.post('/replay/:eventId',
  asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    
    logger.info('Manual webhook replay requested', {
      eventId,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await webhookService.replayWebhookEvent(eventId);

      res.status(200).json({
        success: true,
        replay: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Webhook replay failed', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      res.status(400).json({
        success: false,
        error: 'Replay failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// Webhook configuration endpoint
router.get('/config',
  asyncHandler(async (req, res) => {
    const config = await webhookService.getWebhookConfiguration();

    res.status(200).json({
      success: true,
      configuration: config,
      timestamp: new Date().toISOString(),
    });
  })
);

// Test webhook endpoint (for development)
router.post('/test',
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoint not available in production',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info('Test webhook called', {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const mockResult = {
      processedEvents: 1,
      processingTime: '10ms',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      test: true,
      result: mockResult,
      timestamp: new Date().toISOString(),
    });
  })
);

export { router as webhookRoutes };