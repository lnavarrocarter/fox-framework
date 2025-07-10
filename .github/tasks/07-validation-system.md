# 📋 Task #07: Sistema de Validación de Datos

## 🎯 Objetivo

Implementar un sistema robusto de validación de datos que soporte esquemas tipados, validación automática de requests, sanitización, y transformación de datos con integración completa al router y middleware.

## 📋 Criterios de Aceptación

### Core Requirements

- [ ] **Schema Validation**: Validación basada en esquemas TypeScript
- [ ] **Request Validation**: Validación automática de body, query, params
- [ ] **Response Validation**: Validación opcional de responses
- [ ] **Custom Validators**: Soporte para validadores personalizados
- [ ] **Data Sanitization**: Limpieza automática de datos de entrada
- [ ] **Transformation**: Transformación de tipos y formatos
- [ ] **Error Messages**: Mensajes de error claros y localizados

### Integration Requirements

- [ ] **Middleware Integration**: Middleware de validación automática
- [ ] **Router Integration**: Validación integrada en rutas
- [ ] **Type Safety**: Tipos TypeScript derivados de esquemas
- [ ] **OpenAPI Support**: Generación automática de documentación

### Quality Requirements

- [ ] **Performance**: Validación eficiente sin impacto significativo
- [ ] **Tests**: Cobertura >90% del sistema de validación
- [ ] **Documentation**: Guías completas y ejemplos
- [ ] **Error Handling**: Integración con sistema de errores

## 🏗️ Arquitectura Propuesta

### Estructura de Archivos

```
tsfox/core/features/validation/
├── validation.factory.ts      # Factory principal
├── schema/
│   ├── schema.builder.ts      # Constructor de esquemas
│   ├── schema.parser.ts       # Parser de esquemas
│   └── schema.types.ts        # Tipos de esquemas
├── validators/
│   ├── string.validator.ts    # Validadores de string
│   ├── number.validator.ts    # Validadores numéricos
│   ├── object.validator.ts    # Validadores de objetos
│   └── custom.validator.ts    # Validadores personalizados
├── middleware/
│   ├── request.middleware.ts  # Validación de requests
│   └── response.middleware.ts # Validación de responses
├── interfaces/
│   ├── validation.interface.ts # Contratos principales
│   └── schema.interface.ts     # Interface de esquemas
└── errors/
    └── validation.errors.ts    # Errores específicos
```

### Interfaces Principales

```typescript
// validation.interface.ts
export interface ValidationInterface {
  validate<T>(data: unknown, schema: Schema<T>): ValidationResult<T>;
  validateAsync<T>(data: unknown, schema: Schema<T>): Promise<ValidationResult<T>>;
  sanitize<T>(data: unknown, schema: Schema<T>): T;
  transform<T, U>(data: T, transformer: Transformer<T, U>): U;
}

export interface SchemaInterface<T = any> {
  validate(data: unknown): ValidationResult<T>;
  sanitize(data: unknown): T;
  describe(): SchemaDescription;
  optional(): SchemaInterface<T | undefined>;
  required(): SchemaInterface<T>;
  default(value: T): SchemaInterface<T>;
}

export interface ValidatorInterface<T = any> {
  validate(value: unknown): ValidationResult<T>;
  message?: string;
  code?: string;
}
```

### Tipos y Configuración

```typescript
// schema.types.ts
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
  value?: unknown;
}

export interface SchemaDescription {
  type: string;
  required: boolean;
  constraints?: Record<string, any>;
  children?: Record<string, SchemaDescription>;
}

export interface ValidationConfig {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  context?: Record<string, any>;
}

export type Schema<T> = SchemaInterface<T>;
export type Transformer<T, U> = (value: T) => U;
```

## 💻 Ejemplos de Implementación

### Schema Builder

```typescript
// schema.builder.ts
export class SchemaBuilder {
  static string(): StringSchema {
    return new StringSchema();
  }

  static number(): NumberSchema {
    return new NumberSchema();
  }

  static object<T extends Record<string, any>>(
    shape: { [K in keyof T]: Schema<T[K]> }
  ): ObjectSchema<T> {
    return new ObjectSchema(shape);
  }

  static array<T>(item: Schema<T>): ArraySchema<T[]> {
    return new ArraySchema(item);
  }
}

// Esquemas específicos
export class StringSchema implements SchemaInterface<string> {
  private constraints: StringConstraints = {};

  min(length: number): this {
    this.constraints.min = length;
    return this;
  }

  max(length: number): this {
    this.constraints.max = length;
    return this;
  }

  email(): this {
    this.constraints.email = true;
    return this;
  }

  pattern(regex: RegExp): this {
    this.constraints.pattern = regex;
    return this;
  }

  validate(data: unknown): ValidationResult<string> {
    if (typeof data !== 'string') {
      return {
        success: false,
        errors: [{ 
          path: [], 
          message: 'Expected string', 
          code: 'string.base',
          value: data 
        }]
      };
    }

    const errors: ValidationError[] = [];

    if (this.constraints.min && data.length < this.constraints.min) {
      errors.push({
        path: [],
        message: `String must be at least ${this.constraints.min} characters`,
        code: 'string.min',
        value: data
      });
    }

    if (this.constraints.email && !this.isValidEmail(data)) {
      errors.push({
        path: [],
        message: 'Invalid email format',
        code: 'string.email',
        value: data
      });
    }

    return errors.length > 0 
      ? { success: false, errors }
      : { success: true, data };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### Request Validation Middleware

```typescript
// middleware/request.middleware.ts
export interface ValidationSchemas {
  body?: Schema<any>;
  query?: Schema<any>;
  params?: Schema<any>;
  headers?: Schema<any>;
}

export function validateRequest(schemas: ValidationSchemas) {
  return async (req: any, res: any, next: any) => {
    const errors: ValidationError[] = [];

    // Validate body
    if (schemas.body && req.body) {
      const result = schemas.body.validate(req.body);
      if (!result.success) {
        errors.push(...result.errors!.map(e => ({
          ...e,
          path: ['body', ...e.path]
        })));
      } else {
        req.body = result.data;
      }
    }

    // Validate query
    if (schemas.query && req.query) {
      const result = schemas.query.validate(req.query);
      if (!result.success) {
        errors.push(...result.errors!.map(e => ({
          ...e,
          path: ['query', ...e.path]
        })));
      } else {
        req.query = result.data;
      }
    }

    // Validate params
    if (schemas.params && req.params) {
      const result = schemas.params.validate(req.params);
      if (!result.success) {
        errors.push(...result.errors!.map(e => ({
          ...e,
          path: ['params', ...e.path]
        })));
      } else {
        req.params = result.data;
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Request validation failed', errors);
    }

    next();
  };
}
```

### Router Integration

```typescript
// Uso en router
const userSchema = SchemaBuilder.object({
  name: SchemaBuilder.string().min(2).max(50),
  email: SchemaBuilder.string().email(),
  age: SchemaBuilder.number().min(18).max(120).optional(),
  preferences: SchemaBuilder.object({
    theme: SchemaBuilder.string().oneOf(['light', 'dark']),
    notifications: SchemaBuilder.boolean().default(true)
  }).optional()
});

router.post('/users', 
  validateRequest({
    body: userSchema
  }),
  async (req, res) => {
    // req.body está tipado y validado
    const user = await userService.create(req.body);
    res.json(user);
  }
);

router.get('/users/:id',
  validateRequest({
    params: SchemaBuilder.object({
      id: SchemaBuilder.string().uuid()
    }),
    query: SchemaBuilder.object({
      include: SchemaBuilder.array(
        SchemaBuilder.string()
      ).optional()
    })
  }),
  async (req, res) => {
    const user = await userService.findById(
      req.params.id, 
      { include: req.query.include }
    );
    res.json(user);
  }
);
```

## 🧪 Plan de Testing

### Tests Unitarios

```typescript
// __tests__/schema.builder.test.ts
describe('SchemaBuilder', () => {
  describe('StringSchema', () => {
    test('should validate string type', () => {
      const schema = SchemaBuilder.string();
      const result = schema.validate('hello');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    test('should fail for non-string values', () => {
      const schema = SchemaBuilder.string();
      const result = schema.validate(123);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe('string.base');
    });

    test('should validate email format', () => {
      const schema = SchemaBuilder.string().email();
      
      expect(schema.validate('test@example.com').success).toBe(true);
      expect(schema.validate('invalid-email').success).toBe(false);
    });

    test('should validate string length', () => {
      const schema = SchemaBuilder.string().min(3).max(10);
      
      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate('hi').success).toBe(false);
      expect(schema.validate('very long string').success).toBe(false);
    });
  });

  describe('ObjectSchema', () => {
    test('should validate object structure', () => {
      const schema = SchemaBuilder.object({
        name: SchemaBuilder.string().min(2),
        age: SchemaBuilder.number().min(0)
      });

      const result = schema.validate({
        name: 'John',
        age: 25
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 25 });
    });

    test('should collect multiple validation errors', () => {
      const schema = SchemaBuilder.object({
        name: SchemaBuilder.string().min(2),
        email: SchemaBuilder.string().email()
      });

      const result = schema.validate({
        name: 'J',
        email: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
});
```

### Tests de Integración

```typescript
// __tests__/integration/validation.middleware.test.ts
describe('Validation Middleware Integration', () => {
  let app: any;

  beforeEach(() => {
    app = createFoxApp();
    
    app.post('/test',
      validateRequest({
        body: SchemaBuilder.object({
          name: SchemaBuilder.string().min(2),
          email: SchemaBuilder.string().email()
        })
      }),
      (req: any, res: any) => {
        res.json({ success: true, data: req.body });
      }
    );
  });

  test('should accept valid data', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        name: 'John Doe',
        email: 'john@example.com'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('should reject invalid data', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        name: 'J',
        email: 'invalid-email'
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveLength(2);
  });

  test('should sanitize and transform data', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        name: '  John Doe  ',
        email: 'JOHN@EXAMPLE.COM',
        extra: 'should be removed'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('John Doe');
    expect(response.body.data.email).toBe('john@example.com');
    expect(response.body.data.extra).toBeUndefined();
  });
});
```

## 📊 Performance Benchmarks

### Performance Targets

- **Simple validation**: <0.1ms per field
- **Complex objects**: <1ms for nested structures
- **Array validation**: <0.01ms per item
- **Memory usage**: <1MB for schema cache

### Benchmark Suite

```typescript
// __tests__/benchmarks/validation.benchmark.ts
describe('Validation Performance', () => {
  test('string validation performance', () => {
    const schema = SchemaBuilder.string().email();
    const iterations = 100000;
    
    const start = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      schema.validate('test@example.com');
    }
    
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6;
    
    console.log(`String validation: ${duration}ms for ${iterations} operations`);
    expect(duration).toBeLessThan(100); // <100ms for 100k validations
  });

  test('complex object validation performance', () => {
    const schema = SchemaBuilder.object({
      user: SchemaBuilder.object({
        name: SchemaBuilder.string().min(2).max(50),
        email: SchemaBuilder.string().email(),
        age: SchemaBuilder.number().min(0).max(120)
      }),
      preferences: SchemaBuilder.object({
        theme: SchemaBuilder.string().oneOf(['light', 'dark']),
        notifications: SchemaBuilder.boolean()
      }),
      tags: SchemaBuilder.array(SchemaBuilder.string())
    });

    const testData = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      },
      preferences: {
        theme: 'dark',
        notifications: true
      },
      tags: ['developer', 'typescript', 'node.js']
    };

    const iterations = 10000;
    const start = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      schema.validate(testData);
    }
    
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6;
    
    console.log(`Complex validation: ${duration}ms for ${iterations} operations`);
    expect(duration).toBeLessThan(1000); // <1s for 10k validations
  });
});
```

## 🔧 Configuración y Uso

### Configuración Global

```typescript
// Configuración en fox app
const app = createFoxApp({
  validation: {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    customValidators: {
      creditCard: (value: string) => {
        // Custom credit card validation
        return /^\d{16}$/.test(value);
      }
    }
  }
});
```

### Validadores Personalizados

```typescript
// Custom validators
const customSchema = SchemaBuilder.string().custom(
  (value: string) => {
    if (value.includes('forbidden')) {
      throw new Error('Value contains forbidden word');
    }
    return value.toUpperCase();
  },
  'No forbidden words allowed'
);

// Async validators
const asyncSchema = SchemaBuilder.string().customAsync(
  async (value: string) => {
    const exists = await userService.emailExists(value);
    if (exists) {
      throw new Error('Email already exists');
    }
    return value;
  }
);
```

## 📝 Documentación

### API Reference

- Documentar todos los tipos de schema disponibles
- Ejemplos de validadores built-in y personalizados
- Guía de integración con router y middleware
- Referencia de códigos de error

### Best Practices Guide

- Cuándo usar cada tipo de validación
- Estrategias de performance para validaciones complejas
- Manejo de errores y mensajes localizados
- Testing de esquemas de validación

## ✅ Definition of Done

- [ ] Todos los tipos de schema implementados (string, number, boolean, object, array)
- [ ] Middleware de validación de requests funcionando
- [ ] Integración con router completada
- [ ] Validadores personalizados soportados
- [ ] Tests unitarios con >90% cobertura
- [ ] Tests de integración funcionando
- [ ] Benchmarks de performance documentados
- [ ] Documentación completa y ejemplos
- [ ] Error handling integrado con sistema global

## 🔗 Dependencias

### Precedentes

- [03-error-handling.md](./03-error-handling.md) - Para tipos de errores de validación
- [04-logging-system.md](./04-logging-system.md) - Para logging de errores de validación

### Dependientes

- [11-database-abstraction.md](./11-database-abstraction.md) - Validación de modelos de datos
- [12-cli-improvements.md](./12-cli-improvements.md) - Generación de esquemas de validación

## 📅 Estimación

**Tiempo estimado**: 5-6 días  
**Complejidad**: Alta  
**Prioridad**: Importante

## 📊 Métricas de Éxito

- Performance <1ms para validaciones complejas
- >95% de casos de validación cubiertos
- Reducción >80% en errores de datos en runtime
- Integration sin breaking changes con código existente
