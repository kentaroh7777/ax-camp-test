import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { ApiError } from '../types/api.types.js';
import { config } from '../utils/config.js';
import crypto from 'crypto';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // ADDED: Skip authentication if AUTH_DISABLED is set to true
  if (process.env.PROXY_AUTH_ENABLE === 'false') {
    logger.warn(`Authentication is disabled. Request from ${req.headers['user-agent']}. Path: ${req.path}. Skipping all auth checks.`);
    (req as any).isAuthenticated = true;
    (req as any).lineAccessToken = 'auth-disabled-mock-token';
    return next();
  }

  // Skip authentication in test environment
  if (process.env.NODE_ENV === 'test') {
    (req as any).isAuthenticated = true;
    (req as any).lineAccessToken = 'mock-test-access-token';
    return next();
  }

  try {
    const authorization = req.headers.authorization;
    logger.warn(`Authentication required. Request from ${req.headers['user-agent']}. Path: ${req.path}. Authorization header: ${authorization ? 'present' : 'missing'}. PROXY_AUTH_ENABLE: ${process.env.PROXY_AUTH_ENABLE}`);
    
    // Check if authorization header is present
    if (!authorization) {
      throw new ApiError(
        'Missing authorization header',
        401,
        'MISSING_AUTHORIZATION'
      );
    }

    // Check if it's a Bearer token
    if (!authorization.startsWith('Bearer ')) {
      throw new ApiError(
        'Invalid authorization format. Expected "Bearer <token>"',
        401,
        'INVALID_AUTHORIZATION_FORMAT'
      );
    }

    const token = authorization.substring(7); // Remove 'Bearer ' prefix

    // Validate token format (LINE access tokens are typically long strings)
    if (!token || token.length < 20) {
      throw new ApiError(
        'Invalid access token format',
        401,
        'INVALID_ACCESS_TOKEN'
      );
    }

    // Additional validation for LINE access tokens
    // LINE access tokens typically start with specific prefixes
    const validPrefixes = [
      'Bearer', // For channel access tokens
      'LINE',   // For some LINE tokens
      '+',      // For some LINE tokens
    ];

    // Check if token appears to be a valid format
    // This is a basic validation - the real validation happens at LINE API
    if (token.length > 1000) {
      throw new ApiError(
        'Access token too long',
        401,
        'INVALID_ACCESS_TOKEN'
      );
    }

    // Check for potentially malicious tokens and invalid characters
    if (token.includes(' ') || token.includes('\n') || token.includes('\r')) {
      throw new ApiError(
        'Invalid access token format',
        401,
        'INVALID_ACCESS_TOKEN'
      );
    }

    // Check for invalid characters in token (LINE tokens are typically alphanumeric with - and _)
    if (!/^[A-Za-z0-9_-]+$/.test(token)) {
      throw new ApiError(
        'Invalid access token format',
        401,
        'INVALID_ACCESS_TOKEN'
      );
    }

    // Log authentication attempt (without exposing the actual token)
    logger.info('Authentication attempt', {
      tokenPrefix: token.substring(0, 8) + '...',
      tokenLength: token.length,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      path: req.path,
      method: req.method,
    });

    // In development mode, add more detailed logging
    if (config.NODE_ENV === 'development') {
      logger.debug('Auth middleware: Token validation passed', {
        tokenLength: token.length,
        hasValidFormat: true,
        path: req.path,
      });
    }

    // Store token information for later use
    (req as any).lineAccessToken = token;
    (req as any).isAuthenticated = true;

    next();
  } catch (error) {
    // Log authentication failure
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      hasAuthHeader: !!req.headers.authorization,
      timestamp: new Date().toISOString(),
    });

    next(error);
  }
};

// Optional: Middleware for webhook signature validation
export const webhookAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    const channelSecret = config.LINE_CHANNEL_SECRET; // 環境変数から取得

    if (!signature) {
      throw new ApiError(
        'Missing X-Line-Signature header',
        401,
        'MISSING_SIGNATURE'
      );
    }

    if (!channelSecret) {
      throw new ApiError(
        'LINE_CHANNEL_SECRET is not configured on the server.',
        500,
        'SERVER_CONFIGURATION_ERROR'
      );
    }

    // LINEの署名検証ロジックをここに実装
    const body = (req as any).rawBody.toString(); // リクエストボディを文字列化
    const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
    if (hash !== signature) {
      throw new ApiError(
        'Invalid X-Line-Signature',
        401,
        'INVALID_SIGNATURE'
      );
    }

    // Store webhook information for later use
    (req as any).lineSignature = signature;
    (req as any).lineChannelSecret = channelSecret; // 署名検証用として保持

    logger.info('Webhook authentication attempt', {
      hasSignature: !!signature,
      hasChannelSecret: !!channelSecret,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.warn('Webhook authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    next(error);
  }
};

// Optional: Middleware for specific LINE channel validation
export const channelAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const channelId = req.headers['x-line-channelid'] as string;
    
    if (!channelId) {
      throw new ApiError(
        'Missing X-Line-ChannelId header',
        401,
        'MISSING_CHANNEL_ID'
      );
    }

    // Validate channel ID format
    if (!/^\d+$/.test(channelId)) {
      throw new ApiError(
        'Invalid channel ID format',
        401,
        'INVALID_CHANNEL_ID'
      );
    }

    // Store channel information
    (req as any).lineChannelId = channelId;

    logger.info('Channel authentication', {
      channelId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.warn('Channel authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    next(error);
  }
};