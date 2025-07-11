// Generic API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  timestamp: string;
}

export interface ApiErrorResponse {
  type: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  path?: string;
  method?: string;
  requestId?: string;
}

// Custom API Error Class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorType: string = 'API_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Request/Response Types
export interface PaginatedRequest {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
  dependencies?: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      error?: string;
      lastCheck: string;
    };
  };
  metrics?: {
    [key: string]: any;
  };
}

export interface MetricsResponse {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    usage: number;
    total: number;
    free: number;
    percentage: number;
  };
  uptime: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  errors: {
    total: number;
    rate: number;
    lastError?: {
      message: string;
      timestamp: string;
    };
  };
}

// Request validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Authentication types
export interface AuthRequest {
  authorization?: string;
  channelId?: string;
  channelSecret?: string;
}

export interface AuthResult {
  isAuthenticated: boolean;
  userId?: string;
  channelId?: string;
  scopes?: string[];
  expiresAt?: Date;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface RateLimitResponse extends ApiErrorResponse {
  rateLimit: RateLimitInfo;
}

// Circuit breaker types
export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  nextAttempt?: Date;
  lastFailureTime?: Date;
  stats: {
    requests: number;
    failures: number;
    successes: number;
    timeouts: number;
    rejects: number;
  };
}

// Webhook types
export interface WebhookEventRecord {
  id: string;
  eventType: string;
  source: string;
  destination: string;
  payload: any;
  signature: string;
  processed: boolean;
  processingTime?: number;
  error?: string;
  timestamp: Date;
  retryCount: number;
  nextRetry?: Date;
}

export interface WebhookProcessingResult {
  eventId: string;
  processed: boolean;
  processingTime: number;
  error?: string;
  timestamp: Date;
}

export interface WebhookStatistics {
  period: string;
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  eventTypes: {
    [eventType: string]: number;
  };
  errorRates: {
    [hour: string]: number;
  };
}

// Logging types
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  context?: {
    [key: string]: any;
  };
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  stack?: string;
}

// Configuration types
export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  circuitBreakerTimeout: number;
  circuitBreakerThreshold: number;
  lineApiTimeout: number;
  webhookSecret: string;
}

// File upload types
export interface FileUploadRequest {
  file: Express.Multer.File;
  metadata?: {
    description?: string;
    tags?: string[];
    visibility?: 'public' | 'private';
  };
}

export interface FileUploadResponse {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  expiresAt?: Date;
}

// Search and filter types
export interface SearchRequest extends PaginatedRequest {
  query?: string;
  filters?: {
    [key: string]: any;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

// Cache types
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheStats {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  memoryUsage: number;
}

// Monitoring types
export interface PerformanceMetrics {
  requestDuration: number;
  dbQueryDuration?: number;
  externalApiDuration?: number;
  cacheHit?: boolean;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  value: number;
  duration: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Alert {
  id: string;
  threshold: AlertThreshold;
  triggered: boolean;
  triggeredAt?: Date;
  resolvedAt?: Date;
  message: string;
  currentValue: number;
}

// Batch processing types
export interface BatchRequest<T> {
  items: T[];
  options?: {
    continueOnError?: boolean;
    maxConcurrency?: number;
    timeout?: number;
  };
}

export interface BatchResponse<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  totalProcessed: number;
  processingTime: number;
}

// Export utility types
export type RequireOnly<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Common HTTP status codes
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// Common error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}