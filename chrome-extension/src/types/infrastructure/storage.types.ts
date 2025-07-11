// Storage repository type definitions
// Based on design document Line 661-677

// Chrome storage repository interface
export interface IChromeStorageRepository {
  // Save data
  save<T>(key: string, data: T): Promise<void>;
  
  // Get data
  get<T>(key: string): Promise<T | null>;
  
  // Delete data
  remove(key: string): Promise<void>;
  
  // Get all data
  getAll(): Promise<Record<string, any>>;
  
  // Check if data exists
  exists(key: string): Promise<boolean>;
}

// Storage keys constants
export const STORAGE_KEYS = {
  // Authentication related
  AUTH_TOKENS: 'auth_tokens',
  AUTH_STATE: 'auth_state',
  
  // User data
  USER_MAPPINGS: 'user_mappings',
  MESSAGE_HISTORY: 'message_history',
  
  // Application settings
  APP_SETTINGS: 'app_settings',
  UI_STATE: 'ui_state',
  
  // Statistics and logs
  USAGE_STATS: 'usage_stats',
  ERROR_LOG: 'error_log',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];