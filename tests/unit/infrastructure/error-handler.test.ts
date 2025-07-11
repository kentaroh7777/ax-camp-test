// Error Handler Service unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlerService, ErrorLog } from '../../../chrome-extension/src/services/infrastructure/error-handler.service';
import { IChromeStorageRepository } from '../../../chrome-extension/src/types/infrastructure/storage.types';

// Note: crypto.randomUUID mock is set per test as needed to avoid conflicts

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Store original console
const originalConsole = global.console;

// Mock console
Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
});

describe('ErrorHandlerService', () => {
  let errorHandler: ErrorHandlerService;
  let mockStorageRepository: IChromeStorageRepository;

  beforeEach(() => {
    mockStorageRepository = {
      save: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      getAll: vi.fn(),
      exists: vi.fn(),
    };

    errorHandler = new ErrorHandlerService(mockStorageRepository);
    vi.clearAllMocks();
    
    // Reset console mocks
    mockConsole.error.mockClear();
    mockConsole.warn.mockClear();
    mockConsole.info.mockClear();
    
    // Note: crypto.randomUUID mock is set per test to avoid conflicts
  });

  describe('logError', () => {
    it('should log error with all required fields', async () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const context = { userId: '123', action: 'test' };

      mockStorageRepository.get = vi.fn().mockResolvedValue([]);

      await errorHandler.logError(error, context);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'Test error',
            stack: 'Error stack trace',
            context,
            id: expect.any(String),
            timestamp: expect.any(Date),
          }),
        ])
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error logged:',
        expect.objectContaining({
          level: 'error',
          message: 'Test error',
        })
      );
    });

    it('should log error without context', async () => {
      const error = new Error('Test error without context');

      mockStorageRepository.get = vi.fn().mockResolvedValue([]);

      await errorHandler.logError(error);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'Test error without context',
            context: undefined,
          }),
        ])
      );
    });

    it('should append to existing logs', async () => {
      const existingLogs: ErrorLog[] = [
        {
          id: 'existing-1',
          timestamp: new Date(),
          level: 'warning',
          message: 'Existing warning',
        },
      ];

      const error = new Error('New error');

      mockStorageRepository.get = vi.fn().mockResolvedValue(existingLogs);

      await errorHandler.logError(error);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          existingLogs[0],
          expect.objectContaining({
            level: 'error',
            message: 'New error',
          }),
        ])
      );
    });

    it('should handle null existing logs', async () => {
      const error = new Error('Test error');

      mockStorageRepository.get = vi.fn().mockResolvedValue(null);

      await errorHandler.logError(error);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'Test error',
          }),
        ])
      );
    });
  });

  describe('logWarning', () => {
    it('should log warning with all required fields', async () => {
      const message = 'Test warning';
      const context = { component: 'auth' };

      mockStorageRepository.get = vi.fn().mockResolvedValue([]);

      await errorHandler.logWarning(message, context);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            message: 'Test warning',
            context,
            id: expect.any(String),
            timestamp: expect.any(Date),
          }),
        ])
      );

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Warning logged:',
        expect.objectContaining({
          level: 'warning',
          message: 'Test warning',
        })
      );
    });

    it('should log warning without context', async () => {
      const message = 'Test warning without context';

      mockStorageRepository.get = vi.fn().mockResolvedValue([]);

      await errorHandler.logWarning(message);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            message: 'Test warning without context',
            context: undefined,
          }),
        ])
      );
    });
  });

  describe('logInfo', () => {
    it('should log info with all required fields', async () => {
      const message = 'Test info';
      const context = { operation: 'sync' };

      mockStorageRepository.get = vi.fn().mockResolvedValue([]);

      await errorHandler.logInfo(message, context);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Test info',
            context,
            id: expect.any(String),
            timestamp: expect.any(Date),
          }),
        ])
      );

      expect(mockConsole.info).toHaveBeenCalledWith(
        'Info logged:',
        expect.objectContaining({
          level: 'info',
          message: 'Test info',
        })
      );
    });

    it('should log info without context', async () => {
      const message = 'Test info without context';

      mockStorageRepository.get = vi.fn().mockResolvedValue([]);

      await errorHandler.logInfo(message);

      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Test info without context',
            context: undefined,
          }),
        ])
      );
    });
  });

  describe('getErrorLogs', () => {
    it('should return logs with default limit', async () => {
      const logs: ErrorLog[] = Array.from({ length: 150 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(),
        level: 'error',
        message: `Error ${i}`,
      }));

      mockStorageRepository.get = vi.fn().mockResolvedValue(logs);

      const result = await errorHandler.getErrorLogs();

      expect(result).toHaveLength(100);
      expect(result[0]).toEqual(logs[50]); // Last 100 logs
    });

    it('should return logs with custom limit', async () => {
      const logs: ErrorLog[] = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(),
        level: 'info',
        message: `Info ${i}`,
      }));

      mockStorageRepository.get = vi.fn().mockResolvedValue(logs);

      const result = await errorHandler.getErrorLogs(10);

      expect(result).toHaveLength(10);
      expect(result[0]).toEqual(logs[40]); // Last 10 logs
    });

    it('should return all logs when count is less than limit', async () => {
      const logs: ErrorLog[] = [
        {
          id: 'log-1',
          timestamp: new Date(),
          level: 'error',
          message: 'Error 1',
        },
        {
          id: 'log-2',
          timestamp: new Date(),
          level: 'warning',
          message: 'Warning 1',
        },
      ];

      mockStorageRepository.get = vi.fn().mockResolvedValue(logs);

      const result = await errorHandler.getErrorLogs(10);

      expect(result).toHaveLength(2);
      expect(result).toEqual(logs);
    });

    it('should return empty array when no logs exist', async () => {
      mockStorageRepository.get = vi.fn().mockResolvedValue(null);

      const result = await errorHandler.getErrorLogs();

      expect(result).toEqual([]);
    });
  });

  describe('clearErrorLogs', () => {
    it('should clear all error logs', async () => {
      await errorHandler.clearErrorLogs();

      expect(mockStorageRepository.remove).toHaveBeenCalledWith('error_log');
    });
  });

  describe('log size management', () => {
    it('should limit log entries to max size', async () => {
      // Create 1005 existing logs (over the 1000 limit)
      const existingLogs: ErrorLog[] = Array.from({ length: 1005 }, (_, i) => ({
        id: `existing-${i}`,
        timestamp: new Date(),
        level: 'info',
        message: `Existing log ${i}`,
      }));

      mockStorageRepository.get = vi.fn().mockResolvedValue(existingLogs);

      const error = new Error('New error');
      await errorHandler.logError(error);

      // Should save only 1000 logs (999 existing + 1 new)
      expect(mockStorageRepository.save).toHaveBeenCalledWith(
        'error_log',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'New error',
          }),
        ])
      );

      const savedLogs = (mockStorageRepository.save as any).mock.calls[0][1];
      expect(savedLogs).toHaveLength(1000);
    });

    it('should maintain chronological order when trimming', async () => {
      // Create logs at the limit
      const existingLogs: ErrorLog[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `existing-${i}`,
        timestamp: new Date(Date.now() - (1000 - i) * 1000),
        level: 'info',
        message: `Existing log ${i}`,
      }));

      mockStorageRepository.get = vi.fn().mockResolvedValue(existingLogs);

      const error = new Error('Newest error');
      await errorHandler.logError(error);

      const savedLogs = (mockStorageRepository.save as any).mock.calls[0][1];
      expect(savedLogs).toHaveLength(1000);
      expect(savedLogs[0].message).toBe('Existing log 1'); // First old log removed
      expect(savedLogs[999].message).toBe('Newest error'); // New log at the end
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs', async () => {
      // Clear any existing mock and create fresh one
      if (vi.isMockFunction(crypto.randomUUID)) {
        (crypto.randomUUID as any).mockRestore();
      }
      
      let callCount = 0;
      const uniqueMock = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
        callCount++;
        const id = `12345678-1234-5678-9012-${String(callCount).padStart(12, '0')}`;
        return id as `${string}-${string}-${string}-${string}-${string}`;
      });
      
      // Create realistic storage simulation
      let storedLogs: any[] = [];
      mockStorageRepository.get = vi.fn().mockImplementation(async (key: string) => {
        return storedLogs.slice(); // Return copy of current logs
      });
      
      mockStorageRepository.save = vi.fn().mockImplementation(async (key: string, data: any[]) => {
        storedLogs = data.slice(); // Update stored logs
      });
      
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await errorHandler.logError(error1);
      await errorHandler.logError(error2);

      const call1 = (mockStorageRepository.save as any).mock.calls[0][1];
      const call2 = (mockStorageRepository.save as any).mock.calls[1][1];

      expect(call1[0].id).not.toBe(call2[1].id);
      expect(call1[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(call2[1].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      
      // Verify actual different values
      expect(call1[0].id).toBe('12345678-1234-5678-9012-000000000001');
      expect(call2[1].id).toBe('12345678-1234-5678-9012-000000000002'); // call2[1] because logs accumulate
      
      uniqueMock.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      const error = new Error('Test error');
      
      mockStorageRepository.get = vi.fn().mockRejectedValue(new Error('Storage error'));
      
      // Should not throw, but might log to console
      await expect(errorHandler.logError(error)).rejects.toThrow('Storage error');
    });

    it('should handle save errors gracefully', async () => {
      const error = new Error('Test error');
      
      mockStorageRepository.get = vi.fn().mockResolvedValue([]);
      mockStorageRepository.save = vi.fn().mockRejectedValue(new Error('Save error'));
      
      await expect(errorHandler.logError(error)).rejects.toThrow('Save error');
    });
  });
});