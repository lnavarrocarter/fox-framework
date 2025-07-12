/**
 * Fox Framework - Microservices Factory
 * Main factory for creating and managing microservices infrastructure
 */

import { 
  MicroservicesConfig, 
  MicroserviceFactoryContext,
  ServiceRegistryInterface,
  LoadBalancerInterface,
  CircuitBreakerInterface,
  APIGatewayInterface,
  ServiceMeshInterface
} from './interfaces';
import { ServiceRegistry } from './service-registry/registry';
import { LoadBalancer } from './load-balancer/load.balancer';
import { CircuitBreaker } from './circuit-breaker/circuit.breaker';
import { APIGateway } from './api-gateway/gateway';
import { ServiceMesh } from './service-mesh/mesh';
import { ConsulAdapter } from './service-registry/consul.adapter';
import { EtcdAdapter } from './service-registry/etcd.adapter';
import { MemoryAdapter } from './service-registry/memory.adapter';
import { ILogger } from '../../logging/interfaces';

/**
 * Factory principal para crear y gestionar infraestructura de microservicios
 */
export class MicroservicesFactory {
  private static instances = new Map<string, MicroservicesFactory>();
  private context: MicroserviceFactoryContext;
  private logger?: ILogger;

  private constructor(config: MicroservicesConfig, logger?: ILogger) {
    this.logger = logger;
    this.context = {
      config
    };
  }

  /**
   * Crea o obtiene una instancia de la factory de microservicios
   */
  static create(config: MicroservicesConfig, logger?: ILogger): MicroservicesFactory {
    const key = `${config.serviceName}:${config.version}`;
    
    if (!this.instances.has(key)) {
      const factory = new MicroservicesFactory(config, logger);
      this.instances.set(key, factory);
    }

    return this.instances.get(key)!;
  }

  /**
   * Obtiene una instancia existente
   */
  static getInstance(serviceName: string, version: string): MicroservicesFactory | undefined {
    const key = `${serviceName}:${version}`;
    return this.instances.get(key);
  }

  /**
   * Inicializa todos los componentes de microservicios
   */
  async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing microservices infrastructure...');

      // Initialize service registry
      await this.initializeServiceRegistry();

      // Initialize load balancer
      await this.initializeLoadBalancer();

      // Initialize circuit breaker
      await this.initializeCircuitBreaker();

      // Initialize API gateway if enabled
      if (this.context.config.gateway?.enabled) {
        await this.initializeAPIGateway();
      }

      // Initialize service mesh
      await this.initializeServiceMesh();

      this.log('info', 'Microservices infrastructure initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize microservices infrastructure', error);
      throw error;
    }
  }

  /**
   * Obtiene el service registry
   */
  getServiceRegistry(): ServiceRegistryInterface {
    if (!this.context.serviceRegistry) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }
    return this.context.serviceRegistry;
  }

  /**
   * Obtiene el load balancer
   */
  getLoadBalancer(): LoadBalancerInterface {
    if (!this.context.loadBalancer) {
      throw new Error('Load balancer not initialized. Call initialize() first.');
    }
    return this.context.loadBalancer;
  }

  /**
   * Obtiene el circuit breaker
   */
  getCircuitBreaker(): CircuitBreakerInterface {
    if (!this.context.circuitBreaker) {
      throw new Error('Circuit breaker not initialized. Call initialize() first.');
    }
    return this.context.circuitBreaker;
  }

  /**
   * Obtiene el API gateway
   */
  getAPIGateway(): APIGatewayInterface {
    if (!this.context.gateway) {
      throw new Error('API gateway not initialized or not enabled.');
    }
    return this.context.gateway;
  }

  /**
   * Obtiene el service mesh
   */
  getServiceMesh(): ServiceMeshInterface {
    if (!this.context.mesh) {
      throw new Error('Service mesh not initialized. Call initialize() first.');
    }
    return this.context.mesh;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): MicroservicesConfig {
    return this.context.config;
  }

  /**
   * Registra el servicio actual en el registry
   */
  async registerService(serviceInfo: Partial<import('./interfaces').ServiceInfo>): Promise<void> {
    const registry = this.getServiceRegistry();
    
    const fullServiceInfo: import('./interfaces').ServiceInfo = {
      id: serviceInfo.id || `${this.context.config.serviceName}-${Date.now()}`,
      name: serviceInfo.name || this.context.config.serviceName,
      version: serviceInfo.version || this.context.config.version,
      address: serviceInfo.address || 'localhost',
      port: serviceInfo.port || 3000,
      protocol: serviceInfo.protocol || 'http',
      metadata: serviceInfo.metadata || {},
      health: serviceInfo.health || {
        status: 'healthy',
        lastCheck: new Date(),
        checks: []
      },
      tags: serviceInfo.tags || [],
      weight: serviceInfo.weight || 1,
      endpoints: serviceInfo.endpoints || []
    };

    await registry.register(fullServiceInfo);
    this.log('info', `Service registered: ${fullServiceInfo.name}@${fullServiceInfo.version}`);
  }

  /**
   * Desregistra el servicio actual
   */
  async deregisterService(serviceId: string): Promise<void> {
    const registry = this.getServiceRegistry();
    await registry.deregister(serviceId);
    this.log('info', `Service deregistered: ${serviceId}`);
  }

  /**
   * Descubre servicios por nombre
   */
  async discoverServices(serviceName: string): Promise<import('./interfaces').ServiceInfo[]> {
    const registry = this.getServiceRegistry();
    return await registry.discover(serviceName);
  }

  /**
   * Hace una llamada a otro servicio con load balancing y circuit breaker
   */
  async callService(
    serviceName: string, 
    request: import('./interfaces').ServiceRequest
  ): Promise<import('./interfaces').ServiceResponse> {
    const registry = this.getServiceRegistry();
    const loadBalancer = this.getLoadBalancer();
    const circuitBreaker = this.getCircuitBreaker();

    return await circuitBreaker.execute(async () => {
      // Primero descubrir los servicios disponibles
      const services = await registry.discover(serviceName);
      
      if (services.length === 0) {
        throw new Error(`No services found for ${serviceName}`);
      }

      // Actualizar el load balancer con los servicios descubiertos
      loadBalancer.updateServices(serviceName, services);
      
      // Seleccionar un servicio usando load balancing
      const service = await loadBalancer.selectService(serviceName);
      
      // Aquí iría la lógica de HTTP client
      // Por ahora retornamos un mock
      return {
        statusCode: 200,
        headers: {},
        body: { success: true },
        duration: 100
      };
    });
  }

  /**
   * Destruye la instancia y limpia recursos
   */
  async destroy(): Promise<void> {
    this.log('info', 'Destroying microservices infrastructure...');

    // Cleanup components
    // TODO: Implement cleanup logic for each component

    const key = `${this.context.config.serviceName}:${this.context.config.version}`;
    MicroservicesFactory.instances.delete(key);

    this.log('info', 'Microservices infrastructure destroyed');
  }

  /**
   * Inicializa el service registry
   */
  private async initializeServiceRegistry(): Promise<void> {
    const { registry } = this.context.config;
    let adapter;

    switch (registry.type) {
      case 'consul':
        adapter = new ConsulAdapter({
          host: registry.host || 'localhost',
          port: registry.port || 8500,
          ...registry.options
        });
        break;
      
      case 'etcd':
        adapter = new EtcdAdapter({
          host: registry.host || 'localhost',
          port: registry.port || 2379,
          ...registry.options
        });
        break;
      
      case 'memory':
      default:
        adapter = new MemoryAdapter();
        break;
    }

    this.context.serviceRegistry = new ServiceRegistry(adapter, this.logger);
    this.log('info', `Service registry initialized with ${registry.type} adapter`);
  }

  /**
   * Inicializa el load balancer
   */
  private async initializeLoadBalancer(): Promise<void> {
    const { loadBalancer } = this.context.config;
    
    this.context.loadBalancer = new LoadBalancer({
      algorithm: loadBalancer.algorithm,
      healthCheck: loadBalancer.healthCheck,
      retries: loadBalancer.retries
    }, this.logger);

    this.log('info', `Load balancer initialized with ${loadBalancer.algorithm} algorithm`);
  }

  /**
   * Inicializa el circuit breaker
   */
  private async initializeCircuitBreaker(): Promise<void> {
    const { circuitBreaker } = this.context.config;
    
    this.context.circuitBreaker = new CircuitBreaker(circuitBreaker, this.logger);
    this.log('info', 'Circuit breaker initialized');
  }

  /**
   * Inicializa el API gateway
   */
  private async initializeAPIGateway(): Promise<void> {
    const gateway = this.context.config.gateway!;
    
    this.context.gateway = new APIGateway({
      port: gateway.port,
      routes: gateway.routes,
      serviceRegistry: this.context.serviceRegistry!,
      loadBalancer: this.context.loadBalancer!,
      circuitBreaker: this.context.circuitBreaker!
    }, this.logger);

    this.log('info', `API gateway initialized on port ${gateway.port}`);
  }

  /**
   * Inicializa el service mesh
   */
  private async initializeServiceMesh(): Promise<void> {
    this.context.mesh = new ServiceMesh({
      serviceRegistry: this.context.serviceRegistry!
    }, this.logger);

    this.log('info', 'Service mesh initialized');
  }

  /**
   * Helper para logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      (this.logger as any).log(level, `[MicroservicesFactory] ${message}`, meta);
    } else {
      console.log(`[${level.toUpperCase()}] [MicroservicesFactory] ${message}`, meta || '');
    }
  }
}

/**
 * Helper function para crear configuración de microservicios con defaults
 */
export function createMicroservicesConfig(config: Partial<MicroservicesConfig>): MicroservicesConfig {
  return {
    serviceName: config.serviceName || 'fox-service',
    version: config.version || '1.0.0',
    registry: {
      type: 'memory',
      ...config.registry
    },
    loadBalancer: {
      algorithm: 'round-robin',
      healthCheck: true,
      retries: 3,
      ...config.loadBalancer
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000,
      expectedExceptions: ['Error', 'TimeoutError'],
      halfOpenMaxCalls: 3,
      minimumThroughput: 10,
      ...config.circuitBreaker
    },
    gateway: config.gateway,
    observability: {
      tracing: false,
      metrics: false,
      logging: false,
      ...config.observability
    }
  };
}
