import { Router } from 'express';
import { config } from '../utils/config.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { router as healthRouter } from './health.routes.js';
import { router as lineApiRouter } from './line-api.routes.js';
import { router as webhookRouter } from './webhook.routes.js';
import discordRouter from './discord.routes.js';
import gmailRouter from './gmail-api.routes.js';

const router = Router();

// Keep existing root endpoints for basic info
router.get('/', (req, res) => res.json({ message: 'Channel Proxy Server is running' }));

// Register all channel-specific routers
router.use('/health', healthRouter);
router.use('/line', lineApiRouter);
router.use('/webhook', webhookRouter);
router.use('/discord', discordRouter);
router.use('/gmail', gmailRouter);

export { router as indexRoutes };