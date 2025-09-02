# 🔧 Task 01: Arreglar Dependencias y Configuración

## 📋 Información General

- **ID**: 01
- **Título**: Arreglar Dependencias y Configuración Base
- **Prioridad**: 🔴 Crítica
- **Estimación**: 4-6 horas
- **Asignado**: Developer
- **Estado**: ✅ Completado

## 🎯 Objetivo

Resolver los conflictos de dependencias actuales y establecer una configuración base estable para el desarrollo y testing del framework.

## 📄 Descripción

El proyecto actualmente tiene conflictos de dependencias que impiden ejecutar tests y pueden causar problemas de compatibilidad. Es necesario actualizar y armonizar las dependencias para crear una base estable.

## 🔍 Problema Actual

```bash
npm error Could not resolve dependency:
npm error peer typescript@">=3.8 <5.0" from ts-jest@27.1.5
npm error Conflicting peer dependency: typescript@4.9.5
```

- TypeScript 5.0.4 vs ts-jest que requiere <5.0
- Tests no ejecutables
- Configuración Jest desactualizada
- Posibles incompatibilidades futuras

## ✅ Criterios de Aceptación

### 1. Dependencias Resueltas
- [x] `npm install` ejecuta sin errores
- [x] No hay conflictos de peer dependencies
- [x] TypeScript y Jest compatibles
- [x] Todas las dependencias actualizadas a versiones estables

### 2. Tests Funcionando
- [x] `npm test` ejecuta correctamente
- [x] Jest configurado correctamente
- [x] Tests existentes pasan
- [x] Coverage reports generándose

### 3. Configuración Base
- [x] `tsconfig.json` optimizado
- [x] `jest.config.ts` configurado correctamente
- [x] Scripts de npm actualizados
- [ ] ESLint/Prettier configurados (opcional)

### 4. Documentación
- [ ] `package.json` documentado
- [ ] Dependencias justificadas
- [ ] Comandos de desarrollo documentados

## 🛠️ Tareas Específicas

### 1. Análisis de Dependencias
```bash
# Revisar dependencias actuales
npm ls
npm audit

# Verificar compatibilidad
npm outdated
```

### 2. Actualización de package.json
```json
{
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.8",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.2",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1"
  }
}
```

### 3. Configuración Jest
```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tsfox'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'tsfox/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};

export default config;
```

### 4. Actualización tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "src/**/*",
    "tsfox/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.test.ts"
  ]
}
```

### 5. Scripts de NPM Mejorados
```json
{
  "scripts": {
    "start": "ts-node src/server/index.ts",
    "dev": "nodemon --watch 'src/**/*.ts' --watch 'tsfox/**/*.ts' --exec 'ts-node' src/server/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "clean": "rm -rf dist coverage"
  }
}
```

## 🧪 Plan de Testing

### 1. Verificación Básica
```bash
# Instalar dependencias
npm install

# Verificar TypeScript
npx tsc --noEmit

# Ejecutar tests
npm test

# Verificar desarrollo
npm run dev
```

### 2. Tests de Compatibilidad
- [ ] Node.js versiones soportadas (16, 18, 20)
- [ ] TypeScript compilation exitosa
- [ ] Jest tests ejecutándose
- [ ] Hot reload funcionando

## 📊 Definición de Done

- [ ] `npm install` sin errores ni warnings críticos
- [ ] `npm test` ejecuta y pasa todos los tests
- [ ] `npm run dev` inicia servidor correctamente
- [ ] `npm run build` genera distribución sin errores
- [ ] Documentación actualizada en README
- [ ] No dependencias de seguridad vulnerables (`npm audit`)

## 📝 Notas de Implementación

### Consideraciones Especiales
- Mantener compatibilidad con Node.js LTS
- Priorizar estabilidad sobre features nuevas
- Documentar decisiones de versiones
- Considerar lockfile (package-lock.json)

### Dependencias Críticas
```
express: ^4.18.2       # HTTP framework base
typescript: ^5.3.2     # Lenguaje principal  
jest: ^29.7.0          # Testing framework
ts-jest: ^29.1.1       # TypeScript Jest preset
commander: ^12.1.0     # CLI framework
```

### Orden de Implementación
1. Actualizar TypeScript y Jest a versiones compatibles
2. Actualizar jest.config.ts
3. Verificar tsconfig.json
4. Actualizar scripts npm
5. Instalar y verificar
6. Ejecutar tests existentes
7. Documentar cambios

## 🔗 Dependencias

- **Bloqueante para**: Task 02 (Tests), Task 03 (Error Handling)
- **Depende de**: Ninguna
- **Relacionada con**: Todas las tareas subsecuentes

## 📚 Referencias

- [TypeScript/Jest Compatibility](https://jestjs.io/docs/getting-started#using-typescript)
- [Express TypeScript Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js LTS Schedule](https://nodejs.org/en/about/releases/)
