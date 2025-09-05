# Custom Prompts for Fox Framework AI

El sistema de IA del Fox Framework ahora soporta prompts personalizados y configuración de estilos de código, permitiendo a los desarrolladores especificar reglas y patrones específicos para la generación de código.

## Características Principales

### 1. Prompts Personalizados
- Permite especificar instrucciones adicionales para la generación de código
- Soporta prompts específicos por tipo de componente (controller, middleware, route, model)
- Integración completa con el CLI interactivo
- Almacenamiento en archivos de configuración

### 2. Configuración de Estilo de Código
- Configuración de indentación (espacios vs tabs)
- Estilo de comillas (simples vs dobles)
- Convenciones de nomenclatura personalizables
- Patrones arquitectónicos configurables
- Reglas de formateo específicas

## Uso desde CLI Interactivo

### Generar Controller con Prompt Personalizado

```bash
# Modo interactivo con prompts personalizados
node tsfox/cli/index.js ai:generate controller --interactive

# El sistema preguntará:
# - ¿Usar prompt personalizado? (y/n)
# - Editor de texto se abrirá para escribir el prompt
# - ¿Configurar estilo de código? (y/n)
# - Opciones de estilo (indentación, comillas, nomenclatura, etc.)
```

### Ejemplo de Prompt Personalizado

```text
Generate a controller following enterprise patterns:
- Use dependency injection with constructor parameters
- Implement comprehensive error handling with custom exceptions
- Add input validation using Zod schemas
- Include structured logging with correlation IDs
- Add OpenAPI/Swagger documentation comments
- Use Result pattern for error handling
- Include unit tests structure comments
```

### Configuración de Estilo

```json
{
  "indentation": "spaces",
  "indentSize": 4,
  "quotes": "single",
  "semicolons": true,
  "naming": {
    "classes": "PascalCase",
    "methods": "camelCase",
    "variables": "camelCase",
    "constants": "UPPER_SNAKE_CASE"
  },
  "patterns": {
    "errorHandling": "result-pattern",
    "validation": "zod",
    "logging": "winston",
    "database": "repository"
  }
}
```

## Uso Programático

### Especificar Prompts en Código

```typescript
import { CodeGeneratorAgent } from 'tsfox/ai/agents/code-generator.agent';

const agent = new CodeGeneratorAgent(config);

const controllerSpec: ControllerSpec = {
  name: 'UserProfile',
  model: 'User',
  actions: [
    { name: 'index', method: 'GET', path: '/' },
    { name: 'show', method: 'GET', path: '/:id' }
  ],
  customPrompt: `
    Generate enterprise-level code with:
    - Dependency injection
    - Custom error handling
    - Comprehensive logging
    - OpenAPI documentation
  `,
  codeStyle: {
    indentation: 'spaces',
    indentSize: 4,
    quotes: 'single',
    semicolons: true,
    naming: {
      classes: 'PascalCase',
      methods: 'camelCase'
    },
    patterns: {
      errorHandling: 'result-pattern',
      validation: 'zod'
    }
  }
};

const result = await agent.generateController(controllerSpec);
```

## Archivo de Configuración

Crear un archivo `fox-ai.config.json` en la raíz del proyecto:

```json
{
  "defaultCustomPrompts": {
    "controller": {
      "customPrompt": "Generate controllers with DDD patterns...",
      "codeStyle": {
        "indentation": "spaces",
        "indentSize": 4,
        "quotes": "single"
      }
    },
    "middleware": {
      "customPrompt": "Create middleware with comprehensive logging...",
      "codeStyle": {
        "indentation": "spaces",
        "indentSize": 2
      }
    }
  }
}
```

## Tipos Soportados

### CustomPromptConfig
```typescript
export interface CustomPromptConfig {
    codeStyle?: CodeStyleRules;
    patterns?: ArchitecturalPatterns;
    constraints?: string[];
    examples?: CodeExample[];
}
```

### CodeStyleRules
```typescript
export interface CodeStyleRules {
    indentation?: 'spaces' | 'tabs';
    indentSize?: number;
    semicolons?: boolean;
    quotes?: 'single' | 'double';
    trailingCommas?: boolean;
    bracketSpacing?: boolean;
    arrowParens?: 'always' | 'avoid';
    naming?: NamingConventions;
    patterns?: ArchitecturalPatterns;
}
```

### NamingConventions
```typescript
export interface NamingConventions {
    classes?: 'PascalCase' | 'camelCase';
    methods?: 'camelCase' | 'snake_case';
    variables?: 'camelCase' | 'snake_case';
    constants?: 'UPPER_SNAKE_CASE' | 'UPPER_CAMEL_CASE';
    files?: 'kebab-case' | 'camelCase' | 'PascalCase';
}
```

### ArchitecturalPatterns
```typescript
export interface ArchitecturalPatterns {
    errorHandling?: 'try-catch' | 'result-pattern' | 'either';
    validation?: 'joi' | 'zod' | 'class-validator' | 'custom';
    logging?: 'console' | 'winston' | 'pino' | 'custom';
    database?: 'repository' | 'active-record' | 'data-mapper';
}
```

## Ejemplos de Uso

### 1. Controller Empresarial

```bash
# CLI interactivo
node tsfox/cli/index.js ai:generate controller UserManagement --interactive

# Prompt personalizado:
# "Generate a controller following Domain-Driven Design patterns. 
# Use repository pattern, include comprehensive error handling, 
# and add OpenAPI documentation."
```

### 2. Middleware de Seguridad

```bash
# Generar middleware con logging avanzado
node tsfox/cli/index.js ai:generate middleware Security --interactive

# Prompt personalizado:
# "Create security middleware with rate limiting, request validation, 
# and comprehensive audit logging."
```

### 3. Modelo con Validación

```bash
# Modelo con validaciones complejas
node tsfox/cli/index.js ai:generate model Customer --interactive

# Prompt personalizado:
# "Generate a model with Zod validation, audit fields, 
# soft delete functionality, and relationship management."
```

## Ventajas

1. **Flexibilidad**: Adapta la generación de código a patrones específicos del proyecto
2. **Consistencia**: Mantiene estilos de código uniformes en todo el proyecto
3. **Productividad**: Reduce tiempo de configuración manual post-generación
4. **Calidad**: Aplica mejores prácticas desde el inicio
5. **Escalabilidad**: Soporta proyectos empresariales con reglas complejas

## Limitaciones Actuales

- Los prompts personalizados están limitados por el contexto del modelo de IA
- La validación de estilos se aplica a nivel de prompt, no hay post-procesamiento automático
- Requiere conocimiento de los patrones soportados por el framework

## Próximas Mejoras

- [ ] Validación automática de código generado contra reglas de estilo
- [ ] Plantillas de prompts predefinidas para patrones comunes
- [ ] Integración con linters y formatters
- [ ] Soporte para prompts de equipos/organizaciones
- [ ] Editor visual para configuración de estilos
