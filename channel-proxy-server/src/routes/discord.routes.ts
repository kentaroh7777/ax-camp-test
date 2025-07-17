//
// discord.routes.ts
//
// Responsibilities:
// 1. Define API endpoints for interacting with the Discord service.
// 2. Route incoming HTTP requests to the appropriate methods in DiscordService.
//
// Endpoints:
// - POST /send -> Send a message to a Discord channel.
// - GET /messages -> Get recent messages from cached data.
//
import { Router, Request, Response, NextFunction } from 'express';
import { DiscordService } from '../services/discord.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validationMiddleware } from '../middleware/validation.middleware.js';

const router = Router();
const discordService = DiscordService.getInstance();

router.post('/send',
  validationMiddleware('discordSendMessage'),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { channelId, content } = req.body;
    const messageId = await discordService.sendMessage(channelId, content);
    res.status(200).json({ success: true, messageId });
  })
);

router.get('/messages',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const messages = discordService.getMessages(since);
    res.status(200).json({ success: true, messages });
  })
);

export default router; 