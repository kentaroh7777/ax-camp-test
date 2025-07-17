import winston from 'winston';
import { config } from './config.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  verbose: 'magenta',
};

winston.addColors(colors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    ({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      
      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
      }
      
      // Add stack trace for errors
      if (stack) {
        log += `\n${stack}`;
      }
      
      return log;
    }
  )
);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Sanitize sensitive information in production
    const sanitized = { ...info };
    
    // Remove or mask sensitive fields
    if (sanitized.authorization && typeof sanitized.authorization === 'string') {
      sanitized.authorization = sanitized.authorization.substring(0, 10) + '...';
    }
    if (sanitized.token && typeof sanitized.token === 'string') {
      sanitized.token = sanitized.token.substring(0, 8) + '...';
    }
    if (sanitized.password) {
      sanitized.password = '[REDACTED]';
    }
    if (sanitized.secret) {
      sanitized.secret = '[REDACTED]';
    }
    
    return JSON.stringify(sanitized);
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
if (config.LOG_CONSOLE_ENABLED !== false) {
  transports.push(
    new winston.transports.Console({
      level: config.LOG_LEVEL || 'info',
      format: config.NODE_ENV === 'production' ? productionFormat : developmentFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// File transport for production
if (config.NODE_ENV === 'production' || config.LOG_FILE_ENABLED) {
  transports.push(
    new winston.transports.File({
      filename: config.LOG_FILE_PATH || 'logs/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: parseInt(config.LOG_FILE_MAX_SIZE || '10485760'), // 10MB
      maxFiles: config.LOG_FILE_MAX_FILES || 5,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: config.LOG_FILE_PATH?.replace('.log', '-combined.log') || 'logs/combined.log',
      level: config.LOG_LEVEL || 'info',
      format: productionFormat,
      maxsize: parseInt(config.LOG_FILE_MAX_SIZE || '10485760'), // 10MB
      maxFiles: config.LOG_FILE_MAX_FILES || 5,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  levels,
  level: config.LOG_LEVEL || 'info',
  format: config.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports,
  exitOnError: false,
  // Prevent winston from exiting on uncaught exceptions
  handleExceptions: true,
  handleRejections: true,
});

// Add request correlation ID support
export const createRequestLogger = (requestId?: string) => {
  return logger.child({ requestId });
};

// Helper functions for structured logging
export const logRequest = (req: any, res: any, responseTime: number) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.headers['x-request-id'],
  };

  if (res.statusCode >= 400) {
    logger.warn('Request completed with error', logData);
  } else {
    logger.info('Request completed', logData);
  }
};

export const logError = (error: Error, context?: any) => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  };

  logger.error('Application error', logData);
};

export const logLineApiCall = (
  method: string,
  endpoint: string,
  statusCode: number,
  responseTime: number,
  error?: Error
) => {
  const logData = {
    lineApi: {
      method,
      endpoint,
      statusCode,
      responseTime: `${responseTime}ms`,
    },
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logger.error('LINE API call failed', { ...logData, error: error.message });
  } else if (statusCode >= 400) {
    logger.warn('LINE API call completed with error', logData);
  } else {
    logger.info('LINE API call completed', logData);
  }
};

export const logWebhook = (
  eventType: string,
  source: string,
  processed: boolean,
  processingTime: number,
  error?: Error
) => {
  const logData = {
    webhook: {
      eventType,
      source,
      processed,
      processingTime: `${processingTime}ms`,
    },
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logger.error('Webhook processing failed', { ...logData, error: error.message });
  } else {
    logger.info('Webhook processed', logData);
  }
};

export const logCircuitBreaker = (
  action: 'open' | 'close' | 'half-open',
  serviceName: string,
  stats?: any
) => {
  const logData = {
    circuitBreaker: {
      action,
      serviceName,
      stats,
    },
    timestamp: new Date().toISOString(),
  };

  if (action === 'open') {
    logger.warn('Circuit breaker opened', logData);
  } else {
    logger.info(`Circuit breaker ${action}`, logData);
  }
};

export const logHealthCheck = (
  component: string,
  status: 'healthy' | 'degraded' | 'unhealthy',
  responseTime?: number,
  error?: Error
) => {
  const logData = {
    healthCheck: {
      component,
      status,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logger.error('Health check failed', { ...logData, error: error.message });
  } else if (status === 'unhealthy') {
    logger.warn('Health check unhealthy', logData);
  } else if (status === 'degraded') {
    logger.warn('Health check degraded', logData);
  } else {
    logger.debug('Health check passed', logData);
  }
};

export const logSecurityEvent = (
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: any
) => {
  const logData = {
    security: {
      eventType,
      severity,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  if (severity === 'critical' || severity === 'high') {
    logger.error('Security event', logData);
  } else {
    logger.warn('Security event', logData);
  }
};

export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: any
) => {
  const logData = {
    performance: {
      operation,
      duration: `${duration}ms`,
      metadata,
    },
    timestamp: new Date().toISOString(),
  };

  if (duration > 5000) { // Slow operation (> 5 seconds)
    logger.warn('Slow operation detected', logData);
  } else {
    logger.debug('Performance measurement', logData);
  }
};

// Export logger instance with additional helper methods
export default {
  ...logger,
  request: logRequest,
  error: logError,
  lineApi: logLineApiCall,
  webhook: logWebhook,
  circuitBreaker: logCircuitBreaker,
  healthCheck: logHealthCheck,
  security: logSecurityEvent,
  performance: logPerformance,
  createRequestLogger,
};

// Stream for Morgan HTTP request logging
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};