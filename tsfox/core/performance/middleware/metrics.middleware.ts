/**
 * @fileoverview Performance monitoring middleware
 * @module tsfox/core/performance/middleware
 */

import { Request, Response, NextFunction } from 'express';
import { PerformanceFactory } from '../performance.factory';
import { IPerformance } from '../interfaces';

/**
 * Performance monitoring middleware options
 */
export interface PerformanceMiddlewareOptions {
  /** Enable detailed request tracking */
  trackRequests?: boolean;
  
  /** Enable response time measurement */
  trackResponseTime?: boolean;
  
  /** Enable memory tracking per request */
  trackMemory?: boolean;
  
  /** Track specific headers */
  trackHeaders?: string[];
  
  /** Custom metric prefix */
  metricPrefix?: string;
  
  /** Exclude paths from tracking */
  excludePaths?: string[];
  
  /** Maximum response time before warning (ms) */
  slowRequestThreshold?: number;
}

/**
 * Create performance monitoring middleware
 */
export function performanceMiddleware(options: PerformanceMiddlewareOptions = {}) {
  const {
    trackRequests = true,
    trackResponseTime = true,
    trackMemory = false,
    trackHeaders = [],
    metricPrefix = 'http',
    excludePaths = [],
    slowRequestThreshold = 1000
  } = options;

  const performance = PerformanceFactory.getInstance();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if path should be excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = trackMemory ? process.memoryUsage().heapUsed : 0;
    const requestId = generateRequestId();

    // Add request ID to headers for tracking
    res.setHeader('X-Request-ID', requestId);

    // Track request start
    if (trackRequests) {
      recordMetric(performance, `${metricPrefix}.request.started`, 1, 'counter', {
        method: req.method,
        path: req.route?.path || req.path,
        userAgent: req.get('User-Agent') || 'unknown'
      });
    }

    // Track custom headers
    trackHeaders.forEach(header => {
      const value = req.get(header);
      if (value) {
        recordMetric(performance, `${metricPrefix}.header.${header.toLowerCase()}`, 1, 'counter', {
          value,
          path: req.path
        });
      }
    });

    // Override res.end to capture metrics when response finishes
    const originalEnd = res.end;
    let finished = false;

    res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any): Response {
      if (finished) {
        return originalEnd.call(this, chunk, encoding, cb);
      }
      finished = true;

      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
      const statusCode = res.statusCode;
      const contentLength = parseInt(res.get('Content-Length') || '0', 10);

      // Track response time
      if (trackResponseTime) {
        recordMetric(performance, `${metricPrefix}.response.time`, responseTime, 'timer', {
          method: req.method,
          path: req.route?.path || req.path,
          status: statusCode.toString()
        });

        // Track slow requests
        if (responseTime > slowRequestThreshold) {
          recordMetric(performance, `${metricPrefix}.request.slow`, 1, 'counter', {
            method: req.method,
            path: req.route?.path || req.path,
            responseTime: responseTime.toString()
          });
        }
      }

      // Track memory usage change
      if (trackMemory) {
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;
        
        recordMetric(performance, `${metricPrefix}.memory.delta`, memoryDelta, 'gauge', {
          method: req.method,
          path: req.route?.path || req.path
        });
      }

      // Track status codes
      recordMetric(performance, `${metricPrefix}.status.${Math.floor(statusCode / 100)}xx`, 1, 'counter', {
        method: req.method,
        path: req.route?.path || req.path,
        status: statusCode.toString()
      });

      // Track response size
      if (contentLength > 0) {
        recordMetric(performance, `${metricPrefix}.response.size`, contentLength, 'histogram', {
          method: req.method,
          path: req.route?.path || req.path
        });
      }

      // Track errors
      if (statusCode >= 400) {
        recordMetric(performance, `${metricPrefix}.error`, 1, 'counter', {
          method: req.method,
          path: req.route?.path || req.path,
          status: statusCode.toString()
        });
      }

      // Track completed requests
      recordMetric(performance, `${metricPrefix}.request.completed`, 1, 'counter', {
        method: req.method,
        path: req.route?.path || req.path,
        status: statusCode.toString()
      });

      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  };
}

/**
 * Middleware for tracking route resolution performance
 */
export function routePerformanceMiddleware() {
  const performance = PerformanceFactory.getInstance();

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();

    // Track route resolution
    const originalNext = next;
    const wrappedNext = (error?: any) => {
      const endTime = process.hrtime.bigint();
      const resolutionTime = Number(endTime - startTime) / 1e6;

      recordMetric(performance, 'router.resolution_time', resolutionTime, 'timer', {
        method: req.method,
        path: req.route?.path || req.path
      });

      return originalNext(error);
    };

    wrappedNext();
  };
}

/**
 * Middleware for tracking middleware execution performance
 */
export function middlewarePerformanceWrapper(name: string, middleware: Function) {
  const performance = PerformanceFactory.getInstance();

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();

    const wrappedNext = (error?: any) => {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1e6;

      recordMetric(performance, 'middleware.execution_time', executionTime, 'timer', {
        name,
        method: req.method,
        path: req.route?.path || req.path
      });

      return next(error);
    };

    // Call the original middleware with wrapped next function
    try {
      middleware(req, res, wrappedNext);
    } catch (error) {
      recordMetric(performance, 'middleware.error', 1, 'counter', {
        name,
        method: req.method,
        path: req.route?.path || req.path,
        error: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    }
  };
}

/**
 * Express server performance monitoring integration
 */
export function integrateServerMetrics(server: any) {
  const performance = PerformanceFactory.getInstance();

  // Track server-level metrics
  server.on('connection', (socket: any) => {
    recordMetric(performance, 'server.connection.opened', 1, 'counter');
    
    socket.on('close', () => {
      recordMetric(performance, 'server.connection.closed', 1, 'counter');
    });
  });

  server.on('request', (req: Request, res: Response) => {
    recordMetric(performance, 'server.request.received', 1, 'counter', {
      method: req.method,
      url: req.url
    });
  });

  server.on('error', (error: Error) => {
    recordMetric(performance, 'server.error', 1, 'counter', {
      error: error.message,
      code: (error as any).code || 'unknown'
    });
  });

  return server;
}

/**
 * Database query performance tracker
 */
export function trackDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const performance = PerformanceFactory.getInstance();
  
  return performance.measureAsync(`database.query.${queryName}`, async () => {
    try {
      const result = await queryFn();
      
      recordMetric(performance, 'database.query.success', 1, 'counter', {
        query: queryName
      });
      
      return result;
    } catch (error) {
      recordMetric(performance, 'database.query.error', 1, 'counter', {
        query: queryName,
        error: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    }
  });
}

/**
 * Cache operation performance tracker
 */
export function trackCacheOperation<T>(
  operation: 'get' | 'set' | 'delete' | 'clear',
  key: string,
  operationFn: () => Promise<T>
): Promise<T> {
  const performance = PerformanceFactory.getInstance();
  
  return performance.measureAsync(`cache.${operation}`, async () => {
    try {
      const result = await operationFn();
      
      // Determine if it's a hit or miss for get operations
      if (operation === 'get') {
        const isHit = result !== null && result !== undefined;
        recordMetric(performance, `cache.${isHit ? 'hit' : 'miss'}`, 1, 'counter', {
          key
        });
      }
      
      recordMetric(performance, `cache.operation.success`, 1, 'counter', {
        operation,
        key
      });
      
      return result;
    } catch (error) {
      recordMetric(performance, `cache.operation.error`, 1, 'counter', {
        operation,
        key,
        error: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    }
  });
}

/**
 * Template rendering performance tracker
 */
export function trackTemplateRender<T>(
  templateName: string,
  renderFn: () => Promise<T>
): Promise<T> {
  const performance = PerformanceFactory.getInstance();
  
  return performance.measureAsync(`template.render.${templateName}`, async () => {
    try {
      const result = await renderFn();
      
      recordMetric(performance, 'template.render.success', 1, 'counter', {
        template: templateName
      });
      
      return result;
    } catch (error) {
      recordMetric(performance, 'template.render.error', 1, 'counter', {
        template: templateName,
        error: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    }
  });
}

/**
 * Performance dashboard middleware for metrics endpoint
 */
export function performanceDashboard(path: string = '/metrics') {
  const performance = PerformanceFactory.getInstance();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path !== path) {
      return next();
    }

    try {
      const metrics = performance.getMetrics();
      const format = req.query.format as string || 'json';

      res.setHeader('Content-Type', getContentType(format));

      switch (format.toLowerCase()) {
        case 'prometheus':
          res.send(formatPrometheus(metrics));
          break;
        case 'text':
          res.send(formatText(metrics));
          break;
        default:
          res.json({
            timestamp: new Date().toISOString(),
            metrics
          });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'unknown error'
      });
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function recordMetric(
  performance: IPerformance,
  name: string,
  value: number,
  type: 'counter' | 'gauge' | 'timer' | 'histogram',
  labels: Record<string, string> = {}
): void {
  const collector = (performance as any).metricsCollector;
  if (collector) {
    collector.collect({
      name,
      value,
      timestamp: Date.now(),
      type,
      labels
    });
  }
}

function getContentType(format: string): string {
  switch (format.toLowerCase()) {
    case 'prometheus':
      return 'text/plain; version=0.0.4; charset=utf-8';
    case 'text':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/json; charset=utf-8';
  }
}

function formatPrometheus(metrics: any): string {
  const lines: string[] = [];
  
  // HTTP metrics
  lines.push(`# TYPE http_requests_per_second gauge`);
  lines.push(`http_requests_per_second ${metrics.http.requestsPerSecond}`);
  
  lines.push(`# TYPE http_response_time_average gauge`);
  lines.push(`http_response_time_average ${metrics.http.averageResponseTime}`);
  
  lines.push(`# TYPE http_response_time_p95 gauge`);
  lines.push(`http_response_time_p95 ${metrics.http.p95ResponseTime}`);
  
  lines.push(`# TYPE http_error_rate gauge`);
  lines.push(`http_error_rate ${metrics.http.errorRate}`);
  
  // System metrics
  lines.push(`# TYPE system_cpu_usage gauge`);
  lines.push(`system_cpu_usage ${metrics.system.cpuUsage}`);
  
  lines.push(`# TYPE system_memory_usage gauge`);
  lines.push(`system_memory_usage ${metrics.system.memoryUsage}`);
  
  lines.push(`# TYPE system_heap_used gauge`);
  lines.push(`system_heap_used ${metrics.system.heapUsed}`);
  
  return lines.join('\n');
}

function formatText(metrics: any): string {
  const lines: string[] = [];
  
  lines.push('=== FOX FRAMEWORK PERFORMANCE METRICS ===');
  lines.push('');
  
  lines.push('HTTP Metrics:');
  lines.push(`  Requests/sec: ${metrics.http.requestsPerSecond.toFixed(2)}`);
  lines.push(`  Avg Response Time: ${metrics.http.averageResponseTime.toFixed(2)}ms`);
  lines.push(`  P95 Response Time: ${metrics.http.p95ResponseTime.toFixed(2)}ms`);
  lines.push(`  Error Rate: ${metrics.http.errorRate.toFixed(2)}%`);
  lines.push(`  Total Requests: ${metrics.http.totalRequests}`);
  lines.push('');
  
  lines.push('System Metrics:');
  lines.push(`  CPU Usage: ${metrics.system.cpuUsage.toFixed(2)}%`);
  lines.push(`  Memory Usage: ${(metrics.system.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`  Heap Used: ${(metrics.system.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`  Heap Total: ${(metrics.system.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`  Event Loop Lag: ${metrics.system.eventLoopLag.toFixed(2)}ms`);
  lines.push(`  Uptime: ${metrics.system.uptime.toFixed(0)}s`);
  lines.push('');
  
  lines.push('Application Metrics:');
  lines.push(`  Cache Hit Ratio: ${metrics.application.cacheHitRatio.toFixed(2)}%`);
  lines.push(`  Template Render Time: ${metrics.application.templateRenderTime.toFixed(2)}ms`);
  lines.push(`  Database Query Time: ${metrics.application.databaseQueryTime.toFixed(2)}ms`);
  lines.push(`  Middleware Execution Time: ${metrics.application.middlewareExecutionTime.toFixed(2)}ms`);
  lines.push(`  Route Resolution Time: ${metrics.application.routeResolutionTime.toFixed(2)}ms`);
  lines.push(`  Active Sessions: ${metrics.application.activeSessions}`);
  
  return lines.join('\n');
}
