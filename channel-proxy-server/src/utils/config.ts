// This file is now primarily for parsing and exporting typed config variables.
// The loading of the .env file is handled by the start script in package.json.

import { AppConfig, DEFAULT_CONFIG_VALUES } from '../types/config.types.js';

// Helper function to parse boolean from string
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// Helper function to parse number from string
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to parse array from string
const parseArray = (value: string | undefined, defaultValue: string[] = []): string[] => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

// Helper function to get environment variable with fallback
const getEnv = (key: string, defaultValue?: string): string | undefined => {
  return process.env[key] || defaultValue;
};

// Load configuration from environment variables
const loadConfig = (): AppConfig => {
  // Environment configuration
  const NODE_ENV = (getEnv('NODE_ENV', 'development') as any) || 'development';
  const PORT = parseNumber(getEnv('PORT'), DEFAULT_CONFIG_VALUES.PORT);
  const HOST = getEnv('HOST', DEFAULT_CONFIG_VALUES.HOST)!;
  const LOG_LEVEL = (getEnv('LOG_LEVEL', 'debug') as 'error' | 'warn' | 'info' | 'debug' | 'verbose');

  // CORS configuration
  const CORS_ORIGINS = parseArray(getEnv('CORS_ORIGINS'), [
    'chrome-extension://*',
    'moz-extension://*',
    'https://mail.google.com',
    'https://discord.com',
    'https://line.me',
    'https://web.line.me',
  ]);
  const CORS_CREDENTIALS = parseBoolean(getEnv('CORS_CREDENTIALS'), true);

  // Rate limiting configuration
  const RATE_LIMIT_WINDOW_MS = parseNumber(
    getEnv('RATE_LIMIT_WINDOW_MS'),
    DEFAULT_CONFIG_VALUES.RATE_LIMIT_WINDOW_MS
  );
  const RATE_LIMIT_MAX_REQUESTS = parseNumber(
    getEnv('RATE_LIMIT_MAX_REQUESTS'),
    DEFAULT_CONFIG_VALUES.RATE_LIMIT_MAX_REQUESTS
  );
  const RATE_LIMIT_STRICT_MAX = parseNumber(getEnv('RATE_LIMIT_STRICT_MAX'), 100);
  const RATE_LIMIT_MESSAGE_MAX = parseNumber(getEnv('RATE_LIMIT_MESSAGE_MAX'), 50);

  // Security configuration
  const HELMET_ENABLED = parseBoolean(getEnv('HELMET_ENABLED'), true);
  const COMPRESSION_ENABLED = parseBoolean(getEnv('COMPRESSION_ENABLED'), true);
  const TRUST_PROXY = parseBoolean(getEnv('TRUST_PROXY'), true);

  // Request configuration
  const MAX_REQUEST_SIZE = getEnv('MAX_REQUEST_SIZE', DEFAULT_CONFIG_VALUES.MAX_REQUEST_SIZE)!;
  const REQUEST_TIMEOUT = parseNumber(
    getEnv('REQUEST_TIMEOUT'),
    DEFAULT_CONFIG_VALUES.REQUEST_TIMEOUT
  );

  // LINE API configuration
  const LINE_API_BASE_URL = getEnv('LINE_API_BASE_URL', DEFAULT_CONFIG_VALUES.LINE_API_BASE_URL)!;
  const LINE_API_TIMEOUT = parseNumber(
    getEnv('LINE_API_TIMEOUT'),
    DEFAULT_CONFIG_VALUES.LINE_API_TIMEOUT
  );
  const LINE_API_RETRY_ATTEMPTS = parseNumber(getEnv('LINE_API_RETRY_ATTEMPTS'), 3);
  const LINE_API_RETRY_DELAY = parseNumber(getEnv('LINE_API_RETRY_DELAY'), 1000);

  // LINE webhook configuration
  const LINE_WEBHOOK_PATH = getEnv('LINE_WEBHOOK_PATH', '/api/webhook')!;
  const LINE_WEBHOOK_VERIFY_SIGNATURE = parseBoolean(getEnv('LINE_WEBHOOK_VERIFY_SIGNATURE'), true);

  // Optional LINE channel configuration
  const LINE_CHANNEL_ACCESS_TOKEN = getEnv('LINE_CHANNEL_ACCESS_TOKEN');
  const LINE_CHANNEL_SECRET = getEnv('LINE_CHANNEL_SECRET');
  const LINE_CHANNEL_ID = getEnv('LINE_CHANNEL_ID');
  const LINE_TEST_USER_ID = getEnv('LINE_TEST_USER_ID');

  // Discord API Config
  const DISCORD_BOT_TOKEN = getEnv('DISCORD_BOT_TOKEN') || '';
  const DISCORD_CLIENT_ID = getEnv('DISCORD_CLIENT_ID') || '';

  // Circuit breaker configuration
  const CIRCUIT_BREAKER_ENABLED = parseBoolean(getEnv('CIRCUIT_BREAKER_ENABLED'), true);
  const CIRCUIT_BREAKER_FAILURE_THRESHOLD = parseNumber(
    getEnv('CIRCUIT_BREAKER_FAILURE_THRESHOLD'),
    DEFAULT_CONFIG_VALUES.CIRCUIT_BREAKER_FAILURE_THRESHOLD
  );
  const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = parseNumber(getEnv('CIRCUIT_BREAKER_SUCCESS_THRESHOLD'), 3);
  const CIRCUIT_BREAKER_TIMEOUT = parseNumber(getEnv('CIRCUIT_BREAKER_TIMEOUT'), 10000);
  const CIRCUIT_BREAKER_RESET_TIMEOUT = parseNumber(
    getEnv('CIRCUIT_BREAKER_RESET_TIMEOUT'),
    DEFAULT_CONFIG_VALUES.CIRCUIT_BREAKER_RESET_TIMEOUT
  );
  const CIRCUIT_BREAKER_MONITOR_TIMEOUT = parseNumber(getEnv('CIRCUIT_BREAKER_MONITOR_TIMEOUT'), 10000);
  const CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE = parseNumber(
    getEnv('CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE'),
    50
  );
  const CIRCUIT_BREAKER_VOLUME_THRESHOLD = parseNumber(getEnv('CIRCUIT_BREAKER_VOLUME_THRESHOLD'), 5);
  const CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT = parseNumber(
    getEnv('CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT'),
    30000
  );
  const CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS = parseNumber(
    getEnv('CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS'),
    10
  );

  // Health check configuration
  const HEALTH_CHECK_ENABLED = parseBoolean(getEnv('HEALTH_CHECK_ENABLED'), true);
  const HEALTH_CHECK_INTERVAL = parseNumber(
    getEnv('HEALTH_CHECK_INTERVAL'),
    DEFAULT_CONFIG_VALUES.HEALTH_CHECK_INTERVAL
  );
  const HEALTH_CHECK_TIMEOUT = parseNumber(getEnv('HEALTH_CHECK_TIMEOUT'), 5000);
  const HEALTH_CHECK_RETRIES = parseNumber(getEnv('HEALTH_CHECK_RETRIES'), 3);
  const HEALTH_CHECK_MEMORY_THRESHOLD = parseNumber(getEnv('HEALTH_CHECK_MEMORY_THRESHOLD'), 85);
  const HEALTH_CHECK_CPU_THRESHOLD = parseNumber(getEnv('HEALTH_CHECK_CPU_THRESHOLD'), 90);
  const HEALTH_CHECK_DISK_THRESHOLD = parseNumber(getEnv('HEALTH_CHECK_DISK_THRESHOLD'), 90);
  const HEALTH_CHECK_DEPENDENCIES = parseArray(getEnv('HEALTH_CHECK_DEPENDENCIES'), ['line-api']);

  // Logging configuration
  const LOG_FORMAT = (getEnv('LOG_FORMAT', 'json') as any) || 'json';
  const LOG_FILE_ENABLED = parseBoolean(getEnv('LOG_FILE_ENABLED'), NODE_ENV === 'production');
  const LOG_FILE_PATH = getEnv('LOG_FILE_PATH', 'logs/app.log')!;
  const LOG_FILE_MAX_SIZE = getEnv('LOG_FILE_MAX_SIZE', '10m')!;
  const LOG_FILE_MAX_FILES = parseNumber(getEnv('LOG_FILE_MAX_FILES'), 5);
  const LOG_CONSOLE_ENABLED = parseBoolean(getEnv('LOG_CONSOLE_ENABLED'), true);
  const LOG_REQUEST_ENABLED = parseBoolean(getEnv('LOG_REQUEST_ENABLED'), true);
  const LOG_ERROR_STACK = parseBoolean(getEnv('LOG_ERROR_STACK'), NODE_ENV === 'development');
  const LOG_SENSITIVE_DATA = parseBoolean(getEnv('LOG_SENSITIVE_DATA'), NODE_ENV === 'development');

  // Monitoring configuration
  const METRICS_ENABLED = parseBoolean(getEnv('METRICS_ENABLED'), true);
  const METRICS_PATH = getEnv('METRICS_PATH', '/api/health/metrics')!;
  const METRICS_COLLECTION_INTERVAL = parseNumber(getEnv('METRICS_COLLECTION_INTERVAL'), 60000);
  const PERFORMANCE_MONITORING_ENABLED = parseBoolean(getEnv('PERFORMANCE_MONITORING_ENABLED'), true);
  const PERFORMANCE_SLOW_REQUEST_THRESHOLD = parseNumber(
    getEnv('PERFORMANCE_SLOW_REQUEST_THRESHOLD'),
    5000
  );
  const ERROR_TRACKING_ENABLED = parseBoolean(getEnv('ERROR_TRACKING_ENABLED'), true);
  const ERROR_TRACKING_SAMPLE_RATE = parseNumber(getEnv('ERROR_TRACKING_SAMPLE_RATE'), 100);
  const CUSTOM_METRICS_ENABLED = parseBoolean(getEnv('CUSTOM_METRICS_ENABLED'), true);

  // Cache configuration
  const CACHE_ENABLED = parseBoolean(getEnv('CACHE_ENABLED'), false);
  const CACHE_TYPE = (getEnv('CACHE_TYPE', 'memory') as any) || 'memory';
  const CACHE_TTL = parseNumber(getEnv('CACHE_TTL'), 300000); // 5 minutes
  const CACHE_MAX_SIZE = parseNumber(getEnv('CACHE_MAX_SIZE'), 1000);

  // Database configuration (for future use)
  const DATABASE_ENABLED = parseBoolean(getEnv('DATABASE_ENABLED'), false);
  const DATABASE_TYPE = (getEnv('DATABASE_TYPE', 'postgresql') as any) || 'postgresql';
  const DATABASE_URL = getEnv('DATABASE_URL');

  // Security configuration
  const AUTH_ENABLED = parseBoolean(getEnv('AUTH_ENABLED'), true);
  const AUTH_TOKEN_VALIDATION = parseBoolean(getEnv('AUTH_TOKEN_VALIDATION'), true);
  const AUTH_REQUIRE_HTTPS = parseBoolean(getEnv('AUTH_REQUIRE_HTTPS'), NODE_ENV === 'production');
  const RATE_LIMITING_ENABLED = parseBoolean(getEnv('RATE_LIMITING_ENABLED'), true);
  const RATE_LIMITING_STORE = (getEnv('RATE_LIMITING_STORE', 'memory') as any) || 'memory';
  const RATE_LIMITING_SKIP_FAILED_REQUESTS = parseBoolean(
    getEnv('RATE_LIMITING_SKIP_FAILED_REQUESTS'),
    false
  );
  const RATE_LIMITING_SKIP_SUCCESSFUL_REQUESTS = parseBoolean(
    getEnv('RATE_LIMITING_SKIP_SUCCESSFUL_REQUESTS'),
    false
  );
  const CORS_ENABLED = parseBoolean(getEnv('CORS_ENABLED'), true);
  const CORS_MAX_AGE = parseNumber(getEnv('CORS_MAX_AGE'), 86400);
  const SECURITY_HEADERS_ENABLED = parseBoolean(getEnv('SECURITY_HEADERS_ENABLED'), true);
  const CONTENT_SECURITY_POLICY_ENABLED = parseBoolean(getEnv('CONTENT_SECURITY_POLICY_ENABLED'), true);
  const INPUT_VALIDATION_ENABLED = parseBoolean(getEnv('INPUT_VALIDATION_ENABLED'), true);
  const REQUEST_SIZE_LIMIT = getEnv('REQUEST_SIZE_LIMIT', '10mb')!;
  const WEBHOOK_SIGNATURE_VALIDATION = parseBoolean(getEnv('WEBHOOK_SIGNATURE_VALIDATION'), true);
  const WEBHOOK_IP_WHITELIST = parseArray(getEnv('WEBHOOK_IP_WHITELIST'));

  // Deployment configuration
  const CONTAINER_NAME = getEnv('CONTAINER_NAME', 'line-proxy-server')!;
  const CONTAINER_VERSION = getEnv('CONTAINER_VERSION', '1.0.0')!;
  const RAILWAY_PROJECT_ID = getEnv('RAILWAY_PROJECT_ID');
  const RAILWAY_ENVIRONMENT = getEnv('RAILWAY_ENVIRONMENT');
  const RAILWAY_DEPLOYMENT_ID = getEnv('RAILWAY_DEPLOYMENT_ID');
  const RAILWAY_SERVICE_ID = getEnv('RAILWAY_SERVICE_ID');
  const READINESS_PROBE_PATH = getEnv('READINESS_PROBE_PATH', '/api/health/ready')!;
  const LIVENESS_PROBE_PATH = getEnv('LIVENESS_PROBE_PATH', '/api/health/live')!;
  const STARTUP_PROBE_PATH = getEnv('STARTUP_PROBE_PATH', '/api/health/startup')!;
  const GRACEFUL_SHUTDOWN_TIMEOUT = parseNumber(getEnv('GRACEFUL_SHUTDOWN_TIMEOUT'), 10000);
  const GRACEFUL_SHUTDOWN_SIGNALS = parseArray(getEnv('GRACEFUL_SHUTDOWN_SIGNALS'), ['SIGTERM', 'SIGINT']);

  // Feature flags
  const FEATURE_LINE_API_PROXY = parseBoolean(getEnv('FEATURE_LINE_API_PROXY'), true);
  const FEATURE_WEBHOOK_SUPPORT = parseBoolean(getEnv('FEATURE_WEBHOOK_SUPPORT'), true);
  const FEATURE_HEALTH_CHECKS = parseBoolean(getEnv('FEATURE_HEALTH_CHECKS'), true);
  const FEATURE_METRICS_COLLECTION = parseBoolean(getEnv('FEATURE_METRICS_COLLECTION'), true);
  const FEATURE_CIRCUIT_BREAKER = parseBoolean(getEnv('FEATURE_CIRCUIT_BREAKER'), true);
  const FEATURE_REQUEST_CACHING = parseBoolean(getEnv('FEATURE_REQUEST_CACHING'), false);
  const FEATURE_BATCH_PROCESSING = parseBoolean(getEnv('FEATURE_BATCH_PROCESSING'), false);
  const FEATURE_ASYNC_PROCESSING = parseBoolean(getEnv('FEATURE_ASYNC_PROCESSING'), false);
  const FEATURE_DEBUG_MODE = parseBoolean(getEnv('FEATURE_DEBUG_MODE'), NODE_ENV === 'development');
  const FEATURE_MOCK_RESPONSES = parseBoolean(getEnv('FEATURE_MOCK_RESPONSES'), NODE_ENV === 'test');
  const FEATURE_REQUEST_LOGGING = parseBoolean(getEnv('FEATURE_REQUEST_LOGGING'), true);
  const FEATURE_PERFORMANCE_PROFILING = parseBoolean(getEnv('FEATURE_PERFORMANCE_PROFILING'), false);
  const FEATURE_EXPERIMENTAL_ENDPOINTS = parseBoolean(getEnv('FEATURE_EXPERIMENTAL_ENDPOINTS'), false);
  const FEATURE_BETA_FEATURES = parseBoolean(getEnv('FEATURE_BETA_FEATURES'), NODE_ENV !== 'production');

  // Application metadata
  const APP_NAME = getEnv('APP_NAME', 'LINE Proxy Server')!;
  const APP_VERSION = getEnv('APP_VERSION', '1.0.0')!;
  const APP_DESCRIPTION = getEnv('APP_DESCRIPTION', 'LINE API Proxy Server for Chrome Extension')!;
  const BUILD_DATE = getEnv('BUILD_DATE', new Date().toISOString())!;
  const BUILD_COMMIT = getEnv('BUILD_COMMIT', 'unknown')!;

  return {
    // Environment
    NODE_ENV,
    PORT,
    HOST,
    LOG_LEVEL,

    // CORS
    CORS_ORIGINS,
    CORS_CREDENTIALS,

    // Rate limiting
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_STRICT_MAX,
    RATE_LIMIT_MESSAGE_MAX,

    // Security
    HELMET_ENABLED,
    COMPRESSION_ENABLED,
    TRUST_PROXY,

    // Request
    MAX_REQUEST_SIZE,
    REQUEST_TIMEOUT,

    // LINE API
    LINE_API_BASE_URL,
    LINE_API_TIMEOUT,
    LINE_API_RETRY_ATTEMPTS,
    LINE_API_RETRY_DELAY,
    LINE_WEBHOOK_PATH,
    LINE_WEBHOOK_VERIFY_SIGNATURE,
    LINE_CHANNEL_ACCESS_TOKEN,
    LINE_CHANNEL_SECRET,
    LINE_CHANNEL_ID,
    LINE_TEST_USER_ID,

    // Discord API Config
    DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID,

    // Circuit breaker
    CIRCUIT_BREAKER_ENABLED,
    CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
    CIRCUIT_BREAKER_TIMEOUT,
    CIRCUIT_BREAKER_RESET_TIMEOUT,
    CIRCUIT_BREAKER_MONITOR_TIMEOUT,
    CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE,
    CIRCUIT_BREAKER_VOLUME_THRESHOLD,
    CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT,
    CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS,

    // Health check
    HEALTH_CHECK_ENABLED,
    HEALTH_CHECK_INTERVAL,
    HEALTH_CHECK_TIMEOUT,
    HEALTH_CHECK_RETRIES,
    HEALTH_CHECK_MEMORY_THRESHOLD,
    HEALTH_CHECK_CPU_THRESHOLD,
    HEALTH_CHECK_DISK_THRESHOLD,
    HEALTH_CHECK_DEPENDENCIES,

    // Logging
    LOG_FORMAT,
    LOG_FILE_ENABLED,
    LOG_FILE_PATH,
    LOG_FILE_MAX_SIZE,
    LOG_FILE_MAX_FILES,
    LOG_CONSOLE_ENABLED,
    LOG_REQUEST_ENABLED,
    LOG_ERROR_STACK,
    LOG_SENSITIVE_DATA,

    // Monitoring
    METRICS_ENABLED,
    METRICS_PATH,
    METRICS_COLLECTION_INTERVAL,
    PERFORMANCE_MONITORING_ENABLED,
    PERFORMANCE_SLOW_REQUEST_THRESHOLD,
    ERROR_TRACKING_ENABLED,
    ERROR_TRACKING_SAMPLE_RATE,
    CUSTOM_METRICS_ENABLED,

    // Cache
    CACHE_ENABLED,
    CACHE_TYPE,
    CACHE_TTL,
    CACHE_MAX_SIZE,

    // Database
    DATABASE_ENABLED,
    DATABASE_TYPE,
    DATABASE_URL,

    // Security
    AUTH_ENABLED,
    AUTH_TOKEN_VALIDATION,
    AUTH_REQUIRE_HTTPS,
    RATE_LIMITING_ENABLED,
    RATE_LIMITING_STORE,
    RATE_LIMITING_SKIP_FAILED_REQUESTS,
    RATE_LIMITING_SKIP_SUCCESSFUL_REQUESTS,
    CORS_ENABLED,
    CORS_MAX_AGE,
    SECURITY_HEADERS_ENABLED,
    CONTENT_SECURITY_POLICY_ENABLED,
    INPUT_VALIDATION_ENABLED,
    REQUEST_SIZE_LIMIT,
    WEBHOOK_SIGNATURE_VALIDATION,
    WEBHOOK_IP_WHITELIST,

    // Deployment
    CONTAINER_NAME,
    CONTAINER_VERSION,
    RAILWAY_PROJECT_ID,
    RAILWAY_ENVIRONMENT,
    RAILWAY_DEPLOYMENT_ID,
    RAILWAY_SERVICE_ID,
    READINESS_PROBE_PATH,
    LIVENESS_PROBE_PATH,
    STARTUP_PROBE_PATH,
    GRACEFUL_SHUTDOWN_TIMEOUT,
    GRACEFUL_SHUTDOWN_SIGNALS,

    // Feature flags
    FEATURE_LINE_API_PROXY,
    FEATURE_WEBHOOK_SUPPORT,
    FEATURE_HEALTH_CHECKS,
    FEATURE_METRICS_COLLECTION,
    FEATURE_CIRCUIT_BREAKER,
    FEATURE_REQUEST_CACHING,
    FEATURE_BATCH_PROCESSING,
    FEATURE_ASYNC_PROCESSING,
    FEATURE_DEBUG_MODE,
    FEATURE_MOCK_RESPONSES,
    FEATURE_REQUEST_LOGGING,
    FEATURE_PERFORMANCE_PROFILING,
    FEATURE_EXPERIMENTAL_ENDPOINTS,
    FEATURE_BETA_FEATURES,

    // Application metadata
    APP_NAME,
    APP_VERSION,
    APP_DESCRIPTION,
    BUILD_DATE,
    BUILD_COMMIT,
  };
};

// Export the loaded configuration
export const config = loadConfig();

// Export helper functions for configuration management
export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';
export const isStaging = () => config.NODE_ENV === 'staging';

// Validate required configuration
export const validateConfig = (): void => {
  const requiredFields = [
    'NODE_ENV',
    'PORT',
    'HOST',
    'LOG_LEVEL',
    'LINE_API_BASE_URL',
  ];

  const missingFields = requiredFields.filter(field => {
    const value = (config as any)[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
  }

  // Validate port number (allow 0 for test environment)
  if (config.NODE_ENV !== 'test' && (config.PORT < 1 || config.PORT > 65535)) {
    throw new Error('PORT must be between 1 and 65535');
  }
  if (config.NODE_ENV === 'test' && (config.PORT < 0 || config.PORT > 65535)) {
    throw new Error('PORT must be between 0 and 65535 in test environment');
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
  if (!validLogLevels.includes(config.LOG_LEVEL)) {
    throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate environment
  const validEnvironments = ['development', 'production', 'test', 'staging'];
  if (!validEnvironments.includes(config.NODE_ENV)) {
    throw new Error(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }
};

// Log configuration on startup
export const logConfig = (): void => {
  console.log('🔧 Configuration loaded:', {
    environment: config.NODE_ENV,
    port: config.PORT,
    host: config.HOST,
    logLevel: config.LOG_LEVEL,
    lineApiBaseUrl: config.LINE_API_BASE_URL,
    corsEnabled: config.CORS_ENABLED,
    rateLimitingEnabled: config.RATE_LIMITING_ENABLED,
    circuitBreakerEnabled: config.CIRCUIT_BREAKER_ENABLED,
    healthCheckEnabled: config.HEALTH_CHECK_ENABLED,
    metricsEnabled: config.METRICS_ENABLED,
    featureFlags: {
      lineApiProxy: config.FEATURE_LINE_API_PROXY,
      webhookSupport: config.FEATURE_WEBHOOK_SUPPORT,
      debugMode: config.FEATURE_DEBUG_MODE,
    },
    discordBotToken: config.DISCORD_BOT_TOKEN ? '********' : 'Not Set',
    discordClientId: config.DISCORD_CLIENT_ID || 'Not Set',
    lineChannelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN ? '********' : 'Not Set',
    lineChannelSecret: config.LINE_CHANNEL_SECRET ? '********' : 'Not Set',
    lineTestUserId: (config as any).LINE_TEST_USER_ID || 'Not Set',
    webhookSignatureValidation: config.WEBHOOK_SIGNATURE_VALIDATION,
  });
};

// Run validation on load
validateConfig();