import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app.js';
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';
import { DiscordService } from './services/discord.service.js';

const PORT = config.PORT || 3000;
const HOST = config.HOST || '0.0.0.0';

let server: any;

const startServer = async () => {
  try {
    // Start Discord Bot
    const discordService = DiscordService.getInstance();
    await discordService.start();

    server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 LINE Proxy Server started successfully`, {
        port: PORT,
        host: HOST,
        environment: config.NODE_ENV,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
      
      logger.info(`📡 Server endpoints available:`, {
        health: `http://${HOST}:${PORT}/api/health`,
        lineApi: `http://${HOST}:${PORT}/api/line`,
        docs: `http://${HOST}:${PORT}/`,
      });
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('❌ Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`🔄 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err: any) => {
      if (err) {
        logger.error('❌ Error during server shutdown:', err);
        process.exit(1);
      } else {
        logger.info('✅ Server closed successfully');
        process.exit(0);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();