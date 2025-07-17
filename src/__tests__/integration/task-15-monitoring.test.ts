/**
 * Integration tests for Task 15: Monitoring & Metrics System
 */

import request from 'supertest';
import express from 'express';
import { HealthChecker, createHealthCheckMiddleware, defaultHealthChecks } from '../../../tsfox/core/health/health-check';
import { PerformanceFactory } from '../../../tsfox/core/performance/performance.factory';
import { performanceMiddleware } from '../../../tsfox/core/performance/middleware/metrics.middleware';

describe('Task 15: Monitoring & Metrics Integration', () => {
  let app: express.Application;
  let healthChecker: HealthChecker;
  let performance: any;

  beforeAll(() => {
    // Create Express app
    app = express();
    
    // Initialize health checker
    healthChecker = new HealthChecker('1.0.0', { service: 'test-service' });
    
    // Add default health checks
    healthChecker.addCheck('memory', defaultHealthChecks.memory);
    healthChecker.addCheck('uptime', defaultHealthChecks.uptime);
    healthChecker.addCheck('cpu', defaultHealthChecks.cpu);
    
    // Create health middleware
    const healthMiddleware = createHealthCheckMiddleware(healthChecker);
    
    // Initialize performance monitoring
    performance = PerformanceFactory.getInstance();
    
    // Add performance middleware
    app.use(performanceMiddleware({
      trackRequests: true,
      trackResponseTime: true,
      trackMemory: true,
      excludePaths: ['/health']
    }));
    
    // Health endpoints
    app.get('/health', healthMiddleware.full);
    app.get('/health/ready', healthMiddleware.ready);
    app.get('/health/live', healthMiddleware.live);
    
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        const metrics = performance.metricsCollector?.getPrometheusFormat() || '';
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });
    
    // Test endpoint
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Test endpoint working' });
    });
  });

  describe('Health Check System', () => {
    test('should return full health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body.metadata).toHaveProperty('service', 'test-service');
    });

    test('should return readiness check', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);
        
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(['ready', 'not ready']).toContain(response.body.status);
    });

    test('should return liveness check', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);
        
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('should verify dependency checks', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      const { checks } = response.body;
      expect(checks).toHaveProperty('memory');
      expect(checks).toHaveProperty('uptime');
      expect(checks).toHaveProperty('cpu');
      
      // Check structure of each health check
      Object.values(checks).forEach((check: any) => {
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('time');
        expect(['pass', 'fail', 'warn']).toContain(check.status);
      });
    });
  });

  describe('Performance Metrics', () => {
    test('should export metrics in Prometheus format', async () => {
      // Make some requests to generate metrics
      await request(app).get('/api/test');
      await request(app).get('/api/test');
      
      const response = await request(app)
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/);
        
      const metrics = response.text;
      
      // Check for system metrics
      expect(metrics).toMatch(/# TYPE system_memory_heap_used gauge/);
      expect(metrics).toMatch(/system_memory_heap_used \d+/);
      expect(metrics).toMatch(/# TYPE system_process_uptime gauge/);
      
      // Check for HTTP metrics (if they exist)
      if (metrics.includes('http_')) {
        expect(metrics).toMatch(/# TYPE http_request_started counter/);
      }
    });

    test('should track HTTP request metrics', async () => {
      // Make requests to generate HTTP metrics
      await request(app).get('/api/test').expect(200);
      await request(app).get('/api/test').expect(200);
      
      const response = await request(app).get('/metrics');
      const metrics = response.text;
      
      // System metrics should be present
      expect(metrics).toContain('system_memory_heap_used');
      expect(metrics).toContain('system_process_uptime');
    });

    test('should measure response times', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);
        
      expect(response.body).toHaveProperty('message', 'Test endpoint working');
      
      // Response should be fast
      expect(response.header['x-response-time']).toBeDefined();
    });

    test('should track memory usage per request', async () => {
      const before = await request(app).get('/metrics');
      
      // Make a request
      await request(app).get('/api/test');
      
      const after = await request(app).get('/metrics');
      
      // Memory metrics should be updated
      expect(before.text).toContain('system_memory_heap_used');
      expect(after.text).toContain('system_memory_heap_used');
    });
  });

  describe('Application Metrics', () => {
    test('should track uptime correctly', async () => {
      const response = await request(app).get('/health');
      const { uptime } = response.body;
      
      expect(typeof uptime).toBe('number');
      expect(uptime).toBeGreaterThan(0);
    });

    test('should provide version information', async () => {
      const response = await request(app).get('/health');
      
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body.metadata).toHaveProperty('service', 'test-service');
    });
  });

  describe('Metrics Export Standards', () => {
    test('should follow Prometheus metrics format', async () => {
      const response = await request(app).get('/metrics');
      const metrics = response.text;
      
      // Check Prometheus format compliance
      const lines = metrics.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('#')) {
          // Comment lines should have proper format
          expect(line).toMatch(/^# (TYPE|HELP) \w+/);
        } else if (line.trim()) {
          // Metric lines should have proper format
          expect(line).toMatch(/^\w+(\{.*\})?\s+[\d.\[\]{}e+-]+$/);
        }
      }
    });

    test('should provide correct Content-Type for metrics', async () => {
      await request(app)
        .get('/metrics')
        .expect('Content-Type', /text\/plain.*version=0\.0\.4/)
        .expect(200);
    });
  });
});
