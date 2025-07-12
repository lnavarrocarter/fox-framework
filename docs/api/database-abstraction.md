# 🗄️ Database Abstraction - Fox Framework

## 📋 Índice

- [Introducción](#introducción)
- [Arquitectura](#arquitectura)
- [Configuración](#configuración)
- [Proveedores Soportados](#proveedores-soportados)
- [Query Builder](#query-builder)
- [Modelos y Repositorios](#modelos-y-repositorios)
- [Transacciones](#transacciones)
- [Connection Pooling](#connection-pooling)
- [Migraciones](#migraciones)
- [Ejemplos Prácticos](#ejemplos-prácticos)
- [Mejores Prácticas](#mejores-prácticas)

## 🎯 Introducción

El Database Abstraction Layer de Fox Framework proporciona una interfaz unificada para trabajar con múltiples proveedores de bases de datos, tanto SQL como NoSQL. Está diseñado para facilitar el desarrollo de aplicaciones que necesitan flexibilidad en la elección de base de datos o soporte para múltiples proveedores.

### Características Principales

- **Multi-Provider**: PostgreSQL, MySQL, SQLite, MongoDB, Redis
- **Query Builder**: API fluida para SQL y NoSQL
- **ORM/ODM**: Modelos y repositorios tipo ActiveRecord
- **Connection Pooling**: Gestión avanzada de conexiones
- **Transactions**: Soporte ACID completo
- **Migraciones**: Versionado de esquemas
- **Type Safety**: TypeScript estricto
- **Performance**: Optimizaciones y métricas

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │  Query Builder  │    │ Connection Mgr  │
│   Factory       │    │                 │    │                 │
│                 │◄───┤ • SQL Builder   │◄───┤ • Pool Manager  │
│ • Provider Mgmt │    │ • NoSQL Builder │    │ • Health Check  │
│ • Configuration │    │ • Fluent API    │    │ • Auto Recovery │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Providers     │
                    │                 │
                    │ • PostgreSQL    │
                    │ • MySQL         │
                    │ • SQLite        │
                    │ • MongoDB       │
                    │ • Redis         │
                    └─────────────────┘
```

## ⚙️ Configuración

### Configuración Básica

```typescript
import { createDatabase } from 'fox-framework';

// SQLite para desarrollo
const db = createDatabase({
  provider: 'sqlite',
  connection: {
    filename: './database.sqlite'
  }
});
```

### Configuración Avanzada

```typescript
import { DatabaseFactory } from 'fox-framework';

const db = DatabaseFactory.create({
  provider: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'user',
    password: 'password',
    ssl: {
      rejectUnauthorized: false
    }
  },
  pool: {
    min: 2,
    max: 20,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    extension: 'ts'
  },
  debug: process.env.NODE_ENV === 'development'
});
```

### Builder Pattern para Configuración

```typescript
import { DatabaseBuilder } from 'fox-framework';

const db = new DatabaseBuilder()
  .provider('postgresql')
  .host('db.example.com')
  .port(5432)
  .database('production_db')
  .credentials('admin', 'secret')
  .poolSize(5, 50)
  .timeout(30000)
  .ssl(true)
  .build();
```

## 🔧 Proveedores Soportados

### PostgreSQL

```typescript
const pgDb = createDatabase({
  provider: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    username: 'postgres',
    password: 'password'
  },
  searchPath: ['public', 'app_schema'],
  applicationName: 'fox-app'
});

// Características específicas de PostgreSQL
await pgDb.query('SELECT * FROM users WHERE data @> ?', [{ role: 'admin' }]); // JSONB queries
await pgDb.query('LISTEN user_changes'); // LISTEN/NOTIFY
```

### MySQL

```typescript
const mysqlDb = createDatabase({
  provider: 'mysql',
  connection: {
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password',
    charset: 'utf8mb4',
    timezone: 'Z'
  },
  acquireTimeout: 60000,
  timeout: 60000
});
```

### SQLite

```typescript
const sqliteDb = createDatabase({
  provider: 'sqlite',
  connection: {
    filename: './database.sqlite'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  }
});
```

### MongoDB

```typescript
const mongoDb = createDatabase({
  provider: 'mongodb',
  connection: {
    url: 'mongodb://localhost:27017/myapp',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  }
});
```

### Redis

```typescript
const redisDb = createDatabase({
  provider: 'redis',
  connection: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
    db: 0,
    keyPrefix: 'myapp:',
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  }
});
```

## 🔍 Query Builder

### SQL Query Builder

```typescript
// SELECT básico
const users = await db
  .getBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .where({ active: true })
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute<User>();

// WHERE conditions avanzadas
const activeAdmins = await db
  .getBuilder()
  .select('*')
  .from('users')
  .where('active', '=', true)
  .andWhere('role', 'IN', ['admin', 'moderator'])
  .orWhere('permissions', 'LIKE', '%admin%')
  .execute();

// JOINs
const userPosts = await db
  .getBuilder()
  .select(['u.name', 'u.email', 'p.title', 'p.created_at'])
  .from('users', 'u')
  .leftJoin('posts', 'p', 'u.id = p.user_id')
  .where('u.active', '=', true)
  .orderBy('p.created_at', 'DESC')
  .execute();

// Agregaciones
const stats = await db
  .getBuilder()
  .select(['COUNT(*) as total', 'AVG(age) as avg_age'])
  .from('users')
  .where('active', '=', true)
  .groupBy('department')
  .having('COUNT(*)', '>', 5)
  .execute();

// Subqueries
const recentUsers = await db
  .getBuilder()
  .select('*')
  .from('users')
  .where('created_at', '>', (qb) => 
    qb.select('MAX(created_at)')
      .from('users')
      .where('department', '=', 'engineering')
  )
  .execute();
```

### NoSQL Query Builder (MongoDB)

```typescript
// Find básico
const users = await mongoDb
  .getBuilder()
  .collection('users')
  .find({ status: 'active' })
  .sort({ createdAt: -1 })
  .limit(10)
  .execute();

// Queries complejas
const results = await mongoDb
  .getBuilder()
  .collection('orders')
  .find({
    total: { $gte: 100 },
    status: { $in: ['completed', 'shipped'] },
    'customer.city': 'New York'
  })
  .projection({ _id: 1, total: 1, items: 1 })
  .sort({ createdAt: -1 })
  .execute();

// Aggregation pipeline
const pipeline = await mongoDb
  .getBuilder()
  .collection('sales')
  .aggregate([
    { $match: { date: { $gte: new Date('2024-01-01') } } },
    { $group: { 
        _id: '$category', 
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ])
  .execute();
```

### Redis Query Builder

```typescript
// String operations
await redisDb.getBuilder()
  .key('user:123')
  .set({ name: 'John', email: 'john@example.com' })
  .expire(3600)
  .execute();

// Hash operations
await redisDb.getBuilder()
  .hash('user:123')
  .hset('name', 'John')
  .hset('email', 'john@example.com')
  .execute();

// List operations
await redisDb.getBuilder()
  .list('notifications:123')
  .lpush('New message received')
  .ltrim(0, 99) // Keep only last 100 notifications
  .execute();

// Set operations
await redisDb.getBuilder()
  .set('user:123:followers')
  .sadd('user:456', 'user:789')
  .execute();
```

## 🏛️ Modelos y Repositorios

### Definición de Modelos

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreateData {
  name: string;
  email: string;
  active?: boolean;
}

interface UserUpdateData {
  name?: string;
  email?: string;
  active?: boolean;
}
```

### Repository Pattern

```typescript
class UserRepository {
  constructor(private db: DatabaseInterface) {}

  async findById(id: number): Promise<User | null> {
    const results = await this.db
      .getBuilder()
      .select('*')
      .from('users')
      .where({ id })
      .execute<User>();
    
    return results[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.db
      .getBuilder()
      .select('*')
      .from('users')
      .where({ email })
      .execute<User>();
    
    return results[0] || null;
  }

  async findMany(filters: Partial<User> = {}): Promise<User[]> {
    return this.db
      .getBuilder()
      .select('*')
      .from('users')
      .where(filters)
      .orderBy('created_at', 'DESC')
      .execute<User>();
  }

  async create(data: UserCreateData): Promise<User> {
    const now = new Date();
    const userData = {
      ...data,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    const results = await this.db
      .getBuilder()
      .insert(userData)
      .into('users')
      .returning('*')
      .execute<User>();

    return results[0];
  }

  async update(id: number, data: UserUpdateData): Promise<User | null> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const results = await this.db
      .getBuilder()
      .update(updateData)
      .from('users')
      .where({ id })
      .returning('*')
      .execute<User>();

    return results[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const results = await this.db
      .getBuilder()
      .delete()
      .from('users')
      .where({ id })
      .execute();

    return results.affectedRows > 0;
  }

  async getActiveUsers(): Promise<User[]> {
    return this.findMany({ active: true });
  }

  async getUserStats(): Promise<{ total: number; active: number }> {
    const [totalResult, activeResult] = await Promise.all([
      this.db.getBuilder()
        .count('* as count')
        .from('users')
        .execute(),
      this.db.getBuilder()
        .count('* as count')
        .from('users')
        .where({ active: true })
        .execute()
    ]);

    return {
      total: totalResult[0].count,
      active: activeResult[0].count
    };
  }
}
```

### Active Record Pattern (Opcional)

```typescript
class User {
  constructor(
    public id?: number,
    public name?: string,
    public email?: string,
    public active?: boolean,
    public createdAt?: Date,
    public updatedAt?: Date
  ) {}

  static async find(id: number): Promise<User | null> {
    const repo = new UserRepository(db);
    const userData = await repo.findById(id);
    return userData ? Object.assign(new User(), userData) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const repo = new UserRepository(db);
    const userData = await repo.findByEmail(email);
    return userData ? Object.assign(new User(), userData) : null;
  }

  static async all(): Promise<User[]> {
    const repo = new UserRepository(db);
    const usersData = await repo.findMany();
    return usersData.map(data => Object.assign(new User(), data));
  }

  async save(): Promise<User> {
    const repo = new UserRepository(db);
    
    if (this.id) {
      // Update existing
      const updated = await repo.update(this.id, {
        name: this.name,
        email: this.email,
        active: this.active
      });
      return Object.assign(this, updated);
    } else {
      // Create new
      const created = await repo.create({
        name: this.name!,
        email: this.email!,
        active: this.active
      });
      return Object.assign(this, created);
    }
  }

  async delete(): Promise<boolean> {
    if (!this.id) return false;
    
    const repo = new UserRepository(db);
    return repo.delete(this.id);
  }

  isActive(): boolean {
    return this.active === true;
  }

  getDisplayName(): string {
    return this.name || this.email || 'Unknown User';
  }
}
```

## 💼 Transacciones

### Transacciones Básicas

```typescript
// Transacción simple
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
  await tx.query('INSERT INTO profiles (user_id, bio) VALUES (?, ?)', [userId, 'Developer']);
  
  // Si cualquier operación falla, toda la transacción se revierte
});

// Transacción con query builder
await db.transaction(async (tx) => {
  const user = await tx.getBuilder()
    .insert({ name: 'John', email: 'john@example.com' })
    .into('users')
    .returning('*')
    .execute();

  await tx.getBuilder()
    .insert({ user_id: user[0].id, bio: 'Developer' })
    .into('profiles')
    .execute();
});
```

### Transacciones Anidadas (Savepoints)

```typescript
await db.transaction(async (tx) => {
  // Operación principal
  await tx.query('INSERT INTO orders (customer_id, total) VALUES (?, ?)', [customerId, total]);

  // Savepoint para operaciones que pueden fallar
  const savepoint = await tx.savepoint('sp1');
  
  try {
    await tx.query('UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?', [qty, productId]);
    await savepoint.release();
  } catch (error) {
    await savepoint.rollback();
    // Continuar con orden pero sin reducir inventario
    await tx.query('INSERT INTO backorders (order_id, product_id, quantity) VALUES (?, ?, ?)', [orderId, productId, qty]);
  }
});
```

### Isolation Levels

```typescript
// Transacción con nivel de aislamiento específico
await db.transaction(async (tx) => {
  await tx.setIsolationLevel('READ_COMMITTED');
  
  // Operaciones que requieren consistencia de lectura
  const balance = await tx.query('SELECT balance FROM accounts WHERE id = ?', [accountId]);
  await tx.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, accountId]);
}, {
  isolationLevel: 'SERIALIZABLE',
  timeout: 30000
});
```

## 🌊 Connection Pooling

### Configuración de Pool

```typescript
const db = createDatabase({
  provider: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'myapp'
  },
  pool: {
    min: 2,                    // Mínimo de conexiones
    max: 20,                   // Máximo de conexiones
    idleTimeoutMillis: 30000,  // Timeout para conexiones inactivas
    acquireTimeoutMillis: 60000, // Timeout para obtener conexión
    createTimeoutMillis: 3000,   // Timeout para crear conexión
    destroyTimeoutMillis: 5000,  // Timeout para destruir conexión
    reapIntervalMillis: 1000,    // Intervalo para limpiar conexiones
    createRetryIntervalMillis: 200 // Intervalo entre reintentos
  }
});
```

### Monitoreo de Pool

```typescript
// Obtener información del pool
const poolInfo = await db.getPoolInfo();
console.log({
  total: poolInfo.totalConnections,
  active: poolInfo.activeConnections,
  idle: poolInfo.idleConnections,
  pending: poolInfo.pendingConnections,
  acquiredConnections: poolInfo.acquiredConnections
});

// Health check del pool
const isHealthy = await db.ping();
if (!isHealthy) {
  console.error('Database connection pool is unhealthy');
  // Tomar acción correctiva
}

// Estadísticas detalladas
const stats = db.getStats();
console.log({
  queries: stats.totalQueries,
  errors: stats.totalErrors,
  avgQueryTime: stats.averageQueryTime,
  slowQueries: stats.slowQueries
});
```

### Pool Events

```typescript
db.on('poolError', (error) => {
  console.error('Pool error:', error);
  // Alertar sistema de monitoreo
});

db.on('connectionCreated', (connection) => {
  console.log('New connection created:', connection.id);
});

db.on('connectionDestroyed', (connection) => {
  console.log('Connection destroyed:', connection.id);
});

db.on('slowQuery', (query, duration) => {
  console.warn(`Slow query detected: ${query} (${duration}ms)`);
});
```

## 🔄 Migraciones

### Definición de Migraciones

```typescript
// migrations/001_create_users_table.ts
export async function up(db: DatabaseInterface): Promise<void> {
  await db.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
    table.index(['email']);
    table.index(['active', 'created_at']);
  });
}

export async function down(db: DatabaseInterface): Promise<void> {
  await db.schema.dropTableIfExists('users');
}
```

```typescript
// migrations/002_add_user_profiles.ts
export async function up(db: DatabaseInterface): Promise<void> {
  await db.schema.createTable('profiles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.text('bio');
    table.string('avatar_url');
    table.json('preferences');
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.unique(['user_id']);
  });
}

export async function down(db: DatabaseInterface): Promise<void> {
  await db.schema.dropTableIfExists('profiles');
}
```

### Ejecutar Migraciones

```typescript
// Migrar a la última versión
await db.migrate.latest();

// Migrar a una versión específica
await db.migrate.up('002_add_user_profiles.ts');

// Rollback última migración
await db.migrate.down();

// Rollback a versión específica
await db.migrate.rollback('001_create_users_table.ts');

// Estado de migraciones
const status = await db.migrate.status();
console.log({
  completed: status.completedMigrations,
  pending: status.pendingMigrations,
  current: status.currentVersion
});
```

### Seeds

```typescript
// seeds/users_seed.ts
export async function seed(db: DatabaseInterface): Promise<void> {
  // Limpiar datos existentes
  await db.getBuilder().delete().from('users').execute();
  
  // Insertar datos de prueba
  await db.getBuilder()
    .insert([
      { name: 'John Doe', email: 'john@example.com', active: true },
      { name: 'Jane Smith', email: 'jane@example.com', active: true },
      { name: 'Bob Johnson', email: 'bob@example.com', active: false }
    ])
    .into('users')
    .execute();
}

// Ejecutar seeds
await db.seed.run();
```

## 🚀 Ejemplos Prácticos

### E-commerce Database Setup

```typescript
// Configuración de base de datos para e-commerce
const ecommerceDb = createDatabase({
  provider: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    database: 'ecommerce',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  pool: {
    min: 5,
    max: 50
  }
});

// Repositorios
class ProductRepository {
  constructor(private db: DatabaseInterface) {}

  async findWithInventory(filters: any = {}): Promise<any[]> {
    return this.db
      .getBuilder()
      .select([
        'p.*',
        'i.quantity',
        'i.reserved_quantity',
        'c.name as category_name'
      ])
      .from('products', 'p')
      .leftJoin('inventory', 'i', 'p.id = i.product_id')
      .leftJoin('categories', 'c', 'p.category_id = c.id')
      .where(filters)
      .where('p.active', '=', true)
      .execute();
  }

  async updateInventory(productId: number, quantity: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Verificar cantidad disponible
      const inventory = await tx
        .getBuilder()
        .select(['quantity', 'reserved_quantity'])
        .from('inventory')
        .where({ product_id: productId })
        .execute();

      if (!inventory[0] || inventory[0].quantity < quantity) {
        throw new Error('Insufficient inventory');
      }

      // Actualizar inventario
      await tx
        .getBuilder()
        .update({ 
          quantity: inventory[0].quantity - quantity,
          reserved_quantity: inventory[0].reserved_quantity + quantity
        })
        .from('inventory')
        .where({ product_id: productId })
        .execute();

      // Log del movimiento
      await tx
        .getBuilder()
        .insert({
          product_id: productId,
          type: 'reservation',
          quantity: -quantity,
          created_at: new Date()
        })
        .into('inventory_movements')
        .execute();
    });
  }
}

class OrderRepository {
  constructor(private db: DatabaseInterface) {}

  async createOrder(orderData: any): Promise<any> {
    return this.db.transaction(async (tx) => {
      // Crear orden
      const order = await tx
        .getBuilder()
        .insert({
          customer_id: orderData.customerId,
          total: orderData.total,
          status: 'pending',
          created_at: new Date()
        })
        .into('orders')
        .returning('*')
        .execute();

      // Crear items de la orden
      const orderItems = orderData.items.map((item: any) => ({
        order_id: order[0].id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price
      }));

      await tx
        .getBuilder()
        .insert(orderItems)
        .into('order_items')
        .execute();

      // Reservar inventario para cada item
      for (const item of orderData.items) {
        await new ProductRepository(tx).updateInventory(item.productId, item.quantity);
      }

      return order[0];
    });
  }
}
```

### Analytics con MongoDB

```typescript
// Analytics usando MongoDB
const analyticsDb = createDatabase({
  provider: 'mongodb',
  connection: {
    url: 'mongodb://localhost:27017/analytics'
  }
});

class AnalyticsRepository {
  constructor(private db: DatabaseInterface) {}

  async trackEvent(event: any): Promise<void> {
    await this.db
      .getBuilder()
      .collection('events')
      .insert({
        ...event,
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0] // Para agrupación por día
      })
      .execute();
  }

  async getDailyStats(dateRange: { start: Date; end: Date }): Promise<any[]> {
    return this.db
      .getBuilder()
      .collection('events')
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte: dateRange.start,
              $lte: dateRange.end
            }
          }
        },
        {
          $group: {
            _id: '$date',
            totalEvents: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            eventTypes: { $addToSet: '$type' }
          }
        },
        {
          $project: {
            date: '$_id',
            totalEvents: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            eventTypes: { $size: '$eventTypes' }
          }
        },
        { $sort: { date: 1 } }
      ])
      .execute();
  }

  async getTopPages(limit: number = 10): Promise<any[]> {
    return this.db
      .getBuilder()
      .collection('events')
      .aggregate([
        { $match: { type: 'page_view' } },
        {
          $group: {
            _id: '$data.page',
            views: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            page: '$_id',
            views: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' }
          }
        },
        { $sort: { views: -1 } },
        { $limit: limit }
      ])
      .execute();
  }
}
```

### Cache con Redis

```typescript
// Cache layer usando Redis
const cacheDb = createDatabase({
  provider: 'redis',
  connection: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'app:'
  }
});

class CacheService {
  constructor(private redis: DatabaseInterface) {}

  async cacheUser(user: any, ttl: number = 3600): Promise<void> {
    await this.redis
      .getBuilder()
      .key(`user:${user.id}`)
      .set(JSON.stringify(user))
      .expire(ttl)
      .execute();
  }

  async getCachedUser(userId: number): Promise<any | null> {
    const cached = await this.redis
      .getBuilder()
      .key(`user:${userId}`)
      .get()
      .execute();

    return cached ? JSON.parse(cached) : null;
  }

  async invalidateUserCache(userId: number): Promise<void> {
    await this.redis
      .getBuilder()
      .key(`user:${userId}`)
      .del()
      .execute();
  }

  async cacheSearchResults(query: string, results: any[], ttl: number = 300): Promise<void> {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    
    await this.redis
      .getBuilder()
      .key(key)
      .set(JSON.stringify(results))
      .expire(ttl)
      .execute();
  }

  async addToRecentActivity(userId: number, activity: any): Promise<void> {
    await this.redis
      .getBuilder()
      .list(`activity:${userId}`)
      .lpush(JSON.stringify({
        ...activity,
        timestamp: new Date()
      }))
      .ltrim(0, 99) // Mantener solo las últimas 100 actividades
      .execute();
  }
}
```

## ✅ Mejores Prácticas

### Performance

1. **Usar índices apropiados**
2. **Optimizar queries con EXPLAIN**
3. **Implementar paginación**
4. **Connection pooling adecuado**
5. **Cache para queries frecuentes**

```typescript
// ✅ Bueno - Query optimizada con índices
const users = await db
  .getBuilder()
  .select(['id', 'name', 'email']) // Solo campos necesarios
  .from('users')
  .where('status', '=', 'active')  // Campo indexado
  .orderBy('created_at', 'DESC')   // Campo indexado
  .limit(50)                       // Paginación
  .execute();

// ❌ Malo - Query sin optimizar
const users = await db
  .getBuilder()
  .select('*')                     // Todos los campos
  .from('users')
  .where('UPPER(name)', 'LIKE', '%JOHN%') // Función en WHERE
  .execute();                      // Sin límite
```

### Seguridad

1. **Usar parámetros preparados**
2. **Validar entrada de usuario**
3. **Principio de menor privilegio**
4. **Encriptar datos sensibles**

```typescript
// ✅ Bueno - Parámetros preparados
const user = await db
  .getBuilder()
  .select('*')
  .from('users')
  .where('email', '=', userEmail) // Parámetro seguro
  .execute();

// ❌ Malo - Concatenación de strings
const user = await db.query(`
  SELECT * FROM users WHERE email = '${userEmail}'
`); // Vulnerable a SQL injection
```

### Error Handling

```typescript
class DatabaseService {
  async safeQuery<T>(queryFn: () => Promise<T>): Promise<T | null> {
    try {
      return await queryFn();
    } catch (error) {
      if (this.isConnectionError(error)) {
        // Reintentar conexión
        await this.reconnect();
        return await queryFn();
      } else if (this.isConstraintError(error)) {
        // Error de constraint - no reintentar
        throw new ValidationError(error.message);
      } else {
        // Error desconocido - log y re-throw
        logger.error('Database query failed', { error, query });
        throw error;
      }
    }
  }

  private isConnectionError(error: any): boolean {
    return error.code === 'ECONNRESET' || 
           error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT';
  }

  private isConstraintError(error: any): boolean {
    return error.code === '23505' || // Unique violation
           error.code === '23503';   // Foreign key violation
  }
}
```

### Testing

```typescript
// Configuración de test con database in-memory
const testDb = createDatabase({
  provider: 'sqlite',
  connection: {
    filename: ':memory:'
  }
});

describe('UserRepository', () => {
  let userRepo: UserRepository;

  beforeEach(async () => {
    await testDb.migrate.latest();
    userRepo = new UserRepository(testDb);
  });

  afterEach(async () => {
    await testDb.migrate.rollback();
  });

  it('should create user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    const user = await userRepo.create(userData);

    expect(user.id).toBeDefined();
    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
    expect(user.active).toBe(true);
  });

  it('should find user by email', async () => {
    await userRepo.create({
      name: 'John Doe',
      email: 'john@example.com'
    });

    const user = await userRepo.findByEmail('john@example.com');

    expect(user).toBeTruthy();
    expect(user!.name).toBe('John Doe');
  });
});
```

El Database Abstraction Layer de Fox Framework proporciona una interfaz poderosa y flexible para trabajar con bases de datos, manteniendo la simplicidad en el desarrollo mientras ofrece características avanzadas para aplicaciones empresariales.
