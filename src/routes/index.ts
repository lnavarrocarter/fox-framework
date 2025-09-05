import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { HealthChecker, createHealthCheckMiddleware, defaultHealthChecks } from '../../tsfox/core/health/health-check';
import { PerformanceFactory } from '../../tsfox/core/performance/performance.factory';

const router = Router();

// Initialize health checker
const healthChecker = new HealthChecker(
  '1.0.0',
  { service: 'fox-framework-demo' }
);

// Register default health checks
healthChecker.addCheck('memory', defaultHealthChecks.memory);
healthChecker.addCheck('uptime', defaultHealthChecks.uptime);
healthChecker.addCheck('cpu', defaultHealthChecks.cpu);
healthChecker.addCheck('disk', defaultHealthChecks.disk);
healthChecker.addCheck('environment', defaultHealthChecks.environment);

// Create health check middleware
const healthMiddleware = createHealthCheckMiddleware(healthChecker);

// Health check routes
router.get('/health', healthMiddleware.full);
router.get('/health/ready', healthMiddleware.ready);
router.get('/health/live', healthMiddleware.live);

// Initialize metrics collector from performance factory
const performance = PerformanceFactory.getInstance();

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metricsCollector = performance.getMetricsCollector();
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

// User routes (explicit binding instead of non-existent internal router)
const userController = new UserController();
router.get('/user', (req, res) => userController.index(req, res));
router.get('/user/:id', (req, res) => userController.show(req, res));
router.post('/user', (req, res) => userController.store(req, res));
router.put('/user/:id', (req, res) => userController.update(req, res));
router.delete('/user/:id', (req, res) => userController.destroy(req, res));

// Add your routes here

export default router;
