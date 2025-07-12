/**
 * Fox Framework - Service Registry Tests
 * Unit tests for service registry functionality
 */

import { ServiceRegistry } from '../service-registry/registry';
import { MemoryAdapter } from '../service-registry/memory.adapter';
import { ServiceInfo, HealthStatus } from '../interfaces';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    registry = new ServiceRegistry(adapter);
  });

  afterEach(async () => {
    await registry.destroy();
    adapter.clear();
  });

  const createMockService = (overrides: Partial<ServiceInfo> = {}): ServiceInfo => ({
    id: 'test-service-1',
    name: 'test-service',
    version: '1.0.0',
    address: 'localhost',
    port: 3000,
    protocol: 'http',
    metadata: {},
    health: {
      status: 'healthy',
      lastCheck: new Date(),
      checks: []
    },
    tags: ['test'],
    weight: 1,
    ...overrides
  });

  describe('Service Registration', () => {
    it('should register a service successfully', async () => {
      const service = createMockService();
      
      await expect(registry.register(service)).resolves.not.toThrow();
    });

    it('should throw error for invalid service info', async () => {
      const invalidService = createMockService({ id: '' });
      
      await expect(registry.register(invalidService)).rejects.toThrow('Service ID is required');
    });

    it('should validate required fields', async () => {
      const tests = [
        { field: 'name', value: '', error: 'Service name is required' },
        { field: 'version', value: '', error: 'Service version is required' },
        { field: 'address', value: '', error: 'Service address is required' },
        { field: 'port', value: 0, error: 'Valid service port is required' },
        { field: 'protocol', value: 'invalid', error: 'Service protocol must be http, https, or grpc' }
      ];

      for (const test of tests) {
        const service = createMockService({ [test.field]: test.value } as any);
        await expect(registry.register(service)).rejects.toThrow(test.error);
      }
    });
  });

  describe('Service Discovery', () => {
    it('should discover registered services', async () => {
      const service = createMockService();
      await registry.register(service);
      
      const discovered = await registry.discover('test-service');
      
      expect(discovered).toHaveLength(1);
      expect(discovered[0].id).toBe(service.id);
      expect(discovered[0].name).toBe(service.name);
    });

    it('should return empty array for non-existent services', async () => {
      const discovered = await registry.discover('non-existent-service');
      expect(discovered).toHaveLength(0);
    });

    it('should filter unhealthy services', async () => {
      const healthyService = createMockService({ id: 'healthy-1' });
      const unhealthyService = createMockService({ 
        id: 'unhealthy-1',
        health: {
          status: 'unhealthy',
          lastCheck: new Date(),
          checks: []
        }
      });

      await registry.register(healthyService);
      await registry.register(unhealthyService);
      
      const discovered = await registry.discover('test-service');
      
      expect(discovered).toHaveLength(1);
      expect(discovered[0].id).toBe('healthy-1');
    });
  });

  describe('Service Deregistration', () => {
    it('should deregister a service successfully', async () => {
      const service = createMockService();
      await registry.register(service);
      
      await expect(registry.deregister(service.id)).resolves.not.toThrow();
      
      const discovered = await registry.discover('test-service');
      expect(discovered).toHaveLength(0);
    });

    it('should throw error for non-existent service', async () => {
      await expect(registry.deregister('non-existent')).rejects.toThrow('Service non-existent not found');
    });
  });

  describe('Health Monitoring', () => {
    it('should check service health', async () => {
      const service = createMockService();
      await registry.register(service);
      
      const health = await registry.getHealth(service.id);
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|unhealthy|warning/);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent service health check', async () => {
      await expect(registry.getHealth('non-existent')).rejects.toThrow('Service non-existent not found');
    });
  });

  describe('Service Watching', () => {
    it('should notify watchers on service registration', async () => {
      const watcherCallback = jest.fn();
      
      await registry.watch('test-service', watcherCallback);
      
      const service = createMockService();
      await registry.register(service);
      
      // Give some time for the callback to be executed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(watcherCallback).toHaveBeenCalledWith('registered', service);
    });

    it('should notify watchers on service deregistration', async () => {
      const service = createMockService();
      await registry.register(service);
      
      const watcherCallback = jest.fn();
      await registry.watch('test-service', watcherCallback);
      
      await registry.deregister(service.id);
      
      // Give some time for the callback to be executed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(watcherCallback).toHaveBeenCalledWith('deregistered', service);
    });
  });

  describe('Registry Metrics', () => {
    it('should provide registry metrics', async () => {
      const service1 = createMockService({ id: 'service-1' });
      const service2 = createMockService({ 
        id: 'service-2', 
        health: { 
          status: 'unhealthy', 
          lastCheck: new Date(), 
          checks: [] 
        } 
      });

      await registry.register(service1);
      await registry.register(service2);
      
      const metrics = registry.getMetrics();
      
      expect(metrics.totalServices).toBe(2);
      expect(metrics.healthyServices).toBe(1);
      expect(metrics.unhealthyServices).toBe(1);
      expect(metrics.servicesByName['test-service']).toBe(2);
    });
  });
});
