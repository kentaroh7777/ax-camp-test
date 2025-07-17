// Environment configuration types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test' | 'staging';
  PORT: number;
  HOST: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
}

// Server configuration types
export interface ServerConfig extends EnvironmentConfig {
  // CORS configuration
  CORS_ORIGINS: string[];
  CORS_CREDENTIALS: boolean;
  
  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  RATE_LIMIT_STRICT_MAX: number;
  RATE_LIMIT_MESSAGE_MAX: number;
  
  // Security configuration
  HELMET_ENABLED: boolean;
  COMPRESSION_ENABLED: boolean;
  TRUST_PROXY: boolean;
  
  // Request configuration
  MAX_REQUEST_SIZE: string;
  REQUEST_TIMEOUT: number;
}

// LINE API configuration types
export interface LineApiConfig {
  // LINE API endpoints
  LINE_API_BASE_URL: string;
  LINE_API_TIMEOUT: number;
  LINE_API_RETRY_ATTEMPTS: number;
  LINE_API_RETRY_DELAY: number;
  
  // LINE webhook configuration
  LINE_WEBHOOK_PATH: string;
  LINE_WEBHOOK_VERIFY_SIGNATURE: boolean;
  
  // LINE channel configuration (optional for proxy server)
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ID?: string;
  LINE_TEST_USER_ID?: string;
}

// Discord API configuration types
export interface DiscordApiConfig {
  DISCORD_BOT_TOKEN: string;
  DISCORD_CLIENT_ID: string;
}

// Circuit breaker configuration types
export interface CircuitBreakerConfig {
  CIRCUIT_BREAKER_ENABLED: boolean;
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: number;
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: number;
  CIRCUIT_BREAKER_TIMEOUT: number;
  CIRCUIT_BREAKER_RESET_TIMEOUT: number;
  CIRCUIT_BREAKER_MONITOR_TIMEOUT: number;
  CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE: number;
  CIRCUIT_BREAKER_VOLUME_THRESHOLD: number;
  CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT: number;
  CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS: number;
}

// Health check configuration types
export interface HealthCheckConfig {
  HEALTH_CHECK_ENABLED: boolean;
  HEALTH_CHECK_INTERVAL: number;
  HEALTH_CHECK_TIMEOUT: number;
  HEALTH_CHECK_RETRIES: number;
  HEALTH_CHECK_MEMORY_THRESHOLD: number;
  HEALTH_CHECK_CPU_THRESHOLD: number;
  HEALTH_CHECK_DISK_THRESHOLD: number;
  HEALTH_CHECK_DEPENDENCIES: string[];
}

// Logging configuration types
export interface LoggingConfig {
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  LOG_FORMAT: 'json' | 'simple' | 'combined';
  LOG_FILE_ENABLED: boolean;
  LOG_FILE_PATH: string;
  LOG_FILE_MAX_SIZE: string;
  LOG_FILE_MAX_FILES: number;
  LOG_CONSOLE_ENABLED: boolean;
  LOG_REQUEST_ENABLED: boolean;
  LOG_ERROR_STACK: boolean;
  LOG_SENSITIVE_DATA: boolean;
}

// Monitoring configuration types
export interface MonitoringConfig {
  METRICS_ENABLED: boolean;
  METRICS_PATH: string;
  METRICS_COLLECTION_INTERVAL: number;
  
  // Performance monitoring
  PERFORMANCE_MONITORING_ENABLED: boolean;
  PERFORMANCE_SLOW_REQUEST_THRESHOLD: number;
  
  // Error tracking
  ERROR_TRACKING_ENABLED: boolean;
  ERROR_TRACKING_SAMPLE_RATE: number;
  
  // Custom metrics
  CUSTOM_METRICS_ENABLED: boolean;
}

// Cache configuration types
export interface CacheConfig {
  CACHE_ENABLED: boolean;
  CACHE_TYPE: 'memory' | 'redis' | 'memcached';
  CACHE_TTL: number;
  CACHE_MAX_SIZE: number;
  
  // Redis configuration (if using Redis)
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
  REDIS_CONNECTION_TIMEOUT?: number;
  REDIS_COMMAND_TIMEOUT?: number;
}

// Database configuration types (for future use)
export interface DatabaseConfig {
  DATABASE_ENABLED: boolean;
  DATABASE_TYPE: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  DATABASE_URL?: string;
  DATABASE_HOST?: string;
  DATABASE_PORT?: number;
  DATABASE_NAME?: string;
  DATABASE_USERNAME?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_SSL?: boolean;
  DATABASE_POOL_MIN?: number;
  DATABASE_POOL_MAX?: number;
  DATABASE_CONNECTION_TIMEOUT?: number;
  DATABASE_QUERY_TIMEOUT?: number;
}

// Security configuration types
export interface SecurityConfig {
  // Authentication
  AUTH_ENABLED: boolean;
  AUTH_TOKEN_VALIDATION: boolean;
  AUTH_REQUIRE_HTTPS: boolean;
  
  // Rate limiting
  RATE_LIMITING_ENABLED: boolean;
  RATE_LIMITING_STORE: 'memory' | 'redis';
  RATE_LIMITING_SKIP_FAILED_REQUESTS: boolean;
  RATE_LIMITING_SKIP_SUCCESSFUL_REQUESTS: boolean;
  
  // CORS
  CORS_ENABLED: boolean;
  CORS_MAX_AGE: number;
  
  // Headers
  SECURITY_HEADERS_ENABLED: boolean;
  CONTENT_SECURITY_POLICY_ENABLED: boolean;
  
  // Input validation
  INPUT_VALIDATION_ENABLED: boolean;
  REQUEST_SIZE_LIMIT: string;
  
  // Webhook security
  WEBHOOK_SIGNATURE_VALIDATION: boolean;
  WEBHOOK_IP_WHITELIST: string[];
}

// Deployment configuration types
export interface DeploymentConfig {
  // Container configuration
  CONTAINER_NAME: string;
  CONTAINER_VERSION: string;
  
  // Railway configuration
  RAILWAY_PROJECT_ID?: string;
  RAILWAY_ENVIRONMENT?: string;
  RAILWAY_DEPLOYMENT_ID?: string;
  RAILWAY_SERVICE_ID?: string;
  
  // Health check endpoints for orchestrators
  READINESS_PROBE_PATH: string;
  LIVENESS_PROBE_PATH: string;
  STARTUP_PROBE_PATH: string;
  
  // Graceful shutdown
  GRACEFUL_SHUTDOWN_TIMEOUT: number;
  GRACEFUL_SHUTDOWN_SIGNALS: string[];
}

// Feature flags configuration types
export interface FeatureFlagsConfig {
  // Core features
  FEATURE_LINE_API_PROXY: boolean;
  FEATURE_WEBHOOK_SUPPORT: boolean;
  FEATURE_HEALTH_CHECKS: boolean;
  FEATURE_METRICS_COLLECTION: boolean;
  
  // Advanced features
  FEATURE_CIRCUIT_BREAKER: boolean;
  FEATURE_REQUEST_CACHING: boolean;
  FEATURE_BATCH_PROCESSING: boolean;
  FEATURE_ASYNC_PROCESSING: boolean;
  
  // Development features
  FEATURE_DEBUG_MODE: boolean;
  FEATURE_MOCK_RESPONSES: boolean;
  FEATURE_REQUEST_LOGGING: boolean;
  FEATURE_PERFORMANCE_PROFILING: boolean;
  
  // Experimental features
  FEATURE_EXPERIMENTAL_ENDPOINTS: boolean;
  FEATURE_BETA_FEATURES: boolean;
}

// Complete application configuration type
export interface AppConfig extends 
  ServerConfig,
  LineApiConfig,
  DiscordApiConfig,
  CircuitBreakerConfig,
  HealthCheckConfig,
  LoggingConfig,
  MonitoringConfig,
  CacheConfig,
  DatabaseConfig,
  SecurityConfig,
  DeploymentConfig,
  FeatureFlagsConfig {
  
  // Application metadata
  APP_NAME: string;
  APP_VERSION: string;
  APP_DESCRIPTION: string;
  BUILD_DATE: string;
  BUILD_COMMIT: string;
  
  // Custom configuration
  CUSTOM_CONFIG?: {
    [key: string]: any;
  };
}

// Configuration validation types
export interface ConfigValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
  description?: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: Array<{
    key: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    key: string;
    message: string;
    value?: any;
  }>;
  config: Partial<AppConfig>;
}

// Configuration loading types
export interface ConfigLoader {
  load(): Promise<AppConfig>;
  validate(config: Partial<AppConfig>): ConfigValidationResult;
  getDefault(): AppConfig;
  merge(configs: Partial<AppConfig>[]): AppConfig;
}

// Environment-specific configuration types
export interface DevelopmentConfig extends Partial<AppConfig> {
  NODE_ENV: 'development';
  LOG_LEVEL: 'debug';
  FEATURE_DEBUG_MODE: true;
  FEATURE_REQUEST_LOGGING: true;
}

export interface ProductionConfig extends Partial<AppConfig> {
  NODE_ENV: 'production';
  LOG_LEVEL: 'info';
  FEATURE_DEBUG_MODE: false;
  FEATURE_REQUEST_LOGGING: false;
  AUTH_REQUIRE_HTTPS: true;
  SECURITY_HEADERS_ENABLED: true;
}

export interface TestConfig extends Partial<AppConfig> {
  NODE_ENV: 'test';
  LOG_LEVEL: 'error';
  FEATURE_MOCK_RESPONSES: true;
  DATABASE_ENABLED: false;
  CACHE_ENABLED: false;
}

export interface StagingConfig extends Partial<AppConfig> {
  NODE_ENV: 'staging';
  LOG_LEVEL: 'info';
  FEATURE_BETA_FEATURES: true;
  FEATURE_EXPERIMENTAL_ENDPOINTS: true;
}

// Configuration constants
export const DEFAULT_CONFIG_VALUES: AppConfig = {
  // Application metadata
  APP_NAME: 'Channel Proxy Server',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Proxy server for various communication channels.',
  BUILD_DATE: new Date().toISOString(),
  BUILD_COMMIT: 'unknown',

  // ServerConfig
  NODE_ENV: 'development',
  PORT: 3000,
  HOST: '0.0.0.0',
  CORS_ORIGINS: ['*'],
  CORS_CREDENTIALS: true,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: 1000,
  RATE_LIMIT_STRICT_MAX: 100,
  RATE_LIMIT_MESSAGE_MAX: 50,
  HELMET_ENABLED: true,
  COMPRESSION_ENABLED: true,
  TRUST_PROXY: true,
  MAX_REQUEST_SIZE: '10mb',
  REQUEST_TIMEOUT: 30000,

  // LineApiConfig
  LINE_API_BASE_URL: 'https://api.line.me/v2/bot',
  LINE_API_TIMEOUT: 30000,
  LINE_API_RETRY_ATTEMPTS: 3,
  LINE_API_RETRY_DELAY: 1000,
  LINE_WEBHOOK_PATH: '/api/webhook',
  LINE_WEBHOOK_VERIFY_SIGNATURE: true,
  LINE_CHANNEL_ACCESS_TOKEN: '',
  LINE_CHANNEL_SECRET: '',
  LINE_CHANNEL_ID: '',
  LINE_TEST_USER_ID: '',

  // DiscordApiConfig
  DISCORD_BOT_TOKEN: '',
  DISCORD_CLIENT_ID: '',

  // CircuitBreakerConfig
  CIRCUIT_BREAKER_ENABLED: true,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: 2,
  CIRCUIT_BREAKER_TIMEOUT: 10000,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 30000,
  CIRCUIT_BREAKER_MONITOR_TIMEOUT: 5000,
  CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE: 50,
  CIRCUIT_BREAKER_VOLUME_THRESHOLD: 10,
  CIRCUIT_BREAKER_ROLLING_COUNT_TIMEOUT: 10000,
  CIRCUIT_BREAKER_ROLLING_COUNT_BUCKETS: 10,

  // HealthCheckConfig
  HEALTH_CHECK_ENABLED: true,
  HEALTH_CHECK_INTERVAL: 30000,
  HEALTH_CHECK_TIMEOUT: 5000,
  HEALTH_CHECK_RETRIES: 3,
  HEALTH_CHECK_MEMORY_THRESHOLD: 0.8,
  HEALTH_CHECK_CPU_THRESHOLD: 0.8,
  HEALTH_CHECK_DISK_THRESHOLD: 0.9,
  HEALTH_CHECK_DEPENDENCIES: ['line'],

  // LoggingConfig
  LOG_LEVEL: 'info',
  LOG_FORMAT: 'simple',
  LOG_FILE_ENABLED: false,
  LOG_FILE_PATH: 'logs/server.log',
  LOG_FILE_MAX_SIZE: '20m',
  LOG_FILE_MAX_FILES: 5,
  LOG_CONSOLE_ENABLED: true,
  LOG_REQUEST_ENABLED: true,
  LOG_ERROR_STACK: true,
  LOG_SENSITIVE_DATA: false,

  // MonitoringConfig
  METRICS_ENABLED: true,
  METRICS_PATH: '/metrics',
  METRICS_COLLECTION_INTERVAL: 30000,
  PERFORMANCE_MONITORING_ENABLED: true,
  PERFORMANCE_SLOW_REQUEST_THRESHOLD: 500,
  ERROR_TRACKING_ENABLED: false,
  ERROR_TRACKING_SAMPLE_RATE: 1.0,
  CUSTOM_METRICS_ENABLED: true,

  // CacheConfig
  CACHE_ENABLED: false,
  CACHE_TYPE: 'memory',
  CACHE_TTL: 60,
  CACHE_MAX_SIZE: 1000,
  
  // DatabaseConfig
  DATABASE_ENABLED: false,
  DATABASE_TYPE: 'sqlite',
  
  // SecurityConfig
  AUTH_ENABLED: true,
  AUTH_TOKEN_VALIDATION: true,
  AUTH_REQUIRE_HTTPS: false,
  RATE_LIMITING_ENABLED: true,
  RATE_LIMITING_STORE: 'memory',
  RATE_LIMITING_SKIP_FAILED_REQUESTS: false,
  RATE_LIMITING_SKIP_SUCCESSFUL_REQUESTS: false,
  CORS_ENABLED: true,
  CORS_MAX_AGE: 86400,
  SECURITY_HEADERS_ENABLED: true,
  CONTENT_SECURITY_POLICY_ENABLED: false,
  INPUT_VALIDATION_ENABLED: true,
  REQUEST_SIZE_LIMIT: '10mb',
  WEBHOOK_SIGNATURE_VALIDATION: true,
  WEBHOOK_IP_WHITELIST: [],

  // DeploymentConfig
  CONTAINER_NAME: 'channel-proxy-server',
  CONTAINER_VERSION: '1.0.0',
  READINESS_PROBE_PATH: '/api/health/ready',
  LIVENESS_PROBE_PATH: '/api/health/live',
  STARTUP_PROBE_PATH: '/api/health/startup',
  GRACEFUL_SHUTDOWN_TIMEOUT: 30000,
  GRACEFUL_SHUTDOWN_SIGNALS: ['SIGINT', 'SIGTERM'],
  
  // FeatureFlagsConfig
  FEATURE_LINE_API_PROXY: true,
  FEATURE_WEBHOOK_SUPPORT: true,
  FEATURE_HEALTH_CHECKS: true,
  FEATURE_METRICS_COLLECTION: true,
  FEATURE_CIRCUIT_BREAKER: true,
  FEATURE_REQUEST_CACHING: false,
  FEATURE_BATCH_PROCESSING: false,
  FEATURE_ASYNC_PROCESSING: false,
  FEATURE_DEBUG_MODE: true,
  FEATURE_MOCK_RESPONSES: false,
  FEATURE_REQUEST_LOGGING: true,
  FEATURE_PERFORMANCE_PROFILING: false,
  FEATURE_EXPERIMENTAL_ENDPOINTS: false,
  FEATURE_BETA_FEATURES: false,
};

// Type guards for configuration
export function isDevelopment(config: AppConfig): config is AppConfig & DevelopmentConfig {
  return config.NODE_ENV === 'development';
}

export function isProduction(config: AppConfig): config is AppConfig & ProductionConfig {
  return config.NODE_ENV === 'production';
}

export function isTest(config: AppConfig): config is AppConfig & TestConfig {
  return config.NODE_ENV === 'test';
}

export function isStaging(config: AppConfig): config is AppConfig & StagingConfig {
  return config.NODE_ENV === 'staging';
}