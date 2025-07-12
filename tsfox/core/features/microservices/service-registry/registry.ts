/**
 * Fox Framework - Service Registry
 * Core service registry implementation for service discovery
 */

import { 
  ServiceRegistryInterface,
  ServiceInfo,
  ServiceWatcher,
  ServiceEvent,
  HealthStatus,
  RegistryAdapter,
  ServiceRegistrationError,
  ServiceDiscoveryError
} from '../interfaces';
import { HealthChecker } from './health.checker';
import { ILogger } from '../../../logging/interfaces';

/**
 * Implementación principal del service registry
 */
export class ServiceRegistry implements ServiceRegistryInterface {
  private services = new Map<string, ServiceInfo>();
  private watchers = new Map<string, ServiceWatcher[]>();
  private healthChecker: HealthChecker;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private adapter: RegistryAdapter,
    private logger?: ILogger
  ) {
    this.healthChecker = new HealthChecker(logger);
    this.startHealthChecking();
  }

  /**
   * Registra un servicio en el registry
   */
  async register(service: ServiceInfo): Promise<void> {
    try {
      // Validate service info
      this.validateServiceInfo(service);

      // Register with backend adapter
      await this.adapter.register(service);

      // Store locally for fast access
      this.services.set(service.id, { ...service });

      // Start health monitoring
      this.healthChecker.monitor(service);

      // Notify watchers
      this.notifyWatchers(service.name, 'registered', service);

      this.log('info', `Service registered: ${service.name}@${service.version} (${service.id})`);
    } catch (error) {
      const errorMsg = `Failed to register service ${service.name}: ${error}`;
      this.log('error', errorMsg);
      throw new ServiceRegistrationError(errorMsg, service.id);
    }
  }

  /**
   * Desregistra un servicio del registry
   */
  async deregister(serviceId: string): Promise<void> {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }

      // Deregister from backend adapter
      await this.adapter.deregister(serviceId);

      // Remove from local storage
      this.services.delete(serviceId);

      // Stop health monitoring
      this.healthChecker.unmonitor(serviceId);

      // Notify watchers
      this.notifyWatchers(service.name, 'deregistered', service);

      this.log('info', `Service deregistered: ${service.name} (${serviceId})`);
    } catch (error) {
      const errorMsg = `Failed to deregister service ${serviceId}: ${error}`;
      this.log('error', errorMsg);
      throw new ServiceRegistrationError(errorMsg, serviceId);
    }
  }

  /**
   * Descubre servicios por nombre
   */
  async discover(serviceName: string): Promise<ServiceInfo[]> {
    try {
      // Get services from backend adapter
      const services = await this.adapter.discover(serviceName);

      // Filter only healthy services
      const healthyServices = services.filter(service => 
        service.health.status === 'healthy'
      );

      // Update local cache
      for (const service of services) {
        this.services.set(service.id, service);
      }

      this.log('debug', `Discovered ${healthyServices.length} healthy services for ${serviceName}`);
      return healthyServices;
    } catch (error) {
      const errorMsg = `Failed to discover services for ${serviceName}: ${error}`;
      this.log('error', errorMsg);
      throw new ServiceDiscoveryError(errorMsg, serviceName);
    }
  }

  /**
   * Registra un watcher para cambios en servicios
   */
  async watch(serviceName: string, callback: ServiceWatcher): Promise<void> {
    try {
      // Add to local watchers
      if (!this.watchers.has(serviceName)) {
        this.watchers.set(serviceName, []);
      }
      
      this.watchers.get(serviceName)!.push(callback);

      // Start watching in backend if first watcher
      if (this.watchers.get(serviceName)!.length === 1) {
        await this.adapter.watch(serviceName, (event, service) => {
          this.notifyWatchers(serviceName, event, service);
        });
      }

      this.log('debug', `Watcher added for service: ${serviceName}`);
    } catch (error) {
      this.log('error', `Failed to add watcher for ${serviceName}: ${error}`);
      throw error;
    }
  }

  /**
   * Obtiene el estado de salud de un servicio
   */
  async getHealth(serviceId: string): Promise<HealthStatus> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new ServiceDiscoveryError(`Service ${serviceId} not found`, serviceId);
    }

    // Get fresh health status
    const health = await this.healthChecker.checkHealth(service);
    
    // Update local cache
    service.health = health;
    this.services.set(serviceId, service);

    return health;
  }

  /**
   * Obtiene todos los servicios registrados
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Obtiene servicios por tag
   */
  getServicesByTag(tag: string): ServiceInfo[] {
    return Array.from(this.services.values()).filter(service => 
      service.tags.includes(tag)
    );
  }

  /**
   * Obtiene métricas del registry
   */
  getMetrics() {
    const services = Array.from(this.services.values());
    const healthyCount = services.filter(s => s.health.status === 'healthy').length;
    const unhealthyCount = services.filter(s => s.health.status === 'unhealthy').length;
    const warningCount = services.filter(s => s.health.status === 'warning').length;

    return {
      totalServices: services.length,
      healthyServices: healthyCount,
      unhealthyServices: unhealthyCount,
      warningServices: warningCount,
      servicesByName: this.groupServicesByName(),
      watchers: Array.from(this.watchers.keys()),
      uptime: this.getUptime()
    };
  }

  /**
   * Destruye el registry y limpia recursos
   */
  async destroy(): Promise<void> {
    this.log('info', 'Destroying service registry...');

    // Stop health checking
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop health checker
    this.healthChecker.destroy();

    // Clear watchers
    this.watchers.clear();

    // Clear services
    this.services.clear();

    this.log('info', 'Service registry destroyed');
  }

  /**
   * Inicia el chequeo periódico de salud
   */
  private async startHealthChecking(): Promise<void> {
    this.healthCheckInterval = setInterval(async () => {
      for (const service of this.services.values()) {
        try {
          const previousHealth = service.health.status;
          const currentHealth = await this.healthChecker.checkHealth(service);
          
          if (currentHealth.status !== previousHealth) {
            service.health = currentHealth;
            this.services.set(service.id, service);
            
            // Update in backend
            await this.adapter.updateHealth(service.id, currentHealth);
            
            // Notify watchers
            this.notifyWatchers(service.name, 'health-changed', service);
            
            this.log('info', 
              `Health status changed for ${service.name}: ${previousHealth} -> ${currentHealth.status}`
            );
          }
        } catch (error) {
          this.log('error', `Health check failed for ${service.name}: ${error}`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Notifica a los watchers sobre cambios
   */
  private notifyWatchers(
    serviceName: string,
    event: ServiceEvent,
    service: ServiceInfo
  ): void {
    const watchers = this.watchers.get(serviceName);
    if (watchers) {
      for (const watcher of watchers) {
        try {
          watcher(event, service);
        } catch (error) {
          this.log('error', `Watcher notification failed for ${serviceName}: ${error}`);
        }
      }
    }
  }

  /**
   * Valida la información del servicio
   */
  private validateServiceInfo(service: ServiceInfo): void {
    if (!service.id) {
      throw new Error('Service ID is required');
    }
    if (!service.name) {
      throw new Error('Service name is required');
    }
    if (!service.version) {
      throw new Error('Service version is required');
    }
    if (!service.address) {
      throw new Error('Service address is required');
    }
    if (!service.port || service.port <= 0 || service.port > 65535) {
      throw new Error('Valid service port is required (1-65535)');
    }
    if (!['http', 'https', 'grpc'].includes(service.protocol)) {
      throw new Error('Service protocol must be http, https, or grpc');
    }
  }

  /**
   * Agrupa servicios por nombre
   */
  private groupServicesByName(): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const service of this.services.values()) {
      grouped[service.name] = (grouped[service.name] || 0) + 1;
    }
    
    return grouped;
  }

  /**
   * Obtiene el uptime del registry
   */
  private getUptime(): number {
    // Esta sería la implementación real del uptime
    return Date.now() - (global as any).registryStartTime || Date.now();
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
            (this.logger as any).debug(`[ServiceRegistry] ${message}`, meta);
          }
          break;
        case 'info':
          if ('info' in this.logger) {
            (this.logger as any).info(`[ServiceRegistry] ${message}`, meta);
          }
          break;
        case 'warn':
          if ('warn' in this.logger) {
            (this.logger as any).warn(`[ServiceRegistry] ${message}`, meta);
          }
          break;
        case 'error':
          if ('error' in this.logger) {
            (this.logger as any).error(`[ServiceRegistry] ${message}`, meta);
          }
          break;
      }
    } else if (level !== 'debug') { // No mostrar debug en console
      console.log(`[${level.toUpperCase()}] [ServiceRegistry] ${message}`, meta || '');
    }
  }
}
