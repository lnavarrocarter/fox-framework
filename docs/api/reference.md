# 🚀 API Reference - Fox Framework

## 📋 Índice

- [Core API](#core-api)
- [Server API](#server-api)
- [Router API](#router-api)
- [Template Engine API](#template-engine-api)
- [Cache System API](#cache-system-api)
- [Validation API](#validation-api)
- [Logging API](#logging-api)
- [Event System API](#event-system-api)
- [Database Abstraction API](#database-abstraction-api)
- [CLI API](#cli-api)
- [Types & Interfaces](#types--interfaces)

## 🔧 Core API

### startServer(config: ServerConfig): void

Inicia una nueva instancia del servidor Fox Framework.

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

**Parámetros:**
- `config: ServerConfig` - Configuración del servidor

**Ejemplo:**
```typescript
const server = startServer({
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jsonSpaces: 4,
    staticFolder: 'assets',
    middlewares: [
        corsMiddleware(),
        authMiddleware()
    ]
});
```

## 🖥️ Server API

### FoxFactory

Factory principal para gestión de instancias de servidor.

#### createInstance(context: ServerConfig): FoxServerInterface

Crea una nueva instancia de servidor.

```typescript
import { FoxFactory } from 'fox-framework';

const server = FoxFactory.createInstance({
    port: 3000,
    env: 'production'
});
```

#### getInstance(): FoxServerInterface

Obtiene la instancia actual del servidor (Singleton).

```typescript
const server = FoxFactory.getInstance();
```

#### listen(): void

Inicia el servidor en el puerto configurado.

```typescript
FoxFactory.listen();
```

## 🛣️ Router API

### HTTP Methods

#### get(path: string, callback: RequestCallback): void

Registra una ruta GET.

```typescript
app.get('/users', (req, res) => {
    res.json({ users: [] });
});
```

#### post(path: string, callback: RequestCallback): void

Registra una ruta POST.

```typescript
app.post('/users', (req, res) => {
    const user = req.body;
    // Crear usuario
    res.status(201).json(user);
});
```

#### put(path: string, callback: RequestCallback): void

Registra una ruta PUT.

```typescript
app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const userData = req.body;
    // Actualizar usuario
    res.json({ id: userId, ...userData });
});
```

#### delete(path: string, callback: RequestCallback): void

Registra una ruta DELETE.

```typescript
app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;
    // Eliminar usuario
    res.status(204).send();
});
```

### Middleware

#### use(middleware: Middleware): void

Registra middleware global.

```typescript
app.use((req, res, next) => {
    console.log(\`\${req.method} \${req.path}\`);
    next();
});
```

## 🎨 Template Engine API

### render(type: string, path: string, callback: ViewCallback): void

Configura renderizado de vistas.

```typescript
// Renderizar template .fox
app.render('fox', '/', (req, res) => {
    res.render('index', { 
        title: 'Fox Framework',
        message: 'Bienvenido' 
    });
});

// Renderizar HTML estático
app.render('html', '/about', (req, res) => {
    res.render('about', { 
        title: 'Acerca de' 
    });
});
```

### Sintaxis de Templates (.fox)

#### Variables
```fox
<h1>{{title}}</h1>
<p>{{message}}</p>
```

#### Condicionales
```fox
{{if user}}
    <p>Bienvenido, {{user.name}}!</p>
{{else}}
    <p>Por favor, inicia sesión</p>
{{/if}}
```

#### Bucles
```fox
{{each items}}
    <div>{{this.name}} - {{this.price}}</div>
{{/each}}
```

## 🗂️ Cache System API

### CacheFactory

Factory principal para crear instancias de cache con diferentes providers.

#### create(config: CacheConfig): ICache

Crea una nueva instancia de cache con la configuración especificada.

```typescript
import { CacheFactory } from '@tsfox/core/cache';

// Memory cache
const memoryCache = CacheFactory.create({
  provider: 'memory',
  maxSize: 1000,
  memory: {
    maxKeys: 500
  }
});

// Redis cache
const redisCache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'myapp:'
  }
});

// File cache
const fileCache = CacheFactory.create({
  provider: 'file',
  file: {
    directory: './cache'
  }
});
```

### ICache Interface

Interface principal para todas las operaciones de cache.

#### get<T>(key: string): Promise<T | null>

Obtiene un valor del cache.

```typescript
const user = await cache.get<User>('user:123');
if (user) {
  console.log('Cache hit:', user.name);
} else {
  console.log('Cache miss');
}
```

#### set<T>(key: string, value: T, ttl?: number): Promise<void>

Almacena un valor en el cache con TTL opcional.

```typescript
// Store with 1 hour TTL
await cache.set('user:123', userData, 3600);

// Store without TTL (permanent)
await cache.set('config:theme', themeData);
```

#### delete(key: string): Promise<boolean>

Elimina una entrada del cache.

```typescript
const deleted = await cache.delete('user:123');
console.log('Entry deleted:', deleted);
```

#### clear(): Promise<void>

Limpia todo el contenido del cache.

```typescript
await cache.clear();
console.log('Cache cleared');
```

#### has(key: string): Promise<boolean>

Verifica si una clave existe en el cache.

```typescript
if (await cache.has('user:123')) {
  console.log('User is cached');
}
```

#### ttl(key: string): Promise<number>

Obtiene el tiempo de vida restante de una entrada.

```typescript
const remaining = await cache.ttl('user:123');
console.log(`Expires in ${remaining} seconds`);
```

#### getMetrics(): CacheMetrics

Obtiene métricas de rendimiento del cache.

```typescript
const metrics = cache.getMetrics();
console.log({
  hits: metrics.hits,
  misses: metrics.misses,
  hitRatio: metrics.hitRatio,
  totalRequests: metrics.totalRequests,
  averageResponseTime: metrics.averageResponseTime,
  totalKeys: metrics.totalKeys
});
```

### Response Cache Middleware

Middleware para cache automático de respuestas HTTP.

#### responseCache(options: CacheOptions): Middleware

Crea middleware de cache de respuestas.

```typescript
import { responseCache } from '@tsfox/core/cache/middleware';

// Basic response caching
app.use(responseCache({
  ttl: 300, // 5 minutes
  condition: (req, res) => req.method === 'GET'
}));

// Advanced configuration
app.use('/api', responseCache({
  ttl: 600,
  key: (req) => `api:${req.path}:${JSON.stringify(req.query)}`,
  condition: (req, res) => {
    return req.method === 'GET' && 
           !req.headers.authorization;
  },
  vary: ['accept-language', 'user-agent']
}));
```

### Cache Providers

#### Memory Provider

Cache en memoria con LRU eviction.

```typescript
const cache = CacheFactory.create({
  provider: 'memory',
  maxSize: 100, // MB
  memory: {
    maxKeys: 1000
  }
});
```

**Características:**
- Rápido acceso en memoria
- LRU eviction automático
- Límites configurables de tamaño y claves
- TTL con cleanup automático

#### Redis Provider

Cache distribuido usando Redis (mock implementation).

```typescript
const cache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
    database: 0,
    keyPrefix: 'app:'
  }
});
```

**Características:**
- Compatible con Redis real
- Pattern matching con wildcards
- Key prefixes configurables
- Soporte para clustering

#### File Provider

Cache persistente en sistema de archivos.

```typescript
const cache = CacheFactory.create({
  provider: 'file',
  file: {
    directory: './cache',
    compression: false
  }
});
```

**Características:**
- Persistencia en disco
- TTL con cleanup automático
- Compresión opcional
- Estructura de archivos JSON

## 📊 Logging API

### Logger

Sistema de logging estructurado con múltiples levels y transports.

#### createLogger(config: LoggerConfig): Logger

Crea una nueva instancia del logger.

```typescript
import { createLogger } from '@tsfox/core/logging';

const logger = createLogger({
  level: 'info',
  format: 'json',
  transports: ['console', 'file'],
  file: {
    filename: 'app.log',
    maxSize: '10m',
    maxFiles: 5
  }
});
```

#### log(level: LogLevel, message: string, meta?: object): void

Registra un mensaje con el nivel especificado.

```typescript
logger.log('info', 'User logged in', { userId: 123 });
logger.log('error', 'Database connection failed', { error: err });
```

#### info(message: string, meta?: object): void

Registra un mensaje informativo.

```typescript
logger.info('Server started', { port: 3000 });
```

#### error(message: string, meta?: object): void

Registra un error.

```typescript
logger.error('Payment failed', { 
  userId: 123, 
  amount: 99.99,
  error: error.message 
});
```

#### warn(message: string, meta?: object): void

Registra una advertencia.

```typescript
logger.warn('Rate limit approaching', { 
  userId: 123, 
  requests: 95,
  limit: 100 
});
```

#### debug(message: string, meta?: object): void

Registra información de debug.

```typescript
logger.debug('Cache hit', { 
  key: 'user:123',
  ttl: 3600 
});
```

### Log Levels

```typescript
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}
```

### Transports

#### Console Transport

Salida a consola con colores.

```typescript
{
  transports: ['console'],
  console: {
    colorize: true,
    timestamp: true
  }
}
```

#### File Transport

Salida a archivo con rotación.

```typescript
{
  transports: ['file'],
  file: {
    filename: 'logs/app.log',
    maxSize: '10m',
    maxFiles: 5,
    compress: true
  }
}
```

#### HTTP Transport

Envío a servicio remoto.

```typescript
{
  transports: ['http'],
  http: {
    url: 'https://logs.example.com/api/logs',
    headers: {
      'Authorization': 'Bearer token'
    }
  }
}
```

## 🎯 Event System API

### EventSystemFactory

#### createMemorySystem(): EventSystemInterface

Crea un sistema de eventos en memoria para desarrollo y testing.

```typescript
import { EventSystemFactory } from 'fox-framework';

const eventSystem = EventSystemFactory.createMemorySystem();
```

#### createFromConfig(config: EventConfig): EventSystemInterface

Crea un sistema de eventos desde configuración completa.

```typescript
const eventSystem = EventSystemFactory.createFromConfig({
  store: {
    type: 'memory'
  },
  bus: {
    adapter: 'redis',
    connection: {
      host: 'localhost',
      port: 6379
    }
  }
});
```

### EventSystem

#### emit(event: EventInterface): Promise<void>

Emite un evento a través del pipeline completo.

```typescript
const event: EventInterface = {
  id: 'evt_001',
  type: 'user.created',
  aggregateId: 'user_123',
  data: { name: 'John', email: 'john@example.com' },
  metadata: { source: 'user-service' },
  timestamp: new Date()
};

await eventSystem.emit(event);
```

#### on(eventType: string, handler: EventHandler): void

Registra un manejador de eventos local.

```typescript
eventSystem.on('user.created', async (event) => {
  console.log(`User created: ${event.data.name}`);
});
```

#### subscribe(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Promise<Subscription>

Suscribe a eventos desde el bus distribuido.

```typescript
const subscription = await eventSystem.subscribe(
  'user.created',
  async (event) => {
    // Handle distributed event
  },
  { durable: true, ackTimeout: 5000 }
);
```

#### replay(streamId: string, fromVersion?: number): Promise<void>

Reproduce eventos desde un stream para rebuilding de estado.

```typescript
await eventSystem.replay('user_123', 1);
```

### EventStore

#### append(streamId: string, events: EventInterface[], expectedVersion?: number): Promise<void>

Agrega eventos a un stream.

```typescript
const store = eventSystem.getStore();
await store.append('user_123', [event], 0);
```

#### read(streamId: string, fromVersion?: number, maxCount?: number): Promise<EventInterface[]>

Lee eventos desde un stream.

```typescript
const events = await store.read('user_123', 0, 10);
```

### EventBus

#### publish(event: EventInterface): Promise<void>

Publica un evento al bus distribuido.

```typescript
const bus = eventSystem.getBus();
await bus.publish(event);
```

## 🗄️ Database Abstraction API

### DatabaseFactory

#### create(config: DatabaseConfig): FoxDatabase

Crea una nueva instancia de base de datos.

```typescript
import { DatabaseFactory } from 'fox-framework';

const db = DatabaseFactory.create({
  provider: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'user',
    password: 'pass'
  }
});
```

### createDatabase(config: DatabaseConfig): FoxDatabase

Helper para creación rápida de database.

```typescript
import { createDatabase } from 'fox-framework';

const db = createDatabase({
  provider: 'sqlite',
  connection: { filename: './db.sqlite' }
});
```

### FoxDatabase

#### connect(): Promise<void>

Establece conexión con la base de datos.

```typescript
await db.connect();
```

#### disconnect(): Promise<void>

Cierra todas las conexiones.

```typescript
await db.disconnect();
```

#### getBuilder(): QueryBuilderInterface

Obtiene una instancia del query builder.

```typescript
const users = await db
  .getBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .where({ active: true })
  .execute();
```

#### transaction<T>(callback: (tx: TransactionInterface) => Promise<T>): Promise<T>

Ejecuta operaciones dentro de una transacción.

```typescript
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO users (name) VALUES (?)', ['John']);
  await tx.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
});
```

### QueryBuilder (SQL)

#### select(columns: string[]): QueryBuilderInterface

Especifica las columnas a seleccionar.

```typescript
const query = db.getBuilder().select(['id', 'name', 'email']);
```

#### from(table: string, alias?: string): QueryBuilderInterface

Especifica la tabla base.

```typescript
const query = db.getBuilder().from('users', 'u');
```

#### where(conditions: Record<string, any>): QueryBuilderInterface

Agrega condiciones WHERE.

```typescript
const query = db.getBuilder().where({ active: true, role: 'admin' });
```

#### join(table: string, alias: string, condition: string): QueryBuilderInterface

Agrega un JOIN.

```typescript
const query = db.getBuilder()
  .from('users', 'u')
  .join('profiles', 'p', 'u.id = p.user_id');
```

#### orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilderInterface

Agrega ordenamiento.

```typescript
const query = db.getBuilder().orderBy('created_at', 'DESC');
```

#### limit(count: number): QueryBuilderInterface

Limita el número de resultados.

```typescript
const query = db.getBuilder().limit(10);
```

#### execute<T>(): Promise<T[]>

Ejecuta la query y retorna resultados.

```typescript
const users = await query.execute<User>();
```

### QueryBuilder (NoSQL)

#### collection(name: string): QueryBuilderInterface

Especifica la colección (MongoDB).

```typescript
const query = mongoDb.getBuilder().collection('users');
```

#### find(filter: Record<string, any>): QueryBuilderInterface

Agrega filtros de búsqueda.

```typescript
const query = mongoDb.getBuilder().find({ status: 'active' });
```

#### sort(fields: Record<string, 1 | -1>): QueryBuilderInterface

Agrega ordenamiento.

```typescript
const query = mongoDb.getBuilder().sort({ createdAt: -1 });
```

### Connection Pool

#### getPoolInfo(): Promise<PoolInfo>

Obtiene información del pool de conexiones.

```typescript
const poolInfo = await db.getPoolInfo();
console.log(`Active: ${poolInfo.activeConnections}`);
```

## 🔧 CLI API
