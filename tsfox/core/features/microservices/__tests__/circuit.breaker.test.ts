/**
 * Fox Framework - Circuit Breaker Tests
 * Unit tests for circuit breaker functionality
 */

import { CircuitBreaker } from '../circuit-breaker/circuit.breaker';
import { CircuitBreakerConfig, CircuitBreakerOpenError } from '../interfaces';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let config: CircuitBreakerConfig;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 10000,
      expectedExceptions: ['Error', 'TimeoutError'],
      halfOpenMaxCalls: 2
    };
    circuitBreaker = new CircuitBreaker(config);
  });

  describe('Circuit Breaker States', () => {
    it('should start in closed state', () => {
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should remain closed on successful operations', async () => {
      const successfulOperation = jest.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(successfulOperation);
      await circuitBreaker.execute(successfulOperation);
      
      expect(circuitBreaker.getState()).toBe('closed');
      expect(successfulOperation).toHaveBeenCalledTimes(2);
    });

    it('should open after reaching failure threshold', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reject calls immediately when open', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Trigger circuit breaker to open
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Next call should be rejected immediately
      await expect(circuitBreaker.execute(failingOperation))
        .rejects.toThrow(CircuitBreakerOpenError);
      
      // The operation should not have been called this time
      expect(failingOperation).toHaveBeenCalledTimes(config.failureThreshold);
    });
  });

  describe('Half-Open State', () => {
    beforeEach(async () => {
      // Force circuit breaker to open
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
    });

    it('should transition to half-open after recovery timeout', async () => {
      // Wait for recovery timeout + a bit more
      await new Promise(resolve => setTimeout(resolve, config.recoveryTimeout + 100));
      
      const successfulOperation = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successfulOperation);
      
      expect(circuitBreaker.getState()).toBe('half-open');
    });

    it('should close after successful calls in half-open', async () => {
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, config.recoveryTimeout + 100));
      
      const successfulOperation = jest.fn().mockResolvedValue('success');
      
      // Make enough successful calls to close the circuit
      for (let i = 0; i < config.halfOpenMaxCalls!; i++) {
        await circuitBreaker.execute(successfulOperation);
      }
      
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should reopen on failure in half-open state', async () => {
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, config.recoveryTimeout + 100));
      
      const failingOperation = jest.fn().mockRejectedValue(new Error('Still failing'));
      
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
      
      expect(circuitBreaker.getState()).toBe('open');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track success and failure counts', async () => {
      const successfulOperation = jest.fn().mockResolvedValue('success');
      const failingOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      
      await circuitBreaker.execute(successfulOperation);
      await circuitBreaker.execute(successfulOperation);
      
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = circuitBreaker.getMetrics();
      
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.failureRate).toBeCloseTo(33.33, 1);
    });

    it('should track last failure time', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      
      const beforeFailure = new Date();
      
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
      
      const afterFailure = new Date();
      const metrics = circuitBreaker.getMetrics();
      
      expect(metrics.lastFailureTime).toBeDefined();
      expect(metrics.lastFailureTime!.getTime()).toBeGreaterThanOrEqual(beforeFailure.getTime());
      expect(metrics.lastFailureTime!.getTime()).toBeLessThanOrEqual(afterFailure.getTime());
    });
  });

  describe('Configuration and Reset', () => {
    it('should reset to closed state', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Open the circuit breaker
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe('open');
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
      expect(circuitBreaker.getMetrics().successCount).toBe(0);
    });

    it('should respect expected exceptions configuration', async () => {
      const customConfig = {
        ...config,
        expectedExceptions: ['TimeoutError'] // Only TimeoutError should trigger circuit breaker
      };
      
      const customCircuitBreaker = new CircuitBreaker(customConfig);
      
      const regularError = jest.fn().mockRejectedValue(new Error('Regular error'));
      const timeoutError = jest.fn().mockRejectedValue(new (class TimeoutError extends Error {})('Timeout'));
      
      // Regular errors should not trigger circuit breaker
      for (let i = 0; i < config.failureThreshold + 1; i++) {
        try {
          await customCircuitBreaker.execute(regularError);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(customCircuitBreaker.getState()).toBe('closed');
      
      // TimeoutError should trigger circuit breaker
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await customCircuitBreaker.execute(timeoutError);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(customCircuitBreaker.getState()).toBe('open');
    });
  });
});
