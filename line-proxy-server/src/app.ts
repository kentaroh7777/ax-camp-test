import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middleware/cors.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { lineApiRoutes } from './routes/line-api.routes';
import { healthRoutes } from './routes/health.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { indexRoutes } from './routes/index';
import { logger } from './utils/logger';
import { config } from './utils/config';

const app = express();

// Trust proxy for deployment platforms like Railway
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.line.me"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware
app.use(compression());

// CORS middleware - must come before other middleware
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Store raw body for webhook signature verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting middleware
app.use(rateLimitMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
    });
  });
  
  next();
});

// API Routes
app.use('/api', indexRoutes);
app.use('/api/line', lineApiRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/webhook', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'LINE Proxy Server',
    version: '1.0.0',
    description: 'LINE API Proxy Server for Chrome Extension',
    status: 'running',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware - must be last
app.use(errorMiddleware);

export default app;