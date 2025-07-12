# 🔄 Microservices API - Fox Framework

## 📋 Índice

- [Introducción](#introducción)
- [MicroservicesFactory](#microservicesfactory)
- [ServiceRegistry](#serviceregistry)
- [LoadBalancer](#loadbalancer)
- [CircuitBreaker](#circuitbreaker)
- [ServiceMesh](#servicemesh)
- [HealthChecker](#healthchecker)
- [Interfaces](#interfaces)
- [Configuración](#configuración)
- [Ejemplos de Uso](#ejemplos-de-uso)

## 🎯 Introducción

El sistema de microservicios de Fox Framework proporciona una arquitectura completa para la construcción y gestión de aplicaciones distribuidas. Incluye:

- **Service Registry**: Descubrimiento y registro de servicios
- **Load Balancer**: Balanceeo de carga con múltiples algoritmos
- **Circuit Breaker**: Protección contra fallos en cascada
- **Service Mesh**: Comunicación segura entre servicios
- **Health Monitoring**: Monitoreo continuo de la salud de servicios

## 🏭 MicroservicesFactory

La clase principal que orchestrates todos los componentes del sistema de microservicios.

### Métodos Principales

#### `static create(config: MicroservicesConfig): MicroservicesFactory`

Crea una nueva instancia de la factory (patrón singleton por servicio).

```typescript
import { MicroservicesFactory, createMicroservicesConfig } from 'fox-framework';

const config = createMicroservicesConfig({
  serviceName: 'user-service',
  version: '1.0.0',
  registry: { type: 'memory' },
  loadBalancer: { algorithm: 'round-robin' },
  circuitBreaker: { failureThreshold: 5 }
});

const factory = MicroservicesFactory.create(config);
```

#### `async initialize(): Promise<void>`

Inicializa todos los componentes del sistema de microservicios.

```typescript
await factory.initialize();
```

#### `async registerService(serviceInfo: Partial<ServiceInfo>): Promise<void>`

Registra un servicio en el registry.

```typescript
await factory.registerService({
  name: 'user-service',
  version: '1.0.0',
  address: 'localhost',
  port: 3000,
  protocol: 'http',
  metadata: {
    description: 'User management service'
  }
});
```

#### `async discoverServices(serviceName: string): Promise<ServiceInfo[]>`

Descubre servicios por nombre.

```typescript
const services = await factory.discoverServices('payment-service');
console.log(`Found ${services.length} instances`);
```

#### `async callService(serviceName: string, request: ServiceRequest): Promise<ServiceResponse>`

Realiza una llamada a un servicio con protección de circuit breaker y load balancing.

```typescript
const response = await factory.callService('payment-service', {
  service: 'payment-service',
  method: 'POST',
  path: '/api/payments',
  headers: { 'Content-Type': 'application/json' },
  body: { amount: 100, currency: 'USD' }
});
```

#### Getters de Componentes

```typescript
// Acceso a componentes después de initialize()
const registry = factory.getServiceRegistry();
const loadBalancer = factory.getLoadBalancer();
const circuitBreaker = factory.getCircuitBreaker();
const serviceMesh = factory.getServiceMesh();
```

## 📋 ServiceRegistry

Gestiona el registro y descubrimiento de servicios.

### Características

- **Múltiples Adapters**: Memory, Consul, etcd
- **Health Monitoring**: Chequeos automáticos de salud
- **Service Watching**: Notificaciones de cambios
- **Métricas**: Estadísticas del registry

### Métodos Principales

```typescript
import { ServiceRegistry } from 'fox-framework';

const registry = new ServiceRegistry({
  type: 'memory',
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000
  }
});

// Registro de servicio
await registry.register({
  id: 'user-service-1',
  name: 'user-service',
  version: '1.0.0',
  address: 'localhost',
  port: 3000,
  protocol: 'http'
});

// Descubrimiento
const services = await registry.discover('user-service');

// Monitoreo de cambios
registry.watch('payment-service', (event, service) => {
  console.log(`Service ${service.name} ${event}`);
});
```

## ⚖️ LoadBalancer

Distribuye el tráfico entre instancias de servicios usando diferentes algoritmos.

### Algoritmos Disponibles

1. **Round Robin**: Distribución secuencial
2. **Weighted**: Basado en pesos asignados
3. **Least Connections**: Menor número de conexiones
4. **Random**: Selección aleatoria
5. **IP Hash**: Basado en hash de IP del cliente
6. **Health Based**: Considera la salud del servicio

### Uso

```typescript
import { LoadBalancer } from 'fox-framework';

const loadBalancer = new LoadBalancer({
  algorithm: 'least-connections',
  healthCheck: true,
  retries: 3
});

// Agregar servicios
loadBalancer.updateServices('user-service', [
  { id: 'user-1', address: 'localhost', port: 3001 },
  { id: 'user-2', address: 'localhost', port: 3002 }
]);

// Seleccionar servicio
const selectedService = loadBalancer.selectService('user-service', {
  clientIP: '192.168.1.100'
});
```

## 🔄 CircuitBreaker

Protege contra fallos en cascada implementando el patrón Circuit Breaker.

### Estados

- **Closed**: Funcionamiento normal
- **Open**: Fallo detectado, rechaza llamadas
- **Half-Open**: Permite llamadas de prueba

### Configuración

```typescript
import { CircuitBreaker } from 'fox-framework';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,        // Fallos antes de abrir
  recoveryTimeout: 60000,     // Tiempo antes de half-open
  monitoringPeriod: 10000,    // Ventana de monitoreo
  expectedExceptions: ['ValidationError'] // Excepciones esperadas
});

// Ejecutar operación protegida
const result = await circuitBreaker.execute(async () => {
  return await externalServiceCall();
});

// Métricas
const metrics = circuitBreaker.getMetrics();
console.log(`Success rate: ${metrics.successRate}%`);
```

## 🕸️ ServiceMesh

Proporciona comunicación segura y observabilidad entre servicios.

### Características

- **TLS/mTLS**: Comunicación encriptada
- **Traffic Policies**: Políticas de tráfico
- **Observabilidad**: Métricas y trazado
- **Security**: Autenticación y autorización

```typescript
import { ServiceMesh } from 'fox-framework';

const serviceMesh = new ServiceMesh({
  security: {
    tlsEnabled: true,
    mtlsEnabled: true,
    certificatePath: '/certs',
    allowedServices: ['user-service', 'payment-service']
  },
  policies: {
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000
    },
    timeoutPolicy: {
      requestTimeoutMs: 5000
    }
  }
});

// Comunicación segura
const response = await serviceMesh.sendRequest(
  'payment-service',
  {
    method: 'POST',
    path: '/api/charge',
    body: { amount: 100 }
  }
);
```

## 🏥 HealthChecker

Monitorea la salud de los servicios registrados.

### Tipos de Chequeos

1. **Connectivity**: Verificación de conectividad básica
2. **Endpoint**: Llamada a endpoint de salud específico
3. **Response Time**: Medición de tiempo de respuesta

```typescript
import { HealthChecker } from 'fox-framework';

const healthChecker = new HealthChecker({
  interval: 30000,  // Chequear cada 30 segundos
  timeout: 5000,    // Timeout de 5 segundos
  checks: ['connectivity', 'endpoint', 'response-time']
});

// Chequeo manual
const health = await healthChecker.checkService(serviceInfo);
console.log(`Service health: ${health.status}`);
```

## 🔧 Interfaces

### ServiceInfo

```typescript
interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  address: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  health?: ServiceHealth;
  metadata?: Record<string, any>;
  weight?: number;
  tags?: string[];
}
```

### ServiceRequest

```typescript
interface ServiceRequest {
  service: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}
```

### ServiceResponse

```typescript
interface ServiceResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  metadata: {
    serviceId: string;
    responseTime: number;
    timestamp: Date;
  };
}
```

### MicroservicesConfig

```typescript
interface MicroservicesConfig {
  serviceName: string;
  version: string;
  registry: RegistryConfig;
  loadBalancer: LoadBalancerConfig;
  circuitBreaker: CircuitBreakerConfig;
  serviceMesh: ServiceMeshConfig;
}
```

## ⚙️ Configuración

### Configuración Completa

```typescript
const config = createMicroservicesConfig({
  serviceName: 'my-service',
  version: '2.0.0',
  
  registry: {
    type: 'consul',
    connection: {
      host: 'localhost',
      port: 8500
    },
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      retries: 3
    }
  },
  
  loadBalancer: {
    algorithm: 'least-connections',
    healthCheck: true,
    retries: 3,
    retryDelayMs: 1000
  },
  
  circuitBreaker: {
    failureThreshold: 10,
    recoveryTimeout: 60000,
    monitoringPeriod: 10000,
    expectedExceptions: ['ValidationError', 'NotFoundError']
  },
  
  serviceMesh: {
    security: {
      tlsEnabled: true,
      mtlsEnabled: false,
      certificatePath: '/etc/ssl/certs'
    },
    policies: {
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      timeoutPolicy: {
        requestTimeoutMs: 10000
      }
    }
  }
});
```

## 📖 Ejemplos de Uso

### Ejemplo Básico: Setup de Microservicio

```typescript
import { MicroservicesFactory, createMicroservicesConfig } from 'fox-framework';

async function setupMicroservice() {
  // Crear configuración
  const config = createMicroservicesConfig({
    serviceName: 'user-service',
    version: '1.0.0'
  });
  
  // Crear factory
  const factory = MicroservicesFactory.create(config);
  
  // Inicializar
  await factory.initialize();
  
  // Registrar este servicio
  await factory.registerService({
    name: 'user-service',
    version: '1.0.0',
    address: 'localhost',
    port: 3000,
    protocol: 'http'
  });
  
  return factory;
}
```

### Ejemplo Avanzado: Comunicación Entre Servicios

```typescript
async function userServiceExample() {
  const factory = await setupMicroservice();
  
  // Llamar a otro servicio
  try {
    const paymentResponse = await factory.callService('payment-service', {
      service: 'payment-service',
      method: 'POST',
      path: '/api/payments',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      body: {
        userId: '12345',
        amount: 99.99,
        currency: 'USD'
      }
    });
    
    console.log('Payment processed:', paymentResponse.body);
  } catch (error) {
    console.error('Payment failed:', error.message);
  }
}
```

### Ejemplo: Monitoreo y Métricas

```typescript
async function monitoringExample() {
  const factory = await setupMicroservice();
  
  // Obtener métricas del circuit breaker
  const circuitBreaker = factory.getCircuitBreaker();
  const metrics = circuitBreaker.getMetrics();
  
  console.log('Circuit Breaker Metrics:', {
    state: metrics.state,
    successCount: metrics.successCount,
    failureCount: metrics.failureCount,
    successRate: metrics.successRate
  });
  
  // Obtener métricas del registry
  const registry = factory.getServiceRegistry();
  const registryMetrics = registry.getMetrics();
  
  console.log('Registry Metrics:', {
    totalServices: registryMetrics.totalServices,
    healthyServices: registryMetrics.healthyServices,
    unhealthyServices: registryMetrics.unhealthyServices
  });
}
```

### Ejemplo: Configuración de Producción

```typescript
async function productionSetup() {
  const config = createMicroservicesConfig({
    serviceName: process.env.SERVICE_NAME || 'my-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    
    registry: {
      type: 'consul',
      connection: {
        host: process.env.CONSUL_HOST || 'consul.company.com',
        port: parseInt(process.env.CONSUL_PORT || '8500')
      },
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 10000
      }
    },
    
    loadBalancer: {
      algorithm: 'least-connections',
      healthCheck: true,
      retries: 5
    },
    
    circuitBreaker: {
      failureThreshold: 10,
      recoveryTimeout: 120000,
      monitoringPeriod: 60000
    },
    
    serviceMesh: {
      security: {
        tlsEnabled: true,
        mtlsEnabled: true,
        certificatePath: '/etc/ssl/service-certs'
      }
    }
  });
  
  const factory = MicroservicesFactory.create(config);
  await factory.initialize();
  
  return factory;
}
```

## 🔍 Debugging y Troubleshooting

### Habilitar Logs Detallados

```typescript
const config = createMicroservicesConfig({
  serviceName: 'my-service',
  logging: {
    level: 'debug',
    enableMetrics: true
  }
});
```

### Chequeos de Salud Manuales

```typescript
// Verificar salud de servicios registrados
const services = await factory.discoverServices('payment-service');
for (const service of services) {
  const health = await factory.getServiceRegistry().checkHealth(service.id);
  console.log(`Service ${service.id}: ${health.status}`);
}
```

### Métricas en Tiempo Real

```typescript
// Configurar monitoreo continuo
setInterval(async () => {
  const metrics = factory.getCircuitBreaker().getMetrics();
  if (metrics.successRate < 90) {
    console.warn(`Low success rate: ${metrics.successRate}%`);
  }
}, 10000);
```

---

## 📚 Enlaces Relacionados

- [Arquitectura de Microservicios](../architecture/microservices.md)
- [Configuración Avanzada](../deployment/microservices-config.md)
- [Patrones de Diseño](../architecture/patterns.md)
- [Monitoreo y Observabilidad](../deployment/monitoring.md)
