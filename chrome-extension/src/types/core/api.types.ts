// API related type definitions
// Based on design document Line 570-602

// Error type
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}