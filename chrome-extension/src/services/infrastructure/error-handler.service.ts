// Error Handler Service implementation
// Infrastructure Layer エラーハンドリング

import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';
import { STORAGE_KEYS } from '../../types/infrastructure/storage.types';

export interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: any;
  channel?: string;
}

export interface IErrorHandler {
  logError(error: Error, context?: any): Promise<void>;
  logWarning(message: string, context?: any): Promise<void>;
  logInfo(message: string, context?: any): Promise<void>;
  getErrorLogs(limit?: number): Promise<ErrorLog[]>;
  clearErrorLogs(): Promise<void>;
}

export class ErrorHandlerService implements IErrorHandler {
  private readonly storageRepository: IChromeStorageRepository;
  private readonly maxLogEntries = 1000;

  constructor(storageRepository: IChromeStorageRepository) {
    this.storageRepository = storageRepository;
  }

  /**
   * エラーログ記録
   * @param error - エラーオブジェクト
   * @param context - 追加のコンテキスト情報
   */
  async logError(error: Error, context?: any): Promise<void> {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      context,
    };

    await this.saveLog(errorLog);

    // コンソールにも出力
    console.error('Error logged:', errorLog);
  }

  /**
   * 警告ログ記録
   * @param message - 警告メッセージ
   * @param context - 追加のコンテキスト情報
   */
  async logWarning(message: string, context?: any): Promise<void> {
    const warningLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'warning',
      message,
      context,
    };

    await this.saveLog(warningLog);
    console.warn('Warning logged:', warningLog);
  }

  /**
   * 情報ログ記録
   * @param message - 情報メッセージ
   * @param context - 追加のコンテキスト情報
   */
  async logInfo(message: string, context?: any): Promise<void> {
    const infoLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'info',
      message,
      context,
    };

    await this.saveLog(infoLog);
    console.info('Info logged:', infoLog);
  }

  /**
   * エラーログ取得
   * @param limit - 取得するログの上限数
   * @returns エラーログの配列
   */
  async getErrorLogs(limit = 100): Promise<ErrorLog[]> {
    const logs = await this.storageRepository.get<ErrorLog[]>(STORAGE_KEYS.ERROR_LOG) || [];
    return logs.slice(-limit);
  }

  /**
   * エラーログクリア
   */
  async clearErrorLogs(): Promise<void> {
    await this.storageRepository.remove(STORAGE_KEYS.ERROR_LOG);
  }

  /**
   * ログ保存
   * @param log - 保存するログエントリ
   */
  private async saveLog(log: ErrorLog): Promise<void> {
    const logs = await this.storageRepository.get<ErrorLog[]>(STORAGE_KEYS.ERROR_LOG) || [];
    logs.push(log);

    // ログ数制限
    if (logs.length > this.maxLogEntries) {
      logs.splice(0, logs.length - this.maxLogEntries);
    }

    await this.storageRepository.save(STORAGE_KEYS.ERROR_LOG, logs);
  }

  /**
   * ユニークID生成
   * @returns ユニークID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }
}