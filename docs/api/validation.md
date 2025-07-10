# 🦊 Fox Framework - Validation API Reference

## 📋 Overview

El sistema de validación de Fox Framework proporciona una API fluent y type-safe para validar datos de entrada y salida en aplicaciones web.

## 🎯 Features Principales

- ✅ **Fluent API**: Sintaxis encadenable e intuitiva
- ✅ **Type Safety**: Integración completa con TypeScript
- ✅ **Extensible**: Validadores personalizados y transformaciones
- ✅ **Performance**: Validación lazy y optimizada
- ✅ **Error Handling**: Errores detallados con códigos estructurados

## 🚀 Quick Start

```typescript
import { SchemaBuilder } from 'tsfox/core/features/validation';

// Validación básica de string
const userSchema = SchemaBuilder.object({
  name: SchemaBuilder.string().min(2).max(50),
  email: SchemaBuilder.string().email(),
  age: SchemaBuilder.number().min(18).max(120)
});

const result = userSchema.validate({
  name: "John Doe",
  email: "john@example.com", 
  age: 25
});

if (result.success) {
  console.log("Valid data:", result.data);
} else {
  console.log("Validation errors:", result.errors);
}
```

## 📚 API Reference

### SchemaBuilder

Factory principal para crear schemas de validación.

#### Static Methods

##### `string(): StringSchema`

Crea un validador de string con métodos encadenables.

```typescript
const schema = SchemaBuilder.string()
  .min(3)
  .max(100)
  .email()
  .trim();
```

**Métodos disponibles:**
- `min(length: number)` - Longitud mínima
- `max(length: number)` - Longitud máxima  
- `length(length: number)` - Longitud exacta
- `email()` - Formato de email válido
- `url()` - Formato de URL válido
- `uuid()` - Formato UUID válido
- `regex(pattern: RegExp, code?: string)` - Patrón personalizado
- `trim()` - Eliminar espacios en blanco
- `lowercase()` - Convertir a minúsculas
- `uppercase()` - Convertir a mayúsculas
- `transform(fn: (value: string) => string)` - Transformación personalizada
- `refine(predicate: (value: string) => boolean, code?: string, message?: string)` - Validación personalizada

##### `number(): NumberSchema`

Crea un validador de números.

```typescript
const schema = SchemaBuilder.number()
  .min(0)
  .max(100)
  .integer()
  .positive();
```

**Métodos disponibles:**
- `min(value: number)` - Valor mínimo
- `max(value: number)` - Valor máximo
- `integer()` - Debe ser entero
- `positive()` - Debe ser positivo
- `negative()` - Debe ser negativo
- `finite()` - Debe ser finito

##### `object(shape?: Record<string, SchemaInterface>): ObjectSchema`

Crea un validador de objetos.

```typescript
const schema = SchemaBuilder.object({
  id: SchemaBuilder.string().uuid(),
  profile: SchemaBuilder.object({
    name: SchemaBuilder.string().min(1),
    settings: SchemaBuilder.object({
      theme: SchemaBuilder.enum(['light', 'dark'])
    })
  })
});
```

##### `array(item?: SchemaInterface): ArraySchema`

Crea un validador de arrays.

```typescript
const schema = SchemaBuilder.array(SchemaBuilder.string())
  .min(1)
  .max(10)
  .unique();
```

**Métodos disponibles:**
- `items(schema: SchemaInterface)` - Tipo de elementos
- `min(length: number)` - Longitud mínima
- `max(length: number)` - Longitud máxima
- `length(length: number)` - Longitud exacta
- `unique()` - Elementos únicos

##### `boolean(): BooleanSchema`

Crea un validador de booleanos.

```typescript
const schema = SchemaBuilder.boolean();
```

##### `literal(value: string | number | boolean): LiteralSchema`

Crea un validador de valor literal.

```typescript
const schema = SchemaBuilder.literal('admin');
```

##### `union(...schemas: SchemaInterface[]): UnionSchema`

Crea un validador de unión (uno de varios tipos).

```typescript
const schema = SchemaBuilder.union(
  SchemaBuilder.string(),
  SchemaBuilder.number(),
  SchemaBuilder.boolean()
);
```

##### `enum(values: (string | number)[]): EnumSchema`

Crea un validador de enumeración.

```typescript
const schema = SchemaBuilder.enum(['red', 'green', 'blue']);
```

##### `optional(schema: SchemaInterface): OptionalSchema`

Hace un schema opcional (permite undefined).

```typescript
const schema = SchemaBuilder.optional(SchemaBuilder.string());
```

##### `nullable(schema: SchemaInterface): NullableSchema`

Hace un schema nullable (permite null).

```typescript
const schema = SchemaBuilder.nullable(SchemaBuilder.string());
```

## 🔧 Métodos Comunes

Todos los schemas heredan estos métodos de `BaseSchema`:

### `validate(data: unknown): ValidationResult<T>`

Valida datos y retorna el resultado.

```typescript
const result = schema.validate(data);

if (result.success) {
  // result.data contiene los datos validados y transformados
  console.log(result.data);
} else {
  // result.errors contiene los errores de validación
  result.errors?.forEach(error => {
    console.log(`${error.path.join('.')}: ${error.message} (${error.code})`);
  });
}
```

### `optional(): this`

Marca el schema como opcional.

```typescript
const schema = SchemaBuilder.string().optional();
```

### `required(): this`

Marca el schema como requerido (default).

```typescript
const schema = SchemaBuilder.string().required();
```

### `default(value: T): this`

Establece un valor por defecto.

```typescript
const schema = SchemaBuilder.string().default('hello');
```

## 🎨 Validation Result

### `ValidationResult<T>`

```typescript
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}
```

### `ValidationError`

```typescript
interface ValidationError {
  path: string[];
  message: string;
  code: string;
  value: unknown;
}
```

## 📊 Error Codes

### String Validation
- `type_mismatch` - No es un string
- `min_length` - Longitud menor a la mínima
- `max_length` - Longitud mayor a la máxima
- `exact_length` - Longitud no coincide exactamente
- `invalid_email` - Formato de email inválido
- `invalid_url` - Formato de URL inválido
- `invalid_uuid` - Formato UUID inválido
- `pattern_mismatch` - No coincide con el patrón regex

### Number Validation
- `type_mismatch` - No es un número
- `min_value` - Valor menor al mínimo
- `max_value` - Valor mayor al máximo
- `not_integer` - No es un entero
- `not_positive` - No es positivo
- `not_negative` - No es negativo
- `not_finite` - No es finito

### General
- `required` - Campo requerido faltante

## 🔀 Configuración

### Validation Config

```typescript
interface ValidationConfig {
  abortEarly?: boolean;     // Parar en el primer error (default: false)
  allowUnknown?: boolean;   // Permitir propiedades desconocidas (default: false)
  stripUnknown?: boolean;   // Eliminar propiedades desconocidas (default: false)
  convert?: boolean;        // Convertir tipos automáticamente (default: false)
}
```

### Configurar Validación

```typescript
const result = schema.validate(data, {
  abortEarly: true,
  stripUnknown: true,
  convert: true
});
```

## 🛠️ Advanced Usage

### Custom Validators

```typescript
const passwordSchema = SchemaBuilder.string()
  .min(8)
  .refine(
    (value) => /[A-Z]/.test(value),
    'MISSING_UPPERCASE',
    'Password must contain uppercase letter'
  )
  .refine(
    (value) => /[0-9]/.test(value),
    'MISSING_NUMBER', 
    'Password must contain a number'
  );
```

### Transformations

```typescript
const nameSchema = SchemaBuilder.string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' ')) // Normalizar espacios
  .transform((value) => value.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') // Title Case
  );
```

### Complex Objects

```typescript
const apiResponseSchema = SchemaBuilder.object({
  success: SchemaBuilder.boolean(),
  data: SchemaBuilder.union(
    SchemaBuilder.object({
      users: SchemaBuilder.array(SchemaBuilder.object({
        id: SchemaBuilder.string().uuid(),
        name: SchemaBuilder.string().min(1),
        email: SchemaBuilder.string().email(),
        role: SchemaBuilder.enum(['admin', 'user', 'moderator'])
      }))
    }),
    SchemaBuilder.null()
  ),
  error: SchemaBuilder.optional(SchemaBuilder.object({
    code: SchemaBuilder.string(),
    message: SchemaBuilder.string()
  }))
});
```

## 🧪 Testing

```typescript
import { SchemaBuilder } from 'tsfox/core/features/validation';

describe('User Validation', () => {
  const userSchema = SchemaBuilder.object({
    name: SchemaBuilder.string().min(2),
    email: SchemaBuilder.string().email()
  });

  it('should validate correct user data', () => {
    const result = userSchema.validate({
      name: 'John',
      email: 'john@example.com'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'John',
      email: 'john@example.com'
    });
  });

  it('should reject invalid email', () => {
    const result = userSchema.validate({
      name: 'John',
      email: 'invalid-email'
    });
    
    expect(result.success).toBe(false);
    expect(result.errors?.[0].code).toBe('invalid_email');
  });
});
```

## 🔗 Integration

### Express Middleware

```typescript
import { validationMiddleware } from 'tsfox/core/middleware';

const userSchema = SchemaBuilder.object({
  name: SchemaBuilder.string().min(2),
  email: SchemaBuilder.string().email()
});

app.post('/users', 
  validationMiddleware.body(userSchema),
  (req, res) => {
    // req.body is now typed and validated
    const user = req.body; // Type: { name: string; email: string }
    res.json({ success: true, user });
  }
);
```

### Query Parameters

```typescript
const querySchema = SchemaBuilder.object({
  page: SchemaBuilder.number().min(1).default(1),
  limit: SchemaBuilder.number().min(1).max(100).default(10),
  search: SchemaBuilder.optional(SchemaBuilder.string().min(1))
});

app.get('/users',
  validationMiddleware.query(querySchema),
  (req, res) => {
    const { page, limit, search } = req.query;
    // Fully typed and validated query parameters
  }
);
```
