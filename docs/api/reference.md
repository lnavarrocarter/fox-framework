# 🚀 API Reference - Fox Framework

## 📋 Índice

- [Core API](#core-api)
- [Server API](#server-api)
- [Router API](#router-api)
- [Template Engine API](#template-engine-api)
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

### Decoradores de Seguridad

Uso con decoradores para controladores de clases.

```typescript
import { AuthorizationMiddleware } from 'fox-framework';

class PostController {
  @AuthorizationMiddleware.RequireRole(['admin', 'editor'])
  async createPost(req, res) {
    // Crear post
  }

  @AuthorizationMiddleware.RequirePermission('posts:update')
  async updatePost(req, res) {
    // Actualizar post
  }

  @AuthorizationMiddleware.RequireOwnership({
    resourcePath: 'params.id',
    ownerPath: 'user.id'
  })
  async deletePost(req, res) {
    // Eliminar post (solo el propietario)
  }
}
```

### Configuración Integrada

Integración completa en la configuración del servidor.

```typescript
import { startServer, SecurityFactory } from 'fox-framework';

startServer({
  port: 3000,
  env: 'production',
  security: {
    cors: {
      origin: ['https://myapp.com'],
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
      secret: process.env.JWT_SECRET,
      expiresIn: '1h'
    },
    rbac: {
      roles: {
        admin: ['*'],
        user: ['posts:read']
      }
    },
    headers: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"]
        }
      }
    }
  }
});
```

## 🔒 Interfaces de Seguridad

### CorsOptions

```typescript
interface CorsOptions {
  origin?: string | string[] | boolean | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}
```

### RateLimitOptions

```typescript
interface RateLimitOptions {
  windowMs: number;
  max: number | ((req: Request) => number);
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}
```

### JwtOptions

```typescript
interface JwtOptions {
  secret: string;
  algorithms?: string[];
  audience?: string;
  issuer?: string;
  expiresIn?: string | number;
  notBefore?: string | number;
  ignoreExpiration?: boolean;
  clockTolerance?: number;
}
```

### User

```typescript
interface User {
  id: string;
  username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  isActive?: boolean;
  isPremium?: boolean;
  metadata?: Record<string, any>;
}
```
