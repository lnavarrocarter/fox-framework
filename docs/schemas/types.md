# 📚 Schemas - Fox Framework

## 📋 Índice

- [Core Types](#core-types)
- [Server Configuration](#server-configuration)
- [Request Types](#request-types)
- [Template Types](#template-types)
- [Validation Types](#validation-types)
- [Microservices Types](#microservices-types)
- [CLI Types](#cli-types)
- [Error Types](#error-types)

## 🔧 Core Types

### ServerConfig

Configuración principal para inicializar el servidor Fox Framework.

```typescript
interface ServerConfig {
  // Required fields
  port: number;                    // Puerto del servidor
  env: string;                     // Entorno de ejecución
  
  // Optional configuration
  jsonSpaces?: number;             // Espacios para JSON pretty-print
  staticFolder?: string;           // Carpeta de archivos estáticos
  middlewares?: Middleware[];      // Middleware personalizados
  providers?: Provider[];          // Proveedores de servicios
  views?: ViewConfig[];           // Configuración de vistas
  requests?: RouteConfig[];       // Configuración de rutas
}
```

**Ejemplo:**
```typescript
const config: ServerConfig = {
  port: 3000,
  env: 'development',
  jsonSpaces: 2,
  staticFolder: 'public',
  middlewares: [corsMiddleware(), authMiddleware()],
  requests: [
    {
      method: 'GET',
      path: '/users',
      callback: getUsersHandler
    }
  ]
};
```

### FoxFactoryContext

Contexto interno usado por el factory para gestión de instancias.

```typescript
interface FoxFactoryContext {
  port: number;
  env: string;
  logger?: LoggerInterface;
  providers?: Array<Provider>;
  views?: Array<ViewConfig>;
  serverType?: ServerTypeCtx;
  requests?: Array<RequestMethodsContext>;
}
```

### FoxServerInterface

Interface principal que define las capacidades del servidor.

```typescript
type FoxServerInterface = {
  [index in RequestMethod]: (path: string, callback: RequestCallback) => void;
} & {
  create: () => void;
  start: () => void;
  destroy: () => void;
  use: (callback: Middleware) => void;
  set: (setting: string, value: any) => void;
  render: (type: string, path: string, callback: ViewCallback) => void;
};
```

## 🖥️ Server Configuration

### ServerOptions

Opciones básicas para configuración del servidor.

```typescript
interface ServerOptions {
  port: number;           // Puerto de escucha
  env: string;           // Entorno (development, production, test)
}
```

### Middleware

Definición de middleware para procesamiento de requests.

```typescript
interface Middleware {
  (req: Request, res: Response, next: NextFunction): void;
}
```

**Ejemplo de middleware personalizado:**
```typescript
const loggerMiddleware: Middleware = (req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
};

const authMiddleware: Middleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  // Validate token...
  next();
};
```

## 🛣️ Request Types

### Route

Definición de una ruta HTTP.

```typescript
interface Route {
  path: string;                                    // Ruta URL
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';      // Método HTTP
  handler: RequestCallback;                        // Manejador de la ruta
}
```

### RequestCallback

Función callback para manejar requests HTTP.

```typescript
type RequestCallback = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => void;
```

### RequestMethodsContext

Contexto para métodos de request en el framework.

```typescript
interface RequestMethodsContext {
  method: RequestMethod;
  path: string;
  callback: RequestCallback;
  middleware?: Middleware[];
}
```

**Ejemplo:**
```typescript
const userRoutes: RequestMethodsContext[] = [
  {
    method: RequestMethod.GET,
    path: '/users',
    callback: (req, res) => {
      res.json({ users: [] });
    },
    middleware: [authMiddleware]
  },
  {
    method: RequestMethod.POST,
    path: '/users',
    callback: (req, res) => {
      const user = req.body;
      // Create user logic
      res.status(201).json(user);
    }
  }
];
```

### RequestMethod Enum

Enumeración de métodos HTTP soportados.

```typescript
enum RequestMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
  ALL = 'all'
}
```

## 🎨 Template Types

### ViewConfig

Configuración para renderizado de vistas.

```typescript
interface ViewConfig {
  type: string;                    // Tipo de engine (fox, html, hbs)
  path: string;                    // Ruta de la vista
  callback: ViewCallback;          // Callback de renderizado
  data?: TemplateData;            // Datos por defecto
}
```

### ViewCallback

Función callback para renderizado de vistas.

```typescript
type ViewCallback = (req: Request, res: Response) => void;
```

### TemplateData

Datos que se pasan a los templates para renderizado.

```typescript
interface TemplateData {
  [key: string]: any;
}
```

**Ejemplo de configuración de vista:**
```typescript
const indexView: ViewConfig = {
  type: 'fox',
  path: '/',
  callback: (req, res) => {
    res.render('index', {
      title: 'Fox Framework',
      message: 'Bienvenido',
      users: ['Alice', 'Bob', 'Charlie'],
      isLoggedIn: req.session?.user != null
    });
  }
};
```

### Template Engine Options

Opciones para los motores de plantillas.

```typescript
interface TemplateEngineOptions {
  views?: string;                  // Directorio de vistas
  cache?: boolean;                 // Habilitar cache de templates
  debug?: boolean;                 // Modo debug
  helpers?: TemplateHelpers;       // Funciones helper personalizadas
}

interface TemplateHelpers {
  [name: string]: (...args: any[]) => any;
}
```

## 🔧 CLI Types

### GeneratorConfig

Configuración para generadores del CLI.

```typescript
interface GeneratorConfig {
  name: string;                    // Nombre del elemento a generar
  type: GeneratorType;             // Tipo de generador
  destination?: string;            // Directorio destino
  template?: string;               // Template personalizado
  data?: GeneratorData;           // Datos adicionales
}

enum GeneratorType {
  CONTROLLER = 'controller',
  MODEL = 'model',
  VIEW = 'view',
  MIDDLEWARE = 'middleware',
  SERVICE = 'service'
}

interface GeneratorData {
  [key: string]: any;
}
```

### CLICommand

Definición de comandos del CLI.

```typescript
interface CLICommand {
  name: string;                    // Nombre del comando
  description: string;             // Descripción
  options: CLIOption[];           // Opciones disponibles
  action: CommandAction;          // Función a ejecutar
}

interface CLIOption {
  flag: string;                   // Flag del comando (-f, --force)
  description: string;            // Descripción de la opción
  required?: boolean;             // Si es requerida
  default?: any;                 // Valor por defecto
}

type CommandAction = (args: string[], options: any) => void;
```

## ❌ Error Types

### HttpError

Clase para manejo de errores HTTP.

```typescript
class HttpError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
```

**Uso:**
```typescript
// En un controller
if (!user) {
  throw new HttpError(404, 'User not found', 'USER_NOT_FOUND', { userId });
}

if (!isValidInput(data)) {
  throw new HttpError(400, 'Invalid input data', 'VALIDATION_ERROR', {
    errors: validationErrors
  });
}
```

### ErrorResponse

Estructura estándar para respuestas de error.

```typescript
interface ErrorResponse {
  error: {
    status: number;
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    path: string;
  };
}
```

## Validation Types

Esta sección documenta los tipos utilizados en el sistema de validación de Fox Framework.

### BaseValidationError

Tipo base para errores de validación:

```typescript
interface BaseValidationError {
  path: string;
  message: string;
  code: string;
  value?: any;
}
```

### ValidationResult

Resultado de una operación de validación:

```typescript
type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: BaseValidationError[];
}
```

### SchemaType

Enumeración de tipos de esquema soportados:

```typescript
enum SchemaType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  LITERAL = 'literal',
  UNION = 'union',
  ENUM = 'enum',
  ANY = 'any',
  NEVER = 'never'
}
```

### StringValidationRules

Reglas de validación para strings:

```typescript
interface StringValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  transform?: (value: string) => string;
  refine?: (value: string) => boolean;
}
```

### NumberValidationRules

Reglas de validación para números:

```typescript
interface NumberValidationRules {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  multipleOf?: number;
}
```

### ObjectValidationRules

Reglas de validación para objetos:

```typescript
interface ObjectValidationRules {
  shape: Record<string, BaseSchema<any>>;
  strict?: boolean;
  passthrough?: boolean;
}
```

### ArrayValidationRules

Reglas de validación para arrays:

```typescript
interface ArrayValidationRules {
  element: BaseSchema<any>;
  minLength?: number;
  maxLength?: number;
  unique?: boolean;
}
```
## 🔍 Utility Types

### Optional

Helper type para hacer propiedades opcionales.

```typescript
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Ejemplo de uso
type PartialServerConfig = Optional<ServerConfig, 'jsonSpaces' | 'staticFolder'>;
```

### DeepPartial

Type helper para hacer todas las propiedades opcionales recursivamente.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### Constructor

Type para constructores de clases.

```typescript
type Constructor<T = {}> = new (...args: any[]) => T;
```

## 📊 Examples Schema

### Complete Application Configuration

```typescript
const completeConfig: ServerConfig = {
  // Basic settings
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  env: process.env.NODE_ENV || 'development',
  jsonSpaces: 2,
  staticFolder: 'public',

  // Middleware stack
  middlewares: [
    corsMiddleware({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }),
    authMiddleware(),
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    })
  ],

  // API Routes
  requests: [
    {
      method: RequestMethod.GET,
      path: '/users',
      callback: userController.index
    },
    {
      method: RequestMethod.POST,
      path: '/users',
      callback: userController.create
    },
    {
      method: RequestMethod.GET,
      path: '/users/:id',
      callback: userController.show
    }
  ],

  // Views
  views: [
    {
      type: 'fox',
      path: '/',
      callback: (req, res) => {
        res.render('index', {
          title: 'Fox Framework App',
          description: 'A modern web framework',
          features: ['Fast', 'Scalable', 'TypeScript']
        });
      }
    },
    {
      type: 'html',
      path: '/about',
      callback: (req, res) => {
        res.render('about', {
          title: 'About Us',
          company: 'Fox Framework Ltd.'
        });
      }
    }
  ]
};
```

## 🔄 Microservices Types

### MicroservicesConfig

Configuración principal para el sistema de microservicios.

```typescript
interface MicroservicesConfig {
  serviceName: string;              // Nombre del servicio
  version: string;                  // Versión del servicio
  registry: RegistryConfig;         // Configuración del service registry
  loadBalancer: LoadBalancerConfig; // Configuración del load balancer
  circuitBreaker: CircuitBreakerConfig; // Configuración del circuit breaker
  serviceMesh: ServiceMeshConfig;   // Configuración del service mesh
}
```

### ServiceInfo

Información de un servicio registrado.

```typescript
interface ServiceInfo {
  id: string;                       // ID único del servicio
  name: string;                     // Nombre del servicio
  version: string;                  // Versión del servicio
  address: string;                  // Dirección IP/hostname
  port: number;                     // Puerto del servicio
  protocol: 'http' | 'https' | 'grpc'; // Protocolo de comunicación
  health?: ServiceHealth;           // Estado de salud
  metadata?: Record<string, any>;   // Metadatos adicionales
  weight?: number;                  // Peso para load balancing
  tags?: string[];                  // Tags para filtrado
}
```

### ServiceRequest

Request para comunicación entre servicios.

```typescript
interface ServiceRequest {
  service: string;                  // Nombre del servicio destino
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // Método HTTP
  path: string;                     // Path del endpoint
  headers?: Record<string, string>; // Headers HTTP
  body?: any;                       // Cuerpo de la request
  timeout?: number;                 // Timeout en milisegundos
}
```

### ServiceResponse

Response de comunicación entre servicios.

```typescript
interface ServiceResponse {
  statusCode: number;               // Código de estado HTTP
  headers: Record<string, string>;  // Headers de respuesta
  body: any;                        // Cuerpo de la respuesta
  metadata: {
    serviceId: string;              // ID del servicio que respondió
    responseTime: number;           // Tiempo de respuesta en ms
    timestamp: Date;                // Timestamp de la respuesta
  };
}
```

### RegistryConfig

Configuración para el service registry.

```typescript
interface RegistryConfig {
  type: 'memory' | 'consul' | 'etcd'; // Tipo de registry
  connection?: {
    host?: string;                  // Host del registry
    port?: number;                  // Puerto del registry
    username?: string;              // Usuario para autenticación
    password?: string;              // Contraseña para autenticación
  };
  healthCheck?: {
    enabled: boolean;               // Habilitar health checks
    interval: number;               // Intervalo entre checks (ms)
    timeout: number;                // Timeout por check (ms)
    retries: number;                // Número de reintentos
  };
}
```

### LoadBalancerConfig

Configuración para el load balancer.

```typescript
interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'weighted' | 'least-connections' | 
             'random' | 'ip-hash' | 'health-based'; // Algoritmo de balanceo
  healthCheck: boolean;             // Considerar health en balanceo
  retries: number;                  // Número de reintentos
  retryDelayMs: number;            // Delay entre reintentos
  sticky?: boolean;                 // Sesiones pegajosas
}
```

### CircuitBreakerConfig

Configuración para el circuit breaker.

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;         // Fallos antes de abrir
  recoveryTimeout: number;          // Tiempo antes de half-open (ms)
  monitoringPeriod: number;         // Ventana de monitoreo (ms)
  expectedExceptions: string[];     // Excepciones esperadas (no cuentan)
}
```

### ServiceMeshConfig

Configuración para el service mesh.

```typescript
interface ServiceMeshConfig {
  security: {
    tlsEnabled: boolean;            // Habilitar TLS
    mtlsEnabled: boolean;           // Habilitar mTLS
    certificatePath: string;        // Path a certificados
    allowedServices?: string[];     // Servicios permitidos
  };
  policies: {
    retryPolicy: {
      maxRetries: number;           // Máximo número de reintentos
      backoffMs: number;            // Backoff entre reintentos
    };
    timeoutPolicy: {
      requestTimeoutMs: number;     // Timeout de request
    };
    rateLimitPolicy?: {
      requestsPerMinute: number;    // Límite de requests por minuto
    };
  };
}
```

### ServiceHealth

Estado de salud de un servicio.

```typescript
interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'warning'; // Estado de salud
  lastCheck: Date;                  // Último check de salud
  checks: HealthCheck[];            // Detalles de checks
  metadata?: Record<string, any>;   // Metadatos de salud
}

interface HealthCheck {
  type: 'connectivity' | 'endpoint' | 'response-time'; // Tipo de check
  status: 'pass' | 'fail' | 'warn'; // Resultado del check
  responseTime?: number;            // Tiempo de respuesta
  message?: string;                 // Mensaje descriptivo
  timestamp: Date;                  // Timestamp del check
}
```

### Circuit Breaker States

Estados del circuit breaker.

```typescript
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerMetrics {
  state: CircuitBreakerState;       // Estado actual
  successCount: number;             // Número de éxitos
  failureCount: number;             // Número de fallos
  successRate: number;              // Tasa de éxito (0-100)
  lastFailureTime?: Date;           // Último fallo registrado
  nextAttemptTime?: Date;           // Próximo intento permitido
}
```

### Load Balancer Metrics

Métricas del load balancer.

```typescript
interface LoadBalancerMetrics {
  totalRequests: number;            // Total de requests
  successfulRequests: number;       // Requests exitosos
  failedRequests: number;           // Requests fallidos
  averageResponseTime: number;      // Tiempo promedio de respuesta
  serviceDistribution: Record<string, number>; // Distribución por servicio
}
```

**Ejemplo de uso completo:**

```typescript
import { MicroservicesFactory, createMicroservicesConfig } from 'fox-framework';
import type { MicroservicesConfig, ServiceInfo, ServiceRequest } from 'fox-framework';

const config: MicroservicesConfig = createMicroservicesConfig({
  serviceName: 'user-service',
  version: '1.0.0',
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
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 10000,
    expectedExceptions: ['ValidationError']
  }
});

const factory = MicroservicesFactory.create(config);

// Registro de servicio
const serviceInfo: Partial<ServiceInfo> = {
  name: 'user-service',
  version: '1.0.0',
  address: 'localhost',
  port: 3000,
  protocol: 'http',
  metadata: {
    description: 'User management service',
    team: 'backend'
  }
};

await factory.registerService(serviceInfo);

// Llamada a servicio
const request: ServiceRequest = {
  service: 'payment-service',
  method: 'POST',
  path: '/api/payments',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: {
    amount: 100,
    currency: 'USD'
  },
  timeout: 5000
};

const response = await factory.callService('payment-service', request);
```

## 🏷️ Type Guards

### Server Type Guards

```typescript
function isServerConfig(obj: any): obj is ServerConfig {
  return obj && 
         typeof obj.port === 'number' && 
         typeof obj.env === 'string';
}

function isHttpError(error: any): error is HttpError {
  return error instanceof HttpError || 
         (error && typeof error.status === 'number');
}

function isValidRoute(route: any): route is Route {
  return route &&
         typeof route.path === 'string' &&
         typeof route.method === 'string' &&
         typeof route.handler === 'function';
}
```

## 🔄 Version History

### v1.0.0
- Initial type definitions
- Basic server configuration
- Core interfaces

### v1.1.0 (Completed)
- Enhanced error types
- Plugin system types
- Database abstraction types
- **Microservices types and interfaces**

### v1.2.0 (Planned)
- Event system types
- Cache layer types
- Monitoring types
