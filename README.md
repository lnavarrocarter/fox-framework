# 🦊 Fox Framework

[![NPM Version](https://img.shields.io/npm/v/@foxframework/core.svg)](https://www.npmjs.com/package/@foxframework/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/lnavarrocarter/fox-framework/workflows/CI%2FCD/badge.svg)](https://github.com/lnavarrocarter/fox-framework/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A **modern, production-ready web framework** for TypeScript/Node.js with enterprise features, modular architecture, and integrated DevOps tooling.

## 🚀 **Quick Start**

### Installation

```bash
npm install @foxframework/core
```

### Create a New Project

```bash
npx -p @foxframework/core tsfox new my-app
cd my-app
npm install
npm run dev
```

If developing from source:

```bash
git clone https://github.com/lnavarrocarter/fox-framework.git
cd fox-framework
npm install
npm run build   # generates dist/
npx -p @foxframework/core tsfox new demo-app
```

### Basic Usage

```typescript
import { FoxFactory } from '@foxframework/core';
import { RequestMethod } from '@foxframework/core';

// Option A: create() + listen() — Express-like style
const app = FoxFactory.create({
  port: 3000,
  env: 'development',
  jsonSpaces: 2,
  staticFolder: 'public',
  requests: [
    {
      path: '/',
      method: RequestMethod.GET,
      handler: (req, res) => res.json({ message: 'Hello Fox!' })
    }
  ]
});

app.listen(3000, () => {
  console.log('Fox Framework running on port 3000');
});

// Option B: createInstance() + FoxFactory.listen() — explicit style
FoxFactory.createInstance({ port: 3000, env: 'development', jsonSpaces: 2, staticFolder: 'public' });
FoxFactory.listen();
```

## ✨ **Features**

### 🏗️ **Core Framework**
- **TypeScript-first** with full type safety
- **Modular routing** with factory patterns
- **Integrated template engine** (Fox + Handlebars)
- **Middleware pipeline** with async support
- **Error handling** with custom error types

### 🛠️ **Developer Experience**
- **CLI tools** for project generation
- **Hot reload** in development
- **Testing utilities** with Jest integration
- **TypeScript decorators** support

### 🏢 **Enterprise Features**
- **Microservices** architecture support
- **Circuit breaker** patterns
- **Load balancing** algorithms
- **Service discovery** and registry
- **Health checks** and monitoring

### 🔒 **Security**
- **Authentication** middleware
- **Authorization** with role-based access
- **CSRF protection**
- **Security headers** middleware
- **Rate limiting**

### 📊 **Observability**
- **Structured logging** with multiple transports
- **Metrics collection** (Prometheus format)
- **Performance monitoring**
- **Health check endpoints**
- **Request tracing**

### 🗄️ **Data & Caching**
- **Database abstraction** layer with provider ecosystem (SQL, NoSQL, Redis, AWS)
- **Multi-provider caching** (Memory, Redis, File)
- **Response caching** middleware
- **Cache invalidation** strategies

### 🚀 **DevOps Ready**
- **Docker** multi-stage builds
- **Docker Compose** for local development
- **CI/CD** GitHub Actions workflows
- **Kubernetes** deployment manifests
- **Monitoring** stack (Prometheus + Grafana)

## 📖 **Documentation**

Visit our [complete documentation](https://github.com/lnavarrocarter/fox-framework/docs) for detailed guides and API reference.

### Quick Examples

#### REST API
```typescript
import { FoxFactory } from '@foxframework/core';
import { RequestMethod } from '@foxframework/core';

const app = FoxFactory.create({
  port: 3000,
  env: 'development',
  jsonSpaces: 2,
  staticFolder: 'public',
  requests: [
    { path: '/users',     method: RequestMethod.GET,    handler: getAllUsers },
    { path: '/users',     method: RequestMethod.POST,   handler: createUser },
    { path: '/users/:id', method: RequestMethod.GET,    handler: getUser },
    { path: '/users/:id', method: RequestMethod.PUT,    handler: updateUser },
    { path: '/users/:id', method: RequestMethod.DELETE, handler: deleteUser }
  ]
});

app.listen(3000);
```

#### With Middleware
```typescript
import { FoxFactory, RequestLoggingMiddleware, AuthMiddleware } from '@foxframework/core';
import { RequestMethod } from '@foxframework/core';

const app = FoxFactory.create({
  port: 3000,
  env: 'development',
  jsonSpaces: 2,
  staticFolder: 'public',
  middlewares: [
    RequestLoggingMiddleware.create(),
    AuthMiddleware.jwt({ secret: 'your-jwt-secret' })
  ],
  requests: [
    { path: '/protected', method: RequestMethod.GET, handler: protectedRoute }
  ]
});

app.listen(3000);
```

## 🛠️ **CLI Commands**

```bash
# Create new project
npx -p @foxframework/core tsfox new <project-name>

# Generate components
npx -p @foxframework/core tsfox generate controller users
npx -p @foxframework/core tsfox generate service auth
npx -p @foxframework/core tsfox generate middleware validation

# Docker operations
npx -p @foxframework/core tsfox docker init
npx -p @foxframework/core tsfox docker build
npx -p @foxframework/core tsfox deploy --interactive
```

## 🧪 **Testing**

Fox Framework includes comprehensive testing utilities:

```typescript
import { FoxTestUtils } from '@foxframework/core';

describe('API Tests', () => {
  const { request } = FoxTestUtils.createTestApp(app);
  
  it('should return users', async () => {
    const response = await request.get('/users');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
  });
});
```

## 📈 **Performance**

- **Lightweight**: < 50KB gzipped
- **Fast startup**: < 100ms cold start  
- **High throughput**: > 10k req/s
- **Memory efficient**: < 50MB baseline
- **Scalable**: Horizontal and vertical scaling

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](https://github.com/lnavarrocarter/fox-framework/blob/main/CONTRIBUTING.md).

### Development Setup

```bash
git clone https://github.com/lnavarrocarter/fox-framework.git
cd fox-framework
npm install
npm run dev
```

### Running Tests

```bash
npm test                    # All tests
npm run test:unit          # Unit tests only  
npm run test:integration   # Integration tests
npm run test:coverage      # With coverage
```

## 📦 **Ecosystem**

### Core

- **[@foxframework/core](https://www.npmjs.com/package/@foxframework/core)** — Core framework (routing, middleware, logging, caching, security, validation)

### Database Providers

Install only the driver(s) you need — all are **peer-dependency** based.

| Package | Database | Install |
|---|---|---|
| [@foxframework/db-postgres](packages/db-postgres/README.md) | PostgreSQL | `npm i @foxframework/db-postgres pg` |
| [@foxframework/db-mysql](packages/db-mysql/README.md) | MySQL / MariaDB | `npm i @foxframework/db-mysql mysql2` |
| [@foxframework/db-sqlite](packages/db-sqlite/README.md) | SQLite | `npm i @foxframework/db-sqlite better-sqlite3` |
| [@foxframework/db-mongo](packages/db-mongo/README.md) | MongoDB | `npm i @foxframework/db-mongo mongodb` |
| [@foxframework/db-redis](packages/db-redis/README.md) | Redis | `npm i @foxframework/db-redis ioredis` |
| [@foxframework/db-rds](packages/db-rds/README.md) | AWS RDS / Aurora | `npm i @foxframework/db-rds @foxframework/db-postgres pg` |
| [@foxframework/db-documentdb](packages/db-documentdb/README.md) | AWS DocumentDB | `npm i @foxframework/db-documentdb @foxframework/db-mongo mongodb` |
| [@foxframework/db-dynamodb](packages/db-dynamodb/README.md) | AWS DynamoDB | `npm i @foxframework/db-dynamodb @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb` |

All providers share the same interfaces (`IDbProvider`, `IRepository`, `IQueryBuilder`, `IMongoProvider`, `IRedisProvider`, `IDynamoProvider`) exported from `@foxframework/core`.

## 📄 **License**

MIT © [Luis Navarro Carter](https://github.com/lnavarrocarter)

## 🔗 **Links**

- [📚 Documentation](https://github.com/lnavarrocarter/fox-framework/docs)
- [🐛 Issues](https://github.com/lnavarrocarter/fox-framework/issues)
- [💬 Discussions](https://github.com/lnavarrocarter/fox-framework/discussions)
- [📦 NPM Package](https://www.npmjs.com/package/@foxframework/core)

---

<p align="center">
  <strong>🦊 Built with Fox Framework</strong><br>
  <em>Modern, Fast, Production-Ready</em>
</p>
