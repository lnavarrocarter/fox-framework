/**
 * Fox Framework - etcd Registry Adapter
 * etcd implementation of service registry adapter
 */

import { 
  RegistryAdapter, 
  ServiceInfo, 
  ServiceEvent, 
  HealthStatus 
} from '../interfaces';

interface EtcdConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  prefix?: string;
  [key: string]: any;
}

/**
 * Adapter para etcd service registry
 * Nota: Esta es una implementación mock para demostración
 * En producción se usaría el cliente oficial de etcd
 */
export class EtcdAdapter implements RegistryAdapter {
  private config: EtcdConfig;
  private watchers = new Map<string, ((event: ServiceEvent, service: ServiceInfo) => void)[]>();
  private keyPrefix: string;

  constructor(config: EtcdConfig) {
    this.config = config;
    this.keyPrefix = config.prefix || '/fox-services';
  }

  /**
   * Registra un servicio en etcd
   */
  async register(service: ServiceInfo): Promise<void> {
    console.log(`[EtcdAdapter] Registering service ${service.name} with etcd at ${this.config.host}:${this.config.port}`);
    
    const key = `${this.keyPrefix}/${service.name}/${service.id}`;
    const value = JSON.stringify({
      id: service.id,
      name: service.name,
      version: service.version,
      address: service.address,
      port: service.port,
      protocol: service.protocol,
      metadata: service.metadata,
      tags: service.tags,
      weight: service.weight,
      health: service.health,
      registeredAt: new Date().toISOString()
    });

    // Simular el registro en etcd
    await this.mockEtcdCall('PUT', key, value);

    // Notify watchers
    this.notifyWatchers(service.name, 'registered', service);
  }

  /**
   * Desregistra un servicio de etcd
   */
  async deregister(serviceId: string): Promise<void> {
    console.log(`[EtcdAdapter] Deregistering service ${serviceId} from etcd`);
    
    // Encontrar y eliminar la clave del servicio
    const keys = await this.mockEtcdCall('GET', `${this.keyPrefix}/`, { prefix: true });
    
    for (const key of keys) {
      const serviceData = await this.mockEtcdCall('GET', key);
      if (serviceData && JSON.parse(serviceData).id === serviceId) {
        await this.mockEtcdCall('DELETE', key);
        break;
      }
    }
  }

  /**
   * Descubre servicios por nombre en etcd
   */
  async discover(serviceName: string): Promise<ServiceInfo[]> {
    console.log(`[EtcdAdapter] Discovering services for ${serviceName} from etcd`);
    
    const keyPrefix = `${this.keyPrefix}/${serviceName}/`;
    const keys = await this.mockEtcdCall('GET', keyPrefix, { prefix: true });
    
    const services: ServiceInfo[] = [];
    
    for (const key of keys) {
      try {
        const serviceData = await this.mockEtcdCall('GET', key);
        if (serviceData) {
          const service = JSON.parse(serviceData);
          services.push(this.etcdDataToServiceInfo(service));
        }
      } catch (error) {
        console.error(`[EtcdAdapter] Failed to parse service data for key ${key}:`, error);
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
    console.log(`[EtcdAdapter] Setting up watch for ${serviceName} in etcd`);
    
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, []);
    }
    
    this.watchers.get(serviceName)!.push(callback);

    // En una implementación real, esto configuraría un watch de etcd
    // await etcd.watch()
    //   .key(`${this.keyPrefix}/${serviceName}/`)
    //   .prefix()
    //   .create()
    //   .then(watcher => {
    //     watcher.on('put', (res) => {
    //       // Handle service registration/update
    //     });
    //     watcher.on('delete', (res) => {
    //       // Handle service deregistration
    //     });
    //   });
  }

  /**
   * Actualiza el estado de salud de un servicio
   */
  async updateHealth(serviceId: string, health: HealthStatus): Promise<void> {
    console.log(`[EtcdAdapter] Updating health for ${serviceId} in etcd`);
    
    // Encontrar la clave del servicio y actualizar su estado de salud
    const keys = await this.mockEtcdCall('GET', `${this.keyPrefix}/`, { prefix: true });
    
    for (const key of keys) {
      const serviceData = await this.mockEtcdCall('GET', key);
      if (serviceData) {
        const service = JSON.parse(serviceData);
        if (service.id === serviceId) {
          service.health = health;
          service.lastHealthUpdate = new Date().toISOString();
          
          await this.mockEtcdCall('PUT', key, JSON.stringify(service));
          
          // Notify watchers
          this.notifyWatchers(service.name, 'health-changed', this.etcdDataToServiceInfo(service));
          break;
        }
      }
    }
  }

  /**
   * Simula una llamada a etcd
   */
  private async mockEtcdCall(method: string, key: string, value?: any): Promise<any> {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
    
    console.log(`[EtcdAdapter] ${method} ${key}`, value || '');
    
    // Simular respuestas de etcd
    if (method === 'GET' && value?.prefix) {
      return this.mockGetKeysWithPrefix(key);
    } else if (method === 'GET') {
      return this.mockGetValue(key);
    } else if (method === 'PUT') {
      return this.mockPutValue(key, value);
    } else if (method === 'DELETE') {
      return this.mockDeleteKey(key);
    }
    
    return null;
  }

  /**
   * Simula obtener claves con prefijo
   */
  private mockGetKeysWithPrefix(prefix: string): string[] {
    // Simular claves existentes
    return [
      `${prefix}user-service-1`,
      `${prefix}user-service-2`,
      `${prefix}order-service-1`
    ].filter(key => key.startsWith(prefix));
  }

  /**
   * Simula obtener valor de una clave
   */
  private mockGetValue(key: string): string | null {
    // Simular datos de servicio
    if (key.includes('user-service')) {
      return JSON.stringify({
        id: 'user-service-1',
        name: 'user-service',
        version: '1.0.0',
        address: '192.168.1.20',
        port: 3001,
        protocol: 'http',
        metadata: { region: 'us-east-1' },
        tags: ['api', 'v1'],
        weight: 1,
        health: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          checks: [
            {
              name: 'connectivity',
              status: 'pass',
              output: 'Service is reachable'
            }
          ]
        },
        registeredAt: new Date().toISOString()
      });
    }
    
    return null;
  }

  /**
   * Simula guardar valor en una clave
   */
  private mockPutValue(key: string, value: string): boolean {
    console.log(`[EtcdAdapter] Stored in ${key}:`, JSON.parse(value));
    return true;
  }

  /**
   * Simula eliminar una clave
   */
  private mockDeleteKey(key: string): boolean {
    console.log(`[EtcdAdapter] Deleted key: ${key}`);
    return true;
  }

  /**
   * Convierte datos de etcd a ServiceInfo
   */
  private etcdDataToServiceInfo(data: any): ServiceInfo {
    return {
      id: data.id,
      name: data.name,
      version: data.version,
      address: data.address,
      port: data.port,
      protocol: data.protocol,
      metadata: data.metadata || {},
      health: data.health || {
        status: 'healthy',
        lastCheck: new Date(),
        checks: []
      },
      tags: data.tags || [],
      weight: data.weight || 1,
      endpoints: data.endpoints || []
    };
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
          console.error(`[EtcdAdapter] Watcher callback failed for ${serviceName}:`, error);
        }
      }
    }
  }
}
