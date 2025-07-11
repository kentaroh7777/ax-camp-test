// Background Tasks Manager unit tests
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { BackgroundTasksManager, BackgroundTask } from '../../../chrome-extension/src/services/infrastructure/background-tasks.manager';

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

describe('BackgroundTasksManager', () => {
  let tasksManager: BackgroundTasksManager;
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tasksManager = new BackgroundTasksManager();
    mockExecute = vi.fn();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset console mocks
    mockConsole.error.mockClear();
    mockConsole.warn.mockClear();
    mockConsole.info.mockClear();
  });

  afterEach(() => {
    tasksManager.stopAllTasks();
    vi.useRealTimers();
  });

  afterAll(() => {
    // Restore original console
    Object.defineProperty(global, 'console', {
      value: originalConsole,
      writable: true,
    });
  });

  describe('registerTask', () => {
    it('should register a task', () => {
      const task: BackgroundTask = {
        id: 'test-task',
        name: 'Test Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(1);
      expect(status[0].id).toBe('test-task');
      expect(status[0].name).toBe('Test Task');
      expect(status[0].interval).toBe(1000);
      expect(status[0].isRunning).toBe(false);
    });

    it('should register multiple tasks', () => {
      const task1: BackgroundTask = {
        id: 'task-1',
        name: 'Task 1',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      const task2: BackgroundTask = {
        id: 'task-2',
        name: 'Task 2',
        interval: 2000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task1);
      tasksManager.registerTask(task2);

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(2);
      expect(status.map(t => t.id)).toEqual(['task-1', 'task-2']);
    });

    it('should replace existing task with same ID', () => {
      const task1: BackgroundTask = {
        id: 'same-id',
        name: 'Task 1',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      const task2: BackgroundTask = {
        id: 'same-id',
        name: 'Task 2',
        interval: 2000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task1);
      tasksManager.registerTask(task2);

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(1);
      expect(status[0].name).toBe('Task 2');
      expect(status[0].interval).toBe(2000);
    });
  });

  describe('unregisterTask', () => {
    it('should unregister a task', () => {
      const task: BackgroundTask = {
        id: 'test-task',
        name: 'Test Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.unregisterTask('test-task');

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(0);
    });

    it('should stop running task before unregistering', () => {
      const task: BackgroundTask = {
        id: 'running-task',
        name: 'Running Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('running-task');
      
      let status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(true);

      tasksManager.unregisterTask('running-task');
      
      status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(0);
    });

    it('should handle unregistering non-existent task', () => {
      tasksManager.unregisterTask('non-existent');

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(0);
    });
  });

  describe('startTask', () => {
    it('should start a task', () => {
      const task: BackgroundTask = {
        id: 'test-task',
        name: 'Test Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('test-task');

      const status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(true);
    });

    it('should execute task at specified interval', async () => {
      const task: BackgroundTask = {
        id: 'interval-task',
        name: 'Interval Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('interval-task');

      // Initially not called
      expect(mockExecute).not.toHaveBeenCalled();

      // After 1 second
      vi.advanceTimersByTime(1000);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // After another second
      vi.advanceTimersByTime(1000);
      expect(mockExecute).toHaveBeenCalledTimes(2);

      // After another second
      vi.advanceTimersByTime(1000);
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should not start already running task', async () => {
      const task: BackgroundTask = {
        id: 'running-task',
        name: 'Running Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('running-task');
      tasksManager.startTask('running-task'); // Try to start again

      const status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(true);

      // Should only have one timer
      vi.advanceTimersByTime(1000);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle starting non-existent task', () => {
      tasksManager.startTask('non-existent');

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(0);
    });

    it('should update lastRun after execution', async () => {
      const task: BackgroundTask = {
        id: 'lastrun-task',
        name: 'LastRun Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('lastrun-task');

      const beforeRun = tasksManager.getTaskStatus()[0];
      expect(beforeRun.lastRun).toBeUndefined();

      vi.advanceTimersByTime(1000);

      const afterRun = tasksManager.getTaskStatus()[0];
      expect(afterRun.lastRun).toBeInstanceOf(Date);
    });

    it('should handle task execution errors', async () => {
      const errorExecute = vi.fn().mockRejectedValue(new Error('Task execution error'));
      
      const task: BackgroundTask = {
        id: 'error-task',
        name: 'Error Task',
        interval: 1000,
        isRunning: false,
        execute: errorExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('error-task');

      vi.advanceTimersByTime(1000);

      expect(errorExecute).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Background task "Error Task" failed:',
        expect.any(Error)
      );

      // Task should still be running despite error
      const status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(true);

      // Should continue to execute
      vi.advanceTimersByTime(1000);
      expect(errorExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopTask', () => {
    it('should stop a running task', async () => {
      const task: BackgroundTask = {
        id: 'stop-task',
        name: 'Stop Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('stop-task');

      let status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(true);

      tasksManager.stopTask('stop-task');

      status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(false);

      // Should not execute after stopping
      vi.advanceTimersByTime(1000);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should handle stopping non-existent task', () => {
      tasksManager.stopTask('non-existent');

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(0);
    });

    it('should handle stopping already stopped task', () => {
      const task: BackgroundTask = {
        id: 'stopped-task',
        name: 'Stopped Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.stopTask('stopped-task');

      const status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(false);
    });
  });

  describe('stopAllTasks', () => {
    it('should stop all running tasks', async () => {
      const task1: BackgroundTask = {
        id: 'task-1',
        name: 'Task 1',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      const task2: BackgroundTask = {
        id: 'task-2',
        name: 'Task 2',
        interval: 2000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task1);
      tasksManager.registerTask(task2);
      tasksManager.startTask('task-1');
      tasksManager.startTask('task-2');

      let status = tasksManager.getTaskStatus();
      expect(status.every(t => t.isRunning)).toBe(true);

      tasksManager.stopAllTasks();

      status = tasksManager.getTaskStatus();
      expect(status.every(t => !t.isRunning)).toBe(true);

      // Should not execute after stopping all
      vi.advanceTimersByTime(2000);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should handle stopping all tasks when none are running', () => {
      const task: BackgroundTask = {
        id: 'idle-task',
        name: 'Idle Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.stopAllTasks();

      const status = tasksManager.getTaskStatus();
      expect(status[0].isRunning).toBe(false);
    });

    it('should handle stopping all tasks when no tasks registered', () => {
      tasksManager.stopAllTasks();

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(0);
    });
  });

  describe('getTaskStatus', () => {
    it('should return empty array when no tasks registered', () => {
      const status = tasksManager.getTaskStatus();
      expect(status).toEqual([]);
    });

    it('should return task status without execute function', () => {
      const task: BackgroundTask = {
        id: 'status-task',
        name: 'Status Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);

      const status = tasksManager.getTaskStatus();
      expect(status).toHaveLength(1);
      expect(status[0].id).toBe('status-task');
      expect(status[0].name).toBe('Status Task');
      expect(status[0].interval).toBe(1000);
      expect(status[0].isRunning).toBe(false);
      expect(status[0].execute).toBeUndefined();
    });

    it('should return current status including lastRun', () => {
      const task: BackgroundTask = {
        id: 'status-task',
        name: 'Status Task',
        interval: 1000,
        isRunning: false,
        execute: mockExecute,
      };

      tasksManager.registerTask(task);
      tasksManager.startTask('status-task');

      vi.advanceTimersByTime(1000);

      const status = tasksManager.getTaskStatus();
      expect(status[0].lastRun).toBeInstanceOf(Date);
      expect(status[0].isRunning).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete task lifecycle', async () => {
      const task: BackgroundTask = {
        id: 'lifecycle-task',
        name: 'Lifecycle Task',
        interval: 500,
        isRunning: false,
        execute: mockExecute,
      };

      // Register
      tasksManager.registerTask(task);
      expect(tasksManager.getTaskStatus()).toHaveLength(1);

      // Start
      tasksManager.startTask('lifecycle-task');
      expect(tasksManager.getTaskStatus()[0].isRunning).toBe(true);

      // Execute multiple times
      vi.advanceTimersByTime(1500);
      expect(mockExecute).toHaveBeenCalledTimes(3);

      // Stop
      tasksManager.stopTask('lifecycle-task');
      expect(tasksManager.getTaskStatus()[0].isRunning).toBe(false);

      // Should not execute after stopping
      vi.advanceTimersByTime(1000);
      expect(mockExecute).toHaveBeenCalledTimes(3);

      // Unregister
      tasksManager.unregisterTask('lifecycle-task');
      expect(tasksManager.getTaskStatus()).toHaveLength(0);
    });

    it('should handle multiple tasks with different intervals', async () => {
      const execute1 = vi.fn();
      const execute2 = vi.fn();

      const task1: BackgroundTask = {
        id: 'fast-task',
        name: 'Fast Task',
        interval: 100,
        isRunning: false,
        execute: execute1,
      };

      const task2: BackgroundTask = {
        id: 'slow-task',
        name: 'Slow Task',
        interval: 300,
        isRunning: false,
        execute: execute2,
      };

      tasksManager.registerTask(task1);
      tasksManager.registerTask(task2);
      tasksManager.startTask('fast-task');
      tasksManager.startTask('slow-task');

      // After 300ms
      vi.advanceTimersByTime(300);
      expect(execute1).toHaveBeenCalledTimes(3); // 100ms intervals
      expect(execute2).toHaveBeenCalledTimes(1); // 300ms intervals

      // After another 300ms
      vi.advanceTimersByTime(300);
      expect(execute1).toHaveBeenCalledTimes(6);
      expect(execute2).toHaveBeenCalledTimes(2);
    });

    it('should handle task replacement during execution', async () => {
      const execute1 = vi.fn();
      const execute2 = vi.fn();

      const task1: BackgroundTask = {
        id: 'replace-task',
        name: 'Original Task',
        interval: 1000,
        isRunning: false,
        execute: execute1,
      };

      const task2: BackgroundTask = {
        id: 'replace-task',
        name: 'Replacement Task',
        interval: 500,
        isRunning: false,
        execute: execute2,
      };

      tasksManager.registerTask(task1);
      tasksManager.startTask('replace-task');

      vi.advanceTimersByTime(500);
      expect(execute1).not.toHaveBeenCalled(); // Original task interval is 1000ms

      // Replace the task
      tasksManager.registerTask(task2);
      tasksManager.startTask('replace-task');

      vi.advanceTimersByTime(500);
      expect(execute1).not.toHaveBeenCalled(); // Original task should not execute
      expect(execute2).toHaveBeenCalledTimes(1); // Replacement task should execute
    });
  });
});