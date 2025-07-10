# 📊 Task 15: Sistema de Monitoreo y Métricas

## 📋 Información General

- **ID**: 15
- **Título**: Sistema de Monitoreo y Métricas de Performance
- **Prioridad**: 🟡 Importante
- **Estimación**: 12-16 horas
- **Asignado**: Developer
- **Estado**: ⏳ Pendiente
- **Depende de**: 03-error-handling.md, 04-logging-system.md

## 🎯 Objetivo

Implementar un sistema completo de monitoreo y métricas que permita observar el estado, performance y salud de las aplicaciones Fox Framework en tiempo real.

## 📄 Descripción

El framework necesita un sistema de monitoreo robusto que recolecte métricas de performance, estado de la aplicación, y proporcione endpoints de health check para facilitar el deployment y operación en producción.

## ✅ Criterios de Aceptación

### 1. Health Check System
- [ ] Endpoint `/health` con status de la aplicación
- [ ] Endpoint `/health/ready` para readiness checks
- [ ] Endpoint `/health/live` para liveness checks
- [ ] Verificación de dependencias externas (DB, APIs, etc.)
- [ ] Respuestas estructuradas según estándares

### 2. Performance Metrics
- [ ] Métricas de HTTP requests (count, duration, status codes)
- [ ] Métricas de memoria y CPU usage
- [ ] Métricas de latencia (p50, p95, p99)
- [ ] Contadores de errores por tipo
- [ ] Métricas de throughput

### 3. Application Metrics
- [ ] Tiempo de uptime de la aplicación
- [ ] Número de conexiones activas
- [ ] Request rate por endpoint
- [ ] Métricas de cache hit/miss
- [ ] Métricas de template rendering

### 4. Metrics Export
- [ ] Formato Prometheus metrics
- [ ] Endpoint `/metrics` standard
- [ ] Support para custom metrics
- [ ] Integración con APM tools
- [ ] Export a sistemas externos

## 🛠️ Implementación

### 1. Health Check Manager

```typescript
// tsfox/core/features/health.feature.ts
export interface HealthCheck {
  name: string;
  check: () => Promise<HealthStatus>;
  timeout?: number;
  critical?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export class HealthManager {
  private checks: Map<string, HealthCheck> = new Map();
  
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }
  
  async runCheck(name: string): Promise<HealthStatus> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    try {
      const result = await Promise.race([
        check.check(),
        new Promise<HealthStatus>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), check.timeout || 5000)
        )
      ]);
      
      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date()
      };
    }
  }
  
  async runAllChecks(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};
    
    for (const [name, check] of this.checks) {
      results[name] = await this.runCheck(name);
    }
    
    return results;
  }
  
  async getOverallHealth(): Promise<HealthStatus> {
    const checks = await this.runAllChecks();
    
    const hasUnhealthy = Object.values(checks).some(
      check => check.status === 'unhealthy'
    );
    
    const hasDegraded = Object.values(checks).some(
      check => check.status === 'degraded'
    );
    
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) status = 'unhealthy';
    else if (hasDegraded) status = 'degraded';
    
    return {
      status,
      details: checks,
      timestamp: new Date()
    };
  }
}
```

### 2. Metrics Collector

```typescript
// tsfox/core/features/metrics.feature.ts
export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface HttpMetrics {
  requests_total: number;
  request_duration_seconds: number[];
  request_size_bytes: number[];
  response_size_bytes: number[];
}

export class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private httpMetrics: HttpMetrics = {
    requests_total: 0,
    request_duration_seconds: [],
    request_size_bytes: [],
    response_size_bytes: []
  };
  
  increment(name: string, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const existing = this.metrics.get(key);
    
    this.metrics.set(key, {
      name,
      value: (existing?.value || 0) + 1,
      labels,
      timestamp: new Date(),
      type: 'counter'
    });
  }
  
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    
    this.metrics.set(key, {
      name,
      value,
      labels,
      timestamp: new Date(),
      type: 'gauge'
    });
  }
  
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const existing = this.metrics.get(key);
    
    // Simple histogram implementation
    this.metrics.set(key, {
      name,
      value,
      labels,
      timestamp: new Date(),
      type: 'histogram'
    });
  }
  
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestSize: number,
    responseSize: number
  ): void {
    this.increment('http_requests_total', {
      method,
      path,
      status_code: statusCode.toString()
    });
    
    this.histogram('http_request_duration_seconds', duration / 1000, {
      method,
      path
    });
    
    this.httpMetrics.requests_total++;
    this.httpMetrics.request_duration_seconds.push(duration);
    this.httpMetrics.request_size_bytes.push(requestSize);
    this.httpMetrics.response_size_bytes.push(responseSize);
  }
  
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }
  
  getPrometheusFormat(): string {
    let output = '';
    
    for (const metric of this.metrics.values()) {
      const labels = metric.labels ? 
        Object.entries(metric.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',') : '';
      
      output += `${metric.name}${labels ? `{${labels}}` : ''} ${metric.value}\n`;
    }
    
    return output;
  }
  
  private buildKey(name: string, labels?: Record<string, string>): string {
    const labelStr = labels ? 
      Object.entries(labels)
        .sort()
        .map(([k, v]) => `${k}:${v}`)
        .join(',') : '';
    
    return `${name}${labelStr ? `[${labelStr}]` : ''}`;
  }
}
```

### 3. Monitoring Middleware

```typescript
// tsfox/core/features/monitoring.middleware.ts
export function createMonitoringMiddleware(
  metricsCollector: MetricsCollector
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Capture request size
    const requestSize = parseInt(req.headers['content-length'] || '0');
    
    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function(chunk?: any) {
      const duration = Date.now() - startTime;
      const responseSize = res.getHeader('content-length') || 
        (chunk ? Buffer.byteLength(chunk) : 0);
      
      metricsCollector.recordHttpRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration,
        requestSize,
        Number(responseSize)
      );
      
      return originalEnd.call(this, chunk);
    };
    
    next();
  };
}
```

### 4. Health Check Routes

```typescript
// tsfox/core/features/health.routes.ts
export function setupHealthRoutes(
  app: Express,
  healthManager: HealthManager,
  metricsCollector: MetricsCollector
) {
  // Basic health check
  app.get('/health', async (req, res) => {
    try {
      const health = await healthManager.getOverallHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date()
      });
    }
  });
  
  // Readiness check
  app.get('/health/ready', async (req, res) => {
    try {
      const checks = await healthManager.runAllChecks();
      const critical = Object.entries(checks)
        .filter(([name, status]) => 
          healthManager.checks.get(name)?.critical && 
          status.status === 'unhealthy'
        );
      
      if (critical.length > 0) {
        return res.status(503).json({
          status: 'not ready',
          critical_failures: critical,
          timestamp: new Date()
        });
      }
      
      res.json({
        status: 'ready',
        timestamp: new Date()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        error: error.message,
        timestamp: new Date()
      });
    }
  });
  
  // Liveness check
  app.get('/health/live', (req, res) => {
    res.json({
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date()
    });
  });
  
  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    const format = req.headers.accept?.includes('application/json') ? 
      'json' : 'prometheus';
    
    if (format === 'json') {
      res.json({
        metrics: metricsCollector.getMetrics(),
        timestamp: new Date()
      });
    } else {
      res.set('Content-Type', 'text/plain');
      res.send(metricsCollector.getPrometheusFormat());
    }
  });
}
```

### 5. System Metrics

```typescript
// tsfox/core/features/system.metrics.ts
export class SystemMetrics {
  private metricsCollector: MetricsCollector;
  private interval: NodeJS.Timer | null = null;
  
  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
  }
  
  startCollection(intervalMs: number = 10000): void {
    this.interval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }
  
  stopCollection(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  private collectSystemMetrics(): void {
    // Memory metrics
    const memUsage = process.memoryUsage();
    this.metricsCollector.gauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    this.metricsCollector.gauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    this.metricsCollector.gauge('nodejs_memory_rss_bytes', memUsage.rss);
    this.metricsCollector.gauge('nodejs_memory_external_bytes', memUsage.external);
    
    // Process metrics
    this.metricsCollector.gauge('nodejs_process_uptime_seconds', process.uptime());
    
    // CPU metrics (simplified)
    const cpuUsage = process.cpuUsage();
    this.metricsCollector.gauge('nodejs_process_cpu_user_seconds', cpuUsage.user / 1000000);
    this.metricsCollector.gauge('nodejs_process_cpu_system_seconds', cpuUsage.system / 1000000);
    
    // Event loop lag (simplified)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000;
      this.metricsCollector.gauge('nodejs_eventloop_lag_milliseconds', lag);
    });
  }
}
```

## 🧪 Testing

### 1. Unit Tests

```typescript
// tsfox/core/features/__tests__/health.feature.test.ts
describe('HealthManager', () => {
  it('should register and run health checks', async () => {
    const healthManager = new HealthManager();
    
    healthManager.registerCheck({
      name: 'database',
      check: async () => ({
        status: 'healthy',
        timestamp: new Date()
      })
    });
    
    const result = await healthManager.runCheck('database');
    expect(result.status).toBe('healthy');
  });
  
  it('should handle check timeouts', async () => {
    const healthManager = new HealthManager();
    
    healthManager.registerCheck({
      name: 'slow-service',
      timeout: 100,
      check: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { status: 'healthy', timestamp: new Date() };
      }
    });
    
    const result = await healthManager.runCheck('slow-service');
    expect(result.status).toBe('unhealthy');
  });
});
```

### 2. Integration Tests

```typescript
describe('Metrics Integration', () => {
  it('should collect HTTP metrics', async () => {
    const collector = new MetricsCollector();
    const app = express();
    
    app.use(createMonitoringMiddleware(collector));
    app.get('/test', (req, res) => res.json({ ok: true }));
    
    await request(app).get('/test');
    
    const metrics = collector.getMetrics();
    expect(metrics.some(m => m.name === 'http_requests_total')).toBe(true);
  });
});
```

## 📊 Configuración

### 1. Fox Factory Integration

```typescript
// En fox.factory.ts
export interface MonitoringConfig {
  enabled: boolean;
  healthChecks?: HealthCheck[];
  metricsInterval?: number;
  customMetrics?: boolean;
}

// Agregar a ServerConfig
export interface ServerConfig extends FoxFactoryContext {
  // ...existing properties
  monitoring?: MonitoringConfig;
}
```

### 2. Environment Variables

```bash
# Monitoring configuration
FOX_MONITORING_ENABLED=true
FOX_METRICS_INTERVAL=10000
FOX_HEALTH_CHECKS_TIMEOUT=5000
```

## 📈 KPIs y Métricas

### Métricas de Éxito
- [ ] Health checks response time < 100ms
- [ ] Metrics collection overhead < 1% CPU
- [ ] Zero false positives en health checks
- [ ] 100% uptime visibility

### Performance Targets
- [ ] Health endpoint: < 50ms response time
- [ ] Metrics endpoint: < 200ms response time
- [ ] System metrics collection: < 10ms overhead
- [ ] Memory overhead: < 50MB

## 🔗 Integración

### Con otros sistemas:
- Error Handling: Health checks reportan errores
- Logging: Métricas se loggean para auditoria
- Security: Endpoints protegidos opcionalmente
- Performance: Métricas de optimización

### APM Tools:
- Prometheus integration
- Grafana dashboards
- New Relic compatibility
- DataDog integration

## 📚 Documentación

### User Guide
- [ ] Configuración de health checks
- [ ] Custom metrics creation
- [ ] Monitoring best practices
- [ ] Troubleshooting guide

### API Reference
- [ ] Health check endpoints
- [ ] Metrics endpoints
- [ ] Configuration options
- [ ] Integration examples

## ⚠️ Consideraciones

### Seguridad
- Health checks pueden exponer información sensible
- Metrics endpoints deben ser protegidos en producción
- Rate limiting en endpoints de monitoreo

### Performance
- Overhead mínimo en metrics collection
- Lazy loading de system metrics
- Efficient storage de historical data

### Compatibilidad
- Standard Prometheus format
- Health check RFC compliance
- Container orchestration ready
