/**
 * @fileoverview Tests for Circuit Breaker pattern implementation
 * @module tsfox/core/resilience/__tests__/circuit-breaker.test
 */

import { CircuitBreaker, CircuitBreakerOptions, CircuitState, CircuitBreakerManager } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockFunction: jest.Mock;

  beforeEach(() => {
    mockFunction = jest.fn();
    const options: CircuitBreakerOptions = {
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 5000,
      volumeThreshold: 1
    };
    circuitBreaker = new CircuitBreaker(options);
  });

  describe('constructor', () => {
    it('should initialize with correct default state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.requestCount).toBe(0);
    });

    it('should throw error for invalid options', () => {
      expect(() => new CircuitBreaker({ failureThreshold: 0, resetTimeout: 1000, monitoringPeriod: 5000 }))
        .toThrow('Failure threshold must be greater than 0');
      
      expect(() => new CircuitBreaker({ failureThreshold: 3, resetTimeout: 0, monitoringPeriod: 5000 }))
        .toThrow('Reset timeout must be greater than 0');
    });
  });

  describe('execute - CLOSED state', () => {
    it('should execute successfully when circuit is closed', async () => {
      mockFunction.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFunction);

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      
      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(1);
      expect(stats.requestCount).toBe(1);
    });

    it('should track failures and open circuit when threshold is reached', async () => {
      mockFunction.mockRejectedValue(new Error('Test failure'));

      // Fail below threshold
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Test failure');
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Test failure');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // Fail at threshold - should open circuit
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Test failure');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset failure count on successful execution in half-open state', async () => {
      mockFunction
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockRejectedValueOnce(new Error('Failure 3')) // This opens the circuit
        .mockResolvedValue('success');

      // Cause failures to open circuit
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Failure 1');
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Failure 2');
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Failure 3');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout and try again (should be HALF_OPEN)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // This should succeed and close the circuit
      const result = await circuitBreaker.execute(mockFunction);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('execute - OPEN state', () => {
    beforeEach(async () => {
      mockFunction.mockRejectedValue(new Error('Force open'));
      // Force circuit to open
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reject immediately when circuit is open', async () => {
      mockFunction.mockResolvedValue('should not execute');

      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Circuit breaker is OPEN');
      // mockFunction should not be called again (still 3 from beforeEach)
      expect(mockFunction).toHaveBeenCalledTimes(3);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      mockFunction.mockResolvedValue('success');
      
      // This should trigger transition to HALF_OPEN and then CLOSED
      const result = await circuitBreaker.execute(mockFunction);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('execute - HALF_OPEN state', () => {
    beforeEach(async () => {
      mockFunction.mockRejectedValue(new Error('Force open'));
      // Force circuit to open
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow();
      }
      // Wait for reset timeout to allow transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN); // Still open until next execute
    });

    it('should close circuit on successful execution', async () => {
      mockFunction.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFunction);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open circuit on failed execution', async () => {
      mockFunction.mockRejectedValue(new Error('Still failing'));

      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Still failing');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      mockFunction
        .mockResolvedValueOnce('success1')
        .mockRejectedValueOnce(new Error('failure1'))
        .mockResolvedValueOnce('success2');

      await circuitBreaker.execute(mockFunction);
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow();
      await circuitBreaker.execute(mockFunction);

      const stats = circuitBreaker.getStats();
      expect(stats.requestCount).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.lastSuccessTime).toBeDefined();
      expect(stats.lastFailureTime).toBeDefined();
    });
  });

  describe('force operations', () => {
    it('should force open circuit breaker', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should force close circuit breaker', async () => {
      // Open the circuit first
      mockFunction.mockRejectedValue(new Error('Test failure'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Force close
      circuitBreaker.forceClose();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('isHealthy', () => {
    it('should return true when circuit is closed', () => {
      expect(circuitBreaker.isHealthy()).toBe(true);
    });

    it('should return false when circuit is open', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.isHealthy()).toBe(false);
    });
  });

  describe('volume threshold', () => {
    it('should not trip without sufficient volume', async () => {
      const options: CircuitBreakerOptions = {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        volumeThreshold: 5 // Need 5 requests before considering trip
      };
      
      const breaker = new CircuitBreaker(options);
      mockFunction.mockRejectedValue(new Error('Failure'));

      // Only 2 failures, but volume threshold is 5
      await expect(breaker.execute(mockFunction)).rejects.toThrow();
      await expect(breaker.execute(mockFunction)).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  describe('getCircuitBreaker', () => {
    it('should create new circuit breaker for service', () => {
      const breaker = manager.getCircuitBreaker('test-service');
      
      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(manager.getCount()).toBe(1);
    });

    it('should return existing circuit breaker for service', () => {
      const breaker1 = manager.getCircuitBreaker('test-service');
      const breaker2 = manager.getCircuitBreaker('test-service');
      
      expect(breaker1).toBe(breaker2);
      expect(manager.getCount()).toBe(1);
    });

    it('should create circuit breaker with custom options', () => {
      const options: CircuitBreakerOptions = {
        failureThreshold: 10,
        resetTimeout: 5000,
        monitoringPeriod: 10000
      };
      
      const breaker = manager.getCircuitBreaker('custom-service', options);
      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });
  });

  describe('removeCircuitBreaker', () => {
    it('should remove circuit breaker', () => {
      manager.getCircuitBreaker('test-service');
      expect(manager.getCount()).toBe(1);

      const removed = manager.removeCircuitBreaker('test-service');
      expect(removed).toBe(true);
      expect(manager.getCount()).toBe(0);
    });

    it('should return false for non-existent service', () => {
      const removed = manager.removeCircuitBreaker('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('getAllStates', () => {
    it('should return all circuit breaker states', () => {
      manager.getCircuitBreaker('service1');
      manager.getCircuitBreaker('service2');

      const states = manager.getAllStates();
      
      expect(Object.keys(states)).toHaveLength(2);
      expect(states['service1']).toBeDefined();
      expect(states['service2']).toBeDefined();
      expect(states['service1'].state).toBe(CircuitState.CLOSED);
    });
  });

  describe('getUnhealthyCircuitBreakers', () => {
    it('should return list of unhealthy circuit breakers', () => {
      const breaker1 = manager.getCircuitBreaker('healthy-service');
      const breaker2 = manager.getCircuitBreaker('unhealthy-service');
      
      breaker2.forceOpen();

      const unhealthy = manager.getUnhealthyCircuitBreakers();
      expect(unhealthy).toEqual(['unhealthy-service']);
    });

    it('should return empty array when all are healthy', () => {
      manager.getCircuitBreaker('service1');
      manager.getCircuitBreaker('service2');

      const unhealthy = manager.getUnhealthyCircuitBreakers();
      expect(unhealthy).toEqual([]);
    });
  });

  describe('forceCloseAll', () => {
    it('should force close all circuit breakers', () => {
      const breaker1 = manager.getCircuitBreaker('service1');
      const breaker2 = manager.getCircuitBreaker('service2');
      
      breaker1.forceOpen();
      breaker2.forceOpen();

      manager.forceCloseAll();

      expect(breaker1.isHealthy()).toBe(true);
      expect(breaker2.isHealthy()).toBe(true);
    });
  });
});
