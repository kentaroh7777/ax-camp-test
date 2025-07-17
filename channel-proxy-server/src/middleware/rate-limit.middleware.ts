import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

// Create a key generator that combines IP and authorization token
const createKeyGenerator = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7, 15) : 'anonymous';
  
  return `${ip}:${token}`;
};

// Custom rate limit handler
const rateLimitHandler = (req: Request, res: Response) => {
  const key = createKeyGenerator(req);
  
  logger.warn('Rate limit exceeded', {
    key: key.substring(0, 20) + '...',
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(60), // 1 minute
    timestamp: new Date().toISOString(),
  });
};

// Skip rate limiting for certain requests
const skipRateLimit = (req: Request): boolean => {
  // Skip rate limiting for health checks
  if (req.path.startsWith('/api/health')) {
    return true;
  }

  // Skip rate limiting for webhook requests in production
  if (req.path.startsWith('/api/webhook') && config.NODE_ENV === 'production') {
    return true;
  }

  return false;
};

// General rate limiter - applies to all requests
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'production' ? 1000 : 10000, // More restrictive in production
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

// Strict rate limiter for LINE API endpoints
export const strictRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.NODE_ENV === 'production' ? 100 : 1000, // 100 requests per minute in production
  message: {
    error: 'Too Many Requests',
    message: 'LINE API rate limit exceeded. Please slow down your requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

// Message sending rate limiter (more restrictive)
export const messagingRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.NODE_ENV === 'production' ? 50 : 500, // 50 messages per minute in production
  message: {
    error: 'Too Many Requests',
    message: 'Message sending rate limit exceeded. Please wait before sending more messages.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator,
  handler: rateLimitHandler,
  skip: (req: Request) => {
    // Skip for health checks but apply to all messaging endpoints
    return req.path.startsWith('/api/health');
  },
});

// Webhook rate limiter (more lenient for LINE webhooks)
export const webhookRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 webhook requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Webhook rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP only for webhooks since they don't have auth tokens
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: rateLimitHandler,
  skip: (req: Request) => {
    // Only apply to webhook endpoints
    return !req.path.startsWith('/api/webhook');
  },
});

// Export a factory function to create custom rate limiters
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipPaths?: string[];
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Too Many Requests',
      message: options.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: createKeyGenerator,
    handler: rateLimitHandler,
    skip: (req: Request) => {
      if (options.skipPaths) {
        return options.skipPaths.some(path => req.path.startsWith(path));
      }
      return skipRateLimit(req);
    },
  });
};