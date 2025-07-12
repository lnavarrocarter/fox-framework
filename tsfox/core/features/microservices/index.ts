/**
 * Fox Framework - Microservices Module
 * Main export file for microservices functionality
 */

// Core interfaces and types
export * from './interfaces';

// Factory
export { MicroservicesFactory, createMicroservicesConfig } from './microservices.factory';

// Service Registry
export { ServiceRegistry } from './service-registry/registry';
export { HealthChecker } from './service-registry/health.checker';
export { MemoryAdapter } from './service-registry/memory.adapter';
export { ConsulAdapter } from './service-registry/consul.adapter';
export { EtcdAdapter } from './service-registry/etcd.adapter';

// Load Balancer
export { LoadBalancer } from './load-balancer/load.balancer';

// Circuit Breaker
export { CircuitBreaker } from './circuit-breaker/circuit.breaker';

// API Gateway
export { APIGateway } from './api-gateway/gateway';

// Service Mesh
export { ServiceMesh } from './service-mesh/mesh';
