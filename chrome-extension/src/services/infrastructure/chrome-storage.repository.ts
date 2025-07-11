// Chrome Storage Repository implementation
// Based on design document Line 708-730

import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';

export class ChromeStorageRepository implements IChromeStorageRepository {
  /**
   * データ保存
   * @param key - ストレージキー
   * @param data - 保存するデータ
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      throw new Error(`Failed to save data for key "${key}": ${error}`);
    }
  }

  /**
   * データ取得
   * @param key - ストレージキー
   * @returns 取得されたデータまたはnull
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      throw new Error(`Failed to get data for key "${key}": ${error}`);
    }
  }

  /**
   * データ削除
   * @param key - ストレージキー
   */
  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([key]);
    } catch (error) {
      throw new Error(`Failed to remove data for key "${key}": ${error}`);
    }
  }

  /**
   * 全データ取得
   * @returns 全ストレージデータ
   */
  async getAll(): Promise<Record<string, any>> {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      throw new Error(`Failed to get all data: ${error}`);
    }
  }

  /**
   * データ存在確認
   * @param key - ストレージキー
   * @returns データが存在するかどうか
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get([key]);
      return key in result;
    } catch (error) {
      throw new Error(`Failed to check existence for key "${key}": ${error}`);
    }
  }
}