# 🛡️ Security Middleware API Reference

## Descripción General

El sistema de middleware de seguridad de Fox Framework proporciona protección robusta contra vulnerabilidades comunes y facilita la implementación de autenticación y autorización.

## Instalación y Configuración

```typescript
import { SecurityMiddleware, AuthMiddleware, AuthorizationMiddleware } from 'tsfox/core/security';

const app = createFoxApp();

// Configuración básica de seguridad
app.use(SecurityMiddleware.helmet());
app.use(SecurityMiddleware.cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));
app.use(SecurityMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por ventana
}));
```

## API Reference

### SecurityMiddleware

#### `SecurityMiddleware.cors(options?)`

Configura middleware CORS para controlar acceso desde diferentes dominios.

**Parámetros:**
- `options.origin`: Orígenes permitidos (string, string[], boolean)
- `options.methods`: Métodos HTTP permitidos
- `options.allowedHeaders`: Headers permitidos
- `options.credentials`: Permitir cookies/credenciales

**Ejemplo:**
```typescript
app.use(SecurityMiddleware.cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

#### `SecurityMiddleware.helmet()`

Aplica headers de seguridad estándar para proteger contra ataques comunes.

**Headers aplicados:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`

#### `SecurityMiddleware.rateLimit(options)`

Implementa limitación de tasa para prevenir ataques DoS.

**Parámetros:**
- `windowMs`: Ventana de tiempo en millisegundos
- `max`: Número máximo de requests por ventana
- `message`: Mensaje de error personalizado
- `keyGenerator`: Función para generar clave de identificación

### AuthMiddleware

#### `AuthMiddleware.jwt(options)`

Middleware de autenticación JWT.

**Parámetros:**
- `secret`: Clave secreta para verificar tokens
- `expiresIn`: Tiempo de expiración
- `issuer`: Emisor del token
- `audience`: Audiencia del token

**Ejemplo:**
```typescript
app.use('/api/protected', AuthMiddleware.jwt({
  secret: process.env.JWT_SECRET!,
  expiresIn: '24h',
  issuer: 'fox-framework',
  audience: 'fox-app'
}));
```

#### `AuthMiddleware.basicAuth(validateCredentials)`

Middleware de autenticación básica HTTP.

**Parámetros:**
- `validateCredentials`: Función que valida username/password

**Ejemplo:**
```typescript
app.use('/admin', AuthMiddleware.basicAuth((username, password) => {
  return username === 'admin' && password === process.env.ADMIN_PASSWORD;
}));
```

### AuthorizationMiddleware

#### `AuthorizationMiddleware.requireRole(role)`

Requiere que el usuario tenga un rol específico.

**Ejemplo:**
```typescript
app.get('/admin/users', 
  AuthMiddleware.jwt(jwtOptions),
  AuthorizationMiddleware.requireRole('admin'),
  (req, res) => {
    // Solo usuarios con rol 'admin' pueden acceder
  }
);
```

#### `AuthorizationMiddleware.requirePermission(permission)`

Requiere un permiso específico.

**Ejemplo:**
```typescript
app.delete('/api/posts/:id',
  AuthMiddleware.jwt(jwtOptions),
  AuthorizationMiddleware.requirePermission('posts:delete'),
  (req, res) => {
    // Solo usuarios con permiso 'posts:delete'
  }
);
```

### CSRFMiddleware

#### `CSRFMiddleware.protection(options?)`

Protección contra ataques CSRF.

**Parámetros:**
- `secret`: Clave secreta para tokens CSRF
- `cookie`: Opciones de cookie
- `ignoreMethods`: Métodos HTTP a ignorar

**Ejemplo:**
```typescript
app.use(CSRFMiddleware.protection({
  secret: process.env.CSRF_SECRET,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));
```

## Tipos y Interfaces

### User Interface

```typescript
interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}
```

### JWT Options

```typescript
interface JwtOptions {
  secret: string;
  expiresIn?: string;
  issuer?: string;
  audience?: string;
}
```

### CORS Options

```typescript
interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}
```

## Ejemplos de Uso Completos

### Aplicación con Autenticación JWT

```typescript
import { createFoxApp } from 'tsfox';
import { SecurityMiddleware, AuthMiddleware, AuthorizationMiddleware } from 'tsfox/core/security';

const app = createFoxApp();

// Seguridad básica
app.use(SecurityMiddleware.helmet());
app.use(SecurityMiddleware.cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
app.use(SecurityMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Demasiadas solicitudes desde esta IP'
}));

// Rutas públicas
app.post('/auth/login', async (req, res) => {
  // Lógica de login
  const token = jwt.sign(
    { userId: user.id, roles: user.roles },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// Rutas protegidas
const jwtOptions = {
  secret: process.env.JWT_SECRET!,
  expiresIn: '24h'
};

app.get('/api/profile',
  AuthMiddleware.jwt(jwtOptions),
  (req, res) => {
    res.json({ user: req.user });
  }
);

app.get('/admin/dashboard',
  AuthMiddleware.jwt(jwtOptions),
  AuthorizationMiddleware.requireRole('admin'),
  (req, res) => {
    res.json({ message: 'Panel de administración' });
  }
);
```

### API con Múltiples Niveles de Seguridad

```typescript
const app = createFoxApp();

// Middleware global de seguridad
app.use(SecurityMiddleware.helmet());
app.use(SecurityMiddleware.cors({ origin: true }));

// Rate limiting diferenciado
app.use('/api/public', SecurityMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000 // Más permisivo para rutas públicas
}));

app.use('/api/private', SecurityMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 // Más restrictivo para rutas privadas
}));

// Rutas con diferentes niveles de autorización
app.get('/api/public/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/private/data',
  AuthMiddleware.jwt(jwtOptions),
  (req, res) => {
    res.json({ data: 'información privada' });
  }
);

app.post('/api/admin/config',
  AuthMiddleware.jwt(jwtOptions),
  AuthorizationMiddleware.requireRole('admin'),
  AuthorizationMiddleware.requirePermission('config:write'),
  (req, res) => {
    // Solo administradores con permiso específico
    res.json({ message: 'Configuración actualizada' });
  }
);
```

## Mejores Prácticas

### 1. Configuración de Producción

```typescript
// Usar variables de entorno para configuración sensible
const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS!) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX!) || 100
  }
};
```

### 2. Manejo de Errores de Seguridad

```typescript
app.use((error: any, req: any, res: any, next: any) => {
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Permisos insuficientes',
      code: 'FORBIDDEN'
    });
  }
  
  // Otros errores...
  next(error);
});
```

### 3. Logging de Seguridad

```typescript
import { LoggerFactory } from 'tsfox/core/logging';

const securityLogger = LoggerFactory.create('security');

// Log intentos de acceso no autorizado
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      securityLogger.warn('Acceso denegado', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent')
      });
    }
  });
  next();
});
```

## Testing

### Ejemplo de Tests

```typescript
import { SecurityMiddleware } from 'tsfox/core/security';
import request from 'supertest';

describe('Security Middleware', () => {
  it('should apply CORS headers', async () => {
    const app = createTestApp();
    app.use(SecurityMiddleware.cors({ origin: 'http://localhost:3000' }));
    
    const response = await request(app)
      .get('/test')
      .expect(200);
      
    expect(response.headers['access-control-allow-origin'])
      .toBe('http://localhost:3000');
  });

  it('should enforce rate limiting', async () => {
    const app = createTestApp();
    app.use(SecurityMiddleware.rateLimit({ windowMs: 1000, max: 2 }));
    
    // Primera request - OK
    await request(app).get('/test').expect(200);
    
    // Segunda request - OK
    await request(app).get('/test').expect(200);
    
    // Tercera request - Rate limited
    await request(app).get('/test').expect(429);
  });
});
```

## Notas de Seguridad

1. **Nunca hardcodear secretos** - Usar variables de entorno
2. **Rotar tokens JWT** - Implementar refresh tokens
3. **Validar todos los inputs** - Usar el sistema de validación
4. **Monitorear accesos** - Implementar logging de seguridad
5. **Actualizar dependencias** - Mantener librerías actualizadas

## Estado: ✅ COMPLETADO Y DOCUMENTADO

- ✅ API completa implementada
- ✅ Documentación de referencia completa
- ✅ Ejemplos de uso incluidos
- ✅ Mejores prácticas documentadas
- ✅ Tests de ejemplo proporcionados
