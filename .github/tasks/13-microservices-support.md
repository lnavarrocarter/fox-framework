# 📋 Task #13: Soporte para Microservicios

## 🎯 Objetivo

Implementar soporte completo para arquitectura de microservicios con service discovery, load balancing, circuit breakers, distributed tracing, y herramientas de gestión distribuida.

## 📋 Criterios de Aceptación

### Core Microservices Features

- [ ] **Service Registry**: Registro y descubrimiento de servicios
- [ ] **Load Balancing**: Balanceador de carga con múltiples algoritmos
- [ ] **Circuit Breaker**: Protección contra fallos en cascada
- [ ] **API Gateway**: Gateway centralizado con routing inteligente
- [ ] **Service Mesh**: Comunicación inter-servicio segura
- [ ] **Health Checks**: Monitoreo de salud distribuido
- [ ] **Configuration Management**: Configuración distribuida

### Communication Patterns

- [ ] **HTTP/REST**: Cliente HTTP optimizado para microservicios
- [ ] **gRPC Support**: Comunicación de alta performance
- [ ] **Message Queues**: Async messaging (RabbitMQ, Apache Kafka)
- [ ] **Event Sourcing**: Eventos distribuidos entre servicios
- [ ] **SAGA Pattern**: Transacciones distribuidas
- [ ] **Request/Response**: Patrones síncronos y asíncronos

### Observability & Management

- [ ] **Distributed Tracing**: Tracing de requests cross-service
- [ ] **Centralized Logging**: Agregación de logs distribuidos
- [ ] **Metrics Collection**: Métricas distribuidas
- [ ] **Service Monitoring**: Dashboard de servicios
- [ ] **Alerting**: Sistema de alertas distribuidas

## 🏗️ Arquitectura Propuesta

### Estructura de Archivos

```text
tsfox/core/features/microservices/
├── microservices.factory.ts      # Factory principal
├── service-registry/
│   ├── registry.ts               # Service registry core
│   ├── discovery.ts              # Service discovery
│   ├── consul.adapter.ts         # Consul adapter
│   └── etcd.adapter.ts           # etcd adapter
├── load-balancer/
│   ├── load.balancer.ts          # Load balancer core
│   ├── algorithms/
│   │   ├── round.robin.ts        # Round robin
│   │   ├── weighted.ts           # Weighted load balancing
│   │   └── least.connections.ts  # Least connections
│   └── health.checker.ts         # Health check integration
├── circuit-breaker/
│   ├── circuit.breaker.ts        # Circuit breaker implementation
│   ├── failure.detector.ts       # Failure detection
│   └── recovery.strategy.ts      # Recovery strategies
├── api-gateway/
│   ├── gateway.ts                # API Gateway core
│   ├── routing.engine.ts         # Intelligent routing
│   ├── rate.limiter.ts           # Rate limiting
│   ├── auth.middleware.ts        # Authentication
│   └── response.aggregator.ts    # Response aggregation
├── communication/
│   ├── http.client.ts            # HTTP client with features
│   ├── grpc.client.ts            # gRPC client
│   ├── message.queue.ts          # Message queue abstraction
│   └── event.bus.ts              # Distributed event bus
├── observability/
│   ├── tracing.ts                # Distributed tracing
│   ├── metrics.collector.ts      # Metrics collection
│   ├── log.aggregator.ts         # Log aggregation
│   └── health.monitor.ts         # Health monitoring
└── patterns/
    ├── saga.pattern.ts           # SAGA implementation
    ├── bulkhead.pattern.ts       # Bulkhead isolation
    └── retry.pattern.ts          # Retry patterns
```

### Interfaces Principales

```typescript
// microservices.interface.ts
export interface ServiceRegistryInterface {
  register(service: ServiceInfo): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInfo[]>;
  watch(serviceName: string, callback: ServiceWatcher): Promise<void>;
  getHealth(serviceId: string): Promise<HealthStatus>;
}

export interface LoadBalancerInterface {
  selectService(serviceName: string): Promise<ServiceInfo>;
  updateServices(serviceName: string, services: ServiceInfo[]): void;
  setAlgorithm(algorithm: LoadBalancingAlgorithm): void;
  getStats(): LoadBalancerStats;
}

export interface CircuitBreakerInterface {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): CircuitBreakerState;
  getMetrics(): CircuitBreakerMetrics;
  reset(): void;
}

export interface APIGatewayInterface {
  route(request: GatewayRequest): Promise<GatewayResponse>;
  addRoute(route: RouteDefinition): void;
  removeRoute(routeId: string): void;
  getRoutes(): RouteDefinition[];
}

export interface ServiceMeshInterface {
  proxy(request: ServiceRequest): Promise<ServiceResponse>;
  configureTLS(config: TLSConfig): void;
  enableMTLS(): void;
  getServiceGraph(): ServiceGraph;
}
```

### Tipos y Configuración

```typescript
// microservices.types.ts
export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  address: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  metadata: Record<string, any>;
  health: HealthStatus;
  tags: string[];
  weight?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'warning';
  lastCheck: Date;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  output?: string;
  duration?: number;
}

export type LoadBalancingAlgorithm = 
  | 'round-robin' 
  | 'weighted' 
  | 'least-connections' 
  | 'random' 
  | 'ip-hash';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedExceptions: string[];
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface RouteDefinition {
  id: string;
  path: string;
  method: string;
  service: string;
  rewrite?: string;
  middleware?: string[];
  timeout?: number;
  retries?: number;
}

export interface ServiceRequest {
  service: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
}
```

## 💻 Ejemplos de Implementación

### Service Registry

```typescript
// service-registry/registry.ts
export class ServiceRegistry implements ServiceRegistryInterface {
  private services = new Map<string, ServiceInfo>();
  private watchers = new Map<string, ServiceWatcher[]>();
  private healthChecker: HealthChecker;

  constructor(private adapter: RegistryAdapter) {
    this.healthChecker = new HealthChecker();
    this.startHealthChecking();
  }

  async register(service: ServiceInfo): Promise<void> {
    // Validate service info
    this.validateServiceInfo(service);

    // Register with backend
    await this.adapter.register(service);

    // Store locally
    this.services.set(service.id, service);

    // Start health checking
    this.healthChecker.monitor(service);

    // Notify watchers
    this.notifyWatchers(service.name, 'registered', service);

    console.log(`Service registered: ${service.name}@${service.version}`);
  }

  async deregister(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // Deregister from backend
    await this.adapter.deregister(serviceId);

    // Remove locally
    this.services.delete(serviceId);

    // Stop health checking
    this.healthChecker.unmonitor(serviceId);

    // Notify watchers
    this.notifyWatchers(service.name, 'deregistered', service);

    console.log(`Service deregistered: ${service.name}`);
  }

  async discover(serviceName: string): Promise<ServiceInfo[]> {
    // Get from backend
    const services = await this.adapter.discover(serviceName);

    // Filter healthy services
    return services.filter(service => 
      service.health.status === 'healthy'
    );
  }

  async watch(serviceName: string, callback: ServiceWatcher): Promise<void> {
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
  }

  async getHealth(serviceId: string): Promise<HealthStatus> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    return this.healthChecker.checkHealth(service);
  }

  private async startHealthChecking(): Promise<void> {
    setInterval(async () => {
      for (const service of this.services.values()) {
        try {
          const health = await this.healthChecker.checkHealth(service);
          
          if (health.status !== service.health.status) {
            service.health = health;
            await this.adapter.updateHealth(service.id, health);
            this.notifyWatchers(service.name, 'health-changed', service);
          }
        } catch (error) {
          console.error(`Health check failed for ${service.name}:`, error);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private notifyWatchers(
    serviceName: string,
    event: ServiceEvent,
    service: ServiceInfo
  ): void {
    const watchers = this.watchers.get(serviceName) || [];
    
    for (const watcher of watchers) {
      try {
        watcher(event, service);
      } catch (error) {
        console.error('Watcher error:', error);
      }
    }
  }

  private validateServiceInfo(service: ServiceInfo): void {
    if (!service.name || !service.address || !service.port) {
      throw new Error('Invalid service info: name, address, and port are required');
    }
  }
}

type ServiceEvent = 'registered' | 'deregistered' | 'health-changed';
type ServiceWatcher = (event: ServiceEvent, service: ServiceInfo) => void;
```

### Circuit Breaker

```typescript
// circuit-breaker/circuit.breaker.ts
export class CircuitBreaker implements CircuitBreakerInterface {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private metrics: CircuitBreakerMetrics;

  constructor(private config: CircuitBreakerConfig) {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      stateChanges: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;

    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.metrics.stateChanges++;
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is open');
      }
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      
      this.onSuccess();
      this.metrics.successfulRequests++;
      this.metrics.averageResponseTime = this.updateAverageResponseTime(
        Date.now() - startTime
      );

      return result;

    } catch (error) {
      this.onFailure();
      this.metrics.failedRequests++;

      if (this.isExpectedException(error)) {
        // Don't count expected exceptions as failures
        return Promise.reject(error);
      }

      throw error;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.metrics.stateChanges++;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      
      if (this.successCount >= this.config.failureThreshold) {
        this.state = 'closed';
        this.successCount = 0;
        this.metrics.stateChanges++;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      this.successCount = 0;
      this.metrics.stateChanges++;
    } else if (this.state === 'closed' && 
               this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.metrics.stateChanges++;
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private isExpectedException(error: any): boolean {
    if (!this.config.expectedExceptions) {
      return false;
    }

    return this.config.expectedExceptions.some(exceptionType =>
      error.constructor.name === exceptionType || 
      error.name === exceptionType
    );
  }

  private updateAverageResponseTime(responseTime: number): number {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    return (totalTime + responseTime) / this.metrics.totalRequests;
  }
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  stateChanges: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
```

### API Gateway

```typescript
// api-gateway/gateway.ts
export class APIGateway implements APIGatewayInterface {
  private routes = new Map<string, RouteDefinition>();
  private loadBalancer: LoadBalancerInterface;
  private circuitBreakers = new Map<string, CircuitBreakerInterface>();
  private rateLimiter: RateLimiterInterface;

  constructor(
    loadBalancer: LoadBalancerInterface,
    rateLimiter: RateLimiterInterface
  ) {
    this.loadBalancer = loadBalancer;
    this.rateLimiter = rateLimiter;
  }

  async route(request: GatewayRequest): Promise<GatewayResponse> {
    const route = this.matchRoute(request.path, request.method);
    if (!route) {
      return {
        statusCode: 404,
        body: { error: 'Route not found' },
        headers: {}
      };
    }

    // Rate limiting
    if (!await this.rateLimiter.isAllowed(request.clientId, route.id)) {
      return {
        statusCode: 429,
        body: { error: 'Rate limit exceeded' },
        headers: {}
      };
    }

    // Get circuit breaker for service
    let circuitBreaker = this.circuitBreakers.get(route.service);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringPeriod: 60000,
        expectedExceptions: ['NotFoundError']
      });
      this.circuitBreakers.set(route.service, circuitBreaker);
    }

    try {
      return await circuitBreaker.execute(async () => {
        return this.forwardRequest(request, route);
      });

    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          statusCode: 503,
          body: { error: 'Service temporarily unavailable' },
          headers: {}
        };
      }

      throw error;
    }
  }

  addRoute(route: RouteDefinition): void {
    this.routes.set(this.getRouteKey(route.path, route.method), route);
  }

  removeRoute(routeId: string): void {
    for (const [key, route] of this.routes) {
      if (route.id === routeId) {
        this.routes.delete(key);
        break;
      }
    }
  }

  getRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  private matchRoute(path: string, method: string): RouteDefinition | null {
    // Simple exact match - in production, use more sophisticated routing
    const key = this.getRouteKey(path, method);
    return this.routes.get(key) || null;
  }

  private async forwardRequest(
    request: GatewayRequest,
    route: RouteDefinition
  ): Promise<GatewayResponse> {
    // Get service instance
    const service = await this.loadBalancer.selectService(route.service);
    if (!service) {
      throw new Error(`No healthy instances for service: ${route.service}`);
    }

    // Build target URL
    const targetPath = route.rewrite || request.path;
    const targetUrl = `${service.protocol}://${service.address}:${service.port}${targetPath}`;

    // Forward request
    const httpClient = new HTTPClient({
      timeout: route.timeout || 30000,
      retries: route.retries || 3
    });

    const response = await httpClient.request({
      method: request.method,
      url: targetUrl,
      headers: {
        ...request.headers,
        'X-Forwarded-For': request.clientIp,
        'X-Gateway-Route': route.id
      },
      body: request.body
    });

    return {
      statusCode: response.status,
      body: response.data,
      headers: response.headers
    };
  }

  private getRouteKey(path: string, method: string): string {
    return `${method.toUpperCase()}:${path}`;
  }
}

export interface GatewayRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  clientId: string;
  clientIp: string;
}

export interface GatewayResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}
```

### SAGA Pattern Implementation

```typescript
// patterns/saga.pattern.ts
export class SagaOrchestrator {
  private steps: SagaStep[] = [];
  private compensations: Map<string, CompensationAction> = new Map();
  private executedSteps: string[] = [];

  constructor(private eventBus: EventBusInterface) {}

  addStep(step: SagaStep): this {
    this.steps.push(step);
    if (step.compensation) {
      this.compensations.set(step.id, step.compensation);
    }
    return this;
  }

  async execute(sagaId: string, initialData: any): Promise<SagaResult> {
    const saga: SagaExecution = {
      id: sagaId,
      status: 'running',
      currentStep: 0,
      data: initialData,
      startedAt: new Date(),
      executedSteps: []
    };

    try {
      await this.eventBus.emit({
        type: 'SagaStarted',
        aggregateId: sagaId,
        data: saga,
        metadata: { source: 'saga-orchestrator' }
      });

      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        saga.currentStep = i;

        try {
          const result = await this.executeStep(step, saga.data);
          saga.data = { ...saga.data, ...result };
          saga.executedSteps.push(step.id);
          this.executedSteps.push(step.id);

          await this.eventBus.emit({
            type: 'SagaStepCompleted',
            aggregateId: sagaId,
            data: { stepId: step.id, result },
            metadata: { source: 'saga-orchestrator' }
          });

        } catch (error) {
          await this.compensate(sagaId, saga.data);
          
          saga.status = 'failed';
          saga.error = error.message;
          saga.completedAt = new Date();

          await this.eventBus.emit({
            type: 'SagaFailed',
            aggregateId: sagaId,
            data: saga,
            metadata: { source: 'saga-orchestrator' }
          });

          return {
            success: false,
            sagaId,
            error: error.message,
            data: saga.data
          };
        }
      }

      saga.status = 'completed';
      saga.completedAt = new Date();

      await this.eventBus.emit({
        type: 'SagaCompleted',
        aggregateId: sagaId,
        data: saga,
        metadata: { source: 'saga-orchestrator' }
      });

      return {
        success: true,
        sagaId,
        data: saga.data
      };

    } catch (error) {
      await this.compensate(sagaId, saga.data);
      throw error;
    }
  }

  private async executeStep(step: SagaStep, data: any): Promise<any> {
    const client = new HTTPClient();
    
    const response = await client.request({
      method: step.method,
      url: step.url,
      headers: step.headers,
      body: this.prepareStepData(step, data)
    });

    if (response.status >= 400) {
      throw new Error(`Step ${step.id} failed: ${response.statusText}`);
    }

    return response.data;
  }

  private async compensate(sagaId: string, data: any): Promise<void> {
    // Execute compensations in reverse order
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const stepId = this.executedSteps[i];
      const compensation = this.compensations.get(stepId);

      if (compensation) {
        try {
          await this.executeCompensation(compensation, data);

          await this.eventBus.emit({
            type: 'SagaCompensated',
            aggregateId: sagaId,
            data: { stepId, compensation: compensation.id },
            metadata: { source: 'saga-orchestrator' }
          });

        } catch (error) {
          console.error(`Compensation failed for step ${stepId}:`, error);
          
          await this.eventBus.emit({
            type: 'SagaCompensationFailed',
            aggregateId: sagaId,
            data: { stepId, error: error.message },
            metadata: { source: 'saga-orchestrator' }
          });
        }
      }
    }
  }

  private async executeCompensation(
    compensation: CompensationAction,
    data: any
  ): Promise<void> {
    const client = new HTTPClient();
    
    await client.request({
      method: compensation.method,
      url: compensation.url,
      headers: compensation.headers,
      body: this.prepareCompensationData(compensation, data)
    });
  }

  private prepareStepData(step: SagaStep, data: any): any {
    if (step.dataMapper) {
      return step.dataMapper(data);
    }
    return data;
  }

  private prepareCompensationData(compensation: CompensationAction, data: any): any {
    if (compensation.dataMapper) {
      return compensation.dataMapper(data);
    }
    return data;
  }
}

export interface SagaStep {
  id: string;
  name: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  dataMapper?: (data: any) => any;
  compensation?: CompensationAction;
}

export interface CompensationAction {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  dataMapper?: (data: any) => any;
}

export interface SagaExecution {
  id: string;
  status: 'running' | 'completed' | 'failed';
  currentStep: number;
  data: any;
  startedAt: Date;
  completedAt?: Date;
  executedSteps: string[];
  error?: string;
}

export interface SagaResult {
  success: boolean;
  sagaId: string;
  data: any;
  error?: string;
}
```

## 🧪 Plan de Testing

### Tests Unitarios

```typescript
// __tests__/microservices/circuit.breaker.test.ts
describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 5000,
      monitoringPeriod: 60000,
      expectedExceptions: ['NotFoundError']
    });
  });

  test('should be closed initially', () => {
    expect(circuitBreaker.getState()).toBe('closed');
  });

  test('should open after failure threshold', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));

    // Execute failing operations
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe('open');
  });

  test('should transition to half-open after recovery timeout', async () => {
    // Force open state
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('Failure')));
      } catch (error) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe('open');

    // Fast forward time
    jest.advanceTimersByTime(6000);

    // Next operation should transition to half-open
    try {
      await circuitBreaker.execute(() => Promise.resolve('success'));
    } catch (error) {
      // Doesn't matter for this test
    }

    expect(circuitBreaker.getState()).toBe('half-open');
  });
});
```

### Integration Tests

```typescript
// __tests__/microservices/integration.test.ts
describe('Microservices Integration', () => {
  let serviceRegistry: ServiceRegistry;
  let loadBalancer: LoadBalancer;
  let apiGateway: APIGateway;

  beforeEach(async () => {
    // Setup microservices infrastructure
    serviceRegistry = new ServiceRegistry(new MemoryRegistryAdapter());
    loadBalancer = new LoadBalancer(serviceRegistry, 'round-robin');
    apiGateway = new APIGateway(loadBalancer, new RateLimiter());

    // Register test services
    await serviceRegistry.register({
      id: 'user-service-1',
      name: 'user-service',
      version: '1.0.0',
      address: 'localhost',
      port: 3001,
      protocol: 'http',
      metadata: {},
      health: { status: 'healthy', lastCheck: new Date(), checks: [] },
      tags: ['users', 'api']
    });

    // Add routes to gateway
    apiGateway.addRoute({
      id: 'user-routes',
      path: '/api/users',
      method: 'GET',
      service: 'user-service'
    });
  });

  test('should route requests through gateway', async () => {
    const request: GatewayRequest = {
      path: '/api/users',
      method: 'GET',
      headers: {},
      clientId: 'test-client',
      clientIp: '127.0.0.1'
    };

    // Mock HTTP client
    jest.spyOn(HTTPClient.prototype, 'request').mockResolvedValue({
      status: 200,
      data: [{ id: 1, name: 'John Doe' }],
      headers: {}
    });

    const response = await apiGateway.route(request);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: 'John Doe' }]);
  });

  test('should handle service discovery and load balancing', async () => {
    // Register multiple instances
    await serviceRegistry.register({
      id: 'user-service-2',
      name: 'user-service',
      version: '1.0.0',
      address: 'localhost',
      port: 3002,
      protocol: 'http',
      metadata: {},
      health: { status: 'healthy', lastCheck: new Date(), checks: [] },
      tags: ['users', 'api']
    });

    // Test load balancing
    const service1 = await loadBalancer.selectService('user-service');
    const service2 = await loadBalancer.selectService('user-service');

    expect(service1.port).not.toBe(service2.port); // Round robin should alternate
  });
});
```

## ✅ Definition of Done

- [ ] Service registry con discovery funcionando
- [ ] Load balancer con múltiples algoritmos
- [ ] Circuit breaker implementado y testeado
- [ ] API Gateway operativo con routing
- [ ] SAGA pattern para transacciones distribuidas
- [ ] Distributed tracing implementado
- [ ] Health checks distribuidos
- [ ] Message queue integration
- [ ] Tests unitarios e integración >90% cobertura
- [ ] Documentation completa de microservicios

## 🔗 Dependencias

### Precedentes

- [10-event-system.md](./10-event-system.md) - Para eventos distribuidos
- [11-database-abstraction.md](./11-database-abstraction.md) - Para datos distribuidos
- [08-performance-optimization.md](./08-performance-optimization.md) - Para performance

### Dependientes

- [15-monitoring-metrics.md](./15-monitoring-metrics.md) - Monitoreo distribuido
- [16-cloud-deployment.md](./16-cloud-deployment.md) - Deploy de microservicios

## 📅 Estimación

**Tiempo estimado**: 12-15 días  
**Complejidad**: Muy Alta  
**Prioridad**: Enhancement

## 📊 Métricas de Éxito

- Service discovery latency <10ms
- Load balancer efficiency >99%
- Circuit breaker accuracy >95%
- API Gateway throughput >50k req/s
- SAGA completion rate >99%
- Zero data loss en transacciones distribuidas
