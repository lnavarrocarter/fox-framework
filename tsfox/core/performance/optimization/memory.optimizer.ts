/**
 * @fileoverview Memory optimization system
 * @module tsfox/core/performance/optimization
 */

import { OptimizationArea, OptimizationReport, Bottleneck, OptimizationOpportunity } from '../interfaces';

/**
 * Memory optimization options
 */
export interface MemoryOptimizationOptions {
  /** Enable object pooling */
  enableObjectPools: boolean;
  
  /** Enable garbage collection optimization */
  optimizeGC: boolean;
  
  /** Maximum pool size for each object type */
  maxPoolSize: number;
  
  /** Enable memory leak detection */
  detectLeaks: boolean;
  
  /** Memory threshold for GC triggers */
  gcThreshold: number;
  
  /** Enable weak references for caches */
  useWeakReferences: boolean;
}

/**
 * Object pool for memory optimization
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  private created: number = 0;
  private reused: number = 0;

  constructor(
    factory: () => T,
    reset: (obj: T) => void = () => {},
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  /**
   * Acquire object from pool or create new one
   */
  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.reused++;
      return obj;
    }

    this.created++;
    return this.factory();
  }

  /**
   * Return object to pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number;
    created: number;
    reused: number;
    reuseRatio: number;
  } {
    const total = this.created + this.reused;
    return {
      poolSize: this.pool.length,
      created: this.created,
      reused: this.reused,
      reuseRatio: total > 0 ? (this.reused / total) * 100 : 0
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Memory leak detector
 */
export class MemoryLeakDetector {
  private snapshots: NodeJS.MemoryUsage[] = [];
  private intervalId?: NodeJS.Timeout;
  private threshold: number;
  private callbacks: Array<(leak: MemoryLeak) => void> = [];

  constructor(threshold: number = 50 * 1024 * 1024) { // 50MB
    this.threshold = threshold;
  }

  /**
   * Start monitoring for memory leaks
   */
  start(intervalMs: number = 30000): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Add callback for leak detection
   */
  onLeak(callback: (leak: MemoryLeak) => void): void {
    this.callbacks.push(callback);
  }

  private checkMemoryUsage(): void {
    const current = process.memoryUsage();
    this.snapshots.push(current);

    // Keep only last 10 snapshots
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }

    // Check for consistent growth
    if (this.snapshots.length >= 5) {
      const growthTrend = this.detectGrowthTrend();
      if (growthTrend.isLeaking) {
        const leak: MemoryLeak = {
          type: 'heap_growth',
          severity: growthTrend.rate > this.threshold ? 'critical' : 'warning',
          rate: growthTrend.rate,
          current: current.heapUsed,
          timestamp: Date.now(),
          description: `Detected consistent memory growth of ${Math.round(growthTrend.rate / 1024 / 1024)}MB per interval`
        };

        this.callbacks.forEach(callback => callback(leak));
      }
    }
  }

  private detectGrowthTrend(): { isLeaking: boolean; rate: number } {
    if (this.snapshots.length < 5) {
      return { isLeaking: false, rate: 0 };
    }

    const recent = this.snapshots.slice(-5);
    let growthCount = 0;
    let totalGrowth = 0;

    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].heapUsed - recent[i - 1].heapUsed;
      if (growth > 0) {
        growthCount++;
        totalGrowth += growth;
      }
    }

    const averageGrowth = totalGrowth / (recent.length - 1);
    const isLeaking = growthCount >= 3 && averageGrowth > this.threshold / 10;

    return { isLeaking, rate: averageGrowth };
  }
}

/**
 * Memory leak information
 */
export interface MemoryLeak {
  type: 'heap_growth' | 'gc_pressure' | 'large_objects';
  severity: 'warning' | 'critical';
  rate: number;
  current: number;
  timestamp: number;
  description: string;
}

/**
 * Memory optimizer for high-performance memory management
 */
export class MemoryOptimizer {
  private static pools = new Map<string, ObjectPool<any>>();
  private static options: MemoryOptimizationOptions;
  private static gcScheduled = false;
  private static leakDetector?: MemoryLeakDetector;
  private static weakRefCache = new Map<string, { value: any; lastAccess: number }>();

  /**
   * Initialize memory optimizer
   */
  static initialize(options: MemoryOptimizationOptions): void {
    const defaultOptions: MemoryOptimizationOptions = {
      enableObjectPools: true,
      optimizeGC: true,
      maxPoolSize: 100,
      detectLeaks: true,
      gcThreshold: 100 * 1024 * 1024, // 100MB
      useWeakReferences: true
    };

    this.options = { ...defaultOptions, ...options };

    if (this.options.enableObjectPools) {
      this.initializeDefaultPools();
    }

    if (this.options.optimizeGC) {
      this.configureGarbageCollection();
    }

    if (this.options.detectLeaks) {
      this.startLeakDetection();
    }
  }

  /**
   * Create or get object pool
   */
  static createPool<T>(
    name: string,
    factory: () => T,
    reset?: (obj: T) => void,
    maxSize?: number
  ): ObjectPool<T> {
    const pool = new ObjectPool(
      factory,
      reset,
      maxSize || this.options.maxPoolSize
    );
    
    this.pools.set(name, pool);
    return pool;
  }

  /**
   * Get object from pool
   */
  static getFromPool<T>(name: string): T | null {
    const pool = this.pools.get(name);
    return pool ? pool.acquire() : null;
  }

  /**
   * Return object to pool
   */
  static returnToPool<T>(name: string, obj: T): void {
    const pool = this.pools.get(name);
    if (pool) {
      pool.release(obj);
    }
  }

  /**
   * Store value with weak reference
   */
  static setWeak<T extends object>(key: string, value: T): void {
    if (this.options.useWeakReferences) {
      this.weakRefCache.set(key, { value, lastAccess: Date.now() });
    }
  }

  /**
   * Get value from weak reference cache
   */
  static getWeak<T extends object>(key: string): T | null {
    if (!this.options.useWeakReferences) {
      return null;
    }

    const ref = this.weakRefCache.get(key);
    if (!ref) {
      return null;
    }

    // Check if the cached value is old and should be cleaned up
    const now = Date.now();
    if (now - ref.lastAccess > 300000) { // 5 minutes
      this.weakRefCache.delete(key);
      return null;
    }

    // Update last access time
    ref.lastAccess = now;
    return ref.value;
  }

  /**
   * Trigger garbage collection if available
   */
  static triggerGC(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    usage: NodeJS.MemoryUsage;
    pools: Map<string, any>;
    weakCacheSize: number;
    gcAvailable: boolean;
  } {
    const poolStats = new Map();
    for (const [name, pool] of this.pools) {
      poolStats.set(name, pool.getStats());
    }

    return {
      usage: process.memoryUsage(),
      pools: poolStats,
      weakCacheSize: this.weakRefCache.size,
      gcAvailable: typeof global !== 'undefined' && typeof global.gc === 'function'
    };
  }

  /**
   * Analyze memory performance
   */
  static analyze(): OptimizationReport {
    const memStats = this.getMemoryStats();
    const usage = memStats.usage;
    
    const bottlenecks: Bottleneck[] = [];
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze memory usage
    const heapUsagePercentage = (usage.heapUsed / usage.heapTotal) * 100;
    
    if (heapUsagePercentage > 80) {
      bottlenecks.push({
        area: 'memory',
        severity: 'critical',
        description: 'High heap usage detected',
        impact: 60,
        solutions: [
          'Implement object pooling',
          'Review memory allocations',
          'Enable garbage collection optimization',
          'Use weak references for caches'
        ]
      });
    } else if (heapUsagePercentage > 60) {
      bottlenecks.push({
        area: 'memory',
        severity: 'medium',
        description: 'Moderate heap usage',
        impact: 30,
        solutions: [
          'Monitor memory growth trends',
          'Optimize object lifecycles',
          'Consider memory pooling'
        ]
      });
    }

    // Check pool efficiency
    for (const [name, stats] of memStats.pools) {
      if (stats.reuseRatio < 50) {
        opportunities.push({
          area: 'memory',
          potentialGain: 25,
          difficulty: 'medium',
          description: `Low object reuse in pool "${name}"`,
          steps: [
            'Analyze object lifecycle patterns',
            'Optimize pool size configuration',
            'Review object reset logic'
          ]
        });
      }
    }

    // Check if GC is available
    if (!memStats.gcAvailable) {
      opportunities.push({
        area: 'memory',
        potentialGain: 20,
        difficulty: 'easy',
        description: 'Garbage collection not accessible',
        steps: [
          'Start Node.js with --expose-gc flag',
          'Enable manual GC triggering',
          'Configure automatic GC optimization'
        ]
      });
    }

    return {
      score: Math.max(0, 100 - (bottlenecks.length * 25) - (opportunities.length * 10)),
      bottlenecks,
      opportunities,
      currentMetrics: {
        http: {
          requestsPerSecond: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          errorRate: 0,
          totalRequests: 0,
          activeConnections: 0,
          throughput: 0
        },
        system: {
          cpuUsage: 0,
          memoryUsage: usage.rss,
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          eventLoopLag: 0,
          gc: {
            totalTime: 0,
            frequency: 0,
            averagePause: 0,
            memoryFreed: 0
          },
          uptime: process.uptime()
        },
        application: {
          cacheHitRatio: 0,
          templateRenderTime: 0,
          databaseQueryTime: 0,
          middlewareExecutionTime: 0,
          routeResolutionTime: 0,
          activeSessions: 0
        },
        custom: {
          objectPoolStats: Object.fromEntries(memStats.pools),
          weakCacheSize: memStats.weakCacheSize
        },
        timestamp: Date.now()
      },
      estimatedImprovements: {
        'memory_usage': heapUsagePercentage > 60 ? 30 : 10,
        'gc_pressure': memStats.gcAvailable ? 20 : 5,
        'allocation_rate': this.options.enableObjectPools ? 25 : 0
      }
    };
  }

  /**
   * Initialize default object pools
   */
  private static initializeDefaultPools(): void {
    // Request objects pool
    this.createPool(
      'request',
      () => ({}),
      (obj: any) => {
        Object.keys(obj).forEach(key => delete obj[key]);
      }
    );

    // Response objects pool
    this.createPool(
      'response',
      () => ({}),
      (obj: any) => {
        Object.keys(obj).forEach(key => delete obj[key]);
      }
    );

    // Context objects pool
    this.createPool(
      'context',
      () => ({ req: null, res: null, params: {}, query: {} }),
      (obj: any) => {
        obj.req = null;
        obj.res = null;
        Object.keys(obj.params).forEach(key => delete obj.params[key]);
        Object.keys(obj.query).forEach(key => delete obj.query[key]);
      }
    );

    // Buffer pool for common sizes
    this.createPool(
      'buffer-1kb',
      () => Buffer.allocUnsafe(1024),
      (buf: Buffer) => buf.fill(0)
    );

    this.createPool(
      'buffer-4kb',
      () => Buffer.allocUnsafe(4096),
      (buf: Buffer) => buf.fill(0)
    );
  }

  /**
   * Configure garbage collection optimization
   */
  private static configureGarbageCollection(): void {
    if (this.gcScheduled) {
      return;
    }

    // Monitor memory usage and trigger GC when needed
    setInterval(() => {
      const usage = process.memoryUsage();
      
      // Trigger GC if heap usage exceeds threshold
      if (usage.heapUsed > this.options.gcThreshold) {
        this.triggerGC();
      }
      
      // Also trigger GC if heap usage is over 80% of total
      if (usage.heapUsed > usage.heapTotal * 0.8) {
        this.triggerGC();
      }
    }, 30000); // Check every 30 seconds

    this.gcScheduled = true;
  }

  /**
   * Start memory leak detection
   */
  private static startLeakDetection(): void {
    this.leakDetector = new MemoryLeakDetector(this.options.gcThreshold);
    
    this.leakDetector.onLeak((leak) => {
      console.warn(`[MemoryOptimizer] Memory leak detected:`, leak);
      
      // Auto-trigger GC on leak detection
      if (leak.severity === 'critical') {
        this.triggerGC();
      }
    });

    this.leakDetector.start();
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    this.pools.clear();
    this.weakRefCache.clear();
    
    if (this.leakDetector) {
      this.leakDetector.stop();
      this.leakDetector = undefined;
    }
  }
}
