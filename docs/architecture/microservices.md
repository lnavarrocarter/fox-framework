# 🔄 Arquitectura de Microservicios - Fox Framework

## 📋 Índice

- [Visión General](#visión-general)
- [Componentes Principales](#componentes-principales)
- [Patrones de Diseño](#patrones-de-diseño)
- [Flujo de Comunicación](#flujo-de-comunicación)
- [Consideraciones de Arquitectura](#consideraciones-de-arquitectura)
- [Escalabilidad](#escalabilidad)
- [Seguridad](#seguridad)

## 🎯 Visión General

El sistema de microservicios de Fox Framework implementa una arquitectura distribuida completa que facilita la construcción, despliegue y gestión de aplicaciones basadas en microservicios. La arquitectura está diseñada siguiendo principios de:

- **Resilencia**: Tolerancia a fallos mediante Circuit Breaker
- **Escalabilidad**: Load Balancing inteligente y service discovery
- **Observabilidad**: Métricas, logging y health monitoring
- **Seguridad**: Service Mesh con TLS/mTLS
- **Flexibilidad**: Múltiples adapters y algoritmos configurables

## 🏗️ Componentes Principales

### MicroservicesFactory

**Responsabilidad**: Orchestrator principal que gestiona el ciclo de vida de todos los componentes.

**Patrones Implementados**:
- **Factory Pattern**: Creación centralizada de instancias
- **Singleton Pattern**: Una instancia por servicio/versión
- **Facade Pattern**: Interfaz unificada para acceso a componentes

```
┌─────────────────────────────────────┐
│        MicroservicesFactory         │
├─────────────────────────────────────┤
│ + create(config)                    │
│ + initialize()                      │
│ + registerService(info)             │
│ + callService(name, request)        │
│ + getServiceRegistry()              │
│ + getLoadBalancer()                 │
│ + getCircuitBreaker()               │
│ + getServiceMesh()                  │
└─────────────────────────────────────┘
```

### ServiceRegistry

**Responsabilidad**: Registro y descubrimiento de servicios con health monitoring.

**Adaptadores Soportados**:
- **Memory**: Para desarrollo y testing
- **Consul**: Para entornos distribuidos
- **etcd**: Para integración con Kubernetes

```
┌─────────────────────────────────────┐
│           ServiceRegistry           │
├─────────────────────────────────────┤
│ + register(serviceInfo)             │
│ + discover(serviceName)             │
│ + deregister(serviceId)             │
│ + checkHealth(serviceId)            │
│ + watch(serviceName, callback)      │
│ + getMetrics()                      │
└─────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼───────┐ ┌───────▼───────┐
│ MemoryAdapter │ │ ConsulAdapter │
└───────────────┘ └───────────────┘
```

### LoadBalancer

**Responsabilidad**: Distribución inteligente de tráfico entre instancias de servicios.

**Algoritmos Implementados**:
1. **Round Robin**: Distribución secuencial equitativa
2. **Weighted**: Basado en pesos asignados a cada instancia
3. **Least Connections**: Selecciona instancia con menos conexiones activas
4. **Random**: Selección aleatoria con distribución uniforme
5. **IP Hash**: Consistencia por IP del cliente
6. **Health Based**: Prioriza instancias más saludables

```
┌─────────────────────────────────────┐
│            LoadBalancer             │
├─────────────────────────────────────┤
│ + selectService(name, options)      │
│ + updateServices(name, services)    │
│ + recordMetrics(serviceId, metrics) │
│ + getServiceMetrics(serviceId)      │
└─────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
┌───────▼──┐ ┌───▼───┐ ┌──▼────────┐
│RoundRobin│ │Weighted│ │LeastConns │
└──────────┘ └────────┘ └───────────┘
```

### CircuitBreaker

**Responsabilidad**: Protección contra fallos en cascada implementando el patrón Circuit Breaker.

**Estados del Circuit Breaker**:
- **Closed**: Estado normal, permite todas las llamadas
- **Open**: Estado de fallo, rechaza llamadas inmediatamente
- **Half-Open**: Estado de prueba, permite llamadas limitadas

```
┌─────────────────────────────────────┐
│           CircuitBreaker            │
├─────────────────────────────────────┤
│ + execute(operation)                │
│ + recordSuccess()                   │
│ + recordFailure(error)              │
│ + getState()                        │
│ + getMetrics()                      │
│ + reset()                           │
└─────────────────────────────────────┘

   CLOSED ────failure_threshold────► OPEN
      ▲                                │
      │                                │
      │                                │
   success                     recovery_timeout
      │                                │
      │                                ▼
   HALF-OPEN ◄─────────────────── HALF-OPEN
```

### ServiceMesh

**Responsabilidad**: Comunicación segura e interconexión de servicios.

**Características**:
- **TLS/mTLS**: Encriptación de comunicaciones
- **Traffic Policies**: Políticas de retry, timeout y rate limiting
- **Observabilidad**: Métricas de red y trazado distribuido
- **Security**: Autenticación y autorización entre servicios

```
┌─────────────────────────────────────┐
│            ServiceMesh              │
├─────────────────────────────────────┤
│ + sendRequest(service, request)     │
│ + configureSecurity(config)         │
│ + applyPolicies(policies)           │
│ + getNetworkMetrics()               │
└─────────────────────────────────────┘
```

## 🎨 Patrones de Diseño

### 1. Factory Pattern

La `MicroservicesFactory` implementa el patrón Factory para centralizar la creación de componentes:

```typescript
// Implementación del Factory Pattern
class MicroservicesFactory {
  private static instances = new Map<string, MicroservicesFactory>();
  
  static create(config: MicroservicesConfig): MicroservicesFactory {
    const key = `${config.serviceName}:${config.version}`;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, new MicroservicesFactory(config));
    }
    
    return this.instances.get(key)!;
  }
}
```

### 2. Strategy Pattern

El LoadBalancer utiliza Strategy Pattern para algoritmos de balanceo:

```typescript
interface LoadBalancingStrategy {
  selectService(services: ServiceInfo[], options?: any): ServiceInfo;
}

class LoadBalancer {
  private strategy: LoadBalancingStrategy;
  
  constructor(config: LoadBalancerConfig) {
    this.strategy = this.createStrategy(config.algorithm);
  }
  
  private createStrategy(algorithm: string): LoadBalancingStrategy {
    switch (algorithm) {
      case 'round-robin': return new RoundRobinStrategy();
      case 'weighted': return new WeightedStrategy();
      case 'least-connections': return new LeastConnectionsStrategy();
      // ...más estrategias
    }
  }
}
```

### 3. State Pattern

El CircuitBreaker implementa State Pattern para gestionar sus estados:

```typescript
abstract class CircuitBreakerState {
  abstract execute(operation: () => Promise<any>): Promise<any>;
  abstract canExecute(): boolean;
}

class ClosedState extends CircuitBreakerState {
  execute(operation: () => Promise<any>): Promise<any> {
    return operation();
  }
  
  canExecute(): boolean {
    return true;
  }
}

class OpenState extends CircuitBreakerState {
  execute(operation: () => Promise<any>): Promise<any> {
    throw new Error('Circuit breaker is open');
  }
  
  canExecute(): boolean {
    return false;
  }
}
```

### 4. Observer Pattern

El ServiceRegistry implementa Observer Pattern para notificaciones:

```typescript
class ServiceRegistry {
  private watchers = new Map<string, Array<(event: string, service: ServiceInfo) => void>>();
  
  watch(serviceName: string, callback: (event: string, service: ServiceInfo) => void) {
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, []);
    }
    this.watchers.get(serviceName)!.push(callback);
  }
  
  private notifyWatchers(serviceName: string, event: string, service: ServiceInfo) {
    const callbacks = this.watchers.get(serviceName) || [];
    callbacks.forEach(callback => callback(event, service));
  }
}
```

## 🌊 Flujo de Comunicación

### Flujo Completo de Llamada entre Servicios

```
Client Service                   Microservices Factory
     │                                    │
     │ 1. callService(name, request)      │
     ├────────────────────────────────────┤
     │                                    │
     │             ServiceRegistry        │
     │                    │               │
     │ 2. discover(name)  │               │
     │────────────────────┤               │
     │ 3. services[]      │               │
     │◄───────────────────┤               │
     │                                    │
     │             LoadBalancer           │
     │                    │               │
     │ 4. selectService() │               │
     │────────────────────┤               │
     │ 5. selectedService │               │
     │◄───────────────────┤               │
     │                                    │
     │             CircuitBreaker         │
     │                    │               │
     │ 6. execute(call)   │               │
     │────────────────────┤               │
     │                    │               │
     │              ServiceMesh           │
     │                    │               │
     │ 7. sendRequest()   │               │
     │────────────────────┤               │
     │                    │               │
     │                    │  Target Service
     │                    │       │
     │                    │ 8. HTTP Call
     │                    │───────┤
     │                    │ 9. Response
     │                    │◄──────┤
     │                    │               │
     │ 10. response       │               │
     │◄───────────────────┤               │
     │ 11. final response │               │
     │◄───────────────────────────────────┤
```

### Descripción del Flujo

1. **Llamada Inicial**: Cliente solicita comunicación con servicio
2. **Service Discovery**: Registry busca instancias disponibles del servicio
3. **Load Balancing**: Selección de instancia óptima según algoritmo
4. **Circuit Breaker**: Verificación de estado y protección contra fallos
5. **Service Mesh**: Aplicación de políticas de seguridad y red
6. **Comunicación**: Llamada HTTP/gRPC real al servicio destino
7. **Respuesta**: Propagación de respuesta a través de todos los componentes

## 🏛️ Consideraciones de Arquitectura

### Separación de Responsabilidades

Cada componente tiene una responsabilidad específica y bien definida:

- **MicroservicesFactory**: Orchestration y lifecycle management
- **ServiceRegistry**: Service discovery y health monitoring
- **LoadBalancer**: Traffic distribution y performance optimization
- **CircuitBreaker**: Fault tolerance y resilience
- **ServiceMesh**: Network policies y security

### Configurabilidad

La arquitectura permite múltiples configuraciones:

```typescript
// Configuración para desarrollo
const devConfig = {
  registry: { type: 'memory' },
  loadBalancer: { algorithm: 'round-robin' },
  circuitBreaker: { failureThreshold: 3 }
};

// Configuración para producción
const prodConfig = {
  registry: { 
    type: 'consul',
    connection: { host: 'consul.company.com' }
  },
  loadBalancer: { 
    algorithm: 'least-connections',
    healthCheck: true 
  },
  circuitBreaker: { 
    failureThreshold: 10,
    recoveryTimeout: 60000 
  }
};
```

### Extensibilidad

Nuevos adapters y estrategias pueden agregarse fácilmente:

```typescript
// Nuevo adapter para service registry
class KubernetesAdapter implements RegistryAdapter {
  async register(service: ServiceInfo): Promise<void> {
    // Implementación específica para Kubernetes
  }
}

// Nueva estrategia de load balancing
class GeographicStrategy implements LoadBalancingStrategy {
  selectService(services: ServiceInfo[], options: any): ServiceInfo {
    // Selección basada en ubicación geográfica
  }
}
```

## 📈 Escalabilidad

### Escalabilidad Horizontal

- **Service Registry**: Soporta clustering con Consul/etcd
- **Load Balancer**: Distribución automática de carga
- **Circuit Breaker**: Protección individual por servicio
- **Service Mesh**: Comunicación peer-to-peer escalable

### Métricas de Performance

```typescript
// Métricas del LoadBalancer
interface LoadBalancerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  serviceDistribution: Record<string, number>;
}

// Métricas del CircuitBreaker
interface CircuitBreakerMetrics {
  state: 'closed' | 'open' | 'half-open';
  successCount: number;
  failureCount: number;
  successRate: number;
  lastFailureTime?: Date;
}
```

### Optimizaciones

1. **Connection Pooling**: Reutilización de conexiones HTTP
2. **Caching**: Cache de service discovery results
3. **Batching**: Agrupación de health checks
4. **Compression**: Compresión de payloads en Service Mesh

## 🔒 Seguridad

### Autenticación y Autorización

```typescript
// Configuración de seguridad en Service Mesh
const securityConfig = {
  tlsEnabled: true,
  mtlsEnabled: true,
  certificatePath: '/etc/ssl/certs',
  allowedServices: ['user-service', 'payment-service'],
  authenticationRequired: true,
  authorizationPolicies: {
    'payment-service': ['user-service', 'order-service'],
    'user-service': ['*'] // Acceso público
  }
};
```

### Encriptación

- **TLS**: Encriptación en tránsito
- **mTLS**: Autenticación mutua entre servicios
- **Certificate Management**: Rotación automática de certificados

### Auditoría

```typescript
// Logging de seguridad
interface SecurityEvent {
  timestamp: Date;
  sourceService: string;
  targetService: string;
  action: string;
  result: 'allowed' | 'denied';
  reason?: string;
}
```

## 🔍 Monitoreo y Observabilidad

### Health Checks

```typescript
// Configuración de health monitoring
const healthConfig = {
  interval: 30000,      // Cada 30 segundos
  timeout: 5000,        // Timeout de 5 segundos
  retries: 3,           // 3 reintentos
  checks: [
    'connectivity',      // Ping básico
    'endpoint',         // Llamada a /health
    'response-time'     // Medición de latencia
  ]
};
```

### Métricas Distribuidas

```typescript
// Métricas agregadas del sistema
interface SystemMetrics {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  totalRequests: number;
  errorRate: number;
  averageLatency: number;
  circuitBreakerStates: Record<string, string>;
}
```

Esta arquitectura proporciona una base sólida para construir sistemas de microservicios robustos, escalables y mantenibles con Fox Framework.
