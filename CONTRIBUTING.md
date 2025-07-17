# 🦊 Contributing to Fox Framework

¡Gracias por tu interés en contribuir a Fox Framework! Este documento te guiará a través del proceso de contribución y las mejores prácticas para el desarrollo.

## 📋 Tabla de Contenidos

- [🚀 Comenzando](#-comenzando)
- [🏗️ Arquitectura del Proyecto](#️-arquitectura-del-proyecto)
- [💻 Configuración del Entorno de Desarrollo](#-configuración-del-entorno-de-desarrollo)
- [🔄 Flujo de Trabajo](#-flujo-de-trabajo)
- [📝 Estándares de Código](#-estándares-de-código)
- [🧪 Testing](#-testing)
- [📚 Documentación](#-documentación)
- [🐛 Reportar Bugs](#-reportar-bugs)
- [✨ Proponer Features](#-proponer-features)
- [📦 Proceso de Release](#-proceso-de-release)
- [🎯 Roadmap y Prioridades](#-roadmap-y-prioridades)

## 🚀 Comenzando

### Prerrequisitos

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git
- TypeScript conocimiento básico
- Familiaridad con Express.js

### Configuración Inicial

1. **Fork el repositorio**
   ```bash
   # Clona tu fork
   git clone https://github.com/TU_USUARIO/fox-framework.git
   cd fox-framework
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar upstream**
   ```bash
   git remote add upstream https://github.com/lnavarrocarter/fox-framework.git
   ```

4. **Verificar instalación**
   ```bash
   npm test
   npm run build
   npm run dev
   ```

## 🏗️ Arquitectura del Proyecto

### Estructura Principal

```
fox-framework/
├── src/                    # Aplicación de ejemplo/demo
│   ├── server/            # Servidor de demostración
│   └── views/             # Templates de ejemplo
├── tsfox/                 # 🎯 Core del framework
│   ├── core/              # Tipos, interfaces, factories
│   │   ├── cache/         # Sistema de caché
│   │   ├── features/      # Características del framework
│   │   ├── health/        # Health checks
│   │   ├── logging/       # Sistema de logging
│   │   ├── middleware/    # Middlewares
│   │   ├── performance/   # Sistema de performance
│   │   └── security/      # Middleware de seguridad
│   ├── cli/               # Herramientas CLI
│   │   ├── commands/      # Comandos CLI organizados por módulo
│   │   ├── generators/    # Generadores de código
│   │   └── templates/     # Plantillas para generación
│   └── index.ts           # Punto de entrada principal
├── docs/                  # 📚 Documentación
│   ├── api/              # Documentación de API
│   ├── architecture/     # Documentación de arquitectura
│   └── schemas/          # Esquemas y tipos
├── examples/             # Ejemplos de uso
└── __tests__/           # Tests de integración
```

### Principios de Arquitectura

- **Modularidad**: Cada funcionalidad es un módulo independiente
- **Factory Pattern**: Para creación de instancias
- **Interface Segregation**: Separación clara de responsabilidades
- **Dependency Injection**: Para providers y configuración
- **Type Safety**: TypeScript estricto en todo el código

## 💻 Configuración del Entorno de Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Desarrollo con hot-reload
npm run start        # Iniciar servidor de demo
npm run build        # Compilar TypeScript
npm run watch        # Compilación en modo watch

# Testing
npm test             # Ejecutar todos los tests
npm run test:unit    # Solo tests unitarios
npm run test:integration  # Solo tests de integración
npm run test:coverage     # Tests con cobertura

# Linting y Formato
npm run lint         # Verificar estilo de código
npm run lint:fix     # Corregir problemas automáticamente
npm run format       # Formatear código con Prettier

# CLI
npx tsfox --help     # Ver comandos CLI disponibles
```

### Herramientas de Desarrollo

- **TypeScript**: Lenguaje principal
- **Jest**: Framework de testing
- **ESLint**: Linting de código
- **Prettier**: Formateo de código
- **Nodemon**: Hot-reload en desarrollo
- **Commander.js**: Framework CLI

## 🔄 Flujo de Trabajo

### 🎫 PROCESO OBLIGATORIO

**🔴 SIEMPRE seguir este proceso antes de cualquier contribución:**

#### 1. 📖 LEER Documentación
- 🔴 Revisar `docs/architecture/` para entender arquitectura actual
- 🔴 Consultar `docs/api/` para APIs existentes
- 🔴 Revisar `.dev/lessons_learned/` para decisiones técnicas previas

#### 2. 🎫 CONSULTAR/CREAR Ticket
- 🔴 Verificar si existe ticket relacionado en `.github/tasks/`
- 🔴 Si no existe, crear ticket siguiendo el template
- 🔴 Entender completamente los criterios de aceptación

#### 3. 🌿 Crear Branch
```bash
git checkout main
git pull upstream main
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-del-bug
# o
git checkout -b docs/actualizacion-documentacion
```

#### 4. 🔧 IMPLEMENTAR
- 🔴 Seguir **exactamente** las especificaciones del ticket
- 🔴 Mantener consistencia con arquitectura existente
- 🔴 Aplicar todos los coding guidelines del proyecto

#### 5. 📝 DOCUMENTAR Cambios
- 🔴 Actualizar `docs/` con cambios técnicos
- 🔴 Documentar decisiones de arquitectura
- 🔴 Actualizar `docs/api/` si es necesario

#### 6. 🧪 VALIDAR Implementación
- 🔴 Ejecutar tests unitarios e integración
- 🔴 Verificar que no hay regresiones
- 🔴 Probar integración con componentes existentes

#### 7. 📤 Pull Request
```bash
git add .
git commit -m "tipo: descripción clara del cambio"
git push origin nombre-de-tu-branch
```

### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
tipo(scope): descripción

# Tipos:
feat:     Nueva funcionalidad
fix:      Corrección de bug
docs:     Cambios en documentación
style:    Cambios de formato (no afectan código)
refactor: Refactorización de código
test:     Agregar o modificar tests
chore:    Tareas de mantenimiento
perf:     Mejoras de performance
ci:       Cambios en CI/CD

# Ejemplos:
feat(cache): add Redis support for cache provider
fix(cli): resolve option parsing in health commands
docs(api): update cache configuration examples
test(performance): add benchmark integration tests
```

## 📝 Estándares de Código

### TypeScript Guidelines

```typescript
// ✅ Bueno: Interfaces para contratos públicos
export interface FoxServerInterface {
  start(): Promise<void>;
  stop(): Promise<void>;
}

// ✅ Bueno: Tipos estrictos
export type CacheProvider = 'memory' | 'redis' | 'file';

// ✅ Bueno: JSDoc para funciones públicas
/**
 * Creates a new cache instance
 * @param provider - Cache provider type
 * @param config - Provider-specific configuration
 * @returns Configured cache instance
 */
export function createCache(provider: CacheProvider, config?: any): ICache {
  // implementación
}

// ❌ Malo: Tipos any sin justificación
function processData(data: any): any {
  // evitar
}
```

### Naming Conventions

```typescript
// Interfaces: PascalCase con sufijo Interface
export interface FoxServerInterface { }
export interface CacheProviderInterface { }

// Types: PascalCase
export type FoxFactoryContext = { }
export type RequestMethod = 'GET' | 'POST';

// Enums: PascalCase
export enum RequestMethod {
  GET = 'GET',
  POST = 'POST'
}

// Classes: PascalCase
export class FoxFactory { }
export class CacheManager { }

// Functions: camelCase
export function startServer() { }
export function createCache() { }

// Constants: SCREAMING_SNAKE_CASE
export const DEFAULT_PORT = 3000;
export const CACHE_TTL_DEFAULT = 3600;
```

### Estructura de Archivos

```typescript
// 📁 tsfox/core/cache/
├── index.ts              # Exports principales
├── interfaces.ts         # Interfaces y tipos
├── cache.factory.ts      # Factory principal
├── providers/            # Implementaciones específicas
│   ├── memory.provider.ts
│   ├── redis.provider.ts
│   └── file.provider.ts
└── __tests__/           # Tests del módulo
    ├── cache.factory.test.ts
    └── providers/
```

### Error Handling

```typescript
// ✅ Bueno: Error handling específico
export class CacheConnectionError extends Error {
  constructor(provider: string, cause?: Error) {
    super(`Failed to connect to ${provider} cache`);
    this.name = 'CacheConnectionError';
    this.cause = cause;
  }
}

// ✅ Bueno: Try-catch con contexto
async function connectToCache(config: CacheConfig): Promise<ICache> {
  try {
    return await CacheFactory.create(config);
  } catch (error) {
    throw new CacheConnectionError(config.provider, error as Error);
  }
}
```

## 🧪 Testing

### Estructura de Tests

```bash
# Tests unitarios: junto al código
tsfox/core/cache/__tests__/
├── cache.factory.test.ts
├── memory.provider.test.ts
└── redis.provider.test.ts

# Tests de integración: raíz del proyecto
__tests__/
├── integration/
│   ├── cache-integration.test.ts
│   └── cli-integration.test.ts
└── e2e/
    └── full-application.test.ts
```

### Writing Tests

```typescript
// ✅ Bueno: Test descriptivo con setup/teardown
describe('CacheFactory', () => {
  let factory: CacheFactory;
  
  beforeEach(() => {
    factory = new CacheFactory();
  });
  
  afterEach(async () => {
    await factory.cleanup();
  });
  
  describe('create()', () => {
    it('should create memory cache with default configuration', async () => {
      // Arrange
      const config = { provider: 'memory' as const };
      
      // Act
      const cache = await factory.create(config);
      
      // Assert
      expect(cache).toBeInstanceOf(MemoryCache);
      expect(cache.getMetrics().provider).toBe('memory');
    });
    
    it('should throw error for invalid provider', async () => {
      // Arrange
      const config = { provider: 'invalid' as any };
      
      // Act & Assert
      await expect(factory.create(config)).rejects.toThrow(
        'Unsupported cache provider: invalid'
      );
    });
  });
});
```

### Cobertura de Tests

- **Mínimo requerido**: 80%
- **Objetivo**: 90%
- **Critical paths**: 100%

```bash
# Verificar cobertura
npm run test:coverage

# Ver reporte detallado
open coverage/lcov-report/index.html
```

## 📚 Documentación

### API Documentation

```typescript
/**
 * @fileoverview Cache system for Fox Framework
 * @module tsfox/core/cache
 * @version 1.0.0
 */

/**
 * Cache configuration options
 * @interface CacheConfig
 * @property {CacheProvider} provider - Cache provider type
 * @property {number} [ttl=3600] - Time to live in seconds
 * @property {string} [prefix] - Key prefix for namespacing
 * @example
 * ```typescript
 * const config: CacheConfig = {
 *   provider: 'redis',
 *   ttl: 3600,
 *   prefix: 'myapp:'
 * };
 * ```
 */
export interface CacheConfig {
  provider: CacheProvider;
  ttl?: number;
  prefix?: string;
}
```

### Architecture Documentation

- Actualizar `docs/architecture/` para cambios estructurales
- Incluir diagramas cuando sea necesario
- Documentar decisiones de diseño en `docs/architecture/decisions/`

### CLI Documentation

```typescript
// Cada comando debe tener ayuda completa
export const CacheInitCommand: CommandInterface = {
  name: 'init',
  description: 'Initialize cache system configuration',
  examples: [
    'tsfox cache init --provider memory',
    'tsfox cache init --provider redis --ttl 3600'
  ],
  // ...
};
```

## 🐛 Reportar Bugs

### Template de Bug Report

```markdown
## 🐛 Bug Description
Descripción clara y concisa del problema.

## 🔄 Steps to Reproduce
1. Ejecutar comando `tsfox cache init`
2. Configurar provider redis
3. Ver error...

## 🎯 Expected Behavior
Describir qué debería pasar.

## 📸 Screenshots/Logs
```
[incluir logs o screenshots relevantes]
```

## 🖥️ Environment
- OS: macOS 12.0
- Node.js: 16.14.0
- Fox Framework: 1.0.1

## 📝 Additional Context
Cualquier información adicional relevante.
```

### Bug Triage Process

1. **P0 - Critical**: Bloquea funcionalidad core
2. **P1 - High**: Afecta funcionalidad importante
3. **P2 - Medium**: Bug menor, workaround disponible
4. **P3 - Low**: Mejora o bug cosmético

## ✨ Proponer Features

### Template de Feature Request

```markdown
## 🚀 Feature Description
Descripción clara de la nueva funcionalidad.

## 🎯 Motivation
¿Por qué es importante esta feature?

## 📋 Detailed Design
Descripción técnica detallada de la implementación.

## 🔧 API Design
```typescript
// Ejemplo de cómo se usaría la nueva API
const result = await foxFramework.newFeature({
  option1: 'value',
  option2: true
});
```

## 🧪 Testing Strategy
¿Cómo se testearía esta feature?

## 📚 Documentation Impact
¿Qué documentación necesita actualizarse?

## 🔄 Migration Guide
¿Hay breaking changes? ¿Cómo migrar?
```

### Feature Development Process

1. **RFC (Request for Comments)**: Para features grandes
2. **Design Review**: Revisión de arquitectura
3. **Implementation**: Seguir proceso de desarrollo
4. **Testing**: Cobertura completa
5. **Documentation**: Actualizar docs
6. **Release**: Incluir en próximo release

## 📦 Proceso de Release

### Semantic Versioning

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (1.x.0): Nuevas features (backwards compatible)
- **PATCH** (1.0.x): Bug fixes

### Release Checklist

- [ ] Todos los tests pasan
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] Version bump en package.json
- [ ] Tag de git creado
- [ ] NPM package publicado

### Release Notes Format

```markdown
## [1.1.0] - 2025-07-17

### 🚀 Features
- **cache**: Add Redis support for distributed caching
- **cli**: New performance analysis commands

### 🐛 Bug Fixes
- **health**: Fix port configuration in CLI commands
- **types**: Correct export paths for interfaces

### 📚 Documentation
- **api**: Update cache configuration examples
- **contributing**: Add comprehensive contribution guide

### 🔧 Internal
- **build**: Optimize TypeScript compilation
- **tests**: Improve test coverage to 85%
```

## 🎯 Roadmap y Prioridades

### High Priority Features

1. **Database Integration**: ORM/Query Builder
2. **Authentication**: JWT/OAuth middleware
3. **WebSocket Support**: Real-time capabilities
4. **Plugin System**: Extensible architecture

### Medium Priority

1. **GraphQL Support**: GraphQL server integration
2. **Microservices**: Service discovery
3. **Monitoring**: APM integration
4. **Docker**: Container optimization

### Nice to Have

1. **Admin Dashboard**: Web-based management
2. **CLI Plugins**: Extensible CLI system
3. **Code Generation**: More generators
4. **Templates**: Project templates

### Current Sprint Focus

Ver `.github/tasks/README.md` para tasks actuales y sus prioridades.

## 🤝 Código de Conducta

### Nuestros Valores

- **Respeto**: Tratamos a todos con respeto y dignidad
- **Colaboración**: Trabajamos juntos hacia objetivos comunes
- **Calidad**: Nos esforzamos por la excelencia técnica
- **Inclusión**: Valoramos la diversidad de perspectivas
- **Aprendizaje**: Fomentamos el crecimiento continuo

### Comportamiento Esperado

- ✅ Ser constructivo en el feedback
- ✅ Ayudar a otros desarrolladores
- ✅ Documentar decisiones importantes
- ✅ Seguir las mejores prácticas
- ✅ Ser paciente con principiantes

### Comportamiento Inaceptable

- ❌ Ataques personales o insultos
- ❌ Discriminación o acoso
- ❌ Spam o autopromoción
- ❌ Compartir información privada
- ❌ Conducta no profesional

## 📞 Contacto y Ayuda

### Canales de Comunicación

- **GitHub Issues**: Para bugs y feature requests
- **GitHub Discussions**: Para preguntas y discusiones
- **Email**: [mantainer-email] para asuntos privados

### Obtener Ayuda

1. **Documentación**: Revisar `docs/` primero
2. **Examples**: Ver `examples/` para casos de uso
3. **Tests**: Revisar tests para entender APIs
4. **Issues**: Buscar issues similares
5. **Discussions**: Preguntar en GitHub Discussions

### Contribuyendo a la Documentación

La documentación también necesita amor:

- Corregir typos o errores
- Mejorar ejemplos existentes
- Agregar nuevos ejemplos
- Traducir documentación
- Mejorar claridad de explicaciones

---

## 🙏 Reconocimientos

¡Gracias a todos los contributors que hacen posible Fox Framework!

### Hall of Fame

- **Core Team**: [Lista de maintainers]
- **Top Contributors**: [Contributors más activos]
- **Special Thanks**: [Reconocimientos especiales]

---

**¿Listo para contribuir? ¡Empecemos! 🚀**

```bash
git clone https://github.com/lnavarrocarter/fox-framework.git
cd fox-framework
npm install
npm test
```

¡Tu primera contribución puede ser tan simple como corregir un typo o mejorar un ejemplo!
