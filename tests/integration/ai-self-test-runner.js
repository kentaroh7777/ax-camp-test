#!/usr/bin/env node

/**
 * AI自己テスト自動化ランナー
 * 
 * 機能:
 * - 定期実行対応
 * - 結果通知機能
 * - 失敗時の自動再試行
 * - 複数テストの並列実行
 * - CI/CD対応
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// テスト設定
const RUNNER_CONFIG = {
  testScripts: [
    {
      name: 'Gmail新着メッセージ表示テスト',
      command: 'node',
      args: ['tests/integration/ai-self-test.js'],
      timeout: 60000, // 60秒
      retries: 3,
      enabled: true
    },
    {
      name: 'Gmail Service ユニットテスト',
      command: 'npm',
      args: ['run', 'test', 'tests/unit/channel/gmail.service.test.ts'],
      timeout: 30000, // 30秒
      retries: 2,
      enabled: true
    }
  ],
  reportDir: 'tests/integration/reports',
  notifications: {
    enabled: true,
    onFailure: true,
    onSuccess: false
  },
  parallel: true,
  maxConcurrency: 3
};

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color] || colors.reset}${text}${colors.reset}`;
}

class AITestRunner {
  constructor(config = RUNNER_CONFIG) {
    this.config = config;
    this.results = [];
    this.startTime = Date.now();
    this.ensureReportDirectory();
  }

  ensureReportDirectory() {
    if (!fs.existsSync(this.config.reportDir)) {
      fs.mkdirSync(this.config.reportDir, { recursive: true });
    }
  }

  async runAllTests() {
    console.log(colorize('🤖 AI自己テスト自動化ランナー 開始', 'cyan'));
    console.log(colorize('======================================', 'cyan'));
    console.log(`📅 実行日時: ${new Date().toLocaleString('ja-JP')}`);
    console.log(`🏃 実行モード: ${this.config.parallel ? '並列' : '順次'}`);
    console.log(`📊 テスト数: ${this.config.testScripts.filter(t => t.enabled).length}件`);
    console.log('');

    const enabledTests = this.config.testScripts.filter(t => t.enabled);
    
    if (this.config.parallel) {
      await this.runTestsInParallel(enabledTests);
    } else {
      await this.runTestsSequentially(enabledTests);
    }

    await this.generateSummaryReport();
    await this.handleNotifications();
    
    const overallSuccess = this.results.every(r => r.success);
    
    console.log('');
    console.log(colorize('📊 テスト実行結果サマリー', 'cyan'));
    console.log(colorize('========================', 'cyan'));
    
    this.results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name} (${duration})`);
    });
    
    const totalDuration = Date.now() - this.startTime;
    const successCount = this.results.filter(r => r.success).length;
    const failCount = this.results.filter(r => !r.success).length;
    
    console.log('');
    console.log(`🎯 総合結果: ${successCount}/${this.results.length} 成功`);
    console.log(`⏱️  総実行時間: ${totalDuration}ms`);
    console.log(`📈 成功率: ${(successCount / this.results.length * 100).toFixed(1)}%`);
    
    if (overallSuccess) {
      console.log(colorize('\n🎉 すべてのテストが成功しました！', 'green'));
      process.exit(0);
    } else {
      console.log(colorize('\n❌ 一部のテストが失敗しました', 'red'));
      process.exit(1);
    }
  }

  async runTestsInParallel(tests) {
    console.log(colorize('🚀 並列テスト実行開始', 'blue'));
    
    const chunks = this.chunkArray(tests, this.config.maxConcurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(test => this.runSingleTest(test));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          this.results.push({
            name: chunk[index].name,
            success: false,
            duration: 0,
            error: result.reason?.message || 'Unknown error',
            retries: 0
          });
        }
      });
    }
  }

  async runTestsSequentially(tests) {
    console.log(colorize('🎯 順次テスト実行開始', 'blue'));
    
    for (const test of tests) {
      try {
        const result = await this.runSingleTest(test);
        this.results.push(result);
      } catch (error) {
        this.results.push({
          name: test.name,
          success: false,
          duration: 0,
          error: error.message,
          retries: 0
        });
      }
    }
  }

  async runSingleTest(testConfig) {
    let lastError = null;
    let attempts = 0;
    
    while (attempts <= testConfig.retries) {
      attempts++;
      
      try {
        console.log(colorize(`🔍 [${attempts}/${testConfig.retries + 1}] ${testConfig.name} 実行中...`, 'yellow'));
        
        const result = await this.executeTest(testConfig);
        
        if (result.success) {
          console.log(colorize(`✅ ${testConfig.name} 成功 (${result.duration}ms)`, 'green'));
          return result;
        } else {
          lastError = result.error;
          
          if (attempts <= testConfig.retries) {
            console.log(colorize(`⚠️  ${testConfig.name} 失敗 - 再試行 ${attempts}/${testConfig.retries}`, 'yellow'));
            await this.delay(1000 * attempts); // 指数バックオフ
          }
        }
      } catch (error) {
        lastError = error.message;
        
        if (attempts <= testConfig.retries) {
          console.log(colorize(`💥 ${testConfig.name} エラー - 再試行 ${attempts}/${testConfig.retries}`, 'yellow'));
          await this.delay(1000 * attempts);
        }
      }
    }
    
    console.log(colorize(`❌ ${testConfig.name} 最終的に失敗`, 'red'));
    
    return {
      name: testConfig.name,
      success: false,
      duration: 0,
      error: lastError || 'Unknown error',
      retries: attempts - 1
    };
  }

  async executeTest(testConfig) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Timeout after ${testConfig.timeout}ms`));
      }, testConfig.timeout);
      
      const child = spawn(testConfig.command, testConfig.args, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        clearTimeout(timeout);
        
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            name: testConfig.name,
            success: true,
            duration,
            stdout,
            stderr: stderr || null
          });
        } else {
          resolve({
            name: testConfig.name,
            success: false,
            duration,
            error: stderr || stdout || `Exit code: ${code}`,
            stdout,
            stderr
          });
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async generateSummaryReport() {
    const reportPath = path.join(this.config.reportDir, `test-summary-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      runnerVersion: '1.0.0',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      },
      config: this.config,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        totalDuration: Date.now() - this.startTime,
        successRate: this.results.filter(r => r.success).length / this.results.length * 100
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(colorize(`📄 サマリーレポート生成: ${reportPath}`, 'cyan'));
    
    // 最新レポートへのシンボリックリンク作成
    const latestPath = path.join(this.config.reportDir, 'latest-summary.json');
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath);
    }
    fs.symlinkSync(path.basename(reportPath), latestPath);
  }

  async handleNotifications() {
    if (!this.config.notifications.enabled) {
      return;
    }
    
    const hasFailures = this.results.some(r => !r.success);
    
    if (hasFailures && this.config.notifications.onFailure) {
      await this.sendNotification('failure');
    } else if (!hasFailures && this.config.notifications.onSuccess) {
      await this.sendNotification('success');
    }
  }

  async sendNotification(type) {
    const message = type === 'failure' ? 
      '❌ AI自己テストで失敗が発生しました' :
      '✅ AI自己テストがすべて成功しました';
    
    console.log(colorize(`📧 通知送信: ${message}`, 'magenta'));
    
    // 実際の通知実装（Slack、メール、webhookなど）
    // この例では簡単なログファイル出力
    const notificationLog = path.join(this.config.reportDir, 'notifications.log');
    const logEntry = `${new Date().toISOString()} - ${type.toUpperCase()} - ${message}\n`;
    fs.appendFileSync(notificationLog, logEntry);
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CI/CD 対応のヘルパー関数
class CIHelper {
  static isCI() {
    return process.env.CI === 'true' || 
           process.env.GITHUB_ACTIONS === 'true' ||
           process.env.JENKINS_URL !== undefined;
  }

  static getRunnerConfig() {
    if (this.isCI()) {
      return {
        ...RUNNER_CONFIG,
        parallel: true,
        maxConcurrency: 2,
        notifications: {
          enabled: true,
          onFailure: true,
          onSuccess: false
        }
      };
    }
    return RUNNER_CONFIG;
  }

  static outputGitHubActions(results) {
    if (process.env.GITHUB_ACTIONS === 'true') {
      const failedTests = results.filter(r => !r.success);
      
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`::error::${test.name} failed: ${test.error}`);
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`::notice::Tests completed: ${successCount}/${results.length} passed`);
    }
  }
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);
  const config = CIHelper.getRunnerConfig();
  
  // コマンドライン引数処理
  if (args.includes('--sequential')) {
    config.parallel = false;
  }
  
  if (args.includes('--no-notifications')) {
    config.notifications.enabled = false;
  }
  
  const maxConcurrencyArg = args.find(arg => arg.startsWith('--max-concurrency='));
  if (maxConcurrencyArg) {
    config.maxConcurrency = parseInt(maxConcurrencyArg.split('=')[1]);
  }
  
  const runner = new AITestRunner(config);
  
  try {
    await runner.runAllTests();
  } catch (error) {
    console.error(colorize('💥 テストランナーでエラーが発生しました:', 'red'), error.message);
    
    if (CIHelper.isCI()) {
      CIHelper.outputGitHubActions(runner.results);
    }
    
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

module.exports = { AITestRunner, CIHelper, RUNNER_CONFIG }; 