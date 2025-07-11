import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const userAgent = req.get('user-agent') || '';
  
  // Define allowed origins
  const allowedOrigins = [
    // Chrome extension origins
    /^chrome-extension:\/\/[a-z]{32}$/,
    /^moz-extension:\/\/[a-z0-9-]+$/,
    
    // Development origins
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    
    // Platform origins where extension runs
    'https://mail.google.com',
    'https://discord.com',
    'https://line.me',
    'https://web.line.me',
    
    // Railway and other deployment platforms
    process.env.RAILWAY_STATIC_URL,
    process.env.ALLOWED_ORIGIN,
  ].filter(Boolean);

  let corsOrigin = '*';
  let allowCredentials = false;

  // Check if origin is allowed
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      corsOrigin = origin;
      allowCredentials = true;
    } else {
      logger.warn('CORS: Origin not allowed', { origin, userAgent });
    }
  }

  // Special handling for Chrome extensions
  if (!origin && userAgent.includes('Chrome')) {
    // Chrome extensions don't always send origin header
    corsOrigin = '*';
    allowCredentials = false;
  }

  // Set CORS headers
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Line-Signature',
    'X-Line-ChannelId',
    'X-Line-ChannelSecret',
    'X-Extension-Id',
    'X-Extension-Version',
    'User-Agent',
  ].join(', '));
  
  if (allowCredentials) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Set additional security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
    return;
  }

  // Log CORS requests in development
  if (config.NODE_ENV === 'development') {
    logger.debug('CORS request processed', {
      origin,
      method: req.method,
      path: req.path,
      corsOrigin,
      allowCredentials,
      userAgent: userAgent.substring(0, 100),
    });
  }

  next();
};