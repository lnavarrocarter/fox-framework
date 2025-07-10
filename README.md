# 🦊 Fox Framework

Un framework web moderno para TypeScript/Node.js con routing modular, motor de templates integrado y arquitectura basada en factory patterns.

## 🚀 Características

- **🏭 Factory Pattern**: Gestión centralizada de instancias de servidor
- **🛣️ Routing Modular**: Sistema de rutas flexible y extensible
- **🎨 Motor de Templates**: Engine personalizado `.fox` + soporte HTML/HBS
- **⚡ CLI Potente**: Generación automática de código
- **🔧 TypeScript First**: Tipado estricto y IntelliSense completo
- **🧪 Testing Ready**: Configuración Jest incluida
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
- [x] Factory Pattern base
- [x] Motor de templates .fox
- [x] CLI básico
- [x] TypeScript support
- [x] Testing infrastructure

### 🔄 En Progreso
- [ ] Sistema de cache para templates
- [ ] Middleware de seguridad
- [ ] Validación de datos integrada
- [ ] Performance optimization

### 📋 Planificado
- [ ] Plugin system
- [ ] Event system
- [ ] Database abstraction
- [ ] Microservices support
- [ ] Docker integration
- [ ] Cloud deployment tools

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
