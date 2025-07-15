import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class FileStorageRepository implements IChromeStorageRepository {
  private readonly storageFile: string;

  constructor() {
    const configDir = path.join(os.homedir(), '.config', 'multi-channel-reply-assistant');
    this.storageFile = path.join(configDir, 'storage.json');
  }

  async save<T>(key: string, data: T): Promise<void> {
    const allData = await this.readStorageFile();
    allData[key] = data;
    await this.writeStorageFile(allData);
  }

  async get<T>(key: string): Promise<T | null> {
    const allData = await this.readStorageFile();
    return allData[key] || null;
  }

  async remove(key: string): Promise<void> {
    const allData = await this.readStorageFile();
    delete allData[key];
    await this.writeStorageFile(allData);
  }

  async getAll(): Promise<Record<string, any>> {
    return await this.readStorageFile();
  }

  async exists(key: string): Promise<boolean> {
    const allData = await this.readStorageFile();
    return key in allData;
  }

  private async readStorageFile(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private async writeStorageFile(data: Record<string, any>): Promise<void> {
    await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
    await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2));
  }
} 