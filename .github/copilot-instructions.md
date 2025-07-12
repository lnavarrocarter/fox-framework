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

---

## 🤖 Instrucciones Específicas para GitHub Copilot

- Responde solo dentro del contexto del proyecto Fox Framework.
- Usa siempre los tipos, interfaces y patrones definidos en `tsfox/core/`.
- Propón código que siga las convenciones de nombres y estructura del framework.
- Antes de sugerir una implementación, valida si ya existe una solución similar en:
  - `tsfox/core/features/`
  - `docs/architecture/`
  - `.dev/lessons_learned/`
- Nunca propongas instalar nuevas dependencias sin ticket asociado.

---

## 📋 Proceso de Trabajo Obligatorio

🔴 **OBLIGATORIO** seguir este proceso antes de cualquier tarea:

### 1. 📖 LEER Documentación
- 🔴 Revisar `docs/architecture/` para entender arquitectura actual
- 🔴 Consultar `docs/api/` para APIs existentes
- 🔴 Revisar `.dev/lessons_learned/` para decisiones técnicas previas
- 🟡 Verificar `docs/deployment/` para configuración actual
- 🟡 Consultar `docs/schemas/` para modelos de datos

### 2. 🎫 CONSULTAR Ticket
- 🔴 Leer completamente el ticket en `.github/tasks/XX-nombre.md`
- 🔴 Entender todos los criterios de aceptación
- 🟡 Verificar dependencias con otros tickets
- 🟡 Revisar ejemplos de código en el ticket
- 🟡 Entender arquitectura propuesta en el ticket

### 3. 🔧 IMPLEMENTAR
- 🔴 Seguir **exactamente** las especificaciones del ticket
- 🔴 Implementar usando los ejemplos de código proporcionados
- 🔴 Mantener consistencia con arquitectura existente
- 🔴 Aplicar todos los coding guidelines del proyecto
- 🟡 Crear estructura de carpetas si es necesaria

### 4. 📝 DOCUMENTAR Cambios
- 🔴 Actualizar `docs/` con cambios técnicos
- 🔴 Documentar decisiones de arquitectura
- 🟡 Actualizar diagramas en `docs/architecture/` si es necesario
- 🟡 Documentar nuevas APIs en `docs/api/`
- 🟡 Actualizar esquemas en `docs/schemas/`

### 5. 🧪 VALIDAR Implementación
- 🔴 Ejecutar tests unitarios e integración
- 🔴 Validar **todos** los criterios de aceptación del ticket
- 🔴 Verificar que no hay regresiones
- 🟡 Probar integración con componentes existentes

### 6. 🎓 REGISTRAR Lessons Learned
- 🔴 Documentar decisiones importantes en `.dev/lessons_learned/`
- Formato: `YYYY-MM-DD-descripcion-corta.md`
- Incluir: contexto, decisión tomada, alternativas consideradas, rationale

#### 🧠 Ejemplo
Archivo: `2025-07-10-router-refactor.md`

```
# Refactor Router Factory

## Contexto
Se detectó que el router original no soportaba middlewares asincrónicos.

## Decisión
Separar la lógica en 2 clases: `RouterFactory` y `MiddlewarePipeline`.

## Alternativas Consideradas
1. Agregar lógica condicional directamente → 🔴 No mantenible
2. Usar decoradores → 🟡 Innecesario por ahora

## Rationale
Patrón actual permite testeo más sencillo y separación de responsabilidades.
```

### 7. ✅ MARCAR Como Completado
- 🔴 Verificar todos los checkboxes del ticket
- 🔴 Actualizar status en `.github/tasks/README.md` si es necesario
- 🔴 Confirmar que documentación está actualizada

---

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

---

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
```ts
export interface FoxServerInterface { }
export type FoxFactoryContext = { }
export enum RequestMethod { }
export class FoxFactory { }
export function startServer() { }
```

### Testing
- Tests unitarios en carpetas `__test__/`
- Usar **Jest** como framework principal
- Cobertura mínima del 80%
- Tests de integración para features completas

---

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

---

## 📦 Dependencias Principales

- **Express**: Motor HTTP base
- **TypeScript**: Lenguaje principal
- **Jest**: Testing framework
- **Commander**: CLI framework
- **Nodemon**: Hot-reload en desarrollo

---

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

---

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

---

## 👋 ¿Nuevo en el proyecto? Sigue estos pasos

1. Clona el repo y corre `npm install`
2. Revisa `docs/architecture/overview.md`
3. Corre `npm run dev` y explora el servidor de demo
4. Lee ejemplos en `tsfox/core/features/`
5. Mira tests en `__test__/`
6. Revisa tickets abiertos en `.github/tasks/`

---

## ⚡ Comandos de Emergencia

Si algo no funciona:
1. `npm test` - Verificar que tests pasan
2. `npm run dev` - Verificar que demo funciona
3. Revisar `docs/architecture/` para entender el problema
4. Consultar `.dev/lessons_learned/` para problemas similares

**Recuerda**: 🔴 SIEMPRE seguir el proceso de trabajo completo antes de implementar cualquier cambio.