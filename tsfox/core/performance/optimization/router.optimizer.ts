/**
 * @fileoverview Router optimization system
 * @module tsfox/core/performance/optimization
 */

import { OptimizationArea, OptimizationOptions, OptimizationReport, Bottleneck, OptimizationOpportunity } from '../interfaces';

/**
 * Router optimization options
 */
export interface RouterOptimizationOptions {
  /** Enable route caching */
  cacheRoutes: boolean;
  
  /** Enable fast path matching */
  fastPathMatching: boolean;
  
  /** Precompute regex patterns */
  precomputeRegex: boolean;
  
  /** Maximum cache size */
  maxCacheSize: number;
  
  /** Enable middleware optimization */
  optimizeMiddleware: boolean;
}

/**
 * Compiled route structure for performance
 */
export interface CompiledRoute {
  /** Precompiled path regex */
  pathRegex: RegExp;
  
  /** Optimized middleware chain */
  middleware: Function[];
  
  /** Fast handler function */
  handler: Function;
  
  /** Route metadata */
  metadata: {
    method: string;
    path: string;
    compiledAt: number;
    static: boolean;
  };
}

/**
 * Fast path matcher for common route patterns
 */
export class FastPathMatcher {
  private staticRoutes = new Map<string, CompiledRoute>();
  private dynamicRoutes: { pattern: RegExp; route: CompiledRoute }[] = [];
  private paramRoutes = new Map<string, CompiledRoute>();

  /**
   * Add route to fast matcher
   */
  addRoute(method: string, path: string, route: CompiledRoute): void {
    const key = `${method}:${path}`;
    
    if (this.isStaticPath(path)) {
      this.staticRoutes.set(key, route);
    } else if (this.isSimpleParamPath(path)) {
      this.paramRoutes.set(key, route);
    } else {
      this.dynamicRoutes.push({
        pattern: route.pathRegex,
        route
      });
    }
  }

  /**
   * Match incoming request path
   */
  match(method: string, path: string): CompiledRoute | null {
    const key = `${method}:${path}`;
    
    // Try static routes first (fastest)
    if (this.staticRoutes.has(key)) {
      return this.staticRoutes.get(key)!;
    }

    // Try simple parameter routes
    const paramMatch = this.matchParamRoute(method, path);
    if (paramMatch) {
      return paramMatch;
    }

    // Try dynamic routes (slowest)
    for (const { pattern, route } of this.dynamicRoutes) {
      if (pattern.test(path)) {
        return route;
      }
    }

    return null;
  }

  private isStaticPath(path: string): boolean {
    return !path.includes(':') && !path.includes('*') && !path.includes('(');
  }

  private isSimpleParamPath(path: string): boolean {
    return path.includes(':') && !path.includes('*') && !path.includes('(');
  }

  private matchParamRoute(method: string, path: string): CompiledRoute | null {
    for (const [key, route] of this.paramRoutes) {
      if (key.startsWith(`${method}:`)) {
        const routePath = key.substring(method.length + 1);
        if (this.matchSimpleParam(routePath, path)) {
          return route;
        }
      }
    }
    return null;
  }

  private matchSimpleParam(routePath: string, requestPath: string): boolean {
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');
    
    if (routeParts.length !== requestParts.length) {
      return false;
    }

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];
      
      if (routePart.startsWith(':')) {
        continue; // Parameter match
      }
      
      if (routePart !== requestPart) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Router optimizer for high-performance routing
 */
export class RouterOptimizer {
  private static routeCache = new Map<string, CompiledRoute>();
  private static pathMatcher: FastPathMatcher;
  private static options: RouterOptimizationOptions;

  /**
   * Initialize router optimizer
   */
  static initialize(options: RouterOptimizationOptions): void {
    const defaultOptions: RouterOptimizationOptions = {
      cacheRoutes: true,
      fastPathMatching: true,
      precomputeRegex: true,
      maxCacheSize: 1000,
      optimizeMiddleware: true
    };
    
    this.options = { ...defaultOptions, ...options };

    if (this.options.fastPathMatching) {
      this.pathMatcher = new FastPathMatcher();
    }
  }

  /**
   * Optimize a route for performance
   */
  static optimizeRoute(method: string, path: string, middleware: Function[], handler: Function): CompiledRoute {
    const cacheKey = this.generateCacheKey(method, path);
    
    if (this.options.cacheRoutes && this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    const compiled = this.compileRoute(method, path, middleware, handler);
    
    if (this.options.cacheRoutes && this.routeCache.size < this.options.maxCacheSize) {
      this.routeCache.set(cacheKey, compiled);
    }

    if (this.options.fastPathMatching && this.pathMatcher) {
      this.pathMatcher.addRoute(method, path, compiled);
    }
    
    return compiled;
  }

  /**
   * Find optimized route for request
   */
  static findRoute(method: string, path: string): CompiledRoute | null {
    if (this.options.fastPathMatching && this.pathMatcher) {
      return this.pathMatcher.match(method, path);
    }

    // Fallback to cache lookup
    const cacheKey = this.generateCacheKey(method, path);
    return this.routeCache.get(cacheKey) || null;
  }

  /**
   * Compile route into optimized structure
   */
  private static compileRoute(
    method: string, 
    path: string, 
    middleware: Function[], 
    handler: Function
  ): CompiledRoute {
    // Precompute regex patterns
    const pathRegex = this.options.precomputeRegex 
      ? this.compilePathPattern(path)
      : new RegExp(path);
    
    // Optimize middleware chain
    const optimizedMiddleware = this.options.optimizeMiddleware
      ? this.optimizeMiddleware(middleware)
      : middleware;
    
    // Create fast handler
    const fastHandler = this.createFastHandler(handler);

    return {
      pathRegex,
      middleware: optimizedMiddleware,
      handler: fastHandler,
      metadata: {
        method,
        path,
        compiledAt: Date.now(),
        static: !path.includes(':') && !path.includes('*')
      }
    };
  }

  /**
   * Compile path pattern to optimized regex
   */
  private static compilePathPattern(path: string): RegExp {
    // Handle static paths (no regex needed)
    if (!path.includes(':') && !path.includes('*') && !path.includes('(')) {
      return new RegExp(`^${this.escapeRegex(path)}$`);
    }

    // Optimize common parameter patterns
    let pattern = path
      .replace(/:[^/]+/g, '([^/]+)')           // :param -> ([^/]+)
      .replace(/\*/g, '(.*)')                  // * -> (.*)
      .replace(/\//g, '\\/');                  // / -> \/

    return new RegExp(`^${pattern}$`, 'i');
  }

  /**
   * Optimize middleware chain
   */
  private static optimizeMiddleware(middleware: Function[]): Function[] {
    // Remove duplicate middleware
    const unique = Array.from(new Set(middleware));
    
    // Sort by execution cost (lighter middleware first)
    return unique.sort((a, b) => {
      const costA = this.estimateMiddlewareCost(a);
      const costB = this.estimateMiddlewareCost(b);
      return costA - costB;
    });
  }

  /**
   * Estimate middleware execution cost
   */
  private static estimateMiddlewareCost(middleware: Function): number {
    const source = middleware.toString();
    
    // Simple heuristics for middleware cost
    let cost = 1;
    
    if (source.includes('await') || source.includes('Promise')) cost += 2;
    if (source.includes('database') || source.includes('db')) cost += 3;
    if (source.includes('crypto') || source.includes('hash')) cost += 2;
    if (source.includes('fs.') || source.includes('file')) cost += 3;
    
    return cost;
  }

  /**
   * Create optimized handler function
   */
  private static createFastHandler(handler: Function): Function {
    // Wrap handler with performance optimizations
    return function optimizedHandler(req: any, res: any, next: any) {
      const start = process.hrtime.bigint();
      
      try {
        const result = handler(req, res, next);
        
        // Handle async handlers
        if (result && typeof result.catch === 'function') {
          return result.catch((error: any) => {
            if (next) next(error);
          });
        }
        
        return result;
      } catch (error) {
        if (next) next(error);
      } finally {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        
        // Track handler performance
        if (typeof (global as any).__fox_performance_tracker !== 'undefined') {
          (global as any).__fox_performance_tracker.trackHandler(handler.name || 'anonymous', duration);
        }
      }
    };
  }

  /**
   * Generate cache key for route
   */
  private static generateCacheKey(method: string, path: string): string {
    return `${method.toUpperCase()}:${path}`;
  }

  /**
   * Escape regex special characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Analyze router performance
   */
  static analyze(): OptimizationReport {
    const routeCount = this.routeCache.size;
    const staticRoutes = Array.from(this.routeCache.values())
      .filter(route => route.metadata.static).length;
    
    const dynamicRoutes = routeCount - staticRoutes;
    
    const bottlenecks: Bottleneck[] = [];
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze bottlenecks
    if (dynamicRoutes > staticRoutes) {
      bottlenecks.push({
        area: 'routing',
        severity: 'medium',
        description: 'Too many dynamic routes compared to static routes',
        impact: 30,
        solutions: [
          'Convert dynamic routes to static where possible',
          'Use route parameters more efficiently',
          'Consider route grouping strategies'
        ]
      });
    }

    if (routeCount > 500) {
      bottlenecks.push({
        area: 'routing',
        severity: 'high',
        description: 'Large number of routes affecting lookup performance',
        impact: 50,
        solutions: [
          'Implement route tree optimization',
          'Consider microservice architecture',
          'Use route prefixes for grouping'
        ]
      });
    }

    // Identify opportunities
    if (!this.options.fastPathMatching) {
      opportunities.push({
        area: 'routing',
        potentialGain: 40,
        difficulty: 'easy',
        description: 'Enable fast path matching for better route resolution',
        steps: [
          'Enable fastPathMatching option',
          'Reorganize routes by frequency',
          'Use static routes when possible'
        ]
      });
    }

    return {
      score: Math.max(0, 100 - (bottlenecks.length * 20)),
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
          memoryUsage: 0,
          heapUsed: 0,
          heapTotal: 0,
          eventLoopLag: 0,
          gc: {
            totalTime: 0,
            frequency: 0,
            averagePause: 0,
            memoryFreed: 0
          },
          uptime: 0
        },
        application: {
          cacheHitRatio: 0,
          templateRenderTime: 0,
          databaseQueryTime: 0,
          middlewareExecutionTime: 0,
          routeResolutionTime: 0,
          activeSessions: 0
        },
        custom: {},
        timestamp: Date.now()
      },
      estimatedImprovements: {
        'route_resolution_time': dynamicRoutes > staticRoutes ? 30 : 10,
        'memory_usage': routeCount > 500 ? 15 : 5,
        'cpu_usage': this.options.optimizeMiddleware ? 20 : 10
      }
    };
  }

  /**
   * Get performance statistics
   */
  static getStats(): {
    totalRoutes: number;
    staticRoutes: number;
    dynamicRoutes: number;
    cacheHitRatio: number;
    averageLookupTime: number;
  } {
    const totalRoutes = this.routeCache.size;
    const staticRoutes = Array.from(this.routeCache.values())
      .filter(route => route.metadata.static).length;
    
    return {
      totalRoutes,
      staticRoutes,
      dynamicRoutes: totalRoutes - staticRoutes,
      cacheHitRatio: totalRoutes > 0 ? (staticRoutes / totalRoutes) * 100 : 0,
      averageLookupTime: 0 // Would need performance tracking to calculate
    };
  }

  /**
   * Clear route cache
   */
  static clearCache(): void {
    this.routeCache.clear();
    if (this.pathMatcher) {
      this.pathMatcher = new FastPathMatcher();
    }
  }
}
