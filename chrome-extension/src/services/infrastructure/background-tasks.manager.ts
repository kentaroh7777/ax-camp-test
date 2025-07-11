// Background Tasks Manager implementation
// バックグラウンドタスク管理

export interface BackgroundTask {
  id: string;
  name: string;
  interval: number; // ミリ秒
  lastRun?: Date;
  isRunning: boolean;
  execute: () => Promise<void>;
}

export interface IBackgroundTasksManager {
  registerTask(task: BackgroundTask): void;
  unregisterTask(taskId: string): void;
  startTask(taskId: string): void;
  stopTask(taskId: string): void;
  stopAllTasks(): void;
  getTaskStatus(): BackgroundTask[];
}

export class BackgroundTasksManager implements IBackgroundTasksManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * タスク登録
   * @param task - 登録するバックグラウンドタスク
   */
  registerTask(task: BackgroundTask): void {
    // If task already exists and is running, stop it first
    if (this.tasks.has(task.id)) {
      this.stopTask(task.id);
    }
    this.tasks.set(task.id, task);
  }

  /**
   * タスク登録解除
   * @param taskId - 登録解除するタスクID
   */
  unregisterTask(taskId: string): void {
    this.stopTask(taskId);
    this.tasks.delete(taskId);
  }

  /**
   * タスク開始
   * @param taskId - 開始するタスクID
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.isRunning) return;

    task.isRunning = true;
    const timer = setInterval(async () => {
      try {
        await task.execute();
        task.lastRun = new Date();
      } catch (error) {
        console.error(`Background task "${task.name}" failed:`, error);
      }
    }, task.interval);

    this.timers.set(taskId, timer);
  }

  /**
   * タスク停止
   * @param taskId - 停止するタスクID
   */
  stopTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    const timer = this.timers.get(taskId);

    if (task) {
      task.isRunning = false;
    }

    if (timer) {
      clearInterval(timer);
      this.timers.delete(taskId);
    }
  }

  /**
   * 全タスク停止
   */
  stopAllTasks(): void {
    for (const taskId of this.tasks.keys()) {
      this.stopTask(taskId);
    }
  }

  /**
   * タスク状態取得
   * @returns タスク状態の配列（execute関数は除外）
   */
  getTaskStatus(): BackgroundTask[] {
    return Array.from(this.tasks.values()).map(task => ({
      ...task,
      execute: undefined as any, // 関数は除外
    }));
  }
}