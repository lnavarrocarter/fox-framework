/**
 * Fox Framework - Consul Registry Adapter
 * Consul implementation of service registry adapter
 */

import { 
  RegistryAdapter, 
  ServiceInfo, 
  ServiceEvent, 
  HealthStatus 
} from '../interfaces';

interface ConsulConfig {
  host: string;
  port: number;
  token?: string;
  datacenter?: string;
  [key: string]: any;
}

/**
 * Adapter para Consul service registry
 * Nota: Esta es una implementación mock para demostración
 * En producción se usaría el cliente oficial de Consul
 */
export class ConsulAdapter implements RegistryAdapter {
  private config: ConsulConfig;
  private watchers = new Map<string, ((event: ServiceEvent, service: ServiceInfo) => void)[]>();

  constructor(config: ConsulConfig) {
    this.config = config;
  }

  /**
   * Registra un servicio en Consul
   */
  async register(service: ServiceInfo): Promise<void> {
    // En una implementación real, esto haría una llamada HTTP a Consul
    console.log(`[ConsulAdapter] Registering service ${service.name} with Consul at ${this.config.host}:${this.config.port}`);
    
    // Simular el registro en Consul
    await this.mockConsulCall('PUT', `/v1/agent/service/register`, {
      ID: service.id,
      Name: service.name,
      Tags: service.tags,
      Address: service.address,
      Port: service.port,
      Check: {
        HTTP: `${service.protocol}://${service.address}:${service.port}/health`,
        Interval: '10s',
        Timeout: '3s'
      },
      Meta: service.metadata
    });

    // Notify watchers
    this.notifyWatchers(service.name, 'registered', service);
  }

  /**
   * Desregistra un servicio de Consul
   */
  async deregister(serviceId: string): Promise<void> {
    console.log(`[ConsulAdapter] Deregistering service ${serviceId} from Consul`);
    
    // Simular la desregistración en Consul
    await this.mockConsulCall('PUT', `/v1/agent/service/deregister/${serviceId}`);
  }

  /**
   * Descubre servicios por nombre en Consul
   */
  async discover(serviceName: string): Promise<ServiceInfo[]> {
    console.log(`[ConsulAdapter] Discovering services for ${serviceName} from Consul`);
    
    // Simular la consulta a Consul
    const response = await this.mockConsulCall('GET', `/v1/health/service/${serviceName}?passing=true`);
    
    // Convertir respuesta de Consul a ServiceInfo[]
    return this.consulResponseToServiceInfo(response);
  }

  /**
   * Registra un watcher para cambios en servicios
   */
  async watch(
    serviceName: string, 
    callback: (event: ServiceEvent, service: ServiceInfo) => void
  ): Promise<void> {
    console.log(`[ConsulAdapter] Setting up watch for ${serviceName} in Consul`);
    
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, []);
    }
    
    this.watchers.get(serviceName)!.push(callback);

    // En una implementación real, esto configuraría un watch de Consul
    // await consul.watch({
    //   method: consul.health.service,
    //   options: { service: serviceName, passing: true }
    // });
  }

  /**
   * Actualiza el estado de salud de un servicio
   */
  async updateHealth(serviceId: string, health: HealthStatus): Promise<void> {
    console.log(`[ConsulAdapter] Updating health for ${serviceId} in Consul`);
    
    // En Consul, la salud se maneja automáticamente por los health checks
    // Pero podríamos actualizar el estado manualmente si es necesario
    const checkStatus = health.status === 'healthy' ? 'pass' : 'fail';
    
    await this.mockConsulCall('PUT', `/v1/agent/check/update/${serviceId}`, {
      Status: checkStatus,
      Output: health.checks.map(c => c.output).join('; ')
    });
  }

  /**
   * Simula una llamada HTTP a Consul
   */
  private async mockConsulCall(method: string, endpoint: string, data?: any): Promise<any> {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    console.log(`[ConsulAdapter] ${method} ${endpoint}`, data ? JSON.stringify(data, null, 2) : '');
    
    // Simular respuestas de Consul
    if (endpoint.includes('/health/service/')) {
      return this.mockServiceDiscoveryResponse();
    }
    
    return { success: true };
  }

  /**
   * Simula respuesta de descubrimiento de servicios de Consul
   */
  private mockServiceDiscoveryResponse(): any[] {
    return [
      {
        Node: {
          ID: 'node1',
          Node: 'consul-node-1',
          Address: '192.168.1.10'
        },
        Service: {
          ID: 'service-instance-1',
          Service: 'user-service',
          Tags: ['api', 'v1'],
          Address: '192.168.1.20',
          Port: 3001,
          Meta: { version: '1.0.0' }
        },
        Checks: [
          {
            CheckID: 'service:service-instance-1',
            Status: 'passing',
            Output: 'HTTP GET http://192.168.1.20:3001/health: 200 OK Output: {"status":"healthy"}'
          }
        ]
      }
    ];
  }

  /**
   * Convierte respuesta de Consul a ServiceInfo[]
   */
  private consulResponseToServiceInfo(consulResponse: any[]): ServiceInfo[] {
    return consulResponse.map(entry => ({
      id: entry.Service.ID,
      name: entry.Service.Service,
      version: entry.Service.Meta?.version || '1.0.0',
      address: entry.Service.Address,
      port: entry.Service.Port,
      protocol: 'http' as const,
      metadata: entry.Service.Meta || {},
      health: {
        status: entry.Checks.every((c: any) => c.Status === 'passing') ? 'healthy' as const : 'unhealthy' as const,
        lastCheck: new Date(),
        checks: entry.Checks.map((c: any) => ({
          name: c.CheckID,
          status: c.Status === 'passing' ? 'pass' as const : 'fail' as const,
          output: c.Output
        }))
      },
      tags: entry.Service.Tags || [],
      weight: 1
    }));
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
          console.error(`[ConsulAdapter] Watcher callback failed for ${serviceName}:`, error);
        }
      }
    }
  }
}
