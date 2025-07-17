# 📊 Guía de Monitoreo y Operaciones - Fox Framework v1.0.0

## 🎯 Descripción General

Esta guía describe las herramientas, métricas y procedimientos para monitorear Fox Framework en producción, detectar problemas y mantener la salud del sistema.

## 📈 Dashboard de Métricas

### Métricas Principales del Sistema

| Métrica | Descripción | Umbral Crítico | Acción |
|---------|-------------|----------------|--------|
| **HTTP Response Time** | Tiempo promedio de respuesta | > 1000ms | Investigar performance |
| **Error Rate** | Porcentaje de errores HTTP 5xx | > 5% | Alerta inmediata |
| **Memory Usage** | Uso de memoria heap | > 90% | Reiniciar servicio |
| **CPU Usage** | Uso de CPU del proceso | > 80% | Escalar horizontalmente |
| **Uptime** | Tiempo en línea del servicio | < 99% | Investigar estabilidad |
| **Active Connections** | Conexiones HTTP activas | > 1000 | Verificar load balancer |

### Endpoints de Métricas

```typescript
// Principales endpoints para monitoreo
GET /health          // Health check general
GET /metrics         // Métricas Prometheus 
GET /api/status      // Estado de la API
GET /api/diagnostics // Diagnósticos detallados
```

## 🔍 Health Checks

### Health Check Principal (`/health`)

```json
{
  "status": "healthy",
  "timestamp": "2025-07-17T04:48:08.914Z",
  "uptime": 3600,
  "checks": {
    "memory": {
      "status": "pass",
      "usage": "86%",
      "details": {
        "heapUsed": "174 MB",
        "heapTotal": "203 MB"
      }
    },
    "uptime": {
      "status": "pass",
      "uptime": 3600
    },
    "cpu": {
      "status": "pass",
      "load": "normal"
    },
    "staging-readiness": {
      "status": "pass",
      "environment": "production",
      "ready": true
    }
  }
}
```

### Interpretación de Estados

- **✅ healthy**: Todos los checks pasando
- **⚠️ degraded**: Algunos checks con advertencias
- **❌ unhealthy**: Checks críticos fallando

## 📊 Prometheus Metrics

### Métricas HTTP

```promql
# Requests por segundo
rate(http_requests_total[5m])

# Tiempo de respuesta P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{code=~"5.."}[5m]) / rate(http_requests_total[5m])
```

### Métricas del Sistema

```promql
# Uso de memoria
process_resident_memory_bytes / 1024 / 1024

# CPU usage
rate(process_cpu_seconds_total[5m]) * 100

# File descriptors
process_open_fds
```

### Métricas de Aplicación

```promql
# Performance custom metrics
fox_framework_response_time_seconds

# Error tracking
fox_framework_errors_total

# Active connections
fox_framework_active_connections
```

## 🚨 Alertas y Notificaciones

### Reglas de Alertas Críticas

```yaml
# Critical Alerts
groups:
- name: fox-framework-critical
  rules:
  - alert: ServiceDown
    expr: up{job="fox-framework"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Fox Framework service is down"
      description: "Service has been down for more than 1 minute"

  - alert: HighErrorRate
    expr: rate(http_requests_total{code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes / 1024 / 1024 > 400
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }}MB"

  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "Slow response times"
      description: "95th percentile response time is {{ $value }}s"
```

### Canales de Notificación

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#ops-alerts'
    title: 'Fox Framework Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'email'
  email_configs:
  - to: 'ops-team@company.com'
    subject: 'Fox Framework Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
```

## 📊 Dashboards

### Grafana Dashboard Principal

```json
{
  "dashboard": {
    "title": "Fox Framework Operations",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{code=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "thresholds": "0.01,0.05"
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "Memory (MB)"
          }
        ]
      }
    ]
  }
}
```

### Panel de Estado de Servicios

```yaml
# Service Status Panel
- title: "Service Health"
  type: "stat"
  targets:
    - expr: up{job="fox-framework"}
      legendFormat: "Service Status"
  fieldConfig:
    overrides:
      - matcher:
          id: "byName"
          options: "Service Status"
        properties:
          - id: "mappings"
            value:
              - options:
                  "0": {text: "DOWN", color: "red"}
                  "1": {text: "UP", color: "green"}
```

## 🔧 Procedimientos Operacionales

### Restart del Servicio

```bash
#!/bin/bash
# restart-service.sh

echo "🔄 Restarting Fox Framework Service..."

# Con PM2
if command -v pm2 &> /dev/null; then
    pm2 restart fox-framework
    pm2 logs fox-framework --lines 50
    
# Con Docker
elif command -v docker &> /dev/null; then
    docker restart fox-framework
    docker logs -f --tail 50 fox-framework
    
# Con systemctl
elif command -v systemctl &> /dev/null; then
    sudo systemctl restart fox-framework
    sudo journalctl -u fox-framework -f --lines 50
    
else
    echo "❌ No process manager found"
    exit 1
fi

echo "✅ Service restarted successfully"
```

### Health Check Manual

```bash
#!/bin/bash
# health-check.sh

echo "🔍 Fox Framework Health Check"
echo "================================"

# Verificar proceso
if pgrep -f "fox-framework" > /dev/null; then
    echo "✅ Process running"
else
    echo "❌ Process not found"
fi

# Verificar puerto
if nc -z localhost 3000; then
    echo "✅ Port 3000 accessible"
else
    echo "❌ Port 3000 not accessible"
fi

# Verificar health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$response" = "200" ]; then
    echo "✅ Health check OK"
    curl -s http://localhost:3000/health | jq .
else
    echo "❌ Health check failed (HTTP $response)"
fi

# Verificar métricas
metrics_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metrics)
if [ "$metrics_response" = "200" ]; then
    echo "✅ Metrics endpoint OK"
else
    echo "❌ Metrics endpoint failed (HTTP $metrics_response)"
fi
```

### Scaling Horizontal

```bash
#!/bin/bash
# scale-service.sh

INSTANCES=${1:-2}

echo "🚀 Scaling Fox Framework to $INSTANCES instances..."

# Con PM2
if command -v pm2 &> /dev/null; then
    pm2 scale fox-framework $INSTANCES
    pm2 list
    
# Con Docker Swarm
elif command -v docker &> /dev/null && docker node ls &> /dev/null; then
    docker service scale fox-framework=$INSTANCES
    docker service ls
    
# Con Kubernetes
elif command -v kubectl &> /dev/null; then
    kubectl scale deployment fox-framework --replicas=$INSTANCES
    kubectl get pods -l app=fox-framework
    
else
    echo "❌ No orchestration platform found"
    exit 1
fi

echo "✅ Scaling completed"
```

## 📝 Logging y Troubleshooting

### Configuración de Logs

```typescript
// Levels de logging por ambiente
const logConfig = {
  development: {
    level: 'debug',
    format: 'simple',
    console: true
  },
  staging: {
    level: 'info',
    format: 'json',
    console: true,
    file: './logs/staging.log'
  },
  production: {
    level: 'warn',
    format: 'json',
    console: false,
    file: './logs/production.log',
    rotation: {
      maxSize: '10MB',
      maxFiles: 5
    }
  }
};
```

### Análisis de Logs

```bash
# Buscar errores en los últimos 5 minutos
tail -f /var/log/fox-framework/production.log | grep ERROR

# Análisis de performance
grep "response_time" /var/log/fox-framework/production.log | awk '{print $5}' | sort -n

# Top errores más frecuentes
grep ERROR /var/log/fox-framework/production.log | cut -d' ' -f4- | sort | uniq -c | sort -rn | head -10

# Monitoreo en tiempo real
tail -f /var/log/fox-framework/production.log | jq 'select(.level == "ERROR")'
```

### Troubleshooting Common Issues

#### 1. High Memory Usage

```bash
# Investigar uso de memoria
ps aux | grep fox-framework
cat /proc/$(pgrep fox-framework)/status | grep VmRSS

# Análisis de heap
curl http://localhost:3000/api/diagnostics | jq '.memory'

# Acción: Restart si > 90%
if [ $(curl -s http://localhost:3000/health | jq -r '.checks.memory.usage' | sed 's/%//') -gt 90 ]; then
    ./restart-service.sh
fi
```

#### 2. High Error Rate

```bash
# Verificar logs de error recientes
tail -100 /var/log/fox-framework/production.log | grep ERROR

# Verificar conectividad a dependencias
curl -f http://database:5432 || echo "Database connection failed"

# Verificar métricas de error
curl -s http://localhost:3000/metrics | grep fox_framework_errors_total
```

#### 3. Slow Response Times

```bash
# Verificar carga del sistema
top -p $(pgrep fox-framework)

# Análisis de performance endpoint
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/status

# curl-format.txt content:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect:    %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n
```

## 📊 Métricas de Negocio

### KPIs de Operación

| KPI | Definición | Target | Medición |
|-----|------------|---------|----------|
| **Availability** | % de tiempo online | 99.9% | uptime / total_time |
| **MTTR** | Mean Time To Recovery | < 5 min | suma(recovery_times) / incidents |
| **MTBF** | Mean Time Between Failures | > 24h | total_time / number_of_failures |
| **Throughput** | Requests por segundo | > 100 rps | rate(http_requests_total[5m]) |
| **Latency P95** | 95% de requests < threshold | < 500ms | histogram_quantile(0.95, ...) |

### Reportes Automáticos

```bash
#!/bin/bash
# daily-report.sh

DATE=$(date +%Y-%m-%d)
REPORT_FILE="reports/fox-framework-report-$DATE.md"

echo "# Fox Framework Daily Report - $DATE" > $REPORT_FILE
echo "" >> $REPORT_FILE

# Availability
UPTIME=$(curl -s http://localhost:3000/health | jq -r '.uptime')
echo "## Availability: $(($UPTIME / 86400)) days, $(($UPTIME % 86400 / 3600)) hours" >> $REPORT_FILE

# Error rate
ERROR_COUNT=$(grep ERROR /var/log/fox-framework/production.log | wc -l)
echo "## Errors: $ERROR_COUNT total errors today" >> $REPORT_FILE

# Performance
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000/api/status)
echo "## Performance: ${RESPONSE_TIME}s response time" >> $REPORT_FILE

echo "✅ Daily report generated: $REPORT_FILE"
```

## 🎯 Checklist de Monitoreo

### Setup Inicial

- [ ] Prometheus configurado y scrapeando métricas
- [ ] Grafana dashboards creados
- [ ] Alertmanager configurado
- [ ] Canales de notificación configurados
- [ ] Health checks funcionando
- [ ] Logs centralizados configurados

### Operación Diaria

- [ ] Verificar dashboards de salud
- [ ] Revisar alertas activas
- [ ] Verificar logs de error
- [ ] Validar métricas de performance
- [ ] Confirmar backups completados
- [ ] Verificar utilización de recursos

### Respuesta a Incidentes

- [ ] Identificar la causa raíz
- [ ] Implementar fix inmediato
- [ ] Verificar restauración del servicio
- [ ] Documentar el incidente
- [ ] Implementar mejoras preventivas
- [ ] Actualizar runbooks

## 📞 Contactos de Emergencia

### Escalación de Incidentes

**Nivel 1 - On-call Engineer**
- Tiempo de respuesta: 15 minutos
- Alcance: Issues rutinarios, reinicio de servicios

**Nivel 2 - Senior Engineer**
- Tiempo de respuesta: 30 minutos  
- Alcance: Problemas complejos, performance issues

**Nivel 3 - Tech Lead**
- Tiempo de respuesta: 1 hora
- Alcance: Arquitectura, decisiones críticas

**Nivel 4 - Engineering Manager**
- Tiempo de respuesta: 2 horas
- Alcance: Outages prolongados, comunicación ejecutiva

## 📚 Referencias

- [Guía de Deployment](./production-deployment-guide.md)
- [CI/CD Pipeline](./ci-cd-pipeline.md)
- [Resultados de Staging](./staging-validation-results.md)
- [Documentación de API](../api/reference.md)
- [Troubleshooting Guide](../troubleshooting.md)

---

**Fox Framework Operations Guide v1.0.0**  
*Última actualización: Julio 17, 2025*
