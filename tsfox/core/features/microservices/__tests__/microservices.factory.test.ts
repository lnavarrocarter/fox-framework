/**
 * Fox Framework - Microservices Factory Tests
 * Unit tests for microservices functionality
 */

import { MicroservicesFactory, createMicroservicesConfig } from '../microservices.factory';
import { ServiceInfo } from '../interfaces';

describe('MicroservicesFactory', () => {
  let factory: MicroservicesFactory;
  let config: any;

  beforeEach(() => {
    config = createMicroservicesConfig({
      serviceName: 'test-service',
      version: '1.0.0',
      registry: { type: 'memory' }
    });
    factory = MicroservicesFactory.create(config);
  });

  afterEach(async () => {
    await factory.destroy();
  });

  describe('Factory Creation', () => {
    it('should create a microservices factory instance', () => {
      expect(factory).toBeInstanceOf(MicroservicesFactory);
    });

    it('should return the same instance for same service name and version', () => {
      const factory2 = MicroservicesFactory.create(config);
      expect(factory).toBe(factory2);
    });

    it('should create different instances for different service names', () => {
      const config2 = createMicroservicesConfig({
        serviceName: 'different-service',
        version: '1.0.0'
      });
      const factory2 = MicroservicesFactory.create(config2);
      expect(factory).not.toBe(factory2);
    });
  });

  describe('Initialization', () => {
    it('should initialize all components successfully', async () => {
      await expect(factory.initialize()).resolves.not.toThrow();
    });

    it('should throw error when accessing components before initialization', () => {
      expect(() => factory.getServiceRegistry()).toThrow('Service registry not initialized');
      expect(() => factory.getLoadBalancer()).toThrow('Load balancer not initialized');
      expect(() => factory.getCircuitBreaker()).toThrow('Circuit breaker not initialized');
    });

    it('should provide access to components after initialization', async () => {
      await factory.initialize();
      
      expect(factory.getServiceRegistry()).toBeDefined();
      expect(factory.getLoadBalancer()).toBeDefined();
      expect(factory.getCircuitBreaker()).toBeDefined();
      expect(factory.getServiceMesh()).toBeDefined();
    });
  });

  describe('Service Registration', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should register a service successfully', async () => {
      const serviceInfo: Partial<ServiceInfo> = {
        name: 'test-service',
        version: '1.0.0',
        address: 'localhost',
        port: 3000,
        protocol: 'http'
      };

      await expect(factory.registerService(serviceInfo)).resolves.not.toThrow();
    });

    it('should discover registered services', async () => {
      const serviceInfo: Partial<ServiceInfo> = {
        name: 'discoverable-service',
        version: '1.0.0',
        address: 'localhost',
        port: 3001,
        protocol: 'http'
      };

      await factory.registerService(serviceInfo);
      const services = await factory.discoverServices('discoverable-service');
      
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('discoverable-service');
    });
  });

  describe('Configuration', () => {
    it('should create default configuration', () => {
      const defaultConfig = createMicroservicesConfig({});
      
      expect(defaultConfig.serviceName).toBe('fox-service');
      expect(defaultConfig.version).toBe('1.0.0');
      expect(defaultConfig.registry.type).toBe('memory');
      expect(defaultConfig.loadBalancer.algorithm).toBe('round-robin');
      expect(defaultConfig.circuitBreaker.failureThreshold).toBe(5);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = createMicroservicesConfig({
        serviceName: 'custom-service',
        loadBalancer: { 
          algorithm: 'weighted',
          healthCheck: true,
          retries: 3
        },
        circuitBreaker: { 
          failureThreshold: 10,
          recoveryTimeout: 5000,
          monitoringPeriod: 1000,
          expectedExceptions: []
        }
      });
      
      expect(customConfig.serviceName).toBe('custom-service');
      expect(customConfig.loadBalancer.algorithm).toBe('weighted');
      expect(customConfig.loadBalancer.healthCheck).toBe(true); // default
      expect(customConfig.circuitBreaker.failureThreshold).toBe(10);
      expect(customConfig.circuitBreaker.recoveryTimeout).toBe(5000); // custom value
    });
  });

  describe('Service Communication', () => {
    beforeEach(async () => {
      await factory.initialize();
    });

    it('should make service calls with circuit breaker protection', async () => {
      const request = {
        service: 'target-service',
        method: 'GET',
        path: '/api/data',
        headers: {}
      };

      // Mock a service for discovery
      await factory.registerService({
        id: 'target-service-1',
        name: 'target-service',
        version: '1.0.0',
        address: 'localhost',
        port: 3002,
        protocol: 'http',
        health: { 
          status: 'healthy', 
          lastCheck: new Date(),
          checks: []
        }
      });

      const response = await factory.callService('target-service', request);
      
      expect(response).toBeDefined();
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
