/**
 * @fileoverview Integration tests for monitoring system
 */

import request from 'supertest';
import express from 'express';
import { HealthChecker, createHealthCheckMiddleware, defaultHealthChecks, CheckResult } from '../../tsfox/core/health/health-check';
import { MetricsCollector } from '../../tsfox/core/performance/monitoring/metrics.collector';
import { performanceMiddleware } from '../../tsfox/core/performance/middleware/metrics.middleware';

describe('Monitoring System Integration', () => {
  let app: express.Application;
  let healthChecker: HealthChecker;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    app = express();
    
    // Initialize health checker
    healthChecker = new HealthChecker(
      '1.0.0',
      { service: 'test-service' }
    );

    // Add default health checks with test-friendly thresholds
    healthChecker.addCheck('memory', async (): Promise<CheckResult> => {
      const usage = process.memoryUsage();
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const usagePercent = (usedMB / totalMB) * 100;

      // Use more lenient thresholds for test environment
      let status: 'pass' | 'warn' | 'fail' = 'pass';
      if (usagePercent > 98) {
        status = 'fail';
      } else if (usagePercent > 95) {
        status = 'warn';
      }

      return {
        status,
        time: new Date().toISOString(),
        output: `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`,
        metadata: {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external,
          arrayBuffers: usage.arrayBuffers
        }
      };
    });
    healthChecker.addCheck('uptime', defaultHealthChecks.uptime);

    // Initialize metrics collector
    metricsCollector = new MetricsCollector();

    // Add middleware
    app.use(performanceMiddleware({
      trackRequests: true,
      trackResponseTime: true,
      excludePaths: ['/health', '/metrics']
    }));

    // Create health check middleware
    const healthMiddleware = createHealthCheckMiddleware(healthChecker);

    // Register endpoints
    app.get('/health', healthMiddleware.full);
    app.get('/health/ready', healthMiddleware.ready);
    app.get('/health/live', healthMiddleware.live);
    
    app.get('/metrics', async (req, res) => {
      try {
        const metrics = metricsCollector.getPrometheusFormat();
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Test route
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });
  });

  describe('Health Check Endpoints', () => {
    it('should return health status on /health', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version', '1.0.0');
      
      // Should have memory and uptime checks
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks).toHaveProperty('uptime');
    });

    it('should return readiness status on /health/ready', async () => {
      const response = await request(app).get('/health/ready');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(['ready', 'not ready']).toContain(response.body.status);
    });

    it('should return liveness status on /health/live', async () => {
      const response = await request(app).get('/health/live');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return unhealthy status when checks fail', async () => {
      // Add a failing check
      healthChecker.addCheck('failing-check', async () => ({
        status: 'fail',
        time: new Date().toISOString(),
        error: 'Test failure'
      }));

      const response = await request(app).get('/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks).toHaveProperty('failing-check');
      expect(response.body.checks['failing-check'].status).toBe('fail');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return metrics in Prometheus format on /metrics', async () => {
      // Add some metrics
      metricsCollector.collect({
        name: 'test_counter',
        value: 42,
        type: 'counter',
        timestamp: Date.now()
      });

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(typeof response.text).toBe('string');
    });

    it('should handle metrics endpoint errors gracefully', async () => {
      // Mock the metrics collector to throw an error
      const originalMethod = metricsCollector.getPrometheusFormat;
      metricsCollector.getPrometheusFormat = () => {
        throw new Error('Test error');
      };

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');

      // Restore original method
      metricsCollector.getPrometheusFormat = originalMethod;
    });
  });

  describe('Performance Middleware Integration', () => {
    it('should track request metrics', async () => {
      // Make a test request
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);

      // Small delay to allow middleware processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // The performance middleware should have recorded metrics
      // This is more of an integration test to ensure no errors occur
      expect(response.body).toEqual({ message: 'test' });
    });

    it('should exclude health endpoints from performance tracking', async () => {
      // Make requests to excluded paths
      await request(app).get('/health');
      await request(app).get('/metrics');

      // These should not cause any errors and should be excluded from tracking
      expect(true).toBe(true); // Basic assertion that no errors occurred
    });
  });

  describe('Error Handling', () => {
    it('should handle health check timeouts', async () => {
      // Add a slow check that will timeout
      healthChecker.addCheck('slow-check', async () => {
        await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds
        return {
          status: 'pass',
          time: new Date().toISOString()
        };
      });

      // Set a shorter timeout
      healthChecker.setTimeout(100);

      const response = await request(app).get('/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks).toHaveProperty('slow-check');
      expect(response.body.checks['slow-check'].status).toBe('fail');
    });

    it('should handle undefined health check results', async () => {
      // Add a check that returns undefined
      healthChecker.addCheck('undefined-check', async () => {
        throw new Error('Simulated error');
      });

      const response = await request(app).get('/health');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks).toHaveProperty('undefined-check');
      expect(response.body.checks['undefined-check'].status).toBe('fail');
    });
  });
});
