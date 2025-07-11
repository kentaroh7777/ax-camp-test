import { Router } from 'express';
import { config } from '../utils/config';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// API root endpoint
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    name: 'LINE Proxy Server API',
    version: '1.0.0',
    description: 'LINE API Proxy Server for Chrome Extension',
    status: 'running',
    environment: config.NODE_ENV,
    endpoints: {
      health: '/api/health',
      lineApi: '/api/line',
      webhook: '/api/webhook',
      documentation: '/api/docs',
    },
    features: [
      'LINE API Proxy',
      'CORS Support for Chrome Extensions',
      'Circuit Breaker Protection',
      'Rate Limiting',
      'Request Validation',
      'Webhook Support',
      'Health Monitoring',
    ],
    timestamp: new Date().toISOString(),
  });
}));

// API documentation endpoint
router.get('/docs', asyncHandler(async (req, res) => {
  const documentation = {
    title: 'LINE Proxy Server API Documentation',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      health: {
        '/health': {
          method: 'GET',
          description: 'Basic health check',
          response: 'Health status object',
        },
        '/health/detailed': {
          method: 'GET',
          description: 'Detailed health check with dependencies',
          response: 'Detailed health status object',
        },
        '/health/live': {
          method: 'GET',
          description: 'Liveness probe for container orchestration',
          response: 'Liveness status',
        },
        '/health/ready': {
          method: 'GET',
          description: 'Readiness probe for container orchestration',
          response: 'Readiness status',
        },
      },
      lineApi: {
        '/line/message/push': {
          method: 'POST',
          description: 'Send push message via LINE API',
          headers: ['Authorization: Bearer <access_token>'],
          body: 'LINE push message object',
        },
        '/line/message/multicast': {
          method: 'POST',
          description: 'Send multicast message via LINE API',
          headers: ['Authorization: Bearer <access_token>'],
          body: 'LINE multicast message object',
        },
        '/line/message/broadcast': {
          method: 'POST',
          description: 'Send broadcast message via LINE API',
          headers: ['Authorization: Bearer <access_token>'],
          body: 'LINE broadcast message object',
        },
        '/line/message/reply': {
          method: 'POST',
          description: 'Reply to message via LINE API',
          headers: ['Authorization: Bearer <access_token>'],
          body: 'LINE reply message object',
        },
        '/line/bot/info': {
          method: 'GET',
          description: 'Get bot information',
          headers: ['Authorization: Bearer <access_token>'],
        },
        '/line/profile/:userId': {
          method: 'GET',
          description: 'Get user profile',
          headers: ['Authorization: Bearer <access_token>'],
          parameters: ['userId: User ID'],
        },
      },
      webhook: {
        '/webhook': {
          method: 'POST',
          description: 'Receive LINE webhook events',
          headers: [
            'X-Line-Signature: <signature>',
            'X-Line-ChannelSecret: <channel_secret>',
          ],
          body: 'LINE webhook event object',
        },
        '/webhook/status': {
          method: 'GET',
          description: 'Get webhook status and statistics',
        },
      },
    },
    authentication: {
      description: 'LINE API endpoints require Bearer token authentication',
      header: 'Authorization: Bearer <LINE_CHANNEL_ACCESS_TOKEN>',
      obtaining: 'Get access token from LINE Developer Console',
    },
    cors: {
      description: 'CORS is configured to allow Chrome extension origins',
      allowedOrigins: [
        'chrome-extension://*',
        'moz-extension://*',
        'https://mail.google.com',
        'https://discord.com',
        'https://line.me',
      ],
    },
    rateLimiting: {
      general: '1000 requests per 15 minutes',
      lineApi: '100 requests per minute',
      messaging: '50 messages per minute',
    },
    errors: {
      format: {
        success: false,
        error: {
          type: 'ERROR_TYPE',
          message: 'Error description',
          statusCode: 400,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/api/endpoint',
          method: 'POST',
        },
      },
      commonErrors: [
        'MISSING_AUTHORIZATION - Missing or invalid authorization header',
        'VALIDATION_ERROR - Request validation failed',
        'RATE_LIMIT_EXCEEDED - Too many requests',
        'LINE_API_ERROR - Error from LINE API',
        'SERVICE_UNAVAILABLE - Service temporarily unavailable',
      ],
    },
    examples: {
      pushMessage: {
        url: '/api/line/message/push',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_CHANNEL_ACCESS_TOKEN',
          'Content-Type': 'application/json',
        },
        body: {
          to: 'USER_ID',
          messages: [
            {
              type: 'text',
              text: 'Hello from LINE Proxy Server!',
            },
          ],
        },
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.json(documentation);
}));

// API status endpoint
router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    service: 'LINE Proxy Server',
    status: 'operational',
    version: '1.0.0',
    environment: config.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}));

// API version endpoint
router.get('/version', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    version: '1.0.0',
    apiVersion: 'v1',
    buildDate: new Date().toISOString(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
}));

export { router as indexRoutes };