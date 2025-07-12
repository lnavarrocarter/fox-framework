# Sistema de Optimización de Performance - Fox Framework

## 📋 Descripción General

El sistema de performance de Fox Framework proporciona herramientas completas para optimización, benchmarking y monitoreo en tiempo real de aplicaciones web. Este sistema está diseñado para lograr:

- **Throughput**: >10,000 req/s
- **Latency**: <10ms p95
- **Memory Usage**: <100MB
- **CPU Usage**: <70% bajo carga normal

## 🚀 Inicio Rápido

### Instalación y Configuración

```typescript
import { 
  PerformanceFactory,
  PerformanceMonitor,
  PerformanceBenchmark 
} from '@tsfox/core/performance';

// Crear instancia del sistema de performance
const performance = PerformanceFactory.create();

// Configurar monitoreo
const monitor = new PerformanceMonitor({
  interval: 1000,
  maxDataPoints: 1000,
  thresholds: {
    cpuUsage: 80,
    memoryUsage: 500,
    responseTime: 100,
    errorRate: 5,
    requestsPerSecond: 1000
  },
  enabledMetrics: {
    cpu: true,
    memory: true,
    requests: true,
    responses: true,
    errors: true,
    custom: true
  }
});

// Iniciar monitoreo
monitor.start();
```

## 🔧 Optimizadores

### Router Optimizer

Optimiza el rendimiento del sistema de routing:

```typescript
import { RouterOptimizer } from '@tsfox/core/performance';

const routerOptimizer = new RouterOptimizer({
  enableCaching: true,
  cacheSize: 1000,
  enableFastMatching: true,
  precompileRoutes: true,
  enableMiddlewareOptimization: true
});

// Optimizar router
const optimizedRouter = routerOptimizer.optimize(router);

// Obtener análisis
const analysis = routerOptimizer.analyze(router);
console.log('Router performance analysis:', analysis);
```

### Memory Optimizer

Gestiona la memoria de manera eficiente:

```typescript
import { MemoryOptimizer } from '@tsfox/core/performance';

const memoryOptimizer = new MemoryOptimizer({
  enableObjectPooling: true,
  poolSizes: {
    request: 100,
    response: 100,
    context: 50
  },
  enableGCOptimization: true,
  enableMemoryLeakDetection: true,
  gcStrategy: 'generational'
});

// Optimizar uso de memoria
memoryOptimizer.optimize();

// Obtener recomendaciones
const recommendations = memoryOptimizer.recommendations();
recommendations.forEach(rec => {
  console.log(`${rec.type}: ${rec.description} (Priority: ${rec.priority})`);
});
```

### HTTP Optimizer

Optimiza el rendimiento HTTP:

```typescript
import { HttpOptimizer } from '@tsfox/core/performance';

const httpOptimizer = new HttpOptimizer({
  enableResponseCaching: true,
  cacheSize: 100,
  enableCompression: true,
  compressionLevel: 6,
  enableConnectionPooling: true,
  maxConnections: 1000,
  enableKeepAlive: true
});

// Optimizar servidor HTTP
const optimizedApp = httpOptimizer.optimize(app);
```

### Template Optimizer

Optimiza el rendimiento de templates:

```typescript
import { TemplateOptimizer } from '@tsfox/core/performance';

const templateOptimizer = new TemplateOptimizer({
  enableCaching: true,
  cacheSize: 200,
  enablePrecompilation: true,
  enableMinification: true,
  enableAsyncRendering: true,
  compressionLevel: 6
});

// Optimizar engine de templates
const optimizedEngine = templateOptimizer.optimize(templateEngine);
```

## 📊 Sistema de Benchmarking

### Benchmark Básico

```typescript
import { PerformanceBenchmark } from '@tsfox/core/performance';

const benchmark = new PerformanceBenchmark({
  duration: 30000,        // 30 segundos
  concurrency: 50,        // 50 conexiones concurrentes
  targetRPS: 1000,        // 1000 requests por segundo
  warmupDuration: 5000,   // 5 segundos de calentamiento
  urls: ['http://localhost:3000/api/test'],
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Fox-Benchmark'
  }
});

// Ejecutar benchmark
const result = await benchmark.run();

console.log(`RPS: ${result.requestsPerSecond}`);
console.log(`Response time P95: ${result.responseTime.p95}ms`);
console.log(`Error rate: ${result.errorRate}%`);
```

### Load Testing

```typescript
import { LoadTester } from '@tsfox/core/performance';

const loadTester = new LoadTester({
  duration: 300000,  // 5 minutos
  concurrency: 100,
  targetRPS: 2000,
  warmupDuration: 10000,
  urls: ['http://localhost:3000/api/heavy'],
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'data' })
});

// Ejecutar test de carga
const loadResult = await loadTester.runLoadTest();

// Analizar degradación
console.log('Memory growth:', loadResult.degradation.memoryGrowth, '%');
console.log('Performance decline:', loadResult.degradation.performanceDecline, '%');
console.log('Stability score:', loadResult.degradation.stabilityScore);
```

### Regression Testing

```typescript
import { RegressionTester } from '@tsfox/core/performance';

const regressionTester = new RegressionTester();

// Establecer baseline
const baselineResult = await benchmark.run();
regressionTester.setBaseline('api_performance', baselineResult);

// Ejecutar test de regresión después de cambios
const regressionResult = await regressionTester.runRegressionTest(
  'api_performance', 
  benchmarkConfig
);

if (regressionResult.regression) {
  console.log('⚠️ Performance regression detected!');
  console.log('RPS change:', regressionResult.differences.rpsChange, '%');
  console.log('Response time change:', regressionResult.differences.responseTimeChange, '%');
}
```

## 📈 Sistema de Monitoreo

### Monitoreo en Tiempo Real

```typescript
import { PerformanceMonitor } from '@tsfox/core/performance';

const monitor = new PerformanceMonitor(config);

// Suscribirse a métricas en tiempo real
const unsubscribe = monitor.subscribe((metrics) => {
  console.log('CPU Usage:', metrics.system.cpuUsage, '%');
  console.log('Memory Usage:', metrics.system.memoryUsage / 1024 / 1024, 'MB');
  console.log('Requests/sec:', metrics.http.requestsPerSecond);
  console.log('Avg Response Time:', metrics.http.averageResponseTime, 'ms');
});

// Iniciar monitoreo
monitor.start();

// Registrar métricas de requests
monitor.recordRequest(25, 200, '/api/users');
monitor.recordRequest(150, 500, '/api/error');

// Agregar métricas personalizadas
monitor.addCustomMetric('business.active_users', 1000);
monitor.addCustomMetric('business.revenue', 50000);
```

### Dashboard de Performance

```typescript
import { PerformanceDashboard } from '@tsfox/core/performance';

const dashboard = new PerformanceDashboard(monitor);

// Obtener datos del dashboard
const dashboardData = dashboard.getDashboardData();
console.log('Widgets:', dashboardData.widgets.length);
console.log('Active alerts:', dashboardData.alerts.length);

// Agregar widget personalizado
dashboard.addWidget({
  id: 'business_metrics',
  type: 'number',
  title: 'Active Users',
  metric: 'custom.business.active_users',
  position: { x: 0, y: 4, width: 2, height: 1 },
  config: { decimals: 0, trend: true }
});
```

### Alertas y Notificaciones

```typescript
// Configurar alerta personalizada
monitor.addAlert({
  id: 'high_business_load',
  name: 'High Business Load',
  condition: 'custom.business.active_users > threshold',
  threshold: 5000,
  severity: 'medium',
  enabled: true,
  triggered: false,
  message: 'Active users above {threshold}'
});

// Actualizar umbral de alerta existente
monitor.updateAlert('high_cpu', { threshold: 90 });
```

### Reportes Automatizados

```typescript
import { PerformanceReporter } from '@tsfox/core/performance';

const reporter = new PerformanceReporter(monitor);

// Generar reporte de la última hora
const report = reporter.generateReport({
  start: Date.now() - 3600000,
  end: Date.now()
});

console.log('Performance Summary:');
console.log('- Avg CPU Usage:', report.summary.avgCpuUsage.toFixed(1), '%');
console.log('- Avg Memory Usage:', report.summary.avgMemoryUsage.toFixed(1), 'MB');
console.log('- Avg Response Time:', report.summary.avgResponseTime.toFixed(1), 'ms');
console.log('- Error Rate:', report.summary.errorRate.toFixed(2), '%');

console.log('\\nTrends:');
console.log('- CPU Trend:', report.trends.cpuTrend);
console.log('- Memory Trend:', report.trends.memoryTrend);
console.log('- Performance Trend:', report.trends.performanceTrend);

console.log('\\nRecommendations:');
report.recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec}`);
});
```

## 🔌 Integración con Express

### Middleware de Métricas

```typescript
import express from 'express';
import { PerformanceMonitor } from '@tsfox/core/performance';

const app = express();
const monitor = new PerformanceMonitor(config);

// Middleware para registrar métricas de requests
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    monitor.recordRequest(responseTime, res.statusCode, req.path);
  });
  
  next();
});

monitor.start();
```

### Endpoint de Métricas

```typescript
// Endpoint para obtener métricas
app.get('/metrics', (req, res) => {
  const metrics = monitor.getCurrentMetrics();
  res.json(metrics);
});

// Endpoint para obtener reporte
app.get('/performance/report', (req, res) => {
  const reporter = new PerformanceReporter(monitor);
  const report = reporter.generateReport({
    start: Date.now() - 3600000, // Última hora
    end: Date.now()
  });
  res.json(report);
});

// Endpoint para dashboard
app.get('/performance/dashboard', (req, res) => {
  const dashboard = new PerformanceDashboard(monitor);
  const data = dashboard.getDashboardData();
  res.json(data);
});
```

## 🛠️ Configuración Avanzada

### Perfiles de Optimización

```typescript
// Perfil de desarrollo
const devConfig = {
  routerOptimizer: {
    enableCaching: false,
    enableFastMatching: true
  },
  memoryOptimizer: {
    enableObjectPooling: false,
    enableMemoryLeakDetection: true
  },
  monitoring: {
    interval: 5000,
    maxDataPoints: 100
  }
};

// Perfil de producción
const prodConfig = {
  routerOptimizer: {
    enableCaching: true,
    cacheSize: 10000,
    enableFastMatching: true,
    precompileRoutes: true
  },
  memoryOptimizer: {
    enableObjectPooling: true,
    poolSizes: { request: 1000, response: 1000 },
    enableGCOptimization: true
  },
  monitoring: {
    interval: 1000,
    maxDataPoints: 10000
  }
};
```

### Integración con CI/CD

```typescript
// Script para CI/CD
async function runPerformanceTests() {
  const benchmark = new PerformanceBenchmark(benchmarkConfig);
  const result = await benchmark.run();
  
  // Verificar umbrales de performance
  const thresholds = {
    minRPS: 1000,
    maxResponseTime: 50,
    maxErrorRate: 1
  };
  
  if (result.requestsPerSecond < thresholds.minRPS) {
    throw new Error(`Low RPS: ${result.requestsPerSecond} < ${thresholds.minRPS}`);
  }
  
  if (result.responseTime.p95 > thresholds.maxResponseTime) {
    throw new Error(`High response time: ${result.responseTime.p95}ms > ${thresholds.maxResponseTime}ms`);
  }
  
  if (result.errorRate > thresholds.maxErrorRate) {
    throw new Error(`High error rate: ${result.errorRate}% > ${thresholds.maxErrorRate}%`);
  }
  
  console.log('✅ Performance tests passed');
}
```

## 📝 Best Practices

### 1. Configuración de Monitoreo

- Usar intervalos apropiados (1-5 segundos para producción)
- Limitar puntos de datos para evitar uso excesivo de memoria
- Configurar alertas con umbrales realistas
- Monitorear métricas de negocio además de técnicas

### 2. Optimización

- Aplicar optimizaciones gradualmente
- Hacer benchmarks antes y después de cambios
- Usar object pooling para objetos frecuentemente creados
- Habilitar compresión y caching cuando sea apropiado

### 3. Testing de Performance

- Incluir tests de performance en CI/CD
- Usar datos realistas para benchmarks
- Hacer warm-up antes de mediciones
- Ejecutar tests en ambiente similar a producción

### 4. Análisis de Resultados

- Analizar tendencias, no solo valores puntuales
- Correlacionar métricas de sistema con de negocio
- Documentar cambios que afecten performance
- Mantener baselines actualizados

## 🔍 Troubleshooting

### Alta Latencia

```typescript
// Identificar cuellos de botella
const analysis = routerOptimizer.analyze(router);
if (analysis.averageMatchTime > 5) {
  console.log('Router optimization needed');
}

// Revisar métricas de respuesta por endpoint
const slowEndpoints = monitor.getMetricHistory('response.time.avg')
  .filter(point => point.value > 100);
```

### Alto Uso de Memoria

```typescript
// Detectar leaks de memoria
const memoryGrowth = memoryOptimizer.analyze().memoryGrowth;
if (memoryGrowth > 10) {
  console.log('Possible memory leak detected');
  
  // Habilitar detección de leaks
  memoryOptimizer.updateConfig({
    enableMemoryLeakDetection: true
  });
}
```

### Baja Throughput

```typescript
// Optimizar configuración
const httpOptimizer = new HttpOptimizer({
  enableConnectionPooling: true,
  maxConnections: 2000,
  enableKeepAlive: true,
  enableCompression: true
});

const optimizedApp = httpOptimizer.optimize(app);
```

## 📚 Recursos Adicionales

- [Documentación API completa](./api/performance-api.md)
- [Ejemplos de configuración](./examples/performance-examples.md)
- [Guía de troubleshooting](./troubleshooting/performance-issues.md)
- [Best practices](./best-practices/performance-optimization.md)
