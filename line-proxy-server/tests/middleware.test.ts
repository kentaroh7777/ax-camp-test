import request from 'supertest';
import express from 'express';
import { corsMiddleware } from '../src/middleware/cors.middleware';
import { authMiddleware } from '../src/middleware/auth.middleware';
import { validationMiddleware } from '../src/middleware/validation.middleware';
import { errorMiddleware } from '../src/middleware/error.middleware';
import { rateLimitMiddleware } from '../src/middleware/rate-limit.middleware';

describe('Middleware Tests', () => {
  describe('CORS Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(corsMiddleware);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow Chrome extension origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz123456');
    });

    it('should allow Mozilla extension origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'moz-extension://abc123-def456-ghi789')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('moz-extension://abc123-def456-ghi789');
    });

    it('should allow Gmail origin', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://mail.google.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://mail.google.com');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    it('should reject unknown origins', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      // Should not set the malicious origin
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });

    it('should handle requests without origin header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Should allow all origins when no origin is provided (Chrome extensions case)
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Auth Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(authMiddleware);
      app.get('/protected', (req: express.Request, res: express.Response) => {
        res.json({ success: true, authenticated: (req as any).isAuthenticated });
      });
      app.use(errorMiddleware);
    });

    it('should allow valid Bearer token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-line-access-token-12345')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
    });

    it('should reject missing authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('MISSING_AUTHORIZATION');
    });

    it('should reject invalid authorization format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Invalid token-format')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_AUTHORIZATION_FORMAT');
    });

    it('should reject short tokens', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer short')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_ACCESS_TOKEN');
    });

    it('should reject tokens with invalid characters', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer token with spaces and\nnewlines')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_ACCESS_TOKEN');
    });

    it('should reject extremely long tokens', async () => {
      const longToken = 'a'.repeat(1001);
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_ACCESS_TOKEN');
    });
  });

  describe('Validation Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      
      // Test route for sendMessage validation
      app.post('/test/send-message', 
        validationMiddleware('sendMessage'),
        (req: express.Request, res: express.Response) => {
          res.json({ success: true });
        }
      );

      // Test route for sendMulticastMessage validation
      app.post('/test/send-multicast', 
        validationMiddleware('sendMulticastMessage'),
        (req: express.Request, res: express.Response) => {
          res.json({ success: true });
        }
      );

      app.use(errorMiddleware);
    });

    it('should validate correct sendMessage payload', async () => {
      const validPayload = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: [
          {
            type: 'text',
            text: 'Hello, World!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/send-message')
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject sendMessage with invalid user ID', async () => {
      const invalidPayload = {
        to: '', // Empty user ID
        messages: [
          {
            type: 'text',
            text: 'Hello!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/send-message')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject sendMessage with empty messages array', async () => {
      const invalidPayload = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: [], // Empty messages
      };

      const response = await request(app)
        .post('/test/send-message')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject sendMessage with too many messages', async () => {
      const invalidPayload = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: Array(6).fill({ type: 'text', text: 'Hello!' }), // More than 5 messages
      };

      const response = await request(app)
        .post('/test/send-message')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should validate correct multicast payload', async () => {
      const validPayload = {
        to: [
          'U123456789abcdef123456789abcdef12',
          'U123456789abcdef123456789abcdef13',
        ],
        messages: [
          {
            type: 'text',
            text: 'Hello, Everyone!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/send-multicast')
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject multicast with too many recipients', async () => {
      const tooManyRecipients = Array(501).fill('U123456789abcdef123456789abcdef12');
      const invalidPayload = {
        to: tooManyRecipients,
        messages: [
          {
            type: 'text',
            text: 'Hello!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/send-multicast')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should validate different message types', async () => {
      const imageMessage = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: [
          {
            type: 'image',
            originalContentUrl: 'https://example.com/image.jpg',
            previewImageUrl: 'https://example.com/preview.jpg',
          },
        ],
      };

      const response = await request(app)
        .post('/test/send-message')
        .send(imageMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject text message with too long content', async () => {
      const longText = 'a'.repeat(5001); // Over 5000 characters
      const invalidPayload = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: [
          {
            type: 'text',
            text: longText,
          },
        ],
      };

      const response = await request(app)
        .post('/test/send-message')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Test routes that throw different types of errors
      app.get('/test/api-error', (req, res, next) => {
        const error = new Error('Custom API Error');
        error.name = 'ApiError';
        (error as any).statusCode = 400;
        (error as any).errorType = 'CUSTOM_ERROR';
        next(error);
      });

      app.get('/test/validation-error', (req, res, next) => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        next(error);
      });

      app.get('/test/generic-error', (req, res, next) => {
        next(new Error('Generic error'));
      });

      app.get('/test/timeout-error', (req, res, next) => {
        const error = new Error('Request timeout occurred');
        next(error);
      });

      app.use(errorMiddleware);
    });

    it('should handle API errors correctly', async () => {
      const response = await request(app)
        .get('/test/api-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Custom API Error');
      expect(response.body.error.timestamp).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should handle generic errors', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error.message).toBe('Internal server error');
    });

    it('should handle timeout errors', async () => {
      const response = await request(app)
        .get('/test/timeout-error')
        .expect(408);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('REQUEST_TIMEOUT');
      expect(response.body.error.message).toBe('Request timeout');
    });

    it('should include request information in error response', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500);

      expect(response.body.error.path).toBe('/test/generic-error');
      expect(response.body.error.method).toBe('GET');
      expect(response.body.error.timestamp).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/test/generic-error')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_JSON');
    });
  });

  describe('Rate Limit Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(rateLimitMiddleware);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorMiddleware);
    });

    it('should allow requests within the limit', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    // Note: Testing actual rate limiting would require making many requests
    // which might be slow and flaky in a test environment. 
    // In a real scenario, you'd want to test this with a shorter window.
  });

  describe('Integration Tests', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(corsMiddleware);
      app.use(express.json());
      app.use(rateLimitMiddleware);

      app.post('/test/protected',
        authMiddleware,
        validationMiddleware('sendMessage'),
        (req: express.Request, res: express.Response) => {
          res.json({ success: true });
        }
      );

      app.use(errorMiddleware);
    });

    it('should work with all middleware combined', async () => {
      const validPayload = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: [
          {
            type: 'text',
            text: 'Hello, World!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/protected')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456')
        .set('Authorization', 'Bearer valid-line-access-token-12345')
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnopqrstuvwxyz123456');
    });

    it('should fail at authentication with all middleware', async () => {
      const validPayload = {
        to: 'U123456789abcdef123456789abcdef12',
        messages: [
          {
            type: 'text',
            text: 'Hello, World!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/protected')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456')
        // Missing Authorization header
        .send(validPayload)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('MISSING_AUTHORIZATION');
    });

    it('should fail at validation with all middleware', async () => {
      const invalidPayload = {
        to: '', // Invalid user ID
        messages: [
          {
            type: 'text',
            text: 'Hello, World!',
          },
        ],
      };

      const response = await request(app)
        .post('/test/protected')
        .set('Origin', 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456')
        .set('Authorization', 'Bearer valid-line-access-token-12345')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });
});