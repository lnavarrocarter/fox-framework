/**
 * Fox Framework - Health Checker
 * Service health monitoring and checking
 */

import { ServiceInfo, HealthStatus, HealthCheck } from '../interfaces';
import { ILogger } from '../../../logging/interfaces';

/**
 * Maneja el chequeo de salud de servicios
 */
export class HealthChecker {
  private monitoredServices = new Map<string, ServiceInfo>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();

  constructor(private logger?: ILogger) {}

  /**
   * Inicia el monitoreo de un servicio
   */
  monitor(service: ServiceInfo): void {
    this.monitoredServices.set(service.id, service);
    this.log('debug', `Started monitoring service: ${service.name} (${service.id})`);
  }

  /**
   * Detiene el monitoreo de un servicio
   */
  unmonitor(serviceId: string): void {
    this.monitoredServices.delete(serviceId);
    
    const interval = this.checkIntervals.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(serviceId);
    }
    
    this.log('debug', `Stopped monitoring service: ${serviceId}`);
  }

  /**
   * Verifica la salud de un servicio específico
   */
  async checkHealth(service: ServiceInfo): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    try {
      // Basic connectivity check
      const connectivityCheck = await this.checkConnectivity(service);
      checks.push(connectivityCheck);

      // Custom health endpoint check if available
      if (service.endpoints?.some(ep => ep.path.includes('/health'))) {
        const healthEndpointCheck = await this.checkHealthEndpoint(service);
        checks.push(healthEndpointCheck);
      }

      // Response time check
      const responseTimeCheck = await this.checkResponseTime(service);
      checks.push(responseTimeCheck);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);
      
      return {
        status: overallStatus,
        lastCheck: new Date(),
        checks,
        uptime: this.calculateUptime(service)
      };

    } catch (error) {
      this.log('error', `Health check failed for ${service.name}: ${error}`);
      
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        checks: [{
          name: 'connectivity',
          status: 'fail',
          output: `Health check error: ${error}`,
          duration: Date.now() - startTime
        }]
      };
    }
  }

  /**
   * Verifica conectividad básica al servicio
   */
  private async checkConnectivity(service: ServiceInfo): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simulamos una verificación de conectividad
      // En una implementación real haríamos una conexión TCP o HTTP
      const isReachable = await this.isServiceReachable(service);
      
      return {
        name: 'connectivity',
        status: isReachable ? 'pass' : 'fail',
        output: isReachable ? 'Service is reachable' : 'Service is unreachable',
        duration: Date.now() - startTime,
        componentType: 'network'
      };
    } catch (error) {
      return {
        name: 'connectivity',
        status: 'fail',
        output: `Connectivity check failed: ${error}`,
        duration: Date.now() - startTime,
        componentType: 'network'
      };
    }
  }

  /**
   * Verifica el endpoint de salud del servicio
   */
  private async checkHealthEndpoint(service: ServiceInfo): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // En una implementación real haríamos una llamada HTTP GET al endpoint /health
      const healthResponse = await this.callHealthEndpoint(service);
      
      return {
        name: 'health-endpoint',
        status: healthResponse.healthy ? 'pass' : 'fail',
        output: healthResponse.message || 'Health endpoint responded',
        duration: Date.now() - startTime,
        componentType: 'http'
      };
    } catch (error) {
      return {
        name: 'health-endpoint',
        status: 'fail',
        output: `Health endpoint check failed: ${error}`,
        duration: Date.now() - startTime,
        componentType: 'http'
      };
    }
  }

  /**
   * Verifica el tiempo de respuesta del servicio
   */
  private async checkResponseTime(service: ServiceInfo): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const responseTime = await this.measureResponseTime(service);
      const isAcceptable = responseTime < 5000; // 5 segundos threshold
      
      return {
        name: 'response-time',
        status: isAcceptable ? 'pass' : 'warn',
        output: `Response time: ${responseTime}ms`,
        duration: Date.now() - startTime,
        componentType: 'performance'
      };
    } catch (error) {
      return {
        name: 'response-time',
        status: 'fail',
        output: `Response time check failed: ${error}`,
        duration: Date.now() - startTime,
        componentType: 'performance'
      };
    }
  }

  /**
   * Determina el estado general basado en todos los checks
   */
  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'warning' {
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warningChecks = checks.filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      return 'unhealthy';
    } else if (warningChecks.length > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Calcula el uptime del servicio
   */
  private calculateUptime(service: ServiceInfo): number {
    // En una implementación real, esto vendría de métricas históricas
    // Por ahora retornamos un valor simulado
    return Math.random() * 99 + 99; // 99-100% uptime
  }

  /**
   * Verifica si el servicio es alcanzable
   */
  private async isServiceReachable(service: ServiceInfo): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulamos una verificación de conectividad
      // En una implementación real usaríamos net.createConnection o similar
      setTimeout(() => {
        resolve(Math.random() > 0.1); // 90% success rate
      }, 100);
    });
  }

  /**
   * Llama al endpoint de salud del servicio
   */
  private async callHealthEndpoint(service: ServiceInfo): Promise<{healthy: boolean, message?: string}> {
    return new Promise((resolve) => {
      // Simulamos una llamada HTTP al endpoint /health
      // En una implementación real usaríamos fetch o axios
      setTimeout(() => {
        resolve({
          healthy: Math.random() > 0.05, // 95% success rate
          message: 'Service is healthy'
        });
      }, Math.random() * 200 + 50); // 50-250ms response time
    });
  }

  /**
   * Mide el tiempo de respuesta del servicio
   */
  private async measureResponseTime(service: ServiceInfo): Promise<number> {
    return new Promise((resolve) => {
      // Simulamos medición de tiempo de respuesta
      // En una implementación real haríamos una llamada HTTP real
      const responseTime = Math.random() * 2000 + 100; // 100-2100ms
      setTimeout(() => {
        resolve(responseTime);
      }, 50);
    });
  }

  /**
   * Obtiene el estado de todos los servicios monitoreados
   */
  getMonitoringStatus(): Record<string, HealthStatus> {
    const status: Record<string, HealthStatus> = {};
    
    for (const [serviceId, service] of this.monitoredServices) {
      status[serviceId] = service.health;
    }
    
    return status;
  }

  /**
   * Destruye el health checker y limpia recursos
   */
  destroy(): void {
    // Clear all intervals
    for (const interval of this.checkIntervals.values()) {
      clearInterval(interval);
    }
    
    this.checkIntervals.clear();
    this.monitoredServices.clear();
    
    this.log('info', 'Health checker destroyed');
  }

  /**
   * Helper para logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      // Usar el método correcto del logger
      switch (level) {
        case 'debug':
          if ('debug' in this.logger) {
            (this.logger as any).debug(`[HealthChecker] ${message}`, meta);
          }
          break;
        case 'info':
          if ('info' in this.logger) {
            (this.logger as any).info(`[HealthChecker] ${message}`, meta);
          }
          break;
        case 'warn':
          if ('warn' in this.logger) {
            (this.logger as any).warn(`[HealthChecker] ${message}`, meta);
          }
          break;
        case 'error':
          if ('error' in this.logger) {
            (this.logger as any).error(`[HealthChecker] ${message}`, meta);
          }
          break;
      }
    } else if (level !== 'debug') {
      console.log(`[${level.toUpperCase()}] [HealthChecker] ${message}`, meta || '');
    }
  }
}
