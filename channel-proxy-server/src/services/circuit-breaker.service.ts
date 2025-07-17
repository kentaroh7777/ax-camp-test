import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger.js';

// Use opossum's own options type directly for simplicity and accuracy.
type OpossumOptions = CircuitBreaker.Options;

/**
 * A wrapper around the 'opossum' circuit breaker library.
 * This service simplifies creating and using a circuit breaker for external API calls.
 */
export class CircuitBreakerService {
  private breaker: CircuitBreaker;

  constructor(options?: OpossumOptions) {
    const defaultOptions: OpossumOptions = {
      timeout: 10000,                   // If the action does not complete in 10s, trigger a failure
      errorThresholdPercentage: 50,     // When 50% of requests fail, open the circuit
      resetTimeout: 30000,              // After 30 seconds, try again.
      volumeThreshold: 5,               // Minimum number of requests before considering opening the circuit
    };
    
    // The action is now passed to `fire()`, not the constructor.
    // The first argument to the constructor is a placeholder action.
    const action = async (fn: (...args: any[]) => Promise<any>, ...args: any[]) => fn(...args);

    this.breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });

    // Setup event listeners for logging
    this.breaker.on('open', () => logger.warn(`🔴 Circuit breaker (${this.breaker.name || 'default'}) opened`));
    this.breaker.on('halfOpen', () => logger.info(`🟡 Circuit breaker (${this.breaker.name || 'default'}) half-opened`));
    this.breaker.on('close', () => logger.info(`🟢 Circuit breaker (${this.breaker.name || 'default'}) closed`));
    this.breaker.on('failure', (error) => logger.warn(`❌ Circuit breaker (${this.breaker.name || 'default'}) failed`, { error: error.message }));
  }

  /**
   * Executes a function protected by the circuit breaker.
   * @param fn The async function to execute.
   * @param args The arguments to pass to the function.
   * @returns A promise that resolves with the result of the function.
   */
  public execute<T>(fn: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    return this.breaker.fire(fn, ...args) as Promise<T>;
  }

  /**
   * Returns the current health status and stats of the circuit breaker.
   */
  public getHealthStatus() {
    return {
      isOpen: this.breaker.opened,
      isHalfOpen: this.breaker.halfOpen,
      stats: this.breaker.stats,
    };
  }
}