/**
 * @fileoverview Performance system factory and main class
 * @module tsfox/core/performance
 */

import { 
  IPerformance, 
  PerformanceConfig, 
  PerformanceMetrics, 
  ProfilingResult,
  HttpMetrics,
  SystemMetrics,
  ApplicationMetrics,
  PerformanceTargets
} from './interfaces';
import { MetricsCollector } from './monitoring/metrics.collector';
import { Profiler } from './monitoring/profiler';

/**
 * Factory for creating performance monitoring instances
 */
export class PerformanceFactory {
  private static instance: IPerformance | null = null;
  private static config: PerformanceConfig | null = null;

  /**
   * Create or get performance monitoring instance
   */
  static create(config: PerformanceConfig): IPerformance {
    if (!this.instance) {
      this.config = config;
      this.instance = new Performance(config);
      
      if (config.autoOptimization) {
        this.applyOptimizations(config);
      }
    }
    
    return this.instance;
  }

  /**
   * Get existing instance or create with default config
   */
  static getInstance(): IPerformance {
    if (!this.instance) {
      return this.create(this.getDefaultConfig());
    }
    return this.instance;
  }

  /**
   * Reset the factory instance
   */
  static reset(): void {
    if (this.instance) {
      (this.instance as Performance).destroy();
      this.instance = null;
      this.config = null;
    }
  }

  /**
   * Get default configuration
   */
  private static getDefaultConfig(): PerformanceConfig {
    return {
      enableProfiling: false,
      metricsInterval: 1000,
      memoryOptimization: true,
      compressionLevel: 6,
      cacheSize: 100 * 1024 * 1024, // 100MB
      autoOptimization: false,
      targets: {
        requestsPerSecond: 1000,
        p95ResponseTime: 100,
        memoryUsage: 100 * 1024 * 1024, // 100MB
        cpuUsage: 70,
        errorRate: 1
      },
      monitoring: {
        enabled: true,
        retentionPeriod: 86400, // 24 hours
        exportFormat: 'json',
        alerts: []
      }
    };
  }

  /**
   * Apply automatic optimizations based on config
   */
  private static applyOptimizations(config: PerformanceConfig): void {
    // HTTP optimizations
    this.optimizeHTTP();
    
    // Memory optimizations
    if (config.memoryOptimization) {
      this.optimizeMemory();
    }
    
    // Node.js optimizations
    this.optimizeNodeJS();
  }

  private static optimizeHTTP(): void {
    // Set HTTP server options for better performance
    process.env.UV_THREADPOOL_SIZE = '16'; // Increase thread pool size
  }

  private static optimizeMemory(): void {
    // Configure garbage collection for better performance
    if (global.gc) {
      // Force garbage collection every 30 seconds in development
      if (process.env.NODE_ENV === 'development') {
        setInterval(() => {
          if (global.gc) {
            global.gc();
          }
        }, 30000);
      }
    }
  }

  private static optimizeNodeJS(): void {
    // Increase max listeners to prevent warnings
    process.setMaxListeners(50);
    
    // Optimize event loop
    process.nextTick(() => {
      // Ensure event loop starts optimized
    });
  }
}

/**
 * Main performance monitoring class
 */
export class Performance implements IPerformance {
  private metricsCollector: MetricsCollector;
  private profiler: Profiler;
  private httpMetrics: HttpMetricsTracker;
  private systemMetrics: SystemMetricsTracker;
  private applicationMetrics: ApplicationMetricsTracker;
  private isDestroyed: boolean = false;

  constructor(private config: PerformanceConfig) {
    this.metricsCollector = new MetricsCollector(
      config.metricsInterval,
      config.monitoring.enabled
    );
    
    this.profiler = new Profiler();
    this.httpMetrics = new HttpMetricsTracker(this.metricsCollector);
    this.systemMetrics = new SystemMetricsTracker(this.metricsCollector);
    this.applicationMetrics = new ApplicationMetricsTracker(this.metricsCollector);
    
    // Start monitoring if enabled
    if (config.monitoring.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Measure synchronous operation performance
   */
  measure<T>(name: string, fn: () => T): T {
    if (this.isDestroyed) {
      return fn();
    }

    const start = process.hrtime.bigint();
    
    try {
      const result = fn();
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6; // Convert to milliseconds
      
      this.metricsCollector.collect({
        name: `operation.${name}.duration`,
        value: duration,
        timestamp: Date.now(),
        type: 'timer',
        unit: 'ms'
      });
      
      return result;
    } catch (error) {
      this.metricsCollector.collect({
        name: `operation.${name}.error`,
        value: 1,
        timestamp: Date.now(),
        type: 'counter'
      });
      throw error;
    }
  }

  /**
   * Measure asynchronous operation performance
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (this.isDestroyed) {
      return fn();
    }

    const start = process.hrtime.bigint();
    
    try {
      const result = await fn();
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6; // Convert to milliseconds
      
      this.metricsCollector.collect({
        name: `operation.${name}.duration`,
        value: duration,
        timestamp: Date.now(),
        type: 'timer',
        unit: 'ms'
      });
      
      return result;
    } catch (error) {
      this.metricsCollector.collect({
        name: `operation.${name}.error`,
        value: 1,
        timestamp: Date.now(),
        type: 'counter'
      });
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const timestamp = Date.now();
    
    return {
      http: this.httpMetrics.getMetrics(),
      system: this.systemMetrics.getMetrics(),
      application: this.applicationMetrics.getMetrics(),
      custom: this.getCustomMetrics(),
      timestamp
    };
  }

  /**
   * Start performance profiling
   */
  startProfiling(): void {
    if (!this.config.enableProfiling) {
      throw new Error('Profiling is disabled in configuration');
    }
    
    this.profiler.start();
  }

  /**
   * Stop profiling and get results
   */
  stopProfiling(): ProfilingResult {
    if (!this.profiler.isRunning()) {
      throw new Error('No active profiling session');
    }
    
    return this.profiler.stop();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metricsCollector.clear();
    this.httpMetrics.reset();
    this.systemMetrics.reset();
    this.applicationMetrics.reset();
  }

  /**
   * Profile a function call
   */
  profileFunction<T>(name: string, fn: () => T): T {
    if (this.config.enableProfiling && this.profiler.isRunning()) {
      return this.profiler.profileFunction(name, fn);
    }
    return this.measure(name, fn);
  }

  /**
   * Profile an async function call
   */
  async profileAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (this.config.enableProfiling && this.profiler.isRunning()) {
      return this.profiler.profileAsyncFunction(name, fn);
    }
    return this.measureAsync(name, fn);
  }

  /**
   * Get performance targets
   */
  getTargets(): PerformanceTargets {
    return this.config.targets;
  }

  /**
   * Check if targets are being met
   */
  checkTargets(): { [key: string]: boolean } {
    const metrics = this.getMetrics();
    const targets = this.config.targets;

    return {
      requestsPerSecond: metrics.http.requestsPerSecond >= targets.requestsPerSecond,
      p95ResponseTime: metrics.http.p95ResponseTime <= targets.p95ResponseTime,
      memoryUsage: metrics.system.memoryUsage <= targets.memoryUsage,
      cpuUsage: metrics.system.cpuUsage <= targets.cpuUsage,
      errorRate: metrics.http.errorRate <= targets.errorRate
    };
  }

  /**
   * Destroy the performance monitor
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.metricsCollector.stop();
    
    if (this.profiler.isRunning()) {
      this.profiler.stop();
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startMonitoring(): void {
    // Start system metrics collection
    this.systemMetrics.start();
    
    // Start application metrics collection
    this.applicationMetrics.start();
  }

  private getCustomMetrics(): Record<string, any> {
    // Get custom metrics from the metrics collector
    const timeRange = {
      start: Date.now() - 60000, // Last minute
      end: Date.now()
    };
    
    const metricsData = this.metricsCollector.getMetrics(timeRange);
    const customMetrics: Record<string, any> = {};
    
    // Extract custom metrics (those that don't start with 'system.' or 'http.')
    metricsData.points.forEach(point => {
      if (point.labels && point.labels.metric) {
        const metricName = point.labels.metric;
        if (!metricName.startsWith('system.') && 
            !metricName.startsWith('http.') && 
            !metricName.startsWith('operation.')) {
          customMetrics[metricName] = point.value;
        }
      }
    });
    
    return customMetrics;
  }

  /**
   * Get access to the underlying metrics collector for Prometheus export
   */
  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }
}

// ============================================================================
// METRICS TRACKERS
// ============================================================================

/**
 * HTTP metrics tracker
 */
class HttpMetricsTracker {
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];
  private startTime: number = Date.now();
  private throughputBytes: number = 0;

  constructor(private metricsCollector: MetricsCollector) {}

  recordRequest(responseTime: number, statusCode: number, bytes: number = 0): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    this.throughputBytes += bytes;

    if (statusCode >= 400) {
      this.errorCount++;
    }

    // Keep only recent response times (last 1000 requests)
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Record metrics
    this.metricsCollector.collect({
      name: 'http.request.count',
      value: 1,
      timestamp: Date.now(),
      type: 'counter'
    });

    this.metricsCollector.collect({
      name: 'http.response.time',
      value: responseTime,
      timestamp: Date.now(),
      type: 'timer',
      unit: 'ms'
    });
  }

  getMetrics(): HttpMetrics {
    const now = Date.now();
    const uptimeSeconds = (now - this.startTime) / 1000;
    const requestsPerSecond = uptimeSeconds > 0 ? this.requestCount / uptimeSeconds : 0;
    
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    const averageResponseTime = this.responseTimes.length > 0 ?
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length : 0;

    return {
      requestsPerSecond,
      averageResponseTime,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      totalRequests: this.requestCount,
      activeConnections: 0, // Would need server integration
      throughput: uptimeSeconds > 0 ? this.throughputBytes / uptimeSeconds : 0
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = Date.now();
    this.throughputBytes = 0;
  }
}

/**
 * System metrics tracker
 */
class SystemMetricsTracker {
  private isRunning: boolean = false;
  private interval?: NodeJS.Timeout;

  constructor(private metricsCollector: MetricsCollector) {}

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.interval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Collect every 5 seconds
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  getMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpuUsage: this.calculateCPUPercentage(cpuUsage),
      memoryUsage: memUsage.heapUsed,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      eventLoopLag: this.measureEventLoopLag(),
      gc: {
        totalTime: 0, // Would need gc-stats integration
        frequency: 0,
        averagePause: 0,
        memoryFreed: 0
      },
      uptime: process.uptime()
    };
  }

  reset(): void {
    // System metrics are real-time, nothing to reset
  }

  private collectSystemMetrics(): void {
    const metrics = this.getMetrics();
    const timestamp = Date.now();

    this.metricsCollector.collect({
      name: 'system.cpu.usage',
      value: metrics.cpuUsage,
      timestamp,
      type: 'gauge',
      unit: 'percent'
    });

    this.metricsCollector.collect({
      name: 'system.memory.heap_used',
      value: metrics.heapUsed,
      timestamp,
      type: 'gauge',
      unit: 'bytes'
    });

    this.metricsCollector.collect({
      name: 'system.memory.heap_total',
      value: metrics.heapTotal,
      timestamp,
      type: 'gauge',
      unit: 'bytes'
    });

    this.metricsCollector.collect({
      name: 'system.event_loop.lag',
      value: metrics.eventLoopLag,
      timestamp,
      type: 'gauge',
      unit: 'ms'
    });
  }

  private calculateCPUPercentage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU calculation
    const total = cpuUsage.user + cpuUsage.system;
    return Math.min(100, (total / 1000000) * 100);
  }

  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    
    return new Promise<number>((resolve) => {
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6;
        resolve(lag);
      });
    }) as any; // Simplified for synchronous return
    
    // Return a simple approximation for now
    return 0;
  }
}

/**
 * Application metrics tracker
 */
class ApplicationMetricsTracker {
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private templateRenderTimes: number[] = [];
  private databaseQueryTimes: number[] = [];
  private middlewareExecutionTimes: number[] = [];
  private routeResolutionTimes: number[] = [];
  private activeSessions: Set<string> = new Set();

  constructor(private metricsCollector: MetricsCollector) {}

  start(): void {
    // Application metrics are event-driven, no need for intervals
  }

  recordCacheHit(): void {
    this.cacheHits++;
    this.metricsCollector.collect({
      name: 'application.cache.hit',
      value: 1,
      timestamp: Date.now(),
      type: 'counter'
    });
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
    this.metricsCollector.collect({
      name: 'application.cache.miss',
      value: 1,
      timestamp: Date.now(),
      type: 'counter'
    });
  }

  recordTemplateRender(time: number): void {
    this.templateRenderTimes.push(time);
    this.keepRecentTimes(this.templateRenderTimes);
    
    this.metricsCollector.collect({
      name: 'application.template.render_time',
      value: time,
      timestamp: Date.now(),
      type: 'timer',
      unit: 'ms'
    });
  }

  recordDatabaseQuery(time: number): void {
    this.databaseQueryTimes.push(time);
    this.keepRecentTimes(this.databaseQueryTimes);
    
    this.metricsCollector.collect({
      name: 'application.database.query_time',
      value: time,
      timestamp: Date.now(),
      type: 'timer',
      unit: 'ms'
    });
  }

  recordMiddlewareExecution(time: number): void {
    this.middlewareExecutionTimes.push(time);
    this.keepRecentTimes(this.middlewareExecutionTimes);
    
    this.metricsCollector.collect({
      name: 'application.middleware.execution_time',
      value: time,
      timestamp: Date.now(),
      type: 'timer',
      unit: 'ms'
    });
  }

  recordRouteResolution(time: number): void {
    this.routeResolutionTimes.push(time);
    this.keepRecentTimes(this.routeResolutionTimes);
    
    this.metricsCollector.collect({
      name: 'application.router.resolution_time',
      value: time,
      timestamp: Date.now(),
      type: 'timer',
      unit: 'ms'
    });
  }

  addSession(sessionId: string): void {
    this.activeSessions.add(sessionId);
    
    this.metricsCollector.collect({
      name: 'application.sessions.active',
      value: this.activeSessions.size,
      timestamp: Date.now(),
      type: 'gauge'
    });
  }

  removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    
    this.metricsCollector.collect({
      name: 'application.sessions.active',
      value: this.activeSessions.size,
      timestamp: Date.now(),
      type: 'gauge'
    });
  }

  getMetrics(): ApplicationMetrics {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRatio = totalCacheRequests > 0 ? 
      (this.cacheHits / totalCacheRequests) * 100 : 0;

    return {
      cacheHitRatio,
      templateRenderTime: this.calculateAverage(this.templateRenderTimes),
      databaseQueryTime: this.calculateAverage(this.databaseQueryTimes),
      middlewareExecutionTime: this.calculateAverage(this.middlewareExecutionTimes),
      routeResolutionTime: this.calculateAverage(this.routeResolutionTimes),
      activeSessions: this.activeSessions.size
    };
  }

  reset(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.templateRenderTimes = [];
    this.databaseQueryTimes = [];
    this.middlewareExecutionTimes = [];
    this.routeResolutionTimes = [];
    this.activeSessions.clear();
  }

  private keepRecentTimes(times: number[]): void {
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
  }

  private calculateAverage(times: number[]): number {
    if (times.length === 0) {
      return 0;
    }
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
}
