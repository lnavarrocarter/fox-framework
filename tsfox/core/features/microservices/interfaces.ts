/**
 * Fox Framework - Microservices Support
 * Interfaces and types for microservices architecture
 */

// ==================== Core Service Interfaces ====================

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

export interface HealthCheckerInterface {
  monitor(service: ServiceInfo): void;
  unmonitor(serviceId: string): void;
  checkHealth(service: ServiceInfo): Promise<HealthStatus>;
}

// ==================== Service Information ====================

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
  endpoints?: ServiceEndpoint[];
}

export interface ServiceEndpoint {
  path: string;
  method: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'warning';
  lastCheck: Date;
  checks: HealthCheck[];
  uptime?: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  output?: string;
  duration?: number;
  componentType?: string;
}

// ==================== Load Balancing ====================

export type LoadBalancingAlgorithm = 
  | 'round-robin' 
  | 'weighted' 
  | 'least-connections' 
  | 'random' 
  | 'ip-hash'
  | 'health-based';

export interface LoadBalancerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  serviceStats: Map<string, ServiceStats>;
}

export interface ServiceStats {
  serviceId: string;
  requests: number;
  successRate: number;
  averageResponseTime: number;
  activeConnections: number;
  lastUsed: Date;
}

// ==================== Circuit Breaker ====================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedExceptions: string[];
  halfOpenMaxCalls?: number;
  minimumThroughput?: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  failureRate: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

// ==================== API Gateway ====================

export interface RouteDefinition {
  id: string;
  path: string;
  method: string;
  service: string;
  rewrite?: string;
  middleware?: string[];
  timeout?: number;
  retries?: number;
  circuitBreaker?: CircuitBreakerConfig;
  rateLimit?: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: any) => string;
}

export interface GatewayRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  correlationId?: string;
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
  service: string;
}

// ==================== Service Communication ====================

export interface ServiceRequest {
  service: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  correlationId?: string;
}

export interface ServiceResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
  fromCache?: boolean;
}

// ==================== Service Mesh ====================

export interface TLSConfig {
  cert: string;
  key: string;
  ca?: string;
  verify?: boolean;
}

export interface ServiceGraph {
  services: ServiceNode[];
  connections: ServiceConnection[];
}

export interface ServiceNode {
  id: string;
  name: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'warning';
}

export interface ServiceConnection {
  from: string;
  to: string;
  protocol: string;
  requestRate: number;
  errorRate: number;
}

// ==================== Registry Adapters ====================

export interface RegistryAdapter {
  register(service: ServiceInfo): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInfo[]>;
  watch(serviceName: string, callback: (event: ServiceEvent, service: ServiceInfo) => void): Promise<void>;
  updateHealth(serviceId: string, health: HealthStatus): Promise<void>;
}

export type ServiceEvent = 'registered' | 'deregistered' | 'health-changed' | 'updated';

export type ServiceWatcher = (event: ServiceEvent, service: ServiceInfo) => void;

// ==================== Configuration ====================

export interface MicroservicesConfig {
  serviceName: string;
  version: string;
  registry: {
    type: 'consul' | 'etcd' | 'memory';
    host?: string;
    port?: number;
    options?: Record<string, any>;
  };
  loadBalancer: {
    algorithm: LoadBalancingAlgorithm;
    healthCheck: boolean;
    retries: number;
  };
  circuitBreaker: CircuitBreakerConfig;
  gateway?: {
    enabled: boolean;
    port: number;
    routes: RouteDefinition[];
  };
  observability: {
    tracing: boolean;
    metrics: boolean;
    logging: boolean;
  };
}

// ==================== Factory Context ====================

export interface MicroserviceFactoryContext {
  config: MicroservicesConfig;
  serviceRegistry?: ServiceRegistryInterface;
  loadBalancer?: LoadBalancerInterface;
  circuitBreaker?: CircuitBreakerInterface;
  gateway?: APIGatewayInterface;
  mesh?: ServiceMeshInterface;
}

// ==================== Error Types ====================

export class ServiceRegistrationError extends Error {
  constructor(message: string, public serviceId: string) {
    super(message);
    this.name = 'ServiceRegistrationError';
  }
}

export class ServiceDiscoveryError extends Error {
  constructor(message: string, public serviceName: string) {
    super(message);
    this.name = 'ServiceDiscoveryError';
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string, public serviceName: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class LoadBalancerError extends Error {
  constructor(message: string, public serviceName: string) {
    super(message);
    this.name = 'LoadBalancerError';
  }
}
