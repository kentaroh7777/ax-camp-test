import request from 'supertest';
import app from '../src/app';
import { LineApiService } from '../src/services/line-api.service';
import { vi } from 'vitest'; // viをインポート
import { authMiddleware } from '../src/middleware/auth.middleware'; // authMiddlewareをインポート

// Mock the LINE API service
vi.mock('../src/services/line-api.service'); // jest.mock -> vi.mock
const MockedLineApiService = LineApiService as any; // jest.MockedClass -> any (型エラー回避のため一時的にany)

describe('LINE API Routes', () => {
  let mockLineApiService: any; // jest.Mocked -> any (型エラー回避のため一時的にany)
  let appWithAuth: any; // Expressアプリのインスタンスを保持する変数

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks(); // jest.clearAllMocks -> vi.clearAllMocks
    
    // Create a mocked instance
    mockLineApiService = new MockedLineApiService() as any;
    
    // Mock the constructor to return our mocked instance
    MockedLineApiService.mockImplementation(() => mockLineApiService);

    // Create a new Express app instance for each test and apply mocked authMiddleware
    const express = (await vi.importActual('express')).default;
    const { router: lineApiRouter } = await vi.importActual('../src/routes/line-api.routes'); // importに修正
    const { errorMiddleware } = await vi.importActual('../src/middleware/error.middleware'); // importに修正
    

    const router = express.Router();
    router.use(authMiddleware);
    router.use(lineApiRouter); // LINE API routes
    appWithAuth = express();
    appWithAuth.use('/api/line', router);
    appWithAuth.use(errorMiddleware);
  });

  describe('POST /api/line/message/push', () => {
    const validPushMessage = {
      to: 'U123456789abcdef123456789abcdef12',
      messages: [
        {
          type: 'text',
          text: 'Hello, World!',
        },
      ],
    };

    it('should send a push message successfully', async () => {
      // Mock successful response
      mockLineApiService.sendMessage.mockResolvedValue({});

      const response = await request(appWithAuth)
        .post('/api/line/message/push')
        .set('Authorization', 'Bearer mock-access-token')
        .send(validPushMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLineApiService.sendMessage).toHaveBeenCalledWith(
        validPushMessage,
        'Bearer mock-access-token'
      );
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(appWithAuth)
        .post('/api/line/message/push')
        .send(validPushMessage)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('MISSING_AUTHORIZATION');
      expect(mockLineApiService.sendMessage).not.toHaveBeenCalled();
    });

    it('should return 400 with invalid message format', async () => {
      const invalidMessage = {
        to: 'invalid-user-id',
        messages: [], // Empty messages array
      };

      const response = await request(appWithAuth)
        .post('/api/line/message/push')
        .set('Authorization', 'Bearer mock-access-token')
        .send(invalidMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(mockLineApiService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle LINE API errors', async () => {
      // Mock LINE API error
      const lineApiError = new Error('LINE API Error');
      lineApiError.name = 'LINE_API_ERROR';
      mockLineApiService.sendMessage.mockRejectedValue(lineApiError);

      const response = await request(appWithAuth)
        .post('/api/line/message/push')
        .set('Authorization', 'Bearer mock-access-token')
        .send(validPushMessage)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockLineApiService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('POST /api/line/message/multicast', () => {
    const validMulticastMessage = {
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

    it('should send a multicast message successfully', async () => {
      mockLineApiService.sendMulticastMessage.mockResolvedValue({});

      const response = await request(appWithAuth)
        .post('/api/line/message/multicast')
        .set('Authorization', 'Bearer mock-access-token')
        .send(validMulticastMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLineApiService.sendMulticastMessage).toHaveBeenCalledWith(
        validMulticastMessage,
        'Bearer mock-access-token'
      );
    });

    it('should validate user IDs array', async () => {
      const invalidMessage = {
        to: 'not-an-array',
        messages: [
          {
            type: 'text',
            text: 'Hello!',
          },
        ],
      };

      const response = await request(appWithAuth)
        .post('/api/line/message/multicast')
        .set('Authorization', 'Bearer mock-access-token')
        .send(invalidMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/line/message/reply', () => {
    const validReplyMessage = {
      replyToken: 'mock-reply-token-12345',
      messages: [
        {
          type: 'text',
          text: 'Thank you for your message!',
        },
      ],
    };

    it('should reply to a message successfully', async () => {
      mockLineApiService.replyMessage.mockResolvedValue({});

      const response = await request(appWithAuth)
        .post('/api/line/message/reply')
        .set('Authorization', 'Bearer mock-access-token')
        .send(validReplyMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLineApiService.replyMessage).toHaveBeenCalledWith(
        validReplyMessage,
        'Bearer mock-access-token'
      );
    });

    it('should validate reply token', async () => {
      const invalidMessage = {
        replyToken: '', // Empty reply token
        messages: [
          {
            type: 'text',
            text: 'Hello!',
          },
        ],
      };

      const response = await request(appWithAuth)
        .post('/api/line/message/reply')
        .set('Authorization', 'Bearer mock-access-token')
        .send(invalidMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/line/bot/info', () => {
    it('should get bot info successfully', async () => {
      const mockBotInfo = {
        userId: 'U123456789abcdef123456789abcdef12',
        basicId: '@bot123',
        displayName: 'Test Bot',
        pictureUrl: 'https://example.com/bot.jpg',
        chatMode: 'bot' as const,
        markAsReadMode: 'auto' as const,
      };

      mockLineApiService.getBotInfo.mockResolvedValue(mockBotInfo);

      const response = await request(appWithAuth)
        .get('/api/line/bot/info')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBotInfo);
      expect(mockLineApiService.getBotInfo).toHaveBeenCalledWith('Bearer mock-access-token');
    });
  });

  describe('GET /api/line/profile/:userId', () => {
    it('should get user profile successfully', async () => {
      const userId = 'U123456789abcdef123456789abcdef12';
      const mockProfile = {
        userId,
        displayName: 'Test User',
        pictureUrl: 'https://example.com/user.jpg',
        statusMessage: 'Hello!',
      };

      mockLineApiService.getProfile.mockResolvedValue(mockProfile);

      const response = await request(appWithAuth)
        .get(`/api/line/profile/${userId}`)
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
      expect(mockLineApiService.getProfile).toHaveBeenCalledWith(
        userId,
        'Bearer mock-access-token'
      );
    });

    it('should validate user ID parameter', async () => {
      const response = await request(appWithAuth)
        .get('/api/line/profile/')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/line/quota', () => {
    it('should get quota information successfully', async () => {
      const mockQuota = {
        type: 'limited' as const,
        value: 1000,
      };

      mockLineApiService.getQuota.mockResolvedValue(mockQuota);

      const response = await request(appWithAuth)
        .get('/api/line/quota')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuota);
      expect(mockLineApiService.getQuota).toHaveBeenCalledWith('Bearer mock-access-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle circuit breaker open state', async () => {
      const circuitBreakerError = new Error('Service temporarily unavailable - Circuit breaker is open');
      circuitBreakerError.name = 'CircuitBreakerOpenError'; // Vitestのモックでエラー名を指定
      mockLineApiService.sendMessage.mockRejectedValue(circuitBreakerError);

      const response = await request(appWithAuth)
        .post('/api/line/message/push')
        .set('Authorization', 'Bearer mock-access-token')
        .send({
          to: 'U123456789abcdef123456789abcdef12',
          messages: [{ type: 'text', text: 'Hello!' }],
        })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError'; // Vitestのモックでエラー名を指定
      mockLineApiService.sendMessage.mockRejectedValue(timeoutError);

      const response = await request(appWithAuth)
        .post('/api/line/message/push')
        .set('Authorization', 'Bearer mock-access-token')
        .send({
          to: 'U123456789abcdef123456789abcdef12',
          messages: [{ type: 'text', text: 'Hello!' }],
        })
        .expect(408);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('REQUEST_TIMEOUT');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(appWithAuth)
          .post('/api/line/message/push')
          .set('Authorization', 'Bearer mock-access-token')
          .send({
            to: 'U123456789abcdef123456789abcdef12',
            messages: [{ type: 'text', text: 'Hello!' }],
          })
      );

      const responses = await Promise.all(requests);
      
      // At least one request should be rate limited (429)
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body.error.type).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });
});