/**
 * Health Check System for Fox Framework
 * 
 * Provides comprehensive health monitoring capabilities including
 * system health checks, service dependencies, and status reporting.
 */

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: Record<string, CheckResult>;
  uptime: number;
  version?: string;
  metadata?: Record<string, any>;
}

export interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  time: string;
  output?: string;
  error?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export type HealthCheck = () => Promise<CheckResult>;

/**
 * Main Health Checker class
 */
export class HealthChecker {
  private checks = new Map<string, HealthCheck>();
  private startTime = Date.now();
  private defaultTimeout = 5000; // 5 seconds

  constructor(
    private version?: string,
    private metadata?: Record<string, any>
  ) {}

  /**
   * Add a health check
   */
  addCheck(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  /**
   * Remove a health check
   */
  removeCheck(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * Get overall health status
   */
  async getStatus(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const checks: Record<string, CheckResult> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // Run all health checks with timeout
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, check]) => {
        const startTime = Date.now();
        try {
          const result = await Promise.race([
            check(),
            new Promise<CheckResult>((_, reject) =>
              setTimeout(() => reject(new Error('Health check timeout')), this.defaultTimeout)
            )
          ]);

          // Add duration
          result.duration = Date.now() - startTime;
          checks[name] = result;

          // Update overall status
          if (result.status === 'fail') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'warn' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          checks[name] = {
            status: 'fail',
            time: timestamp,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          overallStatus = 'unhealthy';
        }
      }
    );

    await Promise.all(checkPromises);

    return {
      status: overallStatus,
      timestamp,
      checks,
      uptime: Date.now() - this.startTime,
      version: this.version || process.env.npm_package_version,
      metadata: this.metadata
    };
  }

  /**
   * Get simplified health status (for load balancers)
   */
  async getSimpleStatus(): Promise<{ status: string; timestamp: string }> {
    const healthStatus = await this.getStatus();
    return {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp
    };
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const status = await this.getStatus();
    return status.status === 'healthy';
  }

  /**
   * Set timeout for health checks
   */
  setTimeout(timeoutMs: number): void {
    this.defaultTimeout = timeoutMs;
  }

  /**
   * Get list of registered checks
   */
  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys());
  }
}

/**
 * Default health checks that can be used out of the box
 */
export const defaultHealthChecks = {
  /**
   * Memory usage check
   */
  memory: async (): Promise<CheckResult> => {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usagePercent = (usedMB / totalMB) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (usagePercent > 90) {
      status = 'fail';
    } else if (usagePercent > 70) {
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
  },

  /**
   * Process uptime check
   */
  uptime: async (): Promise<CheckResult> => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return {
      status: 'pass',
      time: new Date().toISOString(),
      output: `Uptime: ${hours}h ${minutes}m ${seconds}s`,
      metadata: { uptimeSeconds: uptime }
    };
  },

  /**
   * CPU usage check (basic)
   */
  cpu: async (): Promise<CheckResult> => {
    const usage = process.cpuUsage();
    const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds

    return {
      status: 'pass',
      time: new Date().toISOString(),
      output: `CPU usage: ${totalUsage.toFixed(2)}s`,
      metadata: {
        user: usage.user,
        system: usage.system,
        totalMs: totalUsage
      }
    };
  },

  /**
   * Disk space check (Node.js environment)
   */
  disk: async (): Promise<CheckResult> => {
    try {
      const fs = require('fs');
      const stats = fs.statSync(process.cwd());
      
      return {
        status: 'pass',
        time: new Date().toISOString(),
        output: 'Disk accessible',
        metadata: {
          workingDirectory: process.cwd(),
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        time: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Disk check failed',
        metadata: { accessible: false }
      };
    }
  },

  /**
   * Environment variables check
   */
  environment: async (): Promise<CheckResult> => {
    const requiredEnvVars = ['NODE_ENV'];
    const missing = requiredEnvVars.filter(env => !process.env[env]);

    if (missing.length > 0) {
      return {
        status: 'warn',
        time: new Date().toISOString(),
        output: `Missing environment variables: ${missing.join(', ')}`,
        metadata: { missing, required: requiredEnvVars }
      };
    }

    return {
      status: 'pass',
      time: new Date().toISOString(),
      output: 'All required environment variables present',
      metadata: { 
        nodeEnv: process.env.NODE_ENV,
        requiredPresent: true 
      }
    };
  }
};

/**
 * Database connection health check factory
 */
export function createDatabaseCheck(
  name: string,
  testConnection: () => Promise<boolean>
): HealthCheck {
  return async (): Promise<CheckResult> => {
    try {
      const isConnected = await testConnection();
      
      if (isConnected) {
        return {
          status: 'pass',
          time: new Date().toISOString(),
          output: `${name} database connection is healthy`,
          metadata: { connected: true, database: name }
        };
      } else {
        return {
          status: 'fail',
          time: new Date().toISOString(),
          error: `${name} database connection failed`,
          metadata: { connected: false, database: name }
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        time: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database check failed',
        metadata: { connected: false, database: name }
      };
    }
  };
}

/**
 * External service health check factory
 */
export function createExternalServiceCheck(
  serviceName: string,
  healthUrl: string,
  timeout: number = 3000
): HealthCheck {
  return async (): Promise<CheckResult> => {
    try {
      // Simple fetch implementation for Node.js
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout)
      });

      if (response.ok) {
        return {
          status: 'pass',
          time: new Date().toISOString(),
          output: `${serviceName} service is healthy`,
          metadata: { 
            serviceName, 
            url: healthUrl, 
            statusCode: response.status 
          }
        };
      } else {
        return {
          status: 'fail',
          time: new Date().toISOString(),
          error: `${serviceName} returned status ${response.status}`,
          metadata: { 
            serviceName, 
            url: healthUrl, 
            statusCode: response.status 
          }
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        time: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Service check failed',
        metadata: { serviceName, url: healthUrl }
      };
    }
  };
}

/**
 * Create a health check middleware for Express
 */
export function createHealthCheckMiddleware(healthChecker: HealthChecker) {
  return {
    /**
     * Full health check endpoint
     */
    full: async (req: any, res: any) => {
      try {
        const status = await healthChecker.getStatus();
        const httpStatus = status.status === 'healthy' ? 200 : 
                         status.status === 'degraded' ? 200 : 503;
        
        res.status(httpStatus).json(status);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed'
        });
      }
    },

    /**
     * Simple health check endpoint (for load balancers)
     */
    simple: async (req: any, res: any) => {
      try {
        const isHealthy = await healthChecker.isHealthy();
        const status = isHealthy ? 'healthy' : 'unhealthy';
        
        res.status(isHealthy ? 200 : 503).json({
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString()
        });
      }
    },

    /**
     * Readiness check (for Kubernetes)
     */
    ready: async (req: any, res: any) => {
      try {
        const status = await healthChecker.getStatus();
        const isReady = status.status !== 'unhealthy';
        
        res.status(isReady ? 200 : 503).json({
          status: isReady ? 'ready' : 'not ready',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString()
        });
      }
    },

    /**
     * Liveness check (for Kubernetes)
     */
    live: async (req: any, res: any) => {
      // Basic liveness - just check if the process is running
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
  };
}
