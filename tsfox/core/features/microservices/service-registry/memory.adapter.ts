/**
 * Fox Framework - Memory Registry Adapter
 * In-memory implementation of service registry for development and testing
 */

import { 
  RegistryAdapter, 
  ServiceInfo, 
  ServiceEvent, 
  HealthStatus 
} from '../interfaces';

/**
 * Adapter de memoria para el service registry
 * Ideal para desarrollo y testing
 */
export class MemoryAdapter implements RegistryAdapter {
  private services = new Map<string, ServiceInfo>();
  private watchers = new Map<string, ((event: ServiceEvent, service: ServiceInfo) => void)[]>();

  /**
   * Registra un servicio en memoria
   */
  async register(service: ServiceInfo): Promise<void> {
    this.services.set(service.id, { ...service });
    
    // Notify watchers
    this.notifyWatchers(service.name, 'registered', service);
  }

  /**
   * Desregistra un servicio de memoria
   */
  async deregister(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      this.notifyWatchers(service.name, 'deregistered', service);
    }
  }

  /**
   * Descubre servicios por nombre
   */
  async discover(serviceName: string): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    
    for (const service of this.services.values()) {
      if (service.name === serviceName) {
        services.push({ ...service });
      }
    }
    
    return services;
  }

  /**
   * Registra un watcher para cambios en servicios
   */
  async watch(
    serviceName: string, 
    callback: (event: ServiceEvent, service: ServiceInfo) => void
  ): Promise<void> {
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, []);
    }
    
    this.watchers.get(serviceName)!.push(callback);
  }

  /**
   * Actualiza el estado de salud de un servicio
   */
  async updateHealth(serviceId: string, health: HealthStatus): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.health = health;
      this.services.set(serviceId, service);
      this.notifyWatchers(service.name, 'health-changed', service);
    }
  }

  /**
   * Obtiene todos los servicios (método auxiliar)
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Limpia todos los datos (método auxiliar para testing)
   */
  clear(): void {
    this.services.clear();
    this.watchers.clear();
  }

  /**
   * Notifica a los watchers sobre cambios
   */
  private notifyWatchers(
    serviceName: string, 
    event: ServiceEvent, 
    service: ServiceInfo
  ): void {
    const callbacks = this.watchers.get(serviceName);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event, service);
        } catch (error) {
          console.error(`Watcher callback failed for ${serviceName}:`, error);
        }
      }
    }
  }
}
