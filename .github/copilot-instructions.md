# 🦊 Fox Framework - Instrucciones para GitHub Copilot

## 🎯 Contexto del Proyecto

Este es **Fox Framework**, un framework web para TypeScript/Node.js que proporciona:
- Sistema de routing modular
- Motor de templates integrado 
- CLI para generación de código
- Arquitectura de factory patterns
- Soporte para múltiples tipos de servidor
- Enfoque en extensibilidad y mantenibilidad
- Basado en patrones de diseño como Dependency Injection y Interface Segregation
- Enfoque en pruebas unitarias e integración
- Documentación técnica detallada

## 📋 Proceso de Trabajo Obligatorio

**ALWAYS** seguir este proceso antes de cualquier tarea:

### 1. 📖 LEER Documentación
- **OBLIGATORIO**: Revisar `docs/architecture/` para entender arquitectura actual
- **OBLIGATORIO**: Consultar `docs/api/` para APIs existentes
- **OBLIGATORIO**: Revisar `.dev/lessons_learned/` para decisiones técnicas previas
- Verificar `docs/deployment/` para configuración actual
- Consultar `docs/schemas/` para modelos de datos

### 2. 🎫 CONSULTAR Ticket
- **OBLIGATORIO**: Leer completamente el ticket en `.github/tasks/XX-nombre.md`
- Entender todos los criterios de aceptación
- Verificar dependencias con otros tickets
- Revisar ejemplos de código en el ticket
- Entender arquitectura propuesta en el ticket

### 3. 🔧 IMPLEMENTAR
- Seguir **exactamente** las especificaciones del ticket
- Implementar usando los ejemplos de código proporcionados
- Mantener consistencia con arquitectura existente
- Aplicar todos los coding guidelines del proyecto
- Crear estructura de carpetas si es necesaria

### 4. 📝 DOCUMENTAR Cambios
- **OBLIGATORIO**: Actualizar `docs/` con cambios técnicos
- **OBLIGATORIO**: Documentar decisiones de arquitectura
- Actualizar diagramas en `docs/architecture/` si es necesario
- Documentar nuevas APIs en `docs/api/`
- Actualizar esquemas en `docs/schemas/`

### 5. 🧪 VALIDAR Implementación
- Ejecutar tests unitarios e integración
- Validar **todos** los criterios de aceptación del ticket
- Verificar que no hay regresiones
- Probar integración con componentes existentes

### 6. 🎓 REGISTRAR Lessons Learned
- **OBLIGATORIO**: Documentar decisiones importantes en `.dev/lessons_learned/`
- Formato: `YYYY-MM-DD-descripcion-corta.md`
- Incluir: contexto, decisión tomada, alternativas consideradas, rationale

### 7. ✅ MARCAR Como Completado
- Verificar todos los checkboxes del ticket
- Actualizar status en `.github/tasks/README.md` si es necesario
- Confirmar que documentación está actualizada

## 🏗️ Arquitectura del Proyecto

### Estructura Principal
```
fox-framework/
├── src/                    # Aplicación de ejemplo
│   ├── server/            # Servidor de demostración
│   └── views/             # Templates de ejemplo
├── tsfox/                 # Core del framework
│   ├── core/              # Tipos, interfaces, factories
│   ├── cli/               # Herramientas de línea de comandos
│   └── index.ts           # Punto de entrada principal
└── docs/                  # Documentación técnica
```

### Patrones de Arquitectura
- **Factory Pattern**: Para creación de instancias de servidor
- **Interface Segregation**: Separación clara de responsabilidades
- **Dependency Injection**: Para providers y configuración
- **Template Engine**: Sistema de vistas modular

## 🛠️ Coding Guidelines

### TypeScript
- Usar **interfaces** para contratos públicos
- Implementar **tipos estrictos** en `tsfox/core/types.ts`
- Seguir **naming conventions**: PascalCase para interfaces, camelCase para variables
- Documentar con **JSDoc** todas las funciones públicas

### Estructura de Archivos
- **Core logic** en `tsfox/core/`
- **Features** en `tsfox/core/features/`
- **Enums** en `tsfox/core/enums/`
- **Tests** con sufijo `.test.ts`
- **Templates** en `tsfox/cli/templates/`

### Convenciones de Naming
```typescript
// Interfaces
export interface FoxServerInterface { }

// Types
export type FoxFactoryContext = { }

// Enums
export enum RequestMethod { }

// Classes
export class FoxFactory { }

// Functions
export function startServer() { }
```

### Testing
- Tests unitarios en `__test__/` folders
- Usar **Jest** como framework principal
- Cobertura mínima del 80%
- Tests de integración para features completas

## 🔧 Herramientas y Comandos

### Desarrollo
```bash
npm run dev          # Desarrollo con hot-reload
npm run start        # Iniciar servidor
npm test             # Ejecutar tests
```

### CLI del Framework
```bash
npx tsfox generate controller <name>  # Generar controlador
npx tsfox new project <name>          # Nuevo proyecto
```

## 📦 Dependencias Principales

- **Express**: Motor HTTP base
- **TypeScript**: Lenguaje principal
- **Jest**: Testing framework
- **Commander**: CLI framework
- **Nodemon**: Hot-reload en desarrollo

## 🚫 Restricciones y Limitaciones

### NO hacer:
- No modificar interfaces públicas sin actualizar documentación
- No agregar dependencias sin justificación en ticket
- No hacer breaking changes sin versioning
- No implementar features sin tests correspondientes

### SÍ hacer:
- Mantener compatibilidad hacia atrás
- Seguir el patrón factory existente
- Usar los tipos definidos en `core/types.ts`
- Implementar error handling robusto

## 🎯 Casos de Uso Comunes

### Crear nueva feature
1. Definir interfaces en `core/types.ts`
2. Implementar en `core/features/`
3. Agregar tests unitarios
4. Actualizar documentación
5. Crear template si es necesario

### Extender routing
1. Agregar enum en `core/enums/methods.enums.ts`
2. Actualizar `FoxServerInterface`
3. Implementar en factory
4. Agregar tests de integración

### Nuevo template engine
1. Crear feature en `core/features/engine.feature.ts`
2. Definir interfaces específicas
3. Implementar CLI generator
4. Documentar en `docs/api/`

## 📚 Referencias Rápidas

- **Factory Principal**: `tsfox/core/fox.factory.ts`
- **Tipos Core**: `tsfox/core/types.ts`
- **Router**: `tsfox/core/router.factory.ts`
- **CLI**: `tsfox/cli/index.ts`
- **Servidor Demo**: `src/server/index.ts`

---

## ⚡ Comandos de Emergencia

Si algo no funciona:
1. `npm test` - Verificar que tests pasan
2. `npm run dev` - Verificar que demo funciona
3. Revisar `docs/architecture/` para entender el problema
4. Consultar `.dev/lessons_learned/` para problemas similares

**Recuerda**: SIEMPRE seguir el proceso de trabajo completo antes de implementar cualquier cambio.
