# Plan de Mejora de Coverage - Fox Framework

## 🎯 Objetivo
Aumentar coverage del **39.59%** actual al **80%** mínimo

## 📊 Estado Actual
- **Statements**: 39.59% → 80%
- **Branches**: 29.74% → 70% 
- **Functions**: 39.15% → 80%
- **Lines**: 39.73% → 80%

## 🚀 Estrategia por Fases

### Fase 1: Quick Wins (Impacto Alto, Esfuerzo Bajo)
*Target: 39% → 55% coverage*

#### 1.1 Core Application Files
- [ ] `src/routes/index.ts` (0% → 90%)
- [ ] `src/server/index.ts` (0% → 80%)
- [ ] `src/services/user.service.ts` (0% → 85%)

#### 1.2 CLI Core
- [ ] `tsfox/cli/index.ts` (0% → 70%)
- [ ] CLI command básicos con flujos principales

**Estimado**: +15% coverage total

### Fase 2: Database & Events (Impacto Medio, Esfuerzo Medio)
*Target: 55% → 68% coverage*

#### 2.1 Database System
- [ ] `database.factory.ts` (54% → 80%)
- [ ] `connection.manager.ts` (4% → 60%)
- [ ] `query.builder.ts` (76% → 90%)

#### 2.2 Event System  
- [ ] `event.bus.ts` (37% → 75%)
- [ ] `event.emitter.ts` (43% → 80%)
- [ ] `event.store.ts` (46% → 75%)

**Estimado**: +13% coverage total

### Fase 3: CLI Commands (Impacto Alto, Esfuerzo Alto)
*Target: 68% → 78% coverage*

#### 3.1 Generate Commands
- [ ] `controller.command.ts` (8% → 70%)
- [ ] `model.command.ts` (12% → 70%)
- [ ] `service.command.ts` (16% → 70%)

#### 3.2 Deploy Commands
- [ ] `deploy.command.ts` (10% → 60%)
- [ ] Docker commands (37% → 70%)

**Estimado**: +10% coverage total

### Fase 4: Advanced Features (Impacto Medio, Esfuerzo Alto)
*Target: 78% → 85% coverage*

#### 4.1 Performance System
- [ ] `performance.factory.ts` (21% → 60%)
- [ ] `metrics.middleware.ts` (28% → 70%)
- [ ] Optimizers (0% → 50%)

#### 4.2 Plugins System
- [ ] `loader.ts` (3% → 60%)
- [ ] `registry.ts` (31% → 70%)
- [ ] `validator.ts` (28% → 70%)

**Estimado**: +7% coverage total

## 🛠️ Plan de Implementación

### Sprint 1: Core Application (Esta semana)
1. Tests para `src/routes/index.ts`
2. Tests para `src/server/index.ts` 
3. Tests para `src/services/user.service.ts`
4. Tests básicos para CLI principal

### Sprint 2: Database & Events
1. Completar tests de database factory
2. Tests para connection manager
3. Tests para event system core

### Sprint 3: CLI Commands
1. Tests para generadores principales
2. Tests para comandos de deploy
3. Tests para comandos Docker

### Sprint 4: Advanced Features
1. Tests para sistema de performance
2. Tests para plugins system
3. Optimización final

## 📋 Archivos de Test a Crear

### Core Application
```
src/routes/__tests__/index.test.ts
src/server/__tests__/index.test.ts  
src/services/__tests__/user.service.test.ts
```

### Database
```
tsfox/core/features/database/__tests__/connection.manager.test.ts
tsfox/core/features/database/__tests__/database.factory.enhanced.test.ts
```

### Events
```
tsfox/core/features/events/__tests__/event.bus.enhanced.test.ts
tsfox/core/features/events/__tests__/event.emitter.enhanced.test.ts
tsfox/core/features/events/__tests__/event.store.test.ts
```

### CLI Commands
```
tsfox/cli/commands/generate/__tests__/controller.command.test.ts
tsfox/cli/commands/generate/__tests__/model.command.test.ts
tsfox/cli/commands/generate/__tests__/service.command.test.ts
tsfox/cli/commands/__tests__/deploy.command.test.ts
```

### Performance
```
tsfox/core/performance/__tests__/performance.factory.test.ts
tsfox/core/performance/middleware/__tests__/metrics.middleware.test.ts
```

### Plugins
```
tsfox/core/plugins/__tests__/loader.test.ts
tsfox/core/plugins/__tests__/registry.enhanced.test.ts
```

## 🎯 Métricas de Seguimiento

### Coverage por Módulo (Objetivo)
- **src/**: 0% → 85%
- **tsfox/cli/**: 37% → 75%
- **tsfox/core/features/database/**: 59% → 80%
- **tsfox/core/features/events/**: 84% → 90%
- **tsfox/core/performance/**: 21% → 70%
- **tsfox/core/plugins/**: 30% → 70%

### Comandos de Verificación
```bash
# Verificar progreso
npm run test:codecov

# Coverage por archivo específico
npm run test:coverage -- --collectCoverageFrom="src/**"

# Coverage de CLI
npm run test:coverage -- --collectCoverageFrom="tsfox/cli/**"
```

## 🚨 Consideraciones

### Exclusiones Justificadas
- **Examples**: No necesitan coverage (ya excluidos)
- **Types**: Solo definiciones (ya excluidos)
- **Templates**: Solo archivos de ejemplo

### Priorización
1. **Alto Impacto**: Archivos con 0% coverage y muchas líneas
2. **Fácil Implementation**: Tests unitarios simples
3. **Core Business Logic**: Funcionalidad crítica del framework

### Automatización
- Tests automáticos en CI/CD
- Coverage reports en PRs
- Badges actualizados automáticamente

---

**Resultado Esperado**: Coverage del 85% en 4 sprints (4 semanas)
