# 🚀 API Reference - Fox Framework

## 📋 Índice

- [Core API](#core-api)
- [Server API](#server-api)
- [Router API](#router-api)
- [Template Engine API](#template-engine-api)
- [Validation API](#validation-api)
- [CLI API](#cli-api)
- [Types & Interfaces](#types--interfaces)

## 🔧 Core API

### startServer(config: ServerConfig): void

Inicia una nueva instancia del servidor Fox Framework.

```typescript
import { startServer } from 'fox-framework';

const config = {
    port: 3000,
    env: 'development',
    jsonSpaces: 2,
    staticFolder: 'public'
};

startServer(config);
```

**Parámetros:**
- `config: ServerConfig` - Configuración del servidor

**Ejemplo:**
```typescript
const server = startServer({
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jsonSpaces: 4,
    staticFolder: 'assets',
    middlewares: [
        corsMiddleware(),
        authMiddleware()
    ]
});
```

## 🖥️ Server API

### FoxFactory

Factory principal para gestión de instancias de servidor.

#### createInstance(context: ServerConfig): FoxServerInterface

Crea una nueva instancia de servidor.

```typescript
import { FoxFactory } from 'fox-framework';

const server = FoxFactory.createInstance({
    port: 3000,
    env: 'production'
});
```

#### getInstance(): FoxServerInterface

Obtiene la instancia actual del servidor (Singleton).

```typescript
const server = FoxFactory.getInstance();
```

#### listen(): void

Inicia el servidor en el puerto configurado.

```typescript
FoxFactory.listen();
```

## 🛣️ Router API

### HTTP Methods

#### get(path: string, callback: RequestCallback): void

Registra una ruta GET.

```typescript
app.get('/users', (req, res) => {
    res.json({ users: [] });
});
```

#### post(path: string, callback: RequestCallback): void

Registra una ruta POST.

```typescript
app.post('/users', (req, res) => {
    const user = req.body;
    // Crear usuario
    res.status(201).json(user);
});
```

#### put(path: string, callback: RequestCallback): void

Registra una ruta PUT.

```typescript
app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const userData = req.body;
    // Actualizar usuario
    res.json({ id: userId, ...userData });
});
```

#### delete(path: string, callback: RequestCallback): void

Registra una ruta DELETE.

```typescript
app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;
    // Eliminar usuario
    res.status(204).send();
});
```

### Middleware

#### use(middleware: Middleware): void

Registra middleware global.

```typescript
app.use((req, res, next) => {
    console.log(\`\${req.method} \${req.path}\`);
    next();
});
```

## 🎨 Template Engine API

### render(type: string, path: string, callback: ViewCallback): void

Configura renderizado de vistas.

```typescript
// Renderizar template .fox
app.render('fox', '/', (req, res) => {
    res.render('index', { 
        title: 'Fox Framework',
        message: 'Bienvenido' 
    });
});

// Renderizar HTML estático
app.render('html', '/about', (req, res) => {
    res.render('about', { 
        title: 'Acerca de' 
    });
});
```

### Sintaxis de Templates (.fox)

#### Variables
```fox
<h1>{{title}}</h1>
<p>{{message}}</p>
```

#### Condicionales
```fox
{{if user}}
    <p>Bienvenido, {{user.name}}!</p>
{{else}}
    <p>Por favor, inicia sesión</p>
{{/if}}
```

#### Bucles
```fox
{{each items}}
    <div>{{this.name}} - {{this.price}}</div>
{{/each}}
```

## ✅ Validation API

El sistema de validación proporciona una API fluent para validar datos de entrada y salida.

### SchemaBuilder

Factory principal para crear schemas de validación.

```typescript
import { SchemaBuilder } from 'tsfox/core/features/validation';

// Validación de string
const nameSchema = SchemaBuilder.string().min(2).max(50);

// Validación de objeto
const userSchema = SchemaBuilder.object({
  name: SchemaBuilder.string().min(2),
  email: SchemaBuilder.string().email(),
  age: SchemaBuilder.number().min(18)
});

// Validar datos
const result = userSchema.validate(userData);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.log('Errors:', result.errors);
}
```

### Validators Disponibles

- **string()** - Validación de strings con métodos: min, max, email, url, regex, transform
- **number()** - Validación de números con métodos: min, max, integer, positive
- **object()** - Validación de objetos con shape personalizable
- **array()** - Validación de arrays con validación de elementos
- **boolean()** - Validación de booleanos
- **literal()** - Validación de valores literales específicos
- **union()** - Validación de múltiples tipos (OR)
- **enum()** - Validación de enumeraciones

Ver [documentación completa de validación](./validation.md) para detalles.

## 🔧 CLI API

### Comandos Disponibles

#### generate:controller <name>

Genera un nuevo controlador.

```bash
npx tsfox generate:controller UserController
```

**Genera:**
```typescript
// controllers/UserController.ts
export class UserController {
    public index(req: Request, res: Response): void {
        res.json({ message: 'UserController index' });
    }
    
    public show(req: Request, res: Response): void {
        const id = req.params.id;
        res.json({ id, message: 'UserController show' });
    }
    
    public create(req: Request, res: Response): void {
        res.json({ message: 'UserController create' });
    }
    
    public update(req: Request, res: Response): void {
        const id = req.params.id;
        res.json({ id, message: 'UserController update' });
    }
    
    public delete(req: Request, res: Response): void {
        const id = req.params.id;
        res.json({ id, message: 'UserController delete' });
    }
}
```

#### generate:model <name>

Genera un nuevo modelo.

```bash
npx tsfox generate:model User
```

#### generate:view <name>

Genera una nueva vista.

```bash
npx tsfox generate:view users/index
```

## 📊 Types & Interfaces

### ServerConfig

```typescript
interface ServerConfig {
    port: number;
    env: string;
    jsonSpaces: number;
    staticFolder: string;
    middlewares?: Middleware[];
    providers?: Provider[];
    views?: ViewConfig[];
    requests?: RouteConfig[];
}
```

### RequestCallback

```typescript
type RequestCallback = (
    req: Request, 
    res: Response, 
    next: NextFunction
) => void;
```

### ViewCallback

```typescript
type ViewCallback = (
    req: Request, 
    res: Response
) => void;
```

### Route

```typescript
interface Route {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handler: RequestCallback;
}
```

### Middleware

```typescript
interface Middleware {
    (req: Request, res: Response, next: () => void): void;
}
```

### HttpError

```typescript
class HttpError extends Error {
    constructor(public status: number, message: string);
}
```

## 🎯 Ejemplos Completos

### Aplicación Básica

```typescript
import { startServer } from 'fox-framework';

const config = {
    port: 3000,
    env: 'development',
    jsonSpaces: 2,
    staticFolder: 'public',
    requests: [
        {
            method: 'GET',
            path: '/api/users',
            callback: (req, res) => {
                res.json({ users: ['Alice', 'Bob'] });
            }
        }
    ],
    views: [
        {
            type: 'fox',
            path: '/',
            callback: (req, res) => {
                res.render('index', { 
                    title: 'Mi App',
                    users: ['Alice', 'Bob']
                });
            }
        }
    ]
};

startServer(config);
```

### Con Middleware

```typescript
import { startServer, HttpError } from 'fox-framework';

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        throw new HttpError(401, 'Token requerido');
    }
    next();
};

const config = {
    port: 3000,
    env: 'production',
    middlewares: [authMiddleware],
    requests: [
        {
            method: 'GET',
            path: '/api/protected',
            callback: (req, res) => {
                res.json({ message: 'Datos protegidos' });
            }
        }
    ]
};

startServer(config);
```

## 🔍 Error Handling

### HttpError

```typescript
import { HttpError } from 'fox-framework';

app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    
    if (!userId) {
        throw new HttpError(400, 'ID de usuario requerido');
    }
    
    const user = findUser(userId);
    if (!user) {
        throw new HttpError(404, 'Usuario no encontrado');
    }
    
    res.json(user);
});
```

### Error Middleware

```typescript
const errorHandler = (err, req, res, next) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({
            error: err.message,
            status: err.status
        });
    } else {
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};

app.use(errorHandler);
```

## 🛡️ Security API

Fox Framework proporciona un sistema de seguridad completo e integrado que incluye autenticación, autorización, protección CSRF, CORS, rate limiting y más.

### Security Factory

Factory principal para configurar y gestionar el sistema de seguridad.

```typescript
import { SecurityFactory } from 'fox-framework';

// Configuración básica de seguridad
const basicSecurity = SecurityFactory.createBasic({
  enableCors: true,
  enableRateLimit: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por ventana
  }
});

// Configuración completa de seguridad
const fullSecurity = SecurityFactory.createFull({
  cors: {
    origin: ['http://localhost:3000', 'https://myapp.com'],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  csrf: {
    cookie: { name: '_csrf', httpOnly: true }
  },
  jwt: {
    secret: 'my-secret-key',
    expiresIn: '1h'
  }
});

// Aplicar al servidor
app.use(basicSecurity);
```

### CORS Middleware

Configuración de Cross-Origin Resource Sharing.

```typescript
import { SecurityMiddleware } from 'fox-framework';

// CORS básico
app.use(SecurityMiddleware.cors({
  origin: true,
  credentials: false
}));

// CORS avanzado
app.use(SecurityMiddleware.cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'https://myapp.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count']
}));
```

### Rate Limiting

Protección contra ataques de fuerza bruta y uso excesivo.

```typescript
import { SecurityMiddleware } from 'fox-framework';

// Rate limiting básico
app.use(SecurityMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
}));

// Rate limiting avanzado
app.use(SecurityMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    // Diferentes límites por tipo de usuario
    if (req.user?.isPremium) return 1000;
    if (req.user) return 200;
    return 50;
  },
  keyGenerator: (req) => {
    // Usar user ID si está autenticado, sino IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Saltar rate limiting para admins
    return req.user?.role === 'admin';
  }
}));
```

### Security Headers

Configuración automática de headers de seguridad.

```typescript
import { SecurityMiddleware } from 'fox-framework';

// Headers de seguridad básicos
app.use(SecurityMiddleware.securityHeaders());

// Headers personalizados
app.use(SecurityMiddleware.securityHeaders({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.example.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Authentication Middleware

Sistema de autenticación con soporte para múltiples estrategias.

```typescript
import { AuthMiddleware } from 'fox-framework';

// Autenticación JWT
app.use(AuthMiddleware.jwt({
  secret: 'my-jwt-secret',
  algorithms: ['HS256'],
  audience: 'my-app',
  issuer: 'my-app'
}));

// Autenticación básica (username/password)
app.use(AuthMiddleware.basic({
  validate: async (username, password) => {
    const user = await getUserFromDatabase(username);
    return user && await bcrypt.compare(password, user.hashedPassword) ? user : false;
  }
}));

// Autenticación por API Key
app.use(AuthMiddleware.apiKey({
  header: 'X-API-Key',
  validate: async (apiKey) => {
    return await getApiKeyFromDatabase(apiKey);
  }
}));

// Autenticación por sesión
app.use(AuthMiddleware.session({
  secret: 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));
```

### Authorization Middleware

Sistema de autorización basado en roles y permisos.

```typescript
import { AuthorizationMiddleware } from 'fox-framework';

// Autorización por roles
app.get('/admin/*', AuthorizationMiddleware.requireRole(['admin', 'superuser']));

// Autorización por permisos
app.post('/posts', AuthorizationMiddleware.requirePermission('posts:create'));
app.put('/posts/:id', AuthorizationMiddleware.requirePermission('posts:update'));

// RBAC (Role-Based Access Control)
app.use(AuthorizationMiddleware.rbac({
  roles: {
    admin: ['*'],
    editor: ['posts:*', 'comments:*'],
    user: ['posts:read', 'comments:create']
  },
  permissions: {
    'posts:create': 'Crear posts',
    'posts:read': 'Leer posts',
    'posts:update': 'Actualizar posts',
    'posts:delete': 'Eliminar posts'
  }
}));

// Autorización de propiedad (ownership)
app.put('/posts/:id', AuthorizationMiddleware.requireOwnership({
  getResourceId: (req) => req.params.id,
  getOwnerId: (req) => req.user.id,
  validateOwnership: async (resourceId, ownerId) => {
    const post = await getPostById(resourceId);
    return post && post.authorId === ownerId;
  }
}));

// Combinadores de autorización
app.get('/secret', 
  AuthorizationMiddleware.all([
    AuthorizationMiddleware.requireRole(['admin']),
    AuthorizationMiddleware.requirePermission('secrets:read')
  ])
);

app.get('/content',
  AuthorizationMiddleware.any([
    AuthorizationMiddleware.requireRole(['admin']),
    AuthorizationMiddleware.requirePermission('content:read')
  ])
);
```

### CSRF Protection

Protección contra ataques Cross-Site Request Forgery.

```typescript
import { CsrfMiddleware } from 'fox-framework';

// Protección CSRF básica
app.use(CsrfMiddleware.protect());

// Configuración personalizada
app.use(CsrfMiddleware.protect({
  cookie: {
    name: '_csrfToken',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  headerName: 'X-CSRF-Token',
  fieldName: '_csrf'
}));

// Establecer cookie CSRF
app.use(CsrfMiddleware.setCookie());

// En tus templates, el token estará disponible como res.locals.csrfToken
// <input type="hidden" name="_csrf" value="{{ csrfToken }}">
```

### Request Validation

Validación automática de requests con schemas.

```typescript
import { SecurityMiddleware } from 'fox-framework';

// Validación de body JSON
app.post('/users', SecurityMiddleware.validateRequest({
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      age: { type: 'number', minimum: 0, maximum: 120 }
    }
  }
}));

// Validación de parámetros
app.get('/users/:id', SecurityMiddleware.validateRequest({
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    }
  }
}));

// Validación de query strings
app.get('/search', SecurityMiddleware.validateRequest({
  query: {
    type: 'object',
    properties: {
      q: { type: 'string', minLength: 1 },
      page: { type: 'number', minimum: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100 }
    }
  }
}));
```

## 🔍 Validation System API

### ValidationFactory

Factory principal para el sistema de validación de Fox Framework.

```typescript
import { ValidationFactory, SchemaBuilder } from 'fox-framework';

// Usar el schema builder
const userSchema = SchemaBuilder.object({
  name: SchemaBuilder.string().min(2).max(50),
  email: SchemaBuilder.string().email(),
  age: SchemaBuilder.number().min(18).optional()
});

// Validar datos
const result = ValidationFactory.utils.safeParse(userData, userSchema);
if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### SchemaBuilder

Constructor fluido para crear esquemas de validación.

#### String Schemas

```typescript
const nameSchema = SchemaBuilder.string()
  .min(2)
  .max(50)
  .trim()
  .required();

const emailSchema = SchemaBuilder.string()
  .email()
  .lowercase()
  .required();

const phoneSchema = SchemaBuilder.string()
  .pattern(/^\+?[\d\s-()]+$/)
  .optional();
```

#### Number Schemas

```typescript
const ageSchema = SchemaBuilder.number()
  .min(18)
  .max(120)
  .integer()
  .required();

const priceSchema = SchemaBuilder.number()
  .positive()
  .precision(2)
  .required();

const portSchema = SchemaBuilder.number()
  .port()
  .default(3000);
```

#### Object Schemas

```typescript
const userSchema = SchemaBuilder.object({
  id: SchemaBuilder.string().uuid(),
  name: SchemaBuilder.string().min(2).max(50),
  email: SchemaBuilder.string().email(),
  profile: SchemaBuilder.object({
    bio: SchemaBuilder.string().max(500).optional(),
    avatar: SchemaBuilder.string().url().optional()
  }).optional()
});
```

#### Array Schemas

```typescript
const tagsSchema = SchemaBuilder.array(
  SchemaBuilder.string().min(1).max(20)
).min(1).max(10).unique();

const numbersSchema = SchemaBuilder.array(
  SchemaBuilder.number().integer()
).length(5);
```

### Request Validation Middleware

Middleware para validar requests de Express.

```typescript
import { validateRequest, validateBody, SchemaBuilder } from 'fox-framework';

const createUserSchema = SchemaBuilder.object({
  name: SchemaBuilder.string().min(2).max(50),
  email: SchemaBuilder.string().email(),
  password: SchemaBuilder.string().min(8)
});

// Validar solo el body
app.post('/users', 
  validateBody(createUserSchema),
  (req, res) => {
    // req.body está validado y tipado
    const user = req.body;
    res.json({ success: true, user });
  }
);

// Validar múltiples partes del request
app.put('/users/:id',
  validateRequest({
    params: SchemaBuilder.object({
      id: SchemaBuilder.string().uuid()
    }),
    body: updateUserSchema,
    query: SchemaBuilder.object({
      notify: SchemaBuilder.boolean().default(false)
    }).optional()
  }),
  (req, res) => {
    // req.params, req.body y req.query están validados
  }
);
```

### Response Validation Middleware

Middleware para validar responses (útil en desarrollo).

```typescript
import { validateResponse, ResponseSchemas, SchemaBuilder } from 'fox-framework';

const userResponseSchema = SchemaBuilder.object({
  id: SchemaBuilder.string().uuid(),
  name: SchemaBuilder.string(),
  email: SchemaBuilder.string().email(),
  createdAt: SchemaBuilder.date()
});

// Validar response específico
app.get('/users/:id',
  validateResponse(userResponseSchema, {
    skipInProduction: true,
    logErrors: true
  }),
  (req, res) => {
    res.json(user); // Se valida automáticamente
  }
);

// Validar responses por status code
app.post('/users',
  validateResponseByStatus({
    201: ResponseSchemas.success(userResponseSchema),
    400: ResponseSchemas.error(),
    409: ResponseSchemas.error()
  }),
  (req, res) => {
    // Response se valida según el status code
  }
);
```

### Validation Utilities

```typescript
import { ValidationFactory, SchemaBuilder } from 'fox-framework';

const schema = SchemaBuilder.string().email();

// Verificar si un valor es válido
const isValid = ValidationFactory.utils.isValid('test@example.com', schema);

// Parse con excepción en caso de error
try {
  const email = ValidationFactory.utils.parse('test@example.com', schema);
} catch (error) {
  // Manejo de error de validación
}

// Parse seguro que retorna resultado
const result = ValidationFactory.utils.safeParse('invalid-email', schema);
if (result.success) {
  console.log('Valid email:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### Custom Validators

```typescript
import { ValidationFactory } from 'fox-framework';

// Crear validador personalizado
const uniqueEmailValidator = ValidationFactory.utils.createValidator(
  'uniqueEmail',
  async (email) => {
    const exists = await User.findOne({ email });
    return !exists;
  },
  'Email must be unique'
);

const userSchema = SchemaBuilder.object({
  email: SchemaBuilder.string()
    .email()
    .custom(uniqueEmailValidator)
});
```

### Advanced Usage

#### Conditional Validation

```typescript
const schema = SchemaBuilder.object({
  type: SchemaBuilder.string().oneOf(['individual', 'company']),
  name: SchemaBuilder.string().when('type', {
    is: 'individual',
    then: SchemaBuilder.string().min(2).max(50),
    otherwise: SchemaBuilder.string().min(1).max(100)
  }),
  taxId: SchemaBuilder.string().when('type', {
    is: 'company',
    then: SchemaBuilder.string().required(),
    otherwise: SchemaBuilder.string().optional()
  })
});
```

#### Union Types

```typescript
const idSchema = SchemaBuilder.union(
  SchemaBuilder.string().uuid(),
  SchemaBuilder.number().integer().positive()
);

const responseSchema = SchemaBuilder.union(
  SchemaBuilder.object({ success: SchemaBuilder.literal(true), data: dataSchema }),
  SchemaBuilder.object({ success: SchemaBuilder.literal(false), error: errorSchema })
);
```

#### Record and Tuple Types

```typescript
// Record (object with dynamic keys)
const metadataSchema = SchemaBuilder.record(SchemaBuilder.string());

// Tuple (fixed-length array)
const coordinatesSchema = SchemaBuilder.tuple([
  SchemaBuilder.number(), // latitude
  SchemaBuilder.number()  // longitude
]);
```

### Error Handling

```typescript
import { ValidationError } from 'fox-framework';

try {
  const data = ValidationFactory.utils.parse(input, schema);
} catch (error) {
  if (error instanceof ValidationError) {
    // Obtener errores formateados
    const formatted = error.getFormattedErrors();
    
    // Obtener errores por campo
    const byField = error.getErrorsByField();
    
    // Verificar error en campo específico
    const hasEmailError = error.hasErrorForField(['email']);
    
    // Serializar para respuesta JSON
    const errorResponse = error.toJSON();
  }
}
```

### Integration with Router

```typescript
import { ValidationFactory } from 'fox-framework';

class UserController {
  @ValidationFactory.integration.validateRoute({
    body: createUserSchema
  })
  async createUser(req: Request, res: Response) {
    // req.body ya está validado
    const user = await User.create(req.body);
    res.status(201).json(user);
  }
}
```

### TypeScript Integration

```typescript
// Inferir tipos desde esquemas
type User = InferSchemaType<typeof userSchema>;

// El tipo se infiere automáticamente
const user: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
};
```

### Validation Types

```typescript
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

interface ValidationSchemas {
  body?: SchemaInterface<any>;
  query?: SchemaInterface<any>;
  params?: SchemaInterface<any>;
  headers?: SchemaInterface<any>;
}

interface RequestValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  convert?: boolean;
  errorHandler?: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void;
}
```
