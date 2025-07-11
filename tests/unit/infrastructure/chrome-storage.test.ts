// Chrome Storage Repository unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChromeStorageRepository } from '../../../chrome-extension/src/services/infrastructure/chrome-storage.repository';

// Chrome API モック
const mockChromeStorage = {
  local: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
};

global.chrome = {
  storage: mockChromeStorage,
} as any;

describe('ChromeStorageRepository', () => {
  let repository: ChromeStorageRepository;

  beforeEach(() => {
    repository = new ChromeStorageRepository();
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save data to chrome.storage.local', async () => {
      const key = 'test-key';
      const data = { value: 'test-data' };

      mockChromeStorage.local.set.mockResolvedValue(undefined);

      await repository.save(key, data);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ [key]: data });
    });

    it('should throw error when save fails', async () => {
      const key = 'test-key';
      const data = { value: 'test-data' };

      mockChromeStorage.local.set.mockRejectedValue(new Error('Storage error'));

      await expect(repository.save(key, data)).rejects.toThrow('Failed to save data for key "test-key"');
    });

    it('should handle complex data types', async () => {
      const key = 'complex-key';
      const data = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date(),
      };

      mockChromeStorage.local.set.mockResolvedValue(undefined);

      await repository.save(key, data);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ [key]: data });
    });
  });

  describe('get', () => {
    it('should get data from chrome.storage.local', async () => {
      const key = 'test-key';
      const data = { value: 'test-data' };

      mockChromeStorage.local.get.mockResolvedValue({ [key]: data });

      const result = await repository.get(key);

      expect(result).toEqual(data);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith([key]);
    });

    it('should return null when key does not exist', async () => {
      const key = 'nonexistent-key';

      mockChromeStorage.local.get.mockResolvedValue({});

      const result = await repository.get(key);

      expect(result).toBeNull();
    });

    it('should throw error when get fails', async () => {
      const key = 'test-key';

      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(repository.get(key)).rejects.toThrow('Failed to get data for key "test-key"');
    });

    it('should handle typed data correctly', async () => {
      const key = 'typed-key';
      const data = { id: 1, name: 'test' };

      mockChromeStorage.local.get.mockResolvedValue({ [key]: data });

      const result = await repository.get<{ id: number; name: string }>(key);

      expect(result).toEqual(data);
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('test');
    });
  });

  describe('remove', () => {
    it('should remove data from chrome.storage.local', async () => {
      const key = 'test-key';

      mockChromeStorage.local.remove.mockResolvedValue(undefined);

      await repository.remove(key);

      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith([key]);
    });

    it('should throw error when remove fails', async () => {
      const key = 'test-key';

      mockChromeStorage.local.remove.mockRejectedValue(new Error('Storage error'));

      await expect(repository.remove(key)).rejects.toThrow('Failed to remove data for key "test-key"');
    });
  });

  describe('getAll', () => {
    it('should get all data from chrome.storage.local', async () => {
      const allData = {
        key1: 'value1',
        key2: { nested: 'value2' },
        key3: [1, 2, 3],
      };

      mockChromeStorage.local.get.mockResolvedValue(allData);

      const result = await repository.getAll();

      expect(result).toEqual(allData);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(null);
    });

    it('should return empty object when no data exists', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});

      const result = await repository.getAll();

      expect(result).toEqual({});
    });

    it('should throw error when getAll fails', async () => {
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(repository.getAll()).rejects.toThrow('Failed to get all data');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      const key = 'existing-key';

      mockChromeStorage.local.get.mockResolvedValue({ [key]: 'some-value' });

      const result = await repository.exists(key);

      expect(result).toBe(true);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith([key]);
    });

    it('should return false when key does not exist', async () => {
      const key = 'nonexistent-key';

      mockChromeStorage.local.get.mockResolvedValue({});

      const result = await repository.exists(key);

      expect(result).toBe(false);
    });

    it('should return true when key exists with null value', async () => {
      const key = 'null-key';

      mockChromeStorage.local.get.mockResolvedValue({ [key]: null });

      const result = await repository.exists(key);

      expect(result).toBe(true);
    });

    it('should throw error when exists check fails', async () => {
      const key = 'test-key';

      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(repository.exists(key)).rejects.toThrow('Failed to check existence for key "test-key"');
    });
  });

  describe('integration scenarios', () => {
    it('should handle save -> get -> remove workflow', async () => {
      const key = 'workflow-key';
      const data = { test: 'workflow' };

      // Save
      mockChromeStorage.local.set.mockResolvedValue(undefined);
      await repository.save(key, data);

      // Get
      mockChromeStorage.local.get.mockResolvedValue({ [key]: data });
      const retrieved = await repository.get(key);
      expect(retrieved).toEqual(data);

      // Remove
      mockChromeStorage.local.remove.mockResolvedValue(undefined);
      await repository.remove(key);

      // Verify removed
      mockChromeStorage.local.get.mockResolvedValue({});
      const afterRemove = await repository.get(key);
      expect(afterRemove).toBeNull();
    });

    it('should handle multiple keys simultaneously', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const data = { value: 'test' };

      mockChromeStorage.local.set.mockResolvedValue(undefined);

      // Save multiple keys
      await Promise.all(keys.map(key => repository.save(key, data)));

      expect(mockChromeStorage.local.set).toHaveBeenCalledTimes(3);
      keys.forEach(key => {
        expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ [key]: data });
      });
    });
  });
});