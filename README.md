# 🦊 Fox Framework

Un framework web moderno para TypeScript/Node.js con routing modular, motor de templates integrado y arquitectura basada en factory patterns.

## 🚀 Características

- **🏭 Factory Pattern**: Gestión centralizada de instancias de servidor
- **🛣️ Routing Modular**: Sistema de rutas flexible y extensible
- **🎨 Motor de Templates**: Engine personalizado `.fox` + soporte HTML/HBS
- **🗂️ Sistema de Cache**: Multi-provider cache (Memory, Redis, File) con TTL
- **🔍 Sistema de Validación**: Schema builder con API tipo Zod
- **📊 Logging Estructurado**: Sistema completo con múltiples transports
- **🎯 Event System**: Event sourcing, CQRS y sistema pub/sub distribuido
- **🗄️ Database Abstraction**: Multi-provider DB layer (PostgreSQL, MySQL, SQLite, MongoDB, Redis)
- **🔄 Microservices Support**: Service registry, load balancer, circuit breaker y service mesh
- **🐳 Docker Integration**: Generación automática de Dockerfiles y docker-compose
- **⚡ CLI Potente**: Generación automática de código
- **🔧 TypeScript First**: Tipado estricto y IntelliSense completo
- **🧪 Testing Ready**: Configuración Jest incluida + 950+ tests
- **📚 Documentación Completa**: APIs y arquitectura documentadas

## 📦 Instalación

```bash
npm install fox-framework
```

## 🎯 Inicio Rápido

### Crear un servidor básico

```typescript
import { startServer } from 'fox-framework';

const config = {
  port: 3000,
  env: 'development',
  jsonSpaces: 2,
  staticFolder: 'public'
};

startServer(config);
```

### Con rutas personalizadas

```typescript
import { startServer, RequestMethod } from 'fox-framework';

const config = {
  port: 3000,
  env: 'development',
  requests: [
    {
      method: RequestMethod.GET,
      path: '/users',
      callback: (req, res) => {
        res.json({ users: ['Alice', 'Bob'] });
      }
    },
    {
      method: RequestMethod.POST,
      path: '/users',
      callback: (req, res) => {
        const user = req.body;
        res.status(201).json(user);
      }
    }
  ]
};

startServer(config);
```

### Con templates

```typescript
const config = {
  port: 3000,
  env: 'development',
  views: [
    {
      type: 'fox',
      path: '/',
      callback: (req, res) => {
        res.render('index', {
          title: 'Fox Framework',
          message: 'Bienvenido!',
          users: ['Alice', 'Bob']
        });
      }
    }
  ]
};

startServer(config);
```

## 🎨 Motor de Templates (.fox)

### Sintaxis básica

```fox
<!-- Variables -->
<h1>{{title}}</h1>
<p>{{message}}</p>

<!-- Condicionales -->
{{if user}}
  <p>Bienvenido, {{user.name}}!</p>
{{else}}
  <p>Por favor, inicia sesión</p>
{{/if}}

<!-- Bucles -->
<ul>
  {{each users}}
    <li>{{this.name}} - {{this.email}}</li>
  {{/each}}
</ul>
```

## 🗂️ Sistema de Cache

### Cache básico

```typescript
import { CacheFactory } from '@tsfox/core/cache';

// Memory cache
const cache = CacheFactory.create({
  provider: 'memory',
  maxSize: 1000
});

// Store and retrieve data
await cache.set('user:123', { name: 'John Doe' }, 3600); // 1 hour TTL
const user = await cache.get('user:123');

// Check metrics
const metrics = cache.getMetrics();
console.log(`Hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`);
```

### Cache middleware para respuestas

```typescript
import { responseCache } from '@tsfox/core/cache/middleware';

app.use(responseCache({
  ttl: 300, // 5 minutes
  condition: (req, res) => req.method === 'GET'
}));
```

### Multi-provider cache

```typescript
// File cache para desarrollo
const fileCache = CacheFactory.create({
  provider: 'file',
  file: { directory: './cache' }
});

// Redis cache para producción
const redisCache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'myapp:'
  }
});
```

## 🎯 Event System

### Event sourcing y CQRS

```typescript
import { EventSystemFactory, EventInterface } from 'fox-framework';

// Create event system
const eventSystem = EventSystemFactory.createMemorySystem();

// Define events
const userCreatedEvent: EventInterface = {
  id: 'evt_001',
  type: 'user.created',
  aggregateId: 'user_123',
  data: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  metadata: {
    source: 'user-service',
    correlationId: 'req_001'
  },
  timestamp: new Date()
};

// Event handlers
eventSystem.on('user.created', async (event) => {
  console.log(`User created: ${event.data.name}`);
  // Send welcome email, update projections, etc.
});

// Emit events
await eventSystem.emit(userCreatedEvent);
```

### Event Store y Replay

```typescript
// Store events for event sourcing
const store = eventSystem.getStore();
await store.append('user_123', [userCreatedEvent]);

// Read events from stream
const events = await store.read('user_123');

// Replay events for rebuilding state
await eventSystem.replay('user_123');
```

### Distributed Event Bus

```typescript
// Subscribe to distributed events
const subscription = await eventSystem.subscribe(
  'user.created',
  async (event) => {
    // Handle distributed event
  },
  { durable: true, ackTimeout: 5000 }
);

// Publish to external systems
const bus = eventSystem.getBus();
await bus.publish(userCreatedEvent);
```

## 🗄️ Database Abstraction

### Multi-Provider Database Support

```typescript
import { DatabaseFactory, createDatabase } from 'fox-framework';

// PostgreSQL
const pgDb = createDatabase({
  provider: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'user',
    password: 'pass'
  }
});

// MongoDB  
const mongoDb = createDatabase({
  provider: 'mongodb',
  connection: {
    url: 'mongodb://localhost:27017/myapp'
  }
});

// SQLite for development
const sqliteDb = createDatabase({
  provider: 'sqlite',
  connection: {
    filename: './database.sqlite'
  }
});
```

### Query Builder

```typescript
// SQL Query Builder
const users = await db
  .getBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .where({ active: true })
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();

// Complex queries with JOINs
const userPosts = await db
  .getBuilder()
  .select(['u.name', 'p.title', 'p.created_at'])
  .from('users', 'u')
  .join('posts', 'p', 'u.id = p.user_id')
  .where('u.active', '=', true)
  .andWhere('p.published', '=', true)
  .execute();

// NoSQL Query Builder (MongoDB)
const docs = await mongoDb
  .getBuilder()
  .collection('users')
  .find({ status: 'active' })
  .sort({ createdAt: -1 })
  .limit(10)
  .execute();
```

### Transactions

```typescript
// ACID transactions
await db.transaction(async (tx) => {
  // All operations within this block are transactional
  await tx.query('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
  await tx.query('INSERT INTO profiles (user_id, bio) VALUES (?, ?)', [userId, 'Developer']);
  
  // If any operation fails, entire transaction is rolled back
});
```

### Connection Pooling

```typescript
const db = createDatabase({
  provider: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'myapp'
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000
  }
});

// Monitor pool health
const poolInfo = await db.getPoolInfo();
console.log(`Active connections: ${poolInfo.activeConnections}`);
```

## 🔄 Microservices Support

Fox Framework incluye un sistema completo para construir y gestionar arquitecturas de microservicios.

### Setup básico de microservicios

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
await factory.initialize();

// Registrar este servicio
await factory.registerService({
  name: 'user-service',
  version: '1.0.0',
  address: 'localhost',
  port: 3000,
  protocol: 'http'
});
```

### Comunicación entre servicios

```typescript
// Llamar a otro servicio con protección de circuit breaker
const response = await factory.callService('payment-service', {
  service: 'payment-service',
  method: 'POST',
  path: '/api/payments',
  headers: { 'Content-Type': 'application/json' },
  body: { amount: 100, currency: 'USD' }
});

console.log('Payment response:', response.body);
```

### Configuración para producción

```typescript
const prodConfig = createMicroservicesConfig({
  serviceName: process.env.SERVICE_NAME,
  version: process.env.SERVICE_VERSION,
  registry: {
    type: 'consul',
    connection: {
      host: 'consul.company.com',
      port: 8500
    }
  },
  loadBalancer: {
    algorithm: 'least-connections',
    healthCheck: true,
    retries: 3
  },
  circuitBreaker: {
    failureThreshold: 10,
    recoveryTimeout: 60000
  },
  serviceMesh: {
    security: {
      tlsEnabled: true,
      mtlsEnabled: true,
      certificatePath: '/etc/ssl/certs'
    }
  }
});
```

**Características incluidas:**
- **Service Registry**: Memory, Consul, etcd adapters
- **Load Balancer**: 6 algoritmos (round-robin, weighted, least-connections, etc.)
- **Circuit Breaker**: Protección contra fallos en cascada
- **Service Mesh**: Comunicación segura con TLS/mTLS
- **Health Monitoring**: Chequeos automáticos de salud

## 🔍 Sistema de Validación

### Schema builder con API tipo Zod

```typescript
import { z } from '@tsfox/core/validation';

// User schema
const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120).optional(),
  roles: z.array(z.string()).default(['user'])
});

// Validate data
const result = UserSchema.safeParse({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.log('Validation errors:', result.error.issues);
}
```

### Middleware de validación

```typescript
import { validate } from '@tsfox/core/validation/middleware';

app.post('/users', 
  validate({ body: UserSchema }),
  (req, res) => {
    // req.body is now typed and validated
    const user = req.body;
    res.json({ message: 'User created', user });
  }
);
```

## 📊 Logging Estructurado

### Logger básico

```typescript
import { createLogger } from '@tsfox/core/logging';

const logger = createLogger({
  level: 'info',
  format: 'json',
  transports: ['console', 'file']
});

// Structured logging
logger.info('User logged in', { 
  userId: 123, 
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...' 
});

logger.error('Payment failed', { 
  userId: 123,
  amount: 99.99,
  error: error.message,
  stack: error.stack 
});
```

### Multiple transports

```typescript
const logger = createLogger({
  level: 'debug',
  transports: ['console', 'file', 'http'],
  file: {
    filename: 'logs/app.log',
    maxSize: '10m',
    maxFiles: 5
  },
  http: {
    url: 'https://logs.example.com/api',
    headers: { 'Authorization': 'Bearer token' }
  }
});
```

## 🔧 CLI

### Generar componentes

```bash
# Generar controlador
npx tsfox generate:controller UserController

# Generar modelo
npx tsfox generate:model User

# Generar vista
npx tsfox generate:view users/index
```

## 📊 API Reference

### ServerConfig

```typescript
interface ServerConfig {
  port: number;                    // Puerto del servidor
  env: string;                     // Entorno (development, production, test)
  jsonSpaces?: number;             // Espacios para JSON pretty-print
  staticFolder?: string;           // Carpeta de archivos estáticos
  middlewares?: Middleware[];      // Middleware personalizados
  requests?: RouteConfig[];        // Configuración de rutas
  views?: ViewConfig[];           // Configuración de vistas
}
```

### RequestCallback

```typescript
type RequestCallback = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => void;
```

### ViewCallback

```typescript
type ViewCallback = (req: Request, res: Response) => void;
```

## 🐳 Docker Integration

Fox Framework incluye soporte completo para Docker con generación automática de Dockerfiles optimizados y configuraciones docker-compose.

### Generar configuración Docker

```bash
# Generar Dockerfile y docker-compose.yml
npx tsfox docker init

# Generar solo Dockerfile
npx tsfox docker init --dockerfile-only

# Generar para producción con Nginx
npx tsfox docker init --nginx --env production
```

### Comandos Docker integrados

```bash
# Construir imagen
npx tsfox docker build

# Ejecutar en desarrollo
npx tsfox docker run --dev

# Ver logs
npx tsfox docker logs

# Ejecutar con docker-compose
npx tsfox docker compose up
```

### Dockerfile automático

El generador crea Dockerfiles optimizados con:

- Multi-stage builds para reducir tamaño de imagen
- Cache layers inteligente para builds rápidos
- Health checks integrados
- Configuración de desarrollo y producción
- Soporte para diferentes package managers (npm, yarn, pnpm)

```dockerfile
# Multi-stage build automático
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["npm", "start"]
```

### Docker Compose automático

Genera configuraciones completas con:

- Base de datos (PostgreSQL, MySQL, MongoDB, Redis)
- Nginx reverse proxy con SSL
- Networks y volumes configurados
- Variables de entorno optimizadas

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: foxapp
      POSTGRES_USER: fox
      POSTGRES_PASSWORD: foxpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:coverage

# Solo tests unitarios
npm run test:unit

# Solo tests de integración
npm run test:integration
```

## 🔧 Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/lnavarrocarter/fox-framework.git
cd fox-framework

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar tests
npm test
```

## 📚 Documentación

- **[📖 Guía de Arquitectura](./docs/architecture/overview.md)**
- **[🔧 API Reference](./docs/api/reference.md)**
- **[📊 Schemas y Types](./docs/schemas/types.md)**
- **[🚀 Deployment](./docs/deployment/)**

## 🛠️ Configuración Avanzada

### Con Middleware

```typescript
import { startServer, Middleware } from 'fox-framework';

const authMiddleware: Middleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  next();
};

const config = {
  port: 3000,
  env: 'production',
  middlewares: [authMiddleware],
  requests: [
    {
      method: 'GET',
      path: '/protected',
      callback: (req, res) => {
        res.json({ message: 'Datos protegidos' });
      }
    }
  ]
};

startServer(config);
```

### Error Handling

```typescript
import { HttpError } from 'fox-framework';

const getUserHandler = (req, res) => {
  const userId = req.params.id;
  
  if (!userId) {
    throw new HttpError(400, 'ID de usuario requerido');
  }
  
  const user = findUser(userId);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }
  
  res.json(user);
};
```

## 🎯 Roadmap

### ✅ Completado

- [x] Factory Pattern base implementado
- [x] Routing system con todos los métodos HTTP
- [x] Motor de templates .fox con sintaxis completa
- [x] CLI con generadores automáticos  
- [x] **Sistema de Cache Multi-Provider** (Memory, Redis, File)
- [x] **Sistema de Validación** con API tipo Zod (77 tests)
- [x] **Logging Estructurado** con múltiples transports
- [x] **Error Handling** robusto y tipado
- [x] **Event System** completo con Event Sourcing, CQRS y Pub/Sub distribuido
- [x] **Database Abstraction** Multi-Provider (PostgreSQL, MySQL, SQLite, MongoDB, Redis)
- [x] **Microservices Support** completo con Service Registry, Load Balancer y Circuit Breaker
- [x] **Docker Integration** completo con generación automática de Dockerfiles y docker-compose
- [x] Suite de tests completa (950+ tests)

### 🔄 En Progreso

- [ ] Security middleware (JWT, Rate limiting, CORS)
- [ ] Performance optimization con benchmarks
- [ ] Plugin system extensible

### 📋 Planificado

- [ ] CLI improvements avanzados
- [ ] Cloud deployment tools
- [ ] Monitoring y métricas avanzadas
- [ ] WebSocket support
- [ ] GraphQL integration

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Contribución

- Seguir [coding guidelines](./docs/development/coding-guidelines.md)
- Escribir tests para nuevas features
- Mantener cobertura > 80%
- Documentar APIs públicas
- Seguir [conventional commits](https://conventionalcommits.org/)

## 📄 Licencia

Este proyecto está bajo la Licencia ISC - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- Express.js por la base HTTP sólida
- TypeScript por el sistema de tipos
- Jest por el framework de testing
- Commander.js por el CLI
- Copilot y ChatGPT por la ayuda en la documentación y ejemplos ademas del codigo
- A todos los contribuidores y usuarios que hacen posible este proyecto

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/lnavarrocarter/fox-framework/issues)
- **Documentación**: [Wiki del proyecto](https://github.com/lnavarrocarter/fox-framework/wiki)
- **Email**: [soporte@foxframework.dev](mailto:soporte@foxframework.dev)

---

**¿Te gusta Fox Framework?** ⭐ Dale una estrella en GitHub y ayúdanos a crecer.

## 📈 Stats

![GitHub stars](https://img.shields.io/github/stars/lnavarrocarter/fox-framework)
![GitHub forks](https://img.shields.io/github/forks/lnavarrocarter/fox-framework)
![GitHub issues](https://img.shields.io/github/issues/lnavarrocarter/fox-framework)
![GitHub license](https://img.shields.io/github/license/lnavarrocarter/fox-framework)
![npm version](https://img.shields.io/npm/v/fox-framework)
![npm downloads](https://img.shields.io/npm/dm/fox-framework)
