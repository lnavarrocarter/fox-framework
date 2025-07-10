# 📋 Task #08: Optimización de Performance

## 🎯 Objetivo

Implementar optimizaciones sistemáticas de performance para mejorar el throughput, reducir latencia, optimizar uso de memoria y establecer un sistema de monitoreo y benchmarking continuo.

## 📋 Criterios de Aceptación

### Performance Targets

- [ ] **Throughput**: >10,000 req/s en servidor estándar
- [ ] **Latency**: <10ms p95 para requests simples
- [ ] **Memory Usage**: <100MB para aplicación típica
- [ ] **CPU Usage**: <70% bajo carga normal
- [ ] **Bundle Size**: <500KB para client builds
- [ ] **Cold Start**: <500ms para inicialización

### Optimization Areas

- [ ] **HTTP Layer**: Optimización de Express y middleware
- [ ] **Router Performance**: Fast routing con path matching eficiente
- [ ] **Template Rendering**: Caching y optimización de templates
- [ ] **Memory Management**: Garbage collection y memory pools
- [ ] **Bundle Optimization**: Tree shaking y code splitting
- [ ] **Database Queries**: Connection pooling y query optimization

### Monitoring & Benchmarking

- [ ] **Performance Metrics**: Métricas en tiempo real
- [ ] **Benchmarking Suite**: Tests automatizados de performance
- [ ] **Profiling Tools**: Herramientas de profiling integradas
- [ ] **Load Testing**: Tests de carga automatizados

## 🏗️ Arquitectura Propuesta

### Estructura de Archivos

```text
tsfox/core/features/performance/
├── performance.factory.ts         # Factory principal
├── monitoring/
│   ├── metrics.collector.ts       # Recolector de métricas
│   ├── profiler.ts               # Profiler integrado
│   └── benchmarks.ts             # Suite de benchmarks
├── optimization/
│   ├── router.optimizer.ts       # Optimización de routing
│   ├── template.optimizer.ts     # Optimización de templates
│   ├── memory.optimizer.ts       # Gestión de memoria
│   └── http.optimizer.ts         # Optimización HTTP
├── middleware/
│   ├── compression.middleware.ts  # Compresión de responses
│   ├── etag.middleware.ts        # ETags para caching
│   └── metrics.middleware.ts     # Recolección de métricas
└── interfaces/
    ├── metrics.interface.ts       # Interfaces de métricas
    └── performance.interface.ts   # Interfaces principales
```

### Interfaces Principales

```typescript
// performance.interface.ts
export interface PerformanceInterface {
  measure<T>(name: string, fn: () => T): T;
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
  getMetrics(): PerformanceMetrics;
  startProfiling(): void;
  stopProfiling(): ProfilingResult;
}

export interface MetricsCollectorInterface {
  collect(metric: Metric): void;
  getMetrics(timeRange?: TimeRange): MetricsData;
  clear(): void;
  export(format: ExportFormat): string;
}

export interface OptimizerInterface {
  optimize<T>(target: T, options?: OptimizationOptions): T;
  analyze(target: any): OptimizationReport;
  recommendations(): OptimizationRecommendation[];
}
```

### Tipos y Configuración

```typescript
// metrics.types.ts
export interface PerformanceMetrics {
  http: {
    requestsPerSecond: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    heapUsed: number;
    eventLoopLag: number;
  };
  custom: Record<string, any>;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  type: MetricType;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface PerformanceConfig {
  enableProfiling: boolean;
  metricsInterval: number;
  memoryOptimization: boolean;
  compressionLevel: number;
  cacheSize: number;
}
```

## 💻 Ejemplos de Implementación

### Performance Factory

```typescript
// performance.factory.ts
export class PerformanceFactory {
  private static instance: PerformanceInterface;
  private static config: PerformanceConfig;

  static create(config: PerformanceConfig): PerformanceInterface {
    if (!this.instance) {
      this.config = config;
      this.instance = new Performance(config);
      this.setupOptimizations();
    }
    return this.instance;
  }

  private static setupOptimizations(): void {
    // HTTP optimizations
    HttpOptimizer.optimize({
      keepAlive: true,
      keepAliveTimeout: 65000,
      headersTimeout: 66000,
      maxConnections: 1000
    });

    // Router optimizations
    RouterOptimizer.optimize({
      cacheRoutes: true,
      fastPathMatching: true,
      precomputeRegex: true
    });

    // Memory optimizations
    if (this.config.memoryOptimization) {
      MemoryOptimizer.enablePooling();
      MemoryOptimizer.configuregC();
    }
  }
}

export class Performance implements PerformanceInterface {
  private metricsCollector: MetricsCollectorInterface;
  private profiler: Profiler;

  constructor(config: PerformanceConfig) {
    this.metricsCollector = new MetricsCollector(config);
    this.profiler = new Profiler();
    this.startMetricsCollection();
  }

  measure<T>(name: string, fn: () => T): T {
    const start = process.hrtime.bigint();
    
    try {
      const result = fn();
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6; // Convert to ms
      
      this.metricsCollector.collect({
        name: `execution_time.${name}`,
        value: duration,
        timestamp: Date.now(),
        type: 'timer'
      });
      
      return result;
    } catch (error) {
      this.metricsCollector.collect({
        name: `errors.${name}`,
        value: 1,
        timestamp: Date.now(),
        type: 'counter'
      });
      throw error;
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = process.hrtime.bigint();
    
    try {
      const result = await fn();
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      
      this.metricsCollector.collect({
        name: `async_execution_time.${name}`,
        value: duration,
        timestamp: Date.now(),
        type: 'timer'
      });
      
      return result;
    } catch (error) {
      this.metricsCollector.collect({
        name: `async_errors.${name}`,
        value: 1,
        timestamp: Date.now(),
        type: 'counter'
      });
      throw error;
    }
  }
}
```

### Router Optimizer

```typescript
// optimization/router.optimizer.ts
export class RouterOptimizer {
  private static routeCache = new Map<string, CompiledRoute>();
  private static pathMatcher: FastPathMatcher;

  static optimize(options: RouterOptimizationOptions): void {
    this.pathMatcher = new FastPathMatcher();
    
    if (options.cacheRoutes) {
      this.enableRouteCache();
    }
    
    if (options.precomputeRegex) {
      this.precomputePatterns();
    }
  }

  static optimizeRoute(route: Route): CompiledRoute {
    const cacheKey = this.generateCacheKey(route);
    
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    const compiled = this.compileRoute(route);
    this.routeCache.set(cacheKey, compiled);
    
    return compiled;
  }

  private static compileRoute(route: Route): CompiledRoute {
    // Precompute regex patterns
    const pathRegex = this.compilePathPattern(route.path);
    
    // Optimize middleware chain
    const optimizedMiddleware = this.optimizeMiddleware(route.middleware);
    
    // Create fast handler
    const fastHandler = this.createFastHandler(route.handler);

    return {
      pathRegex,
      middleware: optimizedMiddleware,
      handler: fastHandler,
      metadata: {
        method: route.method,
        path: route.path,
        compiledAt: Date.now()
      }
    };
  }

  private static compilePathPattern(path: string): RegExp {
    // Optimized path-to-regex compilation
    // Support for common patterns without full regex overhead
    if (path.includes(':')) {
      return new RegExp(
        path.replace(/:([^/]+)/g, '([^/]+)')
            .replace(/\*/g, '.*'),
        'i'
      );
    }
    
    // Static paths don't need regex
    return new RegExp(`^${path}$`);
  }
}
```

### Memory Optimizer

```typescript
// optimization/memory.optimizer.ts
export class MemoryOptimizer {
  private static objectPools = new Map<string, ObjectPool>();
  private static gcScheduled = false;

  static enablePooling(): void {
    // Create object pools for common objects
    this.createPool('request', () => ({}), 100);
    this.createPool('response', () => ({}), 100);
    this.createPool('context', () => ({}), 50);
  }

  static createPool<T>(
    name: string, 
    factory: () => T, 
    maxSize: number
  ): void {
    this.objectPools.set(name, new ObjectPool(factory, maxSize));
  }

  static getFromPool<T>(name: string): T {
    const pool = this.objectPools.get(name);
    return pool ? pool.acquire() : null;
  }

  static returnToPool<T>(name: string, obj: T): void {
    const pool = this.objectPools.get(name);
    if (pool) {
      pool.release(obj);
    }
  }

  static configureGC(): void {
    // Optimize garbage collection
    if (global.gc && !this.gcScheduled) {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        
        // Trigger GC if heap usage is high
        if (memUsage.heapUsed > memUsage.heapTotal * 0.8) {
          global.gc();
        }
      }, 30000); // Check every 30 seconds
      
      this.gcScheduled = true;
    }
  }
}

class ObjectPool<T> {
  private pool: T[] = [];
  private maxSize: number;
  private factory: () => T;

  constructor(factory: () => T, maxSize: number) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      // Reset object state
      this.resetObject(obj);
      this.pool.push(obj);
    }
  }

  private resetObject(obj: T): void {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        delete (obj as any)[key];
      });
    }
  }
}
```

### Metrics Middleware

```typescript
// middleware/metrics.middleware.ts
export function metricsMiddleware(config: MetricsConfig = {}) {
  const collector = new MetricsCollector(config);
  
  return (req: any, res: any, next: any) => {
    const start = process.hrtime.bigint();
    const startTime = Date.now();

    // Track request
    collector.collect({
      name: 'http_requests_total',
      value: 1,
      timestamp: startTime,
      type: 'counter',
      labels: {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: '0' // Will be updated on response
      }
    });

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6; // Convert to ms
      
      // Update request counter with final status
      collector.collect({
        name: 'http_requests_total',
        value: 1,
        timestamp: Date.now(),
        type: 'counter',
        labels: {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        }
      });

      // Track response time
      collector.collect({
        name: 'http_request_duration_ms',
        value: duration,
        timestamp: Date.now(),
        type: 'histogram',
        labels: {
          method: req.method,
          route: req.route?.path || req.path
        }
      });

      return originalEnd.apply(this, args);
    };

    next();
  };
}
```

## 🧪 Plan de Testing

### Benchmarking Suite

```typescript
// __tests__/benchmarks/performance.benchmark.ts
describe('Performance Benchmarks', () => {
  test('router performance under load', async () => {
    const app = createFoxApp({
      performance: {
        enableProfiling: true,
        memoryOptimization: true
      }
    });

    // Setup routes
    for (let i = 0; i < 1000; i++) {
      app.get(`/route${i}/:id`, (req, res) => {
        res.json({ id: req.params.id });
      });
    }

    const requests = 10000;
    const start = process.hrtime.bigint();

    // Simulate concurrent requests
    const promises = [];
    for (let i = 0; i < requests; i++) {
      promises.push(
        request(app).get(`/route${i % 1000}/123`)
      );
    }

    await Promise.all(promises);

    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e9; // Convert to seconds
    const rps = requests / duration;

    console.log(`Requests per second: ${rps}`);
    expect(rps).toBeGreaterThan(5000); // Target: >5k RPS
  });

  test('memory usage under load', async () => {
    const app = createFoxApp();
    const initialMemory = process.memoryUsage();

    // Simulate memory-intensive operations
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        request(app)
          .post('/test')
          .send({ data: 'x'.repeat(1000) })
      );
    }

    await Promise.all(promises);

    // Force garbage collection
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB increase
  });

  test('template rendering performance', () => {
    const templateEngine = new FoxTemplateEngine();
    const template = '<div>{{name}} - {{email}} - {{age}}</div>';
    const data = { name: 'John', email: 'john@example.com', age: 30 };

    const iterations = 100000;
    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      templateEngine.render(template, data);
    }

    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to ms

    console.log(`Template rendering: ${duration}ms for ${iterations} renders`);
    expect(duration).toBeLessThan(1000); // <1s for 100k renders
  });
});
```

### Load Testing

```typescript
// __tests__/load/load.test.ts
describe('Load Testing', () => {
  test('sustained load test', async () => {
    const app = createFoxApp();
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Hello World', timestamp: Date.now() });
    });

    const duration = 30000; // 30 seconds
    const targetRPS = 1000;
    const interval = 1000 / targetRPS;

    const metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[]
    };

    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const requestStart = Date.now();
      
      try {
        const response = await request(app).get('/api/test');
        
        metrics.totalRequests++;
        if (response.status === 200) {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
        }
        
        metrics.responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        metrics.failedRequests++;
        metrics.totalRequests++;
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    const averageResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
    const p95ResponseTime = metrics.responseTimes.sort()[Math.floor(metrics.responseTimes.length * 0.95)];
    const actualRPS = metrics.totalRequests / (duration / 1000);

    console.log(`Load Test Results:
      - Total Requests: ${metrics.totalRequests}
      - Successful: ${metrics.successfulRequests}
      - Failed: ${metrics.failedRequests}
      - Average Response Time: ${averageResponseTime}ms
      - P95 Response Time: ${p95ResponseTime}ms
      - Actual RPS: ${actualRPS}
    `);

    expect(metrics.failedRequests / metrics.totalRequests).toBeLessThan(0.01); // <1% error rate
    expect(averageResponseTime).toBeLessThan(50); // <50ms average
    expect(p95ResponseTime).toBeLessThan(100); // <100ms p95
  });
});
```

## 📊 Monitoring Dashboard

### Metrics Collection

```typescript
// monitoring/metrics.collector.ts
export class MetricsCollector implements MetricsCollectorInterface {
  private metrics: Metric[] = [];
  private aggregated: Map<string, AggregatedMetric> = new Map();

  collect(metric: Metric): void {
    this.metrics.push(metric);
    this.updateAggregated(metric);
    
    // Keep only recent metrics in memory
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }
  }

  getMetrics(timeRange?: TimeRange): MetricsData {
    const now = Date.now();
    const since = timeRange?.since || (now - 300000); // Default: last 5 minutes

    const filteredMetrics = this.metrics.filter(
      m => m.timestamp >= since && m.timestamp <= now
    );

    return {
      http: this.calculateHttpMetrics(filteredMetrics),
      system: this.getSystemMetrics(),
      custom: this.calculateCustomMetrics(filteredMetrics)
    };
  }

  private calculateHttpMetrics(metrics: Metric[]): any {
    const httpMetrics = metrics.filter(m => m.name.startsWith('http_'));
    
    const requestCount = httpMetrics
      .filter(m => m.name === 'http_requests_total')
      .reduce((sum, m) => sum + m.value, 0);

    const responseTimes = httpMetrics
      .filter(m => m.name === 'http_request_duration_ms')
      .map(m => m.value);

    return {
      requestsPerSecond: requestCount / 300, // 5 minutes
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: this.calculatePercentile(responseTimes, 0.95),
      errorRate: this.calculateErrorRate(httpMetrics)
    };
  }
}
```

## 📝 Documentación

### Performance Guide

```markdown
# Fox Framework Performance Guide

## Quick Wins

1. **Enable Compression**: Reduce payload size by 60-80%
2. **Use HTTP Keep-Alive**: Reduce connection overhead
3. **Enable Route Caching**: 10x faster route resolution
4. **Configure Object Pooling**: Reduce GC pressure

## Configuration

```typescript
const app = createFoxApp({
  performance: {
    enableProfiling: true,
    memoryOptimization: true,
    compressionLevel: 6,
    cacheSize: 1000
  }
});
```

## Monitoring

Access performance metrics at `/metrics` endpoint or use the built-in dashboard.
```

## ✅ Definition of Done

- [ ] All optimization targets achieved
- [ ] Benchmarking suite implemented y ejecutándose
- [ ] Monitoring dashboard funcional
- [ ] Load testing automated
- [ ] Memory optimization configurado
- [ ] Performance documentation completa
- [ ] Profiling tools integradas
- [ ] Métricas en tiempo real disponibles

## 🔗 Dependencias

### Precedentes

- [05-cache-system.md](./05-cache-system.md) - Cache para optimización
- [04-logging-system.md](./04-logging-system.md) - Logging de métricas

### Dependientes

- [15-monitoring-metrics.md](./15-monitoring-metrics.md) - Monitoring avanzado

## 📅 Estimación

**Tiempo estimado**: 6-7 días  
**Complejidad**: Alta  
**Prioridad**: Importante

## 📊 Métricas de Éxito

- Throughput >10,000 req/s
- Latency p95 <10ms
- Memory usage <100MB
- CPU usage <70% bajo carga
- Zero performance regressions
