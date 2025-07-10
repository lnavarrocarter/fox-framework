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
