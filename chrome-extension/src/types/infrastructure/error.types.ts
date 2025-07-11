// Error handling type definitions

// Re-export ApiError from core API types
export { ApiError } from '../core/api.types';

// Extended error types for infrastructure layer
export interface InfrastructureError extends Error {
  code: string;
  details?: any;
  timestamp: Date;
}

// Storage error types
export interface StorageError extends InfrastructureError {
  key?: string;
  operation: 'save' | 'get' | 'remove' | 'getAll' | 'exists';
}

// Authentication error types
export interface AuthError extends InfrastructureError {
  channel: string;
  authType: 'token' | 'refresh' | 'validate';
}