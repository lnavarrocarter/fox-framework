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
# Método recomendado (publicado)
npx tsfox new my-app
cd my-app
npm install
npm run dev

# Si estás trabajando desde el repositorio fuente (monorepo/clonado):
git clone https://github.com/lnavarrocarter/fox-framework.git
cd fox-framework
npm install
npm run build   # genera dist/
npx tsfox new demo-app
```

Si no has corrido `npm run build`, el binario apunta a `dist/tsfox/cli/index.js` y fallará con "Cannot find module". Ejecuta el build primero o usa el modo desarrollo:

```bash
node tsfox/cli/index.ts new my-app  # requiere ts-node instalado global o usar: npx ts-node tsfox/cli/index.ts new my-app
```

### Basic Usage

```typescript
import { FoxFactory } from '@foxframework/core';

const app = FoxFactory.create({
  requests: [
    {
      path: '/',
      method: 'get',
      handler: (req, res) => res.json({ message: 'Hello Fox!' })
    }
  ]
});

app.listen(3000, () => {
  console.log('🦊 Fox Framework running on port 3000');
});
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
- **Database abstraction** layer
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

const app = FoxFactory.create({
  requests: [
    { path: '/users', method: 'get', handler: getAllUsers },
    { path: '/users', method: 'post', handler: createUser },
    { path: '/users/:id', method: 'get', handler: getUser },
    { path: '/users/:id', method: 'put', handler: updateUser },
    { path: '/users/:id', method: 'delete', handler: deleteUser }
  ]
});
```

#### With Middleware
```typescript
import { FoxFactory, authMiddleware, loggingMiddleware } from '@foxframework/core';

const app = FoxFactory.create({
  middleware: [
    loggingMiddleware(),
    authMiddleware({ secret: 'your-jwt-secret' })
  ],
  requests: [
    { path: '/protected', method: 'get', handler: protectedRoute }
  ]
});
```

## 🛠️ **CLI Commands**

```bash
# Create new project
npx tsfox new <project-name>

# Generate components
npx tsfox generate controller users
npx tsfox generate service auth
npx tsfox generate middleware validation

# Docker operations  
npx tsfox docker init
npx tsfox docker build
npx tsfox docker deploy
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

- **@foxframework/core** - Core framework (this package)
- **@foxframework/cli** - Extended CLI tools
- **@foxframework/plugins** - Community plugins
- **@foxframework/templates** - Project templates

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
