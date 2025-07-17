import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middleware/cors.middleware.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import { indexRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';

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

// ADDED: Log incoming request URL
app.use((req, res, next) => {
  logger.debug(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

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

// API Routes - Use the main index router ONLY
app.use('/api', indexRoutes);

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.json({
    name: 'Channel Proxy Server',
    version: '1.0.0',
    description: 'Proxy server for LINE, Discord, and other channels.',
    status: 'running',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for any other route
app.use(notFoundMiddleware);

// Error handling middleware - must be last
app.use(errorMiddleware);

export default app;