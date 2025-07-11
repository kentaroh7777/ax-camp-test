import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { ApiError } from '../types/api.types';

export const errorMiddleware = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Default error response
  let statusCode = 500;
  let errorType = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle different types of errors
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    errorType = error.errorType;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorType = 'INVALID_PARAMETER';
    message = 'Invalid parameter format';
    details = error.message;
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    errorType = 'INVALID_JSON';
    message = 'Invalid JSON format';
    details = error.message;
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    errorType = 'FILE_UPLOAD_ERROR';
    message = 'File upload error';
    details = error.message;
  } else if (error.message.includes('timeout')) {
    statusCode = 408;
    errorType = 'REQUEST_TIMEOUT';
    message = 'Request timeout';
    details = error.message;
  } else if (error.message.includes('ECONNREFUSED')) {
    statusCode = 503;
    errorType = 'SERVICE_UNAVAILABLE';
    message = 'Service temporarily unavailable';
    details = 'Unable to connect to LINE API';
  } else if (error.message.includes('ENOTFOUND')) {
    statusCode = 503;
    errorType = 'SERVICE_UNAVAILABLE';
    message = 'Service temporarily unavailable';
    details = 'DNS resolution failed';
  } else if (error.message.includes('Circuit breaker')) {
    statusCode = 503;
    errorType = 'SERVICE_UNAVAILABLE';
    message = 'Service temporarily unavailable';
    details = 'Circuit breaker is open';
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      type: errorType,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  // Add details in development mode or for client errors
  if (config.NODE_ENV === 'development' || statusCode < 500) {
    if (details) {
      errorResponse.error.details = details;
    }
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }

  // Add stack trace in development mode
  if (config.NODE_ENV === 'development' && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Log error with appropriate level
  const logData = {
    statusCode,
    errorType,
    message: error.message,
    path: req.path,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
    stack: config.NODE_ENV === 'development' ? error.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  } else {
    logger.info('Request handled with error', logData);
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse = {
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  res.status(404).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handlers for unhandled errors
export const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      promise,
      timestamp: new Date().toISOString(),
    });
    
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

// Health check error handler
export const healthCheckErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.warn('Health check failed', {
    error: error.message,
    path: req.path,
    timestamp: new Date().toISOString(),
  });

  res.status(503).json({
    success: false,
    status: 'unhealthy',
    error: {
      type: 'HEALTH_CHECK_FAILED',
      message: 'Health check failed',
      details: config.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    },
  });
};

// Rate limit error handler
export const rateLimitErrorHandler = (req: Request, res: Response) => {
  const errorResponse = {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      retryAfter: 60, // seconds
    },
  };

  logger.warn('Rate limit exceeded', {
    path: req.path,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  });

  res.status(429).json(errorResponse);
};