/**
 * Circuit Breaker Implementation for Fox Framework
 * 
 * Implements the Circuit Breaker pattern to prevent cascading failures
 * and provide fast failure when services are unavailable.
 */

import { SystemError } from '../errors/base.error';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  volumeThreshold?: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  requestCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private requestCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttemptTime?: number;

  constructor(private options: CircuitBreakerOptions) {
    // Validate options
    if (options.failureThreshold <= 0) {
      throw new Error('Failure threshold must be greater than 0');
    }
    if (options.resetTimeout <= 0) {
      throw new Error('Reset timeout must be greater than 0');
    }
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new SystemError('Circuit breaker is OPEN - failing fast', {
          state: this.state,
          failureCount: this.failureCount,
          nextAttemptTime: this.nextAttemptTime
        });
      }
    }

    this.requestCount++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Reset circuit breaker on successful operation in half-open state
      this.reset();
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Go back to OPEN state if operation fails in half-open state
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    } else if (this.shouldTrip()) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    }
  }

  /**
   * Check if circuit breaker should trip to OPEN state
   */
  private shouldTrip(): boolean {
    // Check if we have enough volume
    if (this.options.volumeThreshold && this.requestCount < this.options.volumeThreshold) {
      return false;
    }

    // Check failure threshold
    return this.failureCount >= this.options.failureThreshold;
  }

  /**
   * Check if we should attempt to reset (transition to HALF_OPEN)
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime : false;
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = undefined;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  /**
   * Manually open the circuit breaker
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.resetTimeout;
  }

  /**
   * Manually close the circuit breaker
   */
  forceClose(): void {
    this.reset();
  }

  /**
   * Check if circuit breaker is currently healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 120000, // 2 minutes
        volumeThreshold: 10
      };
      
      this.circuitBreakers.set(
        serviceName, 
        new CircuitBreaker({ ...defaultOptions, ...options })
      );
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Remove a circuit breaker
   */
  removeCircuitBreaker(serviceName: string): boolean {
    return this.circuitBreakers.delete(serviceName);
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates(): Record<string, CircuitBreakerStats> {
    const states: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      states[name] = breaker.getStats();
    }

    return states;
  }

  /**
   * Get list of unhealthy circuit breakers
   */
  getUnhealthyCircuitBreakers(): string[] {
    const unhealthy: string[] = [];
    
    for (const [name, breaker] of this.circuitBreakers) {
      if (!breaker.isHealthy()) {
        unhealthy.push(name);
      }
    }

    return unhealthy;
  }

  /**
   * Force close all circuit breakers
   */
  forceCloseAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.forceClose();
    }
  }

  /**
   * Get circuit breaker count
   */
  getCount(): number {
    return this.circuitBreakers.size;
  }
}
