/**
 * Fox Framework - Circuit Breaker
 * Circuit breaker pattern implementation for fault tolerance
 */

import { 
  CircuitBreakerInterface,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerMetrics,
  CircuitBreakerOpenError
} from '../interfaces';
import { ILogger } from '../../../logging/interfaces';

/**
 * Implementación del patrón Circuit Breaker
 */
export class CircuitBreaker implements CircuitBreakerInterface {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private halfOpenCallCount = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private logger?: ILogger
  ) {
    this.log('info', `Circuit breaker initialized with ${config.failureThreshold} failure threshold`);
  }

  /**
   * Ejecuta una operación con protección de circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Verificar si el circuit breaker permite la ejecución
    if (!this.canExecute()) {
      const error = new CircuitBreakerOpenError(
        `Circuit breaker is ${this.state}. Next attempt at ${this.nextAttemptTime}`,
        'unknown-service'
      );
      this.log('warn', error.message);
      throw error;
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      // Operación exitosa
      this.onSuccess(duration);
      return result;

    } catch (error) {
      // Operación falló
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Obtiene métricas del circuit breaker
   */
  getMetrics(): CircuitBreakerMetrics {
    const totalCalls = this.successCount + this.failureCount;
    const failureRate = totalCalls > 0 ? (this.failureCount / totalCalls) * 100 : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Resetea el circuit breaker al estado cerrado
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.halfOpenCallCount = 0;
    
    this.log('info', 'Circuit breaker has been reset to closed state');
  }

  /**
   * Verifica si se puede ejecutar la operación
   */
  private canExecute(): boolean {
    switch (this.state) {
      case 'closed':
        return true;
      
      case 'open':
        // Verificar si es tiempo de intentar recovery
        if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;
      
      case 'half-open':
        // Permitir un número limitado de llamadas en half-open
        const maxCalls = this.config.halfOpenMaxCalls || 3;
        return this.halfOpenCallCount < maxCalls;
      
      default:
        return false;
    }
  }

  /**
   * Maneja el éxito de una operación
   */
  private onSuccess(duration: number): void {
    this.successCount++;

    switch (this.state) {
      case 'closed':
        // Resetear contador de fallos si estamos bajo el threshold
        if (this.failureCount > 0) {
          this.failureCount = Math.max(0, this.failureCount - 1);
        }
        break;
      
      case 'half-open':
        this.halfOpenCallCount++;
        
        // Si tenemos suficientes éxitos consecutivos, cerrar el circuit
        const requiredSuccesses = this.config.halfOpenMaxCalls || 3;
        if (this.halfOpenCallCount >= requiredSuccesses) {
          this.transitionToClosed();
        }
        break;
    }

    this.log('debug', `Circuit breaker success recorded. State: ${this.state}, Duration: ${duration}ms`);
  }

  /**
   * Maneja el fallo de una operación
   */
  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    // Verificar si el error debe ser considerado para el circuit breaker
    if (!this.shouldRecordFailure(error)) {
      this.log('debug', 'Error ignored by circuit breaker (not in expected exceptions)');
      return;
    }

    switch (this.state) {
      case 'closed':
        // Verificar si alcanzamos el threshold para abrir
        if (this.failureCount >= this.config.failureThreshold) {
          this.transitionToOpen();
        }
        break;
      
      case 'half-open':
        // Cualquier fallo en half-open vuelve a abrir el circuit
        this.transitionToOpen();
        break;
    }

    this.log('warn', `Circuit breaker failure recorded. State: ${this.state}, Failures: ${this.failureCount}/${this.config.failureThreshold}`);
  }

  /**
   * Verifica si un error debe ser registrado como fallo
   */
  private shouldRecordFailure(error: any): boolean {
    if (!this.config.expectedExceptions || this.config.expectedExceptions.length === 0) {
      return true; // Considerar todos los errores si no hay configuración específica
    }

    const errorName = error.constructor.name || error.name || 'Error';
    return this.config.expectedExceptions.includes(errorName);
  }

  /**
   * Transición a estado abierto
   */
  private transitionToOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    this.halfOpenCallCount = 0;
    
    this.log('warn', `Circuit breaker opened. Next attempt at ${this.nextAttemptTime?.toISOString()}`);
  }

  /**
   * Transición a estado medio-abierto
   */
  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.halfOpenCallCount = 0;
    this.nextAttemptTime = undefined;
    
    this.log('info', 'Circuit breaker transitioned to half-open state');
  }

  /**
   * Transición a estado cerrado
   */
  private transitionToClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.halfOpenCallCount = 0;
    this.nextAttemptTime = undefined;
    
    this.log('info', 'Circuit breaker closed - service recovered');
  }

  /**
   * Obtiene estadísticas de ventana deslizante
   */
  getSlidingWindowStats(): {
    windowSize: number;
    failures: number;
    successes: number;
    rate: number;
  } {
    // En una implementación más avanzada, mantendríamos una ventana deslizante
    // Por ahora retornamos estadísticas básicas
    const total = this.successCount + this.failureCount;
    
    return {
      windowSize: this.config.monitoringPeriod,
      failures: this.failureCount,
      successes: this.successCount,
      rate: total > 0 ? (this.failureCount / total) * 100 : 0
    };
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Actualiza configuración
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', 'Circuit breaker configuration updated', newConfig);
  }

  /**
   * Helper para logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      switch (level) {
        case 'debug':
          if ('debug' in this.logger) {
            (this.logger as any).debug(`[CircuitBreaker] ${message}`, meta);
          }
          break;
        case 'info':
          if ('info' in this.logger) {
            (this.logger as any).info(`[CircuitBreaker] ${message}`, meta);
          }
          break;
        case 'warn':
          if ('warn' in this.logger) {
            (this.logger as any).warn(`[CircuitBreaker] ${message}`, meta);
          }
          break;
        case 'error':
          if ('error' in this.logger) {
            (this.logger as any).error(`[CircuitBreaker] ${message}`, meta);
          }
          break;
      }
    } else if (level !== 'debug') {
      console.log(`[${level.toUpperCase()}] [CircuitBreaker] ${message}`, meta || '');
    }
  }
}
