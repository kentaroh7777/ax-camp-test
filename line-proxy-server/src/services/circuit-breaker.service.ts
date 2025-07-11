import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitorTimeout?: number;
  errorThresholdPercentage?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  volumeThreshold?: number;
}

export class CircuitBreakerService {
  private breaker: CircuitBreaker;
  private stats: {
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    circuitOpenCount: number;
    lastOpenTime?: Date;
    lastCloseTime?: Date;
  };

  constructor(options: CircuitBreakerOptions = {}) {
    const defaultOptions = {
      errorThresholdPercentage: 50,
      timeout: options.monitorTimeout || 10000,
      resetTimeout: options.resetTimeout || 30000,
      rollingCountTimeout: 30000,
      rollingCountBuckets: 10,
      volumeThreshold: 5,
      ...options,
    };

    this.breaker = new CircuitBreaker(this.executeRequest, defaultOptions);
    
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpenCount: 0,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.breaker.on('open', () => {
      this.stats.circuitOpenCount++;
      this.stats.lastOpenTime = new Date();
      
      logger.warn('🔴 Circuit breaker opened', {
        totalRequests: this.stats.totalRequests,
        totalFailures: this.stats.totalFailures,
        totalSuccesses: this.stats.totalSuccesses,
        circuitOpenCount: this.stats.circuitOpenCount,
        timestamp: new Date().toISOString(),
      });
    });

    this.breaker.on('halfOpen', () => {
      logger.info('🟡 Circuit breaker half-opened', {
        totalRequests: this.stats.totalRequests,
        circuitOpenCount: this.stats.circuitOpenCount,
        timestamp: new Date().toISOString(),
      });
    });

    this.breaker.on('close', () => {
      this.stats.lastCloseTime = new Date();
      
      logger.info('🟢 Circuit breaker closed', {
        totalRequests: this.stats.totalRequests,
        totalFailures: this.stats.totalFailures,
        totalSuccesses: this.stats.totalSuccesses,
        circuitOpenCount: this.stats.circuitOpenCount,
        timestamp: new Date().toISOString(),
      });
    });

    this.breaker.on('success', () => {
      this.stats.totalRequests++;
      this.stats.totalSuccesses++;
      
      if (config.NODE_ENV === 'development') {
        logger.debug('✅ Circuit breaker: Request succeeded', {
          totalRequests: this.stats.totalRequests,
          successRate: ((this.stats.totalSuccesses / this.stats.totalRequests) * 100).toFixed(2) + '%',
        });
      }
    });

    this.breaker.on('failure', (error: Error) => {
      this.stats.totalRequests++;
      this.stats.totalFailures++;
      
      logger.warn('❌ Circuit breaker: Request failed', {
        error: error.message,
        totalRequests: this.stats.totalRequests,
        totalFailures: this.stats.totalFailures,
        failureRate: ((this.stats.totalFailures / this.stats.totalRequests) * 100).toFixed(2) + '%',
        timestamp: new Date().toISOString(),
      });
    });

    this.breaker.on('timeout', () => {
      this.stats.totalRequests++;
      this.stats.totalFailures++;
      
      logger.warn('⏱️ Circuit breaker: Request timed out', {
        totalRequests: this.stats.totalRequests,
        totalFailures: this.stats.totalFailures,
        timeout: this.breaker.options.timeout,
        timestamp: new Date().toISOString(),
      });
    });

    this.breaker.on('reject', () => {
      logger.warn('🚫 Circuit breaker: Request rejected (circuit open)', {
        totalRequests: this.stats.totalRequests,
        circuitOpenCount: this.stats.circuitOpenCount,
        lastOpenTime: this.stats.lastOpenTime?.toISOString(),
        timestamp: new Date().toISOString(),
      });
    });

    this.breaker.on('fallback', (result) => {
      logger.info('🔄 Circuit breaker: Fallback executed', {
        result: typeof result,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await this.breaker.fire(fn);
    } catch (error) {
      // If circuit is open, provide a more informative error
      if (this.breaker.opened) {
        throw new Error('Service temporarily unavailable - Circuit breaker is open');
      }
      
      throw error;
    }
  }

  private async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  // Health check methods
  isOpen(): boolean {
    return this.breaker.opened;
  }

  isHalfOpen(): boolean {
    return this.breaker.halfOpen;
  }

  isClosed(): boolean {
    return this.breaker.closed;
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    circuit: 'open' | 'half-open' | 'closed';
    stats: typeof this.stats;
    options: any;
  } {
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (this.breaker.opened) {
      status = 'unhealthy';
    } else if (this.breaker.halfOpen) {
      status = 'degraded';
    } else if (this.stats.totalRequests > 0) {
      const failureRate = (this.stats.totalFailures / this.stats.totalRequests) * 100;
      if (failureRate > 25) {
        status = 'degraded';
      }
    }

    return {
      status,
      circuit: this.breaker.opened ? 'open' : (this.breaker.halfOpen ? 'half-open' : 'closed'),
      stats: this.getStats(),
      options: {
        errorThresholdPercentage: this.breaker.options.errorThresholdPercentage,
        timeout: this.breaker.options.timeout,
        resetTimeout: this.breaker.options.resetTimeout,
        rollingCountTimeout: this.breaker.options.rollingCountTimeout,
        rollingCountBuckets: this.breaker.options.rollingCountBuckets,
        volumeThreshold: this.breaker.options.volumeThreshold,
      },
    };
  }

  // Manual control methods
  reset(): void {
    this.breaker.close();
    logger.info('🔄 Circuit breaker manually reset');
  }

  forceOpen(): void {
    this.breaker.open();
    logger.warn('🔴 Circuit breaker manually opened');
  }

  forceClose(): void {
    this.breaker.close();
    logger.info('🟢 Circuit breaker manually closed');
  }
}