import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
import { ApiError } from '../types/api.types.js';
import { config } from '../utils/config.js';

// Common validation rules
const messageValidation = [
  body('type').isIn(['text', 'image', 'video', 'audio', 'file', 'location', 'sticker', 'template', 'flex']).withMessage('Invalid message type'),
  body('text').optional().isString().isLength({ max: 5000 }).withMessage('Text message too long'),
];

const userIdValidation = [
  body('to').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid user ID'),
];

const userIdsValidation = [
  body('to').isArray({ min: 1, max: 500 }).withMessage('Invalid user IDs array'),
  body('to.*').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid user ID in array'),
];

const messagesValidation = [
  body('messages').isArray({ min: 1, max: 5 }).withMessage('Invalid messages array (1-5 messages allowed)'),
  body('messages.*.type').isIn(['text', 'image', 'video', 'audio', 'file', 'location', 'sticker', 'template', 'flex']).withMessage('Invalid message type'),
];

const replyTokenValidation = [
  body('replyToken').isString().isLength({ min: 1, max: 1000 }).withMessage('Invalid reply token'),
];

// Validation rule sets
const validationRules = {
  sendMessage: [
    ...userIdValidation,
    ...messagesValidation,
    body('notificationDisabled').optional().isBoolean().withMessage('Invalid notification disabled flag'),
  ],

  sendMulticastMessage: [
    ...userIdsValidation,
    ...messagesValidation,
    body('notificationDisabled').optional().isBoolean().withMessage('Invalid notification disabled flag'),
  ],

  sendBroadcastMessage: [
    ...messagesValidation,
    body('notificationDisabled').optional().isBoolean().withMessage('Invalid notification disabled flag'),
  ],

  replyMessage: [
    ...replyTokenValidation,
    ...messagesValidation,
    body('notificationDisabled').optional().isBoolean().withMessage('Invalid notification disabled flag'),
  ],

  getUserProfile: [
    param('userId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid user ID'),
  ],

  getGroupMemberProfile: [
    param('groupId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid group ID'),
    param('userId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid user ID'),
  ],

  getGroupMemberIds: [
    param('groupId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid group ID'),
    query('start').optional().isString().isLength({ min: 1, max: 1000 }).withMessage('Invalid start parameter'),
  ],

  leaveGroup: [
    param('groupId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid group ID'),
  ],

  getContent: [
    param('messageId').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid message ID'),
  ],

  webhook: [
    body('destination').isString().isLength({ min: 1, max: 100 }).withMessage('Invalid destination'),
    body('events').isArray({ min: 1, max: 100 }).withMessage('Invalid events array'),
    body('events.*.type').isIn(['message', 'follow', 'unfollow', 'join', 'leave', 'memberJoined', 'memberLeft', 'postback', 'beacon', 'accountLink', 'things']).withMessage('Invalid event type'),
    body('events.*.timestamp').isInt({ min: 0 }).withMessage('Invalid timestamp'),
    body('events.*.source').isObject().withMessage('Invalid source object'),
    body('events.*.source.type').isIn(['user', 'group', 'room']).withMessage('Invalid source type'),
  ],
  discordSendMessage: [
    body('channelId').isString().withMessage('Channel ID must be a string').notEmpty().withMessage('Channel ID is required'),
    body('content').isString().withMessage('Content must be a string').notEmpty().withMessage('Content is required'),
  ],
};

// Custom validation functions
const validateLineMessage = (message: any): string[] => {
  const errors: string[] = [];

  if (!message.type) {
    errors.push('Message type is required');
    return errors;
  }

  switch (message.type) {
    case 'text':
      if (!message.text) {
        errors.push('Text message content is required');
      } else if (message.text.length > 5000) {
        errors.push('Text message too long (max 5000 characters)');
      }
      break;

    case 'image':
      if (!message.originalContentUrl) {
        errors.push('Image originalContentUrl is required');
      }
      if (!message.previewImageUrl) {
        errors.push('Image previewImageUrl is required');
      }
      break;

    case 'video':
      if (!message.originalContentUrl) {
        errors.push('Video originalContentUrl is required');
      }
      if (!message.previewImageUrl) {
        errors.push('Video previewImageUrl is required');
      }
      break;

    case 'audio':
      if (!message.originalContentUrl) {
        errors.push('Audio originalContentUrl is required');
      }
      if (!message.duration) {
        errors.push('Audio duration is required');
      }
      break;

    case 'file':
      if (!message.originalContentUrl) {
        errors.push('File originalContentUrl is required');
      }
      if (!message.fileName) {
        errors.push('File fileName is required');
      }
      if (!message.fileSize) {
        errors.push('File fileSize is required');
      }
      break;

    case 'location':
      if (!message.title) {
        errors.push('Location title is required');
      }
      if (!message.address) {
        errors.push('Location address is required');
      }
      if (typeof message.latitude !== 'number') {
        errors.push('Location latitude is required and must be a number');
      }
      if (typeof message.longitude !== 'number') {
        errors.push('Location longitude is required and must be a number');
      }
      break;

    case 'sticker':
      if (!message.packageId) {
        errors.push('Sticker packageId is required');
      }
      if (!message.stickerId) {
        errors.push('Sticker stickerId is required');
      }
      break;

    case 'template':
      if (!message.template) {
        errors.push('Template object is required');
      }
      break;

    case 'flex':
      if (!message.contents) {
        errors.push('Flex contents is required');
      }
      break;

    default:
      errors.push(`Unsupported message type: ${message.type}`);
  }

  return errors;
};

// Main validation middleware factory
export const validationMiddleware = (validationType: keyof typeof validationRules) => {
  return [
    // Apply validation rules
    ...validationRules[validationType],
    
    // Custom validation for messages
    body('messages.*').if(body('messages').exists()).custom((message) => {
      const errors = validateLineMessage(message);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      return true;
    }),
    
    // Check validation results
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error: any) => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value,
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errorMessages,
          body: req.body,
          params: req.params,
          query: req.query,
          timestamp: new Date().toISOString(),
        });

        const apiError = new ApiError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          {
            errors: errorMessages,
            details: 'Please check your request parameters and try again',
          }
        );

        return next(apiError);
      }

      logger.debug('Validation passed', {
        path: req.path,
        method: req.method,
        validationType,
      });

      next();
    },
  ];
};

// Webhook signature validation middleware
export const validateWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  // If webhook signature validation is disabled, skip this middleware
  if (!config.WEBHOOK_SIGNATURE_VALIDATION) {
    logger.info('Webhook signature validation skipped by configuration.');
    return next();
  }

  try {
    const signature = req.headers['x-line-signature'] as string;
    const body = (req as any).rawBody;
    
    if (!signature) {
      throw new ApiError(
        'Missing X-Line-Signature header',
        401,
        'MISSING_SIGNATURE'
      );
    }

    if (!body) {
      throw new ApiError(
        'Missing request body for signature validation',
        400,
        'MISSING_BODY'
      );
    }

    // Store for later use in the webhook handler
    (req as any).webhookSignature = signature;
    (req as any).webhookBody = body;

    next();
  } catch (error) {
    logger.error('Webhook signature validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hasSignature: !!req.headers['x-line-signature'],
      hasBody: !!(req as any).rawBody,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    next(error);
  }
};

// Custom validation for file uploads
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file && !req.files) {
      throw new ApiError(
        'No file uploaded',
        400,
        'NO_FILE_UPLOADED'
      );
    }

    const file = req.file || (Array.isArray(req.files) ? req.files[0] : req.files ? Object.values(req.files)[0] : null);
    
    // Handle array case for file type
    const actualFile = Array.isArray(file) ? file[0] : file;
    
    if (!file) {
      throw new ApiError(
        'Invalid file upload',
        400,
        'INVALID_FILE'
      );
    }

    // Check file size (10MB limit)
    if (actualFile && actualFile.size > 10 * 1024 * 1024) {
      throw new ApiError(
        'File too large (max 10MB)',
        400,
        'FILE_TOO_LARGE'
      );
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'application/pdf'];
    if (actualFile && !allowedTypes.includes(actualFile.mimetype)) {
      throw new ApiError(
        'Invalid file type',
        400,
        'INVALID_FILE_TYPE'
      );
    }

    next();
  } catch (error) {
    logger.error('File upload validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    next(error);
  }
};