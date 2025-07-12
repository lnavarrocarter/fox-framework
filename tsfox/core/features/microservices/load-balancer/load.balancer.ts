/**
 * Fox Framework - Load Balancer
 * Intelligent load balancing for microservices
 */

import { 
  LoadBalancerInterface,
  ServiceInfo,
  LoadBalancingAlgorithm,
  LoadBalancerStats,
  ServiceStats,
  LoadBalancerError
} from '../interfaces';
import { ILogger } from '../../../logging/interfaces';

interface LoadBalancerConfig {
  algorithm: LoadBalancingAlgorithm;
  healthCheck: boolean;
  retries: number;
  failureThreshold?: number;
  recoveryTime?: number;
}

/**
 * Implementación del load balancer con múltiples algoritmos
 */
export class LoadBalancer implements LoadBalancerInterface {
  private services = new Map<string, ServiceInfo[]>();
  private serviceStats = new Map<string, ServiceStats>();
  private roundRobinCounters = new Map<string, number>();
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalResponseTime = 0;

  constructor(
    private config: LoadBalancerConfig,
    private logger?: ILogger
  ) {
    this.log('info', `Load balancer initialized with ${config.algorithm} algorithm`);
  }

  /**
   * Selecciona un servicio usando el algoritmo configurado
   */
  async selectService(serviceName: string): Promise<ServiceInfo> {
    const services = this.services.get(serviceName);
    
    if (!services || services.length === 0) {
      throw new LoadBalancerError(`No services available for ${serviceName}`, serviceName);
    }

    // Filtrar servicios saludables si health check está habilitado
    const availableServices = this.config.healthCheck 
      ? services.filter(service => service.health.status === 'healthy')
      : services;

    if (availableServices.length === 0) {
      throw new LoadBalancerError(`No healthy services available for ${serviceName}`, serviceName);
    }

    let selectedService: ServiceInfo;

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedService = this.selectRoundRobin(serviceName, availableServices);
        break;
      case 'weighted':
        selectedService = this.selectWeighted(availableServices);
        break;
      case 'least-connections':
        selectedService = this.selectLeastConnections(availableServices);
        break;
      case 'random':
        selectedService = this.selectRandom(availableServices);
        break;
      case 'ip-hash':
        selectedService = this.selectIPHash(availableServices);
        break;
      case 'health-based':
        selectedService = this.selectHealthBased(availableServices);
        break;
      default:
        selectedService = this.selectRoundRobin(serviceName, availableServices);
    }

    // Actualizar estadísticas
    this.updateServiceStats(selectedService);
    this.totalRequests++;

    this.log('debug', `Selected service ${selectedService.id} for ${serviceName} using ${this.config.algorithm}`);
    
    return selectedService;
  }

  /**
   * Actualiza la lista de servicios para un nombre específico
   */
  updateServices(serviceName: string, services: ServiceInfo[]): void {
    this.services.set(serviceName, [...services]);
    
    // Inicializar estadísticas para nuevos servicios
    for (const service of services) {
      if (!this.serviceStats.has(service.id)) {
        this.serviceStats.set(service.id, {
          serviceId: service.id,
          requests: 0,
          successRate: 100,
          averageResponseTime: 0,
          activeConnections: 0,
          lastUsed: new Date()
        });
      }
    }

    this.log('info', `Updated ${services.length} services for ${serviceName}`);
  }

  /**
   * Establece el algoritmo de load balancing
   */
  setAlgorithm(algorithm: LoadBalancingAlgorithm): void {
    this.config.algorithm = algorithm;
    this.log('info', `Load balancer algorithm changed to ${algorithm}`);
  }

  /**
   * Obtiene estadísticas del load balancer
   */
  getStats(): LoadBalancerStats {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime: this.totalRequests > 0 ? this.totalResponseTime / this.totalRequests : 0,
      serviceStats: new Map(this.serviceStats)
    };
  }

  /**
   * Registra un request exitoso para estadísticas
   */
  recordSuccess(serviceId: string, responseTime: number): void {
    this.successfulRequests++;
    this.totalResponseTime += responseTime;
    
    const stats = this.serviceStats.get(serviceId);
    if (stats) {
      const totalRequests = stats.requests + 1;
      const totalResponseTime = (stats.averageResponseTime * stats.requests) + responseTime;
      
      stats.requests = totalRequests;
      stats.averageResponseTime = totalResponseTime / totalRequests;
      stats.successRate = (this.successfulRequests / this.totalRequests) * 100;
      stats.lastUsed = new Date();
      
      this.serviceStats.set(serviceId, stats);
    }
  }

  /**
   * Registra un request fallido para estadísticas
   */
  recordFailure(serviceId: string): void {
    this.failedRequests++;
    
    const stats = this.serviceStats.get(serviceId);
    if (stats) {
      stats.requests++;
      stats.successRate = (this.successfulRequests / this.totalRequests) * 100;
      this.serviceStats.set(serviceId, stats);
    }
  }

  /**
   * Algoritmo Round Robin
   */
  private selectRoundRobin(serviceName: string, services: ServiceInfo[]): ServiceInfo {
    let counter = this.roundRobinCounters.get(serviceName) || 0;
    const selected = services[counter % services.length];
    this.roundRobinCounters.set(serviceName, counter + 1);
    return selected;
  }

  /**
   * Algoritmo Weighted (basado en peso de servicio)
   */
  private selectWeighted(services: ServiceInfo[]): ServiceInfo {
    const totalWeight = services.reduce((sum, service) => sum + (service.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const service of services) {
      random -= (service.weight || 1);
      if (random <= 0) {
        return service;
      }
    }
    
    // Fallback al último servicio
    return services[services.length - 1];
  }

  /**
   * Algoritmo Least Connections
   */
  private selectLeastConnections(services: ServiceInfo[]): ServiceInfo {
    let minConnections = Infinity;
    let selectedService = services[0];
    
    for (const service of services) {
      const stats = this.serviceStats.get(service.id);
      const connections = stats?.activeConnections || 0;
      
      if (connections < minConnections) {
        minConnections = connections;
        selectedService = service;
      }
    }
    
    return selectedService;
  }

  /**
   * Algoritmo Random
   */
  private selectRandom(services: ServiceInfo[]): ServiceInfo {
    const randomIndex = Math.floor(Math.random() * services.length);
    return services[randomIndex];
  }

  /**
   * Algoritmo IP Hash (simulado)
   */
  private selectIPHash(services: ServiceInfo[]): ServiceInfo {
    // En una implementación real, esto usaría la IP del cliente
    const hash = Math.abs(this.simpleHash('client-ip-placeholder'));
    const index = hash % services.length;
    return services[index];
  }

  /**
   * Algoritmo Health Based (basado en métricas de salud)
   */
  private selectHealthBased(services: ServiceInfo[]): ServiceInfo {
    let bestScore = -1;
    let selectedService = services[0];
    
    for (const service of services) {
      const stats = this.serviceStats.get(service.id);
      const healthScore = this.calculateHealthScore(service, stats);
      
      if (healthScore > bestScore) {
        bestScore = healthScore;
        selectedService = service;
      }
    }
    
    return selectedService;
  }

  /**
   * Calcula un score de salud para un servicio
   */
  private calculateHealthScore(service: ServiceInfo, stats?: ServiceStats): number {
    let score = 0;
    
    // Peso por estado de salud
    switch (service.health.status) {
      case 'healthy':
        score += 50;
        break;
      case 'warning':
        score += 25;
        break;
      case 'unhealthy':
        score += 0;
        break;
    }
    
    // Peso por success rate
    if (stats) {
      score += (stats.successRate / 100) * 30;
      
      // Peso por response time (menor es mejor)
      const responseTimePenalty = Math.min(stats.averageResponseTime / 1000, 10);
      score -= responseTimePenalty;
      
      // Peso por conexiones activas (menos es mejor)
      const connectionsPenalty = Math.min(stats.activeConnections / 10, 10);
      score -= connectionsPenalty;
    }
    
    return Math.max(score, 0);
  }

  /**
   * Hash simple para IP
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return hash;
  }

  /**
   * Actualiza estadísticas de servicio
   */
  private updateServiceStats(service: ServiceInfo): void {
    const stats = this.serviceStats.get(service.id);
    if (stats) {
      stats.activeConnections++;
      stats.lastUsed = new Date();
      this.serviceStats.set(service.id, stats);
    }
  }

  /**
   * Helper para logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      switch (level) {
        case 'debug':
          if ('debug' in this.logger) {
            (this.logger as any).debug(`[LoadBalancer] ${message}`, meta);
          }
          break;
        case 'info':
          if ('info' in this.logger) {
            (this.logger as any).info(`[LoadBalancer] ${message}`, meta);
          }
          break;
        case 'warn':
          if ('warn' in this.logger) {
            (this.logger as any).warn(`[LoadBalancer] ${message}`, meta);
          }
          break;
        case 'error':
          if ('error' in this.logger) {
            (this.logger as any).error(`[LoadBalancer] ${message}`, meta);
          }
          break;
      }
    } else if (level !== 'debug') {
      console.log(`[${level.toUpperCase()}] [LoadBalancer] ${message}`, meta || '');
    }
  }
}
