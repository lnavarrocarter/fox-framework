# 🦊 Fox Framework - Arquitectura General

## 🎯 Visión General

Fox Framework es un framework web modular para TypeScript/Node.js que implementa patrones de diseño modernos para crear aplicaciones web escalables y mantenibles.

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                    Fox Framework                            │
├─────────────────────────────────────────────────────────────┤
│  🌐 HTTP Layer (Express Integration)                       │
├─────────────────────────────────────────────────────────────┤
│  🛣️  Router Factory        │  🎨 Template Engine           │
├─────────────────────────────────────────────────────────────┤
│  🏭 Fox Factory (Core)     │  🔌 Plugin System             │
├─────────────────────────────────────────────────────────────┤
│  📦 Dependency Injection   │  🛡️  Security Middleware      │
├─────────────────────────────────────────────────────────────┤
│  ✅ Validation System      │  🛡️  Enhanced Error Handling  │
├─────────────────────────────────────────────────────────────┤
│  💾 Cache System           │  📊 Logging & Monitoring      │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Patrones de Diseño Implementados

### 1. Factory Pattern
- **FoxFactory**: Gestión centralizada de instancias de servidor
- **RouterFactory**: Creación y configuración de rutas
- **EngineFactory**: Gestión de motores de plantillas

### 2. Interface Segregation
- **IServer**: Contrato para implementaciones de servidor
- **IFactory**: Contrato para factories
- **ILogger**: Contrato para sistemas de logging

### 3. Dependency Injection
- **Container**: Gestión de dependencias
- **Providers**: Servicios inyectables
- **Middleware**: Componentes reutilizables

## 📁 Estructura de Directorios

```
fox-framework/
├── src/                           # Demo Application
│   ├── server/                    # Demo server implementation
│   │   ├── index.ts              # Entry point
│   │   ├── config.ts             # Server configuration
│   │   ├── routes.ts             # Route definitions
│   │   └── views.ts              # View configurations
│   └── views/                     # Template examples
├── tsfox/                         # Framework Core
│   ├── core/                      # Core functionality
│   │   ├── types.ts              # Type definitions
│   │   ├── fox.factory.ts        # Main factory
│   │   ├── router.factory.ts     # Router factory
│   │   ├── error.factory.ts      # Error handling
│   │   ├── enums/                # Enumerations
│   │   ├── features/             # Feature implementations
│   │   │   ├── validation/      # Sistema de validación
│   │   │   │   ├── interfaces/  # Contratos de validación
│   │   │   │   ├── validators/  # Validadores específicos
│   │   │   │   ├── schema/      # Schema builders y base
│   │   │   │   └── errors/      # Errores de validación
│   │   │   ├── engine.feature.ts # Template engine
│   │   │   └── foxserver.feature.ts # Server features
│   │   └── interfaces/           # Interface contracts
│   ├── cli/                       # Command Line Interface
│   │   ├── index.ts              # CLI entry point
│   │   ├── generators.ts         # Code generators
│   │   └── templates/            # Code templates
│   └── index.ts                   # Framework entry point
├── docs/                          # Documentation
│   ├── architecture/             # Architecture docs
│   ├── api/                      # API documentation
│   ├── schemas/                  # Data schemas
│   └── deployment/               # Deployment guides
└── .dev/                          # Development resources
    └── lessons_learned/          # Technical decisions
```

## 🔄 Flujo de Datos

1. **Inicialización**
   ```typescript
   const config = { port: 3000, env: 'development' };
   const app = startServer(config);
   ```

2. **Procesamiento de Requests**
   ```
   Request → Router → Middleware → Controller → Response
   ```

3. **Template Rendering**
   ```
   Controller → Engine → Template → Rendered HTML
   ```

## 🧩 Componentes Principales

### FoxFactory
- **Responsabilidad**: Gestión del ciclo de vida del servidor
- **Patrón**: Singleton Factory
- **Métodos**: `createInstance()`, `getInstance()`, `listen()`

### RouterFactory
- **Responsabilidad**: Configuración y gestión de rutas
- **Patrón**: Factory Method
- **Métodos**: `register()`, `group()`, `middleware()`

### Template Engine
- **Responsabilidad**: Renderizado de vistas
- **Soporte**: `.fox`, `.html`, `.hbs`
- **Features**: Variables, bucles, condicionales

### Validation System
- **Responsabilidad**: Validación de datos de entrada y salida
- **Patrón**: Builder Pattern + Schema Validation
- **Arquitectura**: Fluent API con validators modulares
- **Features**: String, Number, Object, Array, Boolean, Literal, Union, Enum validators

## 📊 Métricas de Arquitectura

### Complejidad
- **Cyclomatic Complexity**: < 10 por método
- **Coupling**: Bajo (interfaces bien definidas)
- **Cohesion**: Alto (responsabilidades claras)

### Performance
- **Startup Time**: < 1 segundo
- **Memory Usage**: < 100MB baseline
- **Request Throughput**: > 10k requests/segundo

## 🔮 Evolución Futura

### Fase 1: Estabilización
- [ ] Dependency injection completo
- [x] Error handling robusto
- [x] Validation system completo
- [ ] Test coverage > 80%

### Fase 2: Features Avanzadas
- [ ] Plugin system
- [ ] Event system
- [ ] Cache layer

### Fase 3: Escalabilidad
- [ ] Microservices support
- [ ] Database abstraction
- [ ] Cloud deployment

## 📖 Referencias

- [Factory Pattern](https://refactoring.guru/design-patterns/factory-method)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
