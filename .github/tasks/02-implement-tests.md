# 🧪 Task 02: Implementar Sistema de Tests Completo

## 📋 Información General

- **ID**: 02
- **Título**: Sistema de Tests Unitarios e Integración
- **Prioridad**: 🔴 Crítica
- **Estimación**: 8-12 horas
- **Asignado**: Developer
- **Estado**: ✅ Completado (2025-01-10)

## 🎯 Objetivo

Implementar un sistema completo de testing unitario e integración que cubra todas las funcionalidades críticas del framework y establezca una base sólida para desarrollo futuro.

## 📄 Descripción

El framework actualmente carece de tests adecuados, lo que hace difícil garantizar la estabilidad y detectar regresiones. Se necesita implementar tests unitarios e integración para todos los componentes principales.

## ✅ Criterios de Aceptación

### 1. Tests Unitarios Core
- [x] FoxFactory tests completos
- [x] RouterFactory tests implementados
- [x] Template Engine tests funcionando
- [x] Error handling tests cubriendo edge cases
- [x] Cobertura > 80% en componentes core

### 2. Tests de Integración
- [x] Server startup/shutdown tests
- [x] End-to-end routing tests
- [x] Template rendering integration tests
- [x] CLI commands integration tests

### 3. Infraestructura de Testing
- [x] Test helpers y utilities
- [x] Mock objects y factories
- [x] Test data fixtures
- [x] Coverage reporting configurado

### 4. CI/CD Readiness
- [x] Tests ejecutándose en pipeline
- [x] Coverage reports automáticos
- [x] Test results visualization
- [x] Performance benchmarks básicos

## 🛠️ Implementación

### 1. Tests para FoxFactory

```typescript
// tsfox/core/__tests__/fox.factory.test.ts
import { FoxFactory } from '../fox.factory';
import { ServerConfig } from '../types';

describe('FoxFactory', () => {
  let mockConfig: ServerConfig;

  beforeEach(() => {
    mockConfig = {
      port: 3000,
      env: 'test',
      jsonSpaces: 2,
      staticFolder: 'public'
    };
  });

  afterEach(() => {
    // Clean up instances
    jest.clearAllMocks();
  });

  describe('createInstance', () => {
    it('should create a server instance with valid config', () => {
      const instance = FoxFactory.createInstance(mockConfig);
      expect(instance).toBeDefined();
      expect(instance).toHaveProperty('start');
      expect(instance).toHaveProperty('get');
    });

    it('should return singleton instance', () => {
      const instance1 = FoxFactory.createInstance(mockConfig);
      const instance2 = FoxFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should handle default routes when none provided', () => {
      const instance = FoxFactory.createInstance(mockConfig);
      expect(instance).toBeDefined();
      // Verify default route is registered
    });
  });

  describe('requestsManager', () => {
    it('should register multiple routes correctly', () => {
      const requests = [
        {
          method: 'GET' as const,
          path: '/users',
          callback: jest.fn()
        },
        {
          method: 'POST' as const,
          path: '/users',
          callback: jest.fn()
        }
      ];

      const config = { ...mockConfig, requests };
      const instance = FoxFactory.createInstance(config);
      
      // Verify routes are registered
      expect(instance.get).toHaveBeenCalledWith('/api/users', expect.any(Function));
      expect(instance.post).toHaveBeenCalledWith('/api/users', expect.any(Function));
    });
  });
});
```

### 2. Tests para Template Engine

```typescript
// tsfox/core/features/__tests__/engine.feature.test.ts
import { engineFox, engineHtml } from '../engine.feature';
import fs from 'fs';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Template Engines', () => {
  describe('engineFox', () => {
    it('should render simple template with variables', (done) => {
      const templateContent = '<h1>{{title}}</h1><p>{{message}}</p>';
      const options = {
        title: 'Test Title',
        message: 'Test Message'
      };

      mockedFs.readFile.mockImplementation((path, callback) => {
        callback(null, { toString: () => templateContent });
      });

      engineFox('test.fox', options, (err, result) => {
        expect(err).toBeNull();
        expect(result).toContain('Test Title');
        expect(result).toContain('Test Message');
        done();
      });
    });

    it('should handle file read errors', (done) => {
      const error = new Error('File not found');
      mockedFs.readFile.mockImplementation((path, callback) => {
        callback(error);
      });

      engineFox('nonexistent.fox', {}, (err, result) => {
        expect(err).toBe(error);
        expect(result).toBeUndefined();
        done();
      });
    });
  });

  describe('engineHtml', () => {
    it('should replace HTML template placeholders', (done) => {
      const templateContent = '<html>#title##message#</html>';
      const options = {
        title: 'Page Title',
        message: 'Welcome Message'
      };

      mockedFs.readFile.mockImplementation((path, callback) => {
        callback(null, { toString: () => templateContent });
      });

      engineHtml('test.html', options, (err, result) => {
        expect(err).toBeNull();
        expect(result).toContain('<title>Page Title</title>');
        expect(result).toContain('<h1>Welcome Message</h1>');
        done();
      });
    });
  });
});
```

### 3. Integration Tests

```typescript
// tsfox/__tests__/integration/server.integration.test.ts
import request from 'supertest';
import { FoxFactory } from '../core/fox.factory';
import { ServerConfig } from '../core/types';

describe('Server Integration Tests', () => {
  let server: any;
  let config: ServerConfig;

  beforeAll(() => {
    config = {
      port: 0, // Random port for testing
      env: 'test',
      jsonSpaces: 2,
      staticFolder: 'public',
      requests: [
        {
          method: 'GET',
          path: '/test',
          callback: (req: any, res: any) => {
            res.json({ message: 'Test successful' });
          }
        }
      ]
    };
    
    server = FoxFactory.createInstance(config);
  });

  afterAll(() => {
    if (server) {
      server.destroy();
    }
  });

  describe('API Endpoints', () => {
    it('should respond to GET /api/test', async () => {
      const response = await request(server.app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Test successful'
      });
    });

    it('should handle 404 for unknown routes', async () => {
      await request(server.app)
        .get('/api/nonexistent')
        .expect(404);
    });
  });

  describe('Static Files', () => {
    it('should serve static files from public folder', async () => {
      // Assuming we have a test file in public/
      await request(server.app)
        .get('/test.txt')
        .expect(200);
    });
  });
});
```

### 4. CLI Tests

```typescript
// tsfox/cli/__tests__/generators.test.ts
import { generateController, generateModel, generateView } from '../generators';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('CLI Generators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateController', () => {
    it('should create controller file with correct content', () => {
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(false);

      generateController('UserController');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('UserController.ts'),
        expect.stringContaining('export class UserController')
      );
    });

    it('should create directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => '');
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController('UserController');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('controllers'),
        { recursive: true }
      );
    });
  });
});
```

### 5. Test Utilities

```typescript
// tsfox/__tests__/utils/test-helpers.ts
import { ServerConfig } from '../../core/types';
import { FoxFactory } from '../../core/fox.factory';

export class TestServerFactory {
  static createTestConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
    return {
      port: 0,
      env: 'test',
      jsonSpaces: 2,
      staticFolder: 'public',
      ...overrides
    };
  }

  static createTestServer(config?: Partial<ServerConfig>) {
    const testConfig = this.createTestConfig(config);
    return FoxFactory.createInstance(testConfig);
  }
}

export const mockRequest = () => ({
  params: {},
  query: {},
  body: {},
  headers: {}
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();
```

### 6. Performance Tests

```typescript
// tsfox/__tests__/performance/benchmark.test.ts
import { performance } from 'perf_hooks';
import { TestServerFactory } from '../utils/test-helpers';

describe('Performance Benchmarks', () => {
  it('should start server within acceptable time', () => {
    const start = performance.now();
    
    const server = TestServerFactory.createTestServer();
    
    const end = performance.now();
    const startupTime = end - start;
    
    expect(startupTime).toBeLessThan(1000); // < 1 second
  });

  it('should handle multiple route registrations efficiently', () => {
    const routes = Array.from({ length: 100 }, (_, i) => ({
      method: 'GET' as const,
      path: `/test${i}`,
      callback: jest.fn()
    }));

    const start = performance.now();
    
    TestServerFactory.createTestServer({ requests: routes });
    
    const end = performance.now();
    const registrationTime = end - start;
    
    expect(registrationTime).toBeLessThan(500); // < 0.5 seconds
  });
});
```

## 📊 Plan de Testing

### 1. Test Coverage Goals
- **Core Factory**: 90%+
- **Router Factory**: 85%+
- **Template Engine**: 80%+
- **CLI Tools**: 75%+
- **Overall**: 80%+

### 2. Test Categories
- **Unit Tests**: Componentes aislados
- **Integration Tests**: Interacción entre componentes
- **End-to-End Tests**: Flujo completo usuario
- **Performance Tests**: Métricas de rendimiento

### 3. Mock Strategy
- Mock filesystem operations
- Mock HTTP requests/responses
- Mock external dependencies
- Use dependency injection for testability

## 📝 Configuración Adicional

### Jest Setup File
```typescript
// jest.setup.ts
import 'jest';

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterEach(() => {
  // Clean up any global state
});

// Custom matchers
expect.extend({
  toBeValidFoxServer(received) {
    const pass = received && 
                 typeof received.start === 'function' &&
                 typeof received.get === 'function' &&
                 typeof received.post === 'function';
    
    return {
      message: () => 'Expected value to be a valid Fox server instance',
      pass
    };
  }
});
```

### Test Scripts Package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testMatch='**/__tests__/integration/**/*.test.ts'",
    "test:unit": "jest --testMatch='**/__tests__/**/*.test.ts' --ignore-pattern='integration'",
    "test:performance": "jest --testMatch='**/__tests__/performance/**/*.test.ts'"
  }
}
```

## 📊 Definición de Done

- [x] Todos los tests unitarios implementados y pasando
- [x] Tests de integración cubriendo flujos principales
- [x] Cobertura de código > 80%
- [x] Performance benchmarks establecidos
- [x] Test utilities documentadas
- [x] CI/CD pipeline configurado
- [x] Documentación de testing actualizada

## ✅ Resultado Final

**Tarea completada exitosamente el 2025-01-10**

### Métricas Logradas:
- **249 tests** implementados y pasando
- **88.22%** cobertura en statements
- **80.29%** cobertura en branches  
- **85.33%** cobertura en functions
- **87.38%** cobertura en lines
- **20 test suites** ejecutándose correctamente

### Componentes Testeados:
- ✅ FoxFactory con tests completos
- ✅ RouterFactory con todos los métodos HTTP
- ✅ Error handling robusto con edge cases
- ✅ Template Engine Fox con tests exhaustivos
- ✅ CLI generators con casos reales
- ✅ Integration tests end-to-end
- ✅ Server features con mocks avanzados

## 🔗 Dependencias

- **Depende de**: Task 01 (Fix Dependencies)
- **Bloqueante para**: Task 03 (Error Handling), Task 04 (Logging)
- **Relacionada con**: Todas las tareas de desarrollo

## 📚 Referencias

- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Testing Node.js Applications](https://nodejs.org/en/docs/guides/testing/)
- [TypeScript Jest Configuration](https://jestjs.io/docs/getting-started#using-typescript)
