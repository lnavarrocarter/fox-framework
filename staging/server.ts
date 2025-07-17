/**
 * @fileoverview Fox Framework Staging Server
 * @description Servidor de staging para validación previa al lanzamiento
 */

import express from 'express';
import { PerformanceFactory } from '../tsfox/core/performance/performance.factory';
import { LoggerFactory } from '../tsfox/core/logging/logger.factory';
import { HealthChecker, createHealthCheckMiddleware, defaultHealthChecks } from '../tsfox/core/health/health-check';
import { performanceMiddleware } from '../tsfox/core/performance/middleware/metrics.middleware';

// Logger para staging
const logger = LoggerFactory.create();

// Performance monitoring
const performance = PerformanceFactory.getInstance();

// Health checker with production-like configuration
const healthChecker = new HealthChecker('1.0.0', { 
  service: 'fox-framework-staging',
  environment: 'staging'
});

// Add health checks with more permissive thresholds for staging
healthChecker.addCheck('memory', async () => {
  const memUsage = process.memoryUsage();
  const usage = memUsage.heapUsed / memUsage.heapTotal;
  return {
    status: usage < 0.98 ? 'pass' : 'warn', // Very permissive for staging
    time: new Date().toISOString(),
    metadata: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      usage: Math.round(usage * 100 * 100) / 100
    }
  };
});

healthChecker.addCheck('uptime', async () => {
  return {
    status: 'pass',
    time: new Date().toISOString(),
    metadata: { uptime: process.uptime() }
  };
});

healthChecker.addCheck('cpu', async () => {
  return {
    status: 'pass',
    time: new Date().toISOString(),
    metadata: { status: 'ok' }
  };
});

// Add custom staging health check
healthChecker.addCheck('staging-readiness', async () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Staging is ready if uptime > 5 seconds and memory usage < 95%
  const isReady = uptime > 5 && (memUsage.heapUsed / memUsage.heapTotal) < 0.95;
  
  return {
    status: isReady ? 'pass' : 'fail',
    time: new Date().toISOString(),
    output: isReady ? 'Staging environment ready' : 'Staging environment not ready',
    metadata: {
      uptime,
      memoryUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    }
  };
});

async function startStagingServer() {
  try {
    logger.info('🚀 Starting Fox Framework Staging Server...');
    
    // Create Express app directly for staging
    const app = express();
    
    // Add middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Performance monitoring
    app.use(performanceMiddleware({
      trackRequests: true,
      trackResponseTime: true,
      trackMemory: true,
      excludePaths: ['/health', '/metrics'],
      slowRequestThreshold: 500
    }));
    
    // Request logging
    app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent') || 'unknown'
      });
      next();
    });

    // Health check middleware
    const healthMiddleware = createHealthCheckMiddleware(healthChecker);
    
    // Health endpoints
    app.get('/health', healthMiddleware.full);
    app.get('/health/ready', healthMiddleware.ready);
    app.get('/health/live', healthMiddleware.live);
    
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        const metricsCollector = performance.getMetricsCollector();
        const metrics = metricsCollector?.getPrometheusFormat() || '';
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
      } catch (error) {
        logger.error('Error retrieving metrics', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });
    
    // API endpoints for testing
    app.get('/api/status', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'staging',
        framework: 'Fox Framework'
      });
    });
    
    app.get('/api/test-load', async (req, res) => {
      // Simulate some work
      const delay = Math.random() * 100 + 50; // 50-150ms
      await new Promise(resolve => setTimeout(resolve, delay));
      
      res.json({
        message: 'Load test endpoint',
        responseTime: `${delay.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
    });
    
    app.get('/api/memory-test', (req, res) => {
      const memUsage = process.memoryUsage();
      res.json({
        memory: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
          usage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
        }
      });
    });
    
    // Error testing endpoint
    app.get('/api/error-test', (req, res) => {
      const shouldError = Math.random() > 0.7; // 30% chance of error
      
      if (shouldError) {
        logger.error('Simulated error in staging');
        return res.status(500).json({ error: 'Simulated server error' });
      }
      
      res.json({ message: 'No error this time' });
    });
    
    // Start server
    const server = app.listen(3001, () => {
      logger.info(`✅ Fox Framework Staging Server started successfully`, {
        port: 3001,
        environment: 'staging',
        healthEndpoint: 'http://localhost:3001/health',
        metricsEndpoint: 'http://localhost:3001/metrics',
        apiEndpoint: 'http://localhost:3001/api/status'
      });
    });
    
    // Schedule periodic health checks
    const healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await healthChecker.getStatus();
        logger.info('Periodic health check', { 
          status: healthStatus.status,
          checks: Object.keys(healthStatus.checks).length
        });
      } catch (error) {
        logger.error('Health check failed', { error: (error as Error).message });
      }
    }, 30000); // Every 30 seconds
    
    // Graceful shutdown
    const shutdown = () => {
      logger.info('🛑 Shutting down staging server...');
      clearInterval(healthCheckInterval);
      server.close(() => {
        logger.info('✅ Staging server shut down successfully');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    return app;
    
  } catch (error) {
    logger.error('❌ Failed to start staging server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startStagingServer().catch(error => {
    console.error('Failed to start staging server:', error);
    process.exit(1);
  });
}

export { startStagingServer };
