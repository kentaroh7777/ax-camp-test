// User mapping service type definitions
// Based on design document Line 619-632

import { Message } from '../core/message.types';
import { UserMapping, UserMappingRequest, ResolvedMessage } from '../core/user.types';

// User mapping service interface
export interface IUserMappingService {
  // Create user mapping
  createMapping(mapping: UserMappingRequest): Promise<UserMapping>;
  
  // Get user mapping
  getMapping(userId: string): Promise<UserMapping | null>;
  
  // Auto resolve user mappings
  resolveUserMappings(messages: Message[]): Promise<ResolvedMessage[]>;
  
  // Get all mappings
  getAllMappings(): Promise<UserMapping[]>;
}