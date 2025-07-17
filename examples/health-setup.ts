// Health Check Setup Example - Fox Framework
import { FoxFactory } from '@foxframework/core';
import { HealthChecker, createHealthCheckMiddleware, defaultHealthChecks } from '@foxframework/core/health';
import { healthConfig } from '../config/health.config';
import express from 'express';

const app = express();
const fox = new FoxFactory(app);

// Create health checker instance
const healthChecker = new HealthChecker();

// Add configured health checks
healthChecker.addCheck('memory', defaultHealthChecks.memory);
healthChecker.addCheck('uptime', defaultHealthChecks.uptime);

// Create health middleware
const healthMiddleware = createHealthCheckMiddleware(healthChecker);

// Register health endpoints
app.get('/health', healthMiddleware.full);
app.get('/health/ready', healthMiddleware.ready);
app.get('/health/live', healthMiddleware.live);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🦊 Fox Framework server with health checks running on port ${PORT}`);
  console.log(`🏥 Health endpoint: http://localhost:${PORT}/health`);
});

export { app, healthChecker };
