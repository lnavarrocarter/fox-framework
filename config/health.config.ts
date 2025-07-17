// Health Check Configuration - Fox Framework
import { HealthCheckConfig } from '@foxframework/core';

export const healthConfig: HealthCheckConfig = {
  endpoint: {
    port: 3001,
    path: '/health',
    readyPath: '/health/ready',
    livePath: '/health/live'
  },
  checks: {
    memory: true,
    uptime: true
  },
  thresholds: {
    memory: 0.9,        // 90% memory usage
    cpu: 0.8,           // 80% CPU usage
    responseTime: 5000  // 5 second timeout
  },
  timeout: 30000,       // 30 second health check timeout
  retries: 3
};

export default healthConfig;
