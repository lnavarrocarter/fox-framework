# 🦊 Fox Framework

Un framework web moderno para TypeScript/Node.js con routing modular, motor de templates integrado y arquitectura basada en factory patterns.

## 🚀 Características

- **🏭 Factory Pattern**: Gestión centralizada de instancias de servidor
- **🛣️ Routing Modular**: Sistema de rutas flexible y extensible
- **🎨 Motor de Templates**: Engine personalizado `.fox` + soporte HTML/HBS
- **🗂️ Sistema de Cache**: Multi-provider cache (Memory, Redis, File) con TTL
- **🔍 Sistema de Validación**: Schema builder con API tipo Zod
- **📊 Logging Estructurado**: Sistema completo con múltiples transports
- **⚡ CLI Potente**: Generación automática de código
- **🔧 TypeScript First**: Tipado estricto y IntelliSense completo
- **🧪 Testing Ready**: Configuración Jest incluida + 300+ tests
- **📚 Documentación Completa**: APIs y arquitectura documentadas

## 📦 Instalación

```bash
npm install fox-framework
```

## 🎯 Inicio Rápido

### Crear un servidor básico

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

### Con rutas personalizadas

```typescript
import { startServer, RequestMethod } from 'fox-framework';

const config = {
  port: 3000,
  env: 'development',
  requests: [
    {
      method: RequestMethod.GET,
      path: '/users',
      callback: (req, res) => {
        res.json({ users: ['Alice', 'Bob'] });
      }
    },
    {
      method: RequestMethod.POST,
      path: '/users',
      callback: (req, res) => {
        const user = req.body;
        res.status(201).json(user);
      }
    }
  ]
};

startServer(config);
```

### Con templates

```typescript
const config = {
  port: 3000,
  env: 'development',
  views: [
    {
      type: 'fox',
      path: '/',
      callback: (req, res) => {
        res.render('index', {
          title: 'Fox Framework',
          message: 'Bienvenido!',
          users: ['Alice', 'Bob']
        });
      }
    }
  ]
};

startServer(config);
```

## 🎨 Motor de Templates (.fox)

### Sintaxis básica

```fox
<!-- Variables -->
<h1>{{title}}</h1>
<p>{{message}}</p>

<!-- Condicionales -->
{{if user}}
  <p>Bienvenido, {{user.name}}!</p>
{{else}}
  <p>Por favor, inicia sesión</p>
{{/if}}

<!-- Bucles -->
<ul>
  {{each users}}
    <li>{{this.name}} - {{this.email}}</li>
  {{/each}}
</ul>
```

## 🗂️ Sistema de Cache

### Cache básico

```typescript
import { CacheFactory } from '@tsfox/core/cache';

// Memory cache
const cache = CacheFactory.create({
  provider: 'memory',
  maxSize: 1000
});

// Store and retrieve data
await cache.set('user:123', { name: 'John Doe' }, 3600); // 1 hour TTL
const user = await cache.get('user:123');

// Check metrics
const metrics = cache.getMetrics();
console.log(`Hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`);
```

### Cache middleware para respuestas

```typescript
import { responseCache } from '@tsfox/core/cache/middleware';

app.use(responseCache({
  ttl: 300, // 5 minutes
  condition: (req, res) => req.method === 'GET'
}));
```

### Multi-provider cache

```typescript
// File cache para desarrollo
const fileCache = CacheFactory.create({
  provider: 'file',
  file: { directory: './cache' }
});

// Redis cache para producción
const redisCache = CacheFactory.create({
  provider: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'myapp:'
  }
});
```

## 🔍 Sistema de Validación

### Schema builder con API tipo Zod

```typescript
import { z } from '@tsfox/core/validation';

// User schema
const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120).optional(),
  roles: z.array(z.string()).default(['user'])
});

// Validate data
const result = UserSchema.safeParse({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.log('Validation errors:', result.error.issues);
}
```

### Middleware de validación

```typescript
import { validate } from '@tsfox/core/validation/middleware';

app.post('/users', 
  validate({ body: UserSchema }),
  (req, res) => {
    // req.body is now typed and validated
    const user = req.body;
    res.json({ message: 'User created', user });
  }
);
```

## 📊 Logging Estructurado

### Logger básico

```typescript
import { createLogger } from '@tsfox/core/logging';

const logger = createLogger({
  level: 'info',
  format: 'json',
  transports: ['console', 'file']
});

// Structured logging
logger.info('User logged in', { 
  userId: 123, 
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...' 
});

logger.error('Payment failed', { 
  userId: 123,
  amount: 99.99,
  error: error.message,
  stack: error.stack 
});
```

### Multiple transports

```typescript
const logger = createLogger({
  level: 'debug',
  transports: ['console', 'file', 'http'],
  file: {
    filename: 'logs/app.log',
    maxSize: '10m',
    maxFiles: 5
  },
  http: {
    url: 'https://logs.example.com/api',
    headers: { 'Authorization': 'Bearer token' }
  }
});
```

## 🔧 CLI

### Generar componentes

```bash
# Generar controlador
npx tsfox generate:controller UserController

# Generar modelo
npx tsfox generate:model User

# Generar vista
npx tsfox generate:view users/index
```

## 📊 API Reference

### ServerConfig

```typescript
interface ServerConfig {
  port: number;                    // Puerto del servidor
  env: string;                     // Entorno (development, production, test)
  jsonSpaces?: number;             // Espacios para JSON pretty-print
  staticFolder?: string;           // Carpeta de archivos estáticos
  middlewares?: Middleware[];      // Middleware personalizados
  requests?: RouteConfig[];        // Configuración de rutas
  views?: ViewConfig[];           // Configuración de vistas
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
type ViewCallback = (req: Request, res: Response) => void;
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:coverage

# Solo tests unitarios
npm run test:unit

# Solo tests de integración
npm run test:integration
```

## 🔧 Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/fox-framework.git
cd fox-framework

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar tests
npm test
```

## 📚 Documentación

- **[📖 Guía de Arquitectura](./docs/architecture/overview.md)**
- **[🔧 API Reference](./docs/api/reference.md)**
- **[📊 Schemas y Types](./docs/schemas/types.md)**
- **[🚀 Deployment](./docs/deployment/)**

## 🛠️ Configuración Avanzada

### Con Middleware

```typescript
import { startServer, Middleware } from 'fox-framework';

const authMiddleware: Middleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
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
      path: '/protected',
      callback: (req, res) => {
        res.json({ message: 'Datos protegidos' });
      }
    }
  ]
};

startServer(config);
```

### Error Handling

```typescript
import { HttpError } from 'fox-framework';

const getUserHandler = (req, res) => {
  const userId = req.params.id;
  
  if (!userId) {
    throw new HttpError(400, 'ID de usuario requerido');
  }
  
  const user = findUser(userId);
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }
  
  res.json(user);
};
```

## 🎯 Roadmap

### ✅ Completado

- [x] Factory Pattern base implementado
- [x] Routing system con todos los métodos HTTP
- [x] Motor de templates .fox con sintaxis completa
- [x] CLI con generadores automáticos  
- [x] **Sistema de Cache Multi-Provider** (Memory, Redis, File)
- [x] **Sistema de Validación** con API tipo Zod (77 tests)
- [x] **Logging Estructurado** con múltiples transports
- [x] **Error Handling** robusto y tipado
- [x] Suite de tests completa (300+ tests)

### 🔄 En Progreso

- [ ] Security middleware (JWT, Rate limiting, CORS)
- [ ] Performance optimization con benchmarks
- [ ] Database abstraction layer
- [ ] Plugin system extensible

### 📋 Planificado

- [ ] Event system
- [ ] Microservices support
- [ ] Docker integration
- [ ] Cloud deployment tools
- [ ] Monitoring y métricas avanzadas
- [ ] WebSocket support
- [ ] GraphQL integration

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Contribución

- Seguir [coding guidelines](./docs/development/coding-guidelines.md)
- Escribir tests para nuevas features
- Mantener cobertura > 80%
- Documentar APIs públicas
- Seguir [conventional commits](https://conventionalcommits.org/)

## 📄 Licencia

Este proyecto está bajo la Licencia ISC - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- Express.js por la base HTTP sólida
- TypeScript por el sistema de tipos
- Jest por el framework de testing
- Commander.js por el CLI

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/fox-framework/issues)
- **Documentación**: [Wiki del proyecto](https://github.com/tu-usuario/fox-framework/wiki)
- **Email**: soporte@foxframework.dev

---

**¿Te gusta Fox Framework?** ⭐ Dale una estrella en GitHub y ayúdanos a crecer.

## 📈 Stats

![GitHub stars](https://img.shields.io/github/stars/tu-usuario/fox-framework)
![GitHub forks](https://img.shields.io/github/forks/tu-usuario/fox-framework)
![GitHub issues](https://img.shields.io/github/issues/tu-usuario/fox-framework)
![GitHub license](https://img.shields.io/github/license/tu-usuario/fox-framework)
![npm version](https://img.shields.io/npm/v/fox-framework)
![npm downloads](https://img.shields.io/npm/dm/fox-framework)
