import axios from 'axios';
import { CircuitBreakerService } from './circuit-breaker.service';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { HealthCheckResponse, MetricsResponse } from '../types/api.types';

interface HealthCheckHistory {
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
}

export class HealthCheckService {
  private healthHistory: HealthCheckHistory[] = [];
  private circuitBreaker?: CircuitBreakerService;
  private startupTime: Date;
  private isReady: boolean = false;

  constructor() {
    this.startupTime = new Date();
    
    // Initialize circuit breaker reference if available
    if (config.FEATURE_CIRCUIT_BREAKER) {
      this.circuitBreaker = new CircuitBreakerService();
    }

    // Mark as ready after a short delay (simulating startup checks)
    setTimeout(() => {
      this.isReady = true;
      logger.info('Health check service ready');
    }, 2000);
  }

  // Basic health check
  async getBasicHealth(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    
    try {
      const status = await this.determineHealthStatus();
      const responseTime = Date.now() - startTime;
      
      const health: HealthCheckResponse = {
        status,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
        version: config.APP_VERSION,
        environment: config.NODE_ENV,
      };

      this.recordHealthCheck(status, responseTime);
      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Basic health check failed', { error: error instanceof Error ? error.message : error });
      
      this.recordHealthCheck('unhealthy', responseTime, error);
      
      return {
        status: 'unhealthy',
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
        version: config.APP_VERSION,
        environment: config.NODE_ENV,
      };
    }
  }

  // Detailed health check with dependencies
  async getDetailedHealth(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    
    try {
      const [
        basicStatus,
        dependencyStatus,
        metrics,
      ] = await Promise.allSettled([
        this.determineHealthStatus(),
        this.checkDependencies(),
        this.getSystemMetrics(),
      ]);

      const status = this.aggregateHealthStatus([
        basicStatus.status === 'fulfilled' ? basicStatus.value : 'unhealthy',
        dependencyStatus.status === 'fulfilled' ? 
          this.getDependencyOverallStatus(dependencyStatus.value) : 'unhealthy',
      ]);

      const responseTime = Date.now() - startTime;

      const health: HealthCheckResponse = {
        status,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
        version: config.APP_VERSION,
        environment: config.NODE_ENV,
        dependencies: dependencyStatus.status === 'fulfilled' ? dependencyStatus.value : undefined,
        metrics: metrics.status === 'fulfilled' ? metrics.value : undefined,
      };

      this.recordHealthCheck(status, responseTime);
      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Detailed health check failed', { error: error instanceof Error ? error.message : error });
      
      this.recordHealthCheck('unhealthy', responseTime, error);
      
      return {
        status: 'unhealthy',
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
        version: config.APP_VERSION,
        environment: config.NODE_ENV,
      };
    }
  }

  // Liveness probe
  async getLivenessStatus(): Promise<boolean> {
    try {
      // Check if the application is still running
      // This is a simple check - more complex checks can be added
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Check for memory leaks (very basic check)
      const memoryThreshold = 1024 * 1024 * 1024; // 1GB
      if (memoryUsage.heapUsed > memoryThreshold) {
        logger.warn('High memory usage detected', { memoryUsage });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Liveness check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  // Readiness probe
  async getReadinessStatus(): Promise<boolean> {
    try {
      // Check if the application is ready to serve traffic
      if (!this.isReady) {
        return false;
      }

      // Check critical dependencies
      const criticalDependencies = await this.checkCriticalDependencies();
      return criticalDependencies.every(dep => dep.status === 'healthy');
    } catch (error) {
      logger.error('Readiness check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  // Startup probe
  async getStartupStatus(): Promise<{ ready: boolean; startupTime: number; checks: any[] }> {
    const startupTime = Date.now() - this.startupTime.getTime();
    
    const checks = [
      { name: 'configuration', status: this.checkConfiguration() },
      { name: 'dependencies', status: await this.checkStartupDependencies() },
      { name: 'resources', status: this.checkSystemResources() },
    ];

    const ready = this.isReady && checks.every(check => check.status);

    return {
      ready,
      startupTime,
      checks,
    };
  }

  // Circuit breaker status
  async getCircuitBreakerStatus(): Promise<any> {
    if (!this.circuitBreaker) {
      return {
        enabled: false,
        status: 'not configured',
      };
    }

    return this.circuitBreaker.getHealthStatus();
  }

  // System metrics
  async getSystemMetrics(): Promise<MetricsResponse> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = this.getUptime();

      // Calculate memory percentage
      const totalMemory = memoryUsage.heapTotal + memoryUsage.external + memoryUsage.arrayBuffers;
      const usedMemory = memoryUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      // Get load average (Unix systems only)
      let loadAverage: number[] = [];
      try {
        const os = require('os');
        loadAverage = os.loadavg();
      } catch (error) {
        // Windows or other systems might not support this
        loadAverage = [0, 0, 0];
      }

      return {
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
          loadAverage,
        },
        memory: {
          usage: usedMemory,
          total: totalMemory,
          free: totalMemory - usedMemory,
          percentage: Math.round(memoryPercentage * 100) / 100,
        },
        uptime,
        requests: {
          total: 0, // Would be populated by middleware
          successful: 0,
          failed: 0,
          averageResponseTime: 0,
        },
        errors: {
          total: 0,
          rate: 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get system metrics', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  // Check LINE API connectivity
  async checkLineApiConnectivity(authorization: string): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${config.LINE_API_BASE_URL}/info`, {
        headers: {
          'Authorization': authorization,
        },
        timeout: config.HEALTH_CHECK_TIMEOUT,
      });

      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        return {
          status: 'healthy',
          responseTime,
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          error: `Unexpected status code: ${response.status}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get health history
  async getHealthHistory(limit: number = 100): Promise<HealthCheckHistory[]> {
    return this.healthHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Private helper methods
  private async determineHealthStatus(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // Check system resources
      const metrics = await this.getSystemMetrics();
      
      // Check memory usage
      if (metrics.memory.percentage > config.HEALTH_CHECK_MEMORY_THRESHOLD) {
        return 'degraded';
      }

      // Check if recent health checks show issues
      const recentChecks = this.healthHistory.slice(-5);
      const unhealthyCount = recentChecks.filter(check => check.status === 'unhealthy').length;
      
      if (unhealthyCount >= 3) {
        return 'unhealthy';
      } else if (unhealthyCount >= 1) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      logger.error('Failed to determine health status', { error: error instanceof Error ? error.message : error });
      return 'unhealthy';
    }
  }

  private async checkDependencies(): Promise<{ [key: string]: any }> {
    const dependencies: { [key: string]: any } = {};

    // Check LINE API (if we have credentials)
    if (config.LINE_CHANNEL_ACCESS_TOKEN) {
      try {
        const lineApiStatus = await this.checkLineApiConnectivity(
          `Bearer ${config.LINE_CHANNEL_ACCESS_TOKEN}`
        );
        dependencies['line-api'] = {
          status: lineApiStatus.status,
          responseTime: lineApiStatus.responseTime,
          error: lineApiStatus.error,
          lastCheck: new Date().toISOString(),
        };
      } catch (error) {
        dependencies['line-api'] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        };
      }
    }

    // Add other dependency checks here as needed
    
    return dependencies;
  }

  private async checkCriticalDependencies(): Promise<Array<{ name: string; status: 'healthy' | 'unhealthy' }>> {
    const dependencies = [];

    // For now, we don't have critical external dependencies
    // LINE API is checked on-demand with user credentials
    dependencies.push({ name: 'configuration', status: this.checkConfiguration() ? 'healthy' : 'unhealthy' });

    return dependencies;
  }

  private async checkStartupDependencies(): Promise<boolean> {
    try {
      // Check if all required configurations are available
      if (!this.checkConfiguration()) {
        return false;
      }

      // Add other startup dependency checks here
      return true;
    } catch (error) {
      logger.error('Startup dependency check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  private checkConfiguration(): boolean {
    try {
      // Check if all required configuration is present
      const requiredConfigs = [
        config.NODE_ENV,
        config.PORT,
        config.HOST,
        config.LINE_API_BASE_URL,
      ];

      return requiredConfigs.every(cfg => cfg !== undefined && cfg !== null);
    } catch (error) {
      return false;
    }
  }

  private checkSystemResources(): boolean {
    try {
      const memoryUsage = process.memoryUsage();
      const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      // Basic resource check
      return heapPercentage < 90;
    } catch (error) {
      return false;
    }
  }

  private getDependencyOverallStatus(dependencies: { [key: string]: any }): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(dependencies).map(dep => dep.status);
    
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    } else if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private aggregateHealthStatus(statuses: Array<'healthy' | 'degraded' | 'unhealthy'>): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    } else if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private recordHealthCheck(status: 'healthy' | 'degraded' | 'unhealthy', responseTime: number, details?: any): void {
    this.healthHistory.push({
      timestamp: new Date(),
      status,
      responseTime,
      details,
    });

    // Keep only the last 1000 records
    if (this.healthHistory.length > 1000) {
      this.healthHistory = this.healthHistory.slice(-1000);
    }
  }

  private getUptime(): number {
    return Math.floor(process.uptime());
  }
}