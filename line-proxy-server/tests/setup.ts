import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '0'; // Let the OS assign a random port for tests
process.env.RATE_LIMIT_MAX_REQUESTS = '10000'; // High limit for tests
process.env.FEATURE_DEBUG_MODE = 'true';
process.env.FEATURE_MOCK_RESPONSES = 'true';

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  mockLineApiResponse: (statusCode: number = 200, data: any = {}) => ({
    status: statusCode,
    data,
    headers: {
      'content-type': 'application/json',
    },
  }),

  mockLineApiError: (statusCode: number = 400, message: string = 'LINE API Error') => {
    const error = new Error(message);
    (error as any).response = {
      status: statusCode,
      data: {
        message,
        details: [],
      },
    };
    return error;
  },

  validLineAccessToken: 'mock-line-access-token-12345abcdef',
  
  validUserId: 'U123456789abcdef123456789abcdef12',
  
  validGroupId: 'C123456789abcdef123456789abcdef12',

  validReplyToken: 'mock-reply-token-12345abcdef67890',

  createValidTextMessage: (text: string = 'Hello, World!') => ({
    type: 'text' as const,
    text,
  }),

  createValidImageMessage: () => ({
    type: 'image' as const,
    originalContentUrl: 'https://example.com/image.jpg',
    previewImageUrl: 'https://example.com/preview.jpg',
  }),

  createValidPushMessageRequest: (to?: string, messages?: any[]) => ({
    to: to || global.testUtils.validUserId,
    messages: messages || [global.testUtils.createValidTextMessage()],
  }),

  createValidMulticastMessageRequest: (to?: string[], messages?: any[]) => ({
    to: to || [global.testUtils.validUserId, 'U123456789abcdef123456789abcdef13'],
    messages: messages || [global.testUtils.createValidTextMessage()],
  }),

  createValidReplyMessageRequest: (replyToken?: string, messages?: any[]) => ({
    replyToken: replyToken || global.testUtils.validReplyToken,
    messages: messages || [global.testUtils.createValidTextMessage()],
  }),

  createWebhookEvent: (type: string = 'message', overrides: any = {}) => ({
    type,
    timestamp: Date.now(),
    source: {
      type: 'user',
      userId: global.testUtils.validUserId,
    },
    webhookEventId: 'mock-webhook-event-id-12345',
    deliveryContext: {
      isRedelivery: false,
    },
    replyToken: global.testUtils.validReplyToken,
    ...overrides,
  }),

  createWebhookRequest: (events?: any[], destination?: string) => ({
    destination: destination || global.testUtils.validUserId,
    events: events || [global.testUtils.createWebhookEvent()],
  }),

  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  suppressConsole: () => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  },

  restoreConsole: () => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  },
};

// Test utilities type definition
interface TestUtilsType {
  mockLineApiResponse: (statusCode?: number, data?: any) => any;
  mockLineApiError: (statusCode?: number, message?: string) => Error;
  validLineAccessToken: string;
  validUserId: string;
  validGroupId: string;
  validReplyToken: string;
  createValidTextMessage: (text?: string) => any;
  createValidImageMessage: () => any;
  createValidPushMessageRequest: (to?: string, messages?: any[]) => any;
  createValidMulticastMessageRequest: (to?: string[], messages?: any[]) => any;
  createValidReplyMessageRequest: (replyToken?: string, messages?: any[]) => any;
  createWebhookEvent: (type?: string, overrides?: any) => any;
  createWebhookRequest: (events?: any[], destination?: string) => any;
  sleep: (ms: number) => Promise<void>;
  suppressConsole: () => void;
  restoreConsole: () => void;
}

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidLineResponse(): R;
      toBeLineApiError(): R;
    }
  }

  var testUtils: TestUtilsType;
}

// Custom Jest matchers
expect.extend({
  toBeValidLineResponse(received) {
    const pass = received && 
                 typeof received === 'object' && 
                 received.success === true &&
                 received.timestamp &&
                 new Date(received.timestamp).getTime() > 0;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid LINE response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid LINE response with success=true and valid timestamp`,
        pass: false,
      };
    }
  },

  toBeLineApiError(received) {
    const pass = received && 
                 typeof received === 'object' && 
                 received.success === false &&
                 received.error &&
                 received.error.type &&
                 received.error.message &&
                 received.error.timestamp;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a LINE API error`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a LINE API error with success=false and error object`,
        pass: false,
      };
    }
  },
});

// Suppress console output during tests unless explicitly needed
beforeAll(() => {
  global.testUtils.suppressConsole();
});

afterAll(() => {
  global.testUtils.restoreConsole();
});