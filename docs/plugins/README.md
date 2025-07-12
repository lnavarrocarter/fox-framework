# Plugin System

El sistema de plugins de Fox Framework proporciona una arquitectura extensible y robusta para añadir funcionalidad modular a aplicaciones.

## Características Principales

- **Arquitectura Modular**: Plugins independientes con ciclo de vida completo
- **Gestión de Dependencias**: Resolución automática de dependencias entre plugins
- **Sistema de Hooks**: Puntos de extensión configurables
- **Sistema de Eventos**: Comunicación asíncrona entre plugins
- **Contenedor de Servicios**: Inyección de dependencias
- **Seguridad**: Validación y sandboxing de plugins
- **Hot Reload**: Carga y descarga dinámica de plugins
- **Validación**: Verificación automática de compatibilidad

## Inicio Rápido

### Crear un Plugin

```typescript
import { IPlugin, PluginManifest } from '@fox/core/plugins';

// Definir el plugin
const myPlugin: IPlugin = {
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'Un plugin increíble',
  
  async initialize(context) {
    // Registrar un hook
    context.hooks.register('app:request', async (req) => {
      console.log(`Request to: ${req.url}`);
      return req;
    });
    
    // Escuchar eventos
    context.events.on('user:login', (event) => {
      console.log(`User logged in: ${event.data.userId}`);
    });
    
    // Registrar un servicio
    context.services.register('my-service', () => ({
      doSomething: () => 'Hello from plugin!'
    }));
  },
  
  async destroy() {
    console.log('Plugin destroyed');
  }
};

// Manifiesto del plugin
const manifest: PluginManifest = {
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'Un plugin increíble',
  author: 'Tu Nombre',
  license: 'MIT',
  main: 'index.js',
  
  dependencies: {
    '@fox/core': '^1.0.0'
  },
  
  permissions: [
    'filesystem:read',
    'network:http'
  ]
};

export { myPlugin, manifest };
```

### Inicializar el Sistema de Plugins

```typescript
import { createPluginFactory } from '@fox/core/plugins';

// Crear factory de plugins
const pluginFactory = createPluginFactory({
  security: {
    enabled: true,
    sandboxed: true
  },
  performance: {
    enableMetrics: true,
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB
  },
  development: {
    hotReload: true,
    validatePlugins: true
  }
});

// Inicializar
await pluginFactory.initialize();

// Registrar plugins
await pluginFactory.register(myPlugin, manifest);

// Usar el plugin
const service = pluginFactory.getServices().get('my-service');
console.log(service.doSomething()); // "Hello from plugin!"

// Cleanup
await pluginFactory.shutdown();
```

## Conceptos Principales

### Plugin Factory

El `PluginFactory` es el punto de entrada principal para gestionar plugins:

```typescript
import { createPluginFactory, PluginFactoryOptions } from '@fox/core/plugins';

const options: PluginFactoryOptions = {
  // Configuración de seguridad
  security: {
    enabled: true,
    sandboxed: true,
    allowedPermissions: ['filesystem:read'],
    maxPermissions: 10
  },
  
  // Configuración de rendimiento
  performance: {
    enableMetrics: true,
    enableProfiling: false,
    maxExecutionTime: 5000,
    maxMemoryUsage: 50 * 1024 * 1024,
    enableCaching: true
  },
  
  // Configuración de desarrollo
  development: {
    enableDebugMode: true,
    hotReload: true,
    validatePlugins: true,
    logLevel: 'debug'
  },
  
  // Configuración de almacenamiento
  storage: {
    enablePersistence: true,
    persistencePath: './plugins-data',
    enableCompression: true
  },
  
  // Configuración de logging
  logging: {
    enabled: true,
    level: 'info',
    includeStackTrace: true,
    logToFile: true,
    logFilePath: './plugins.log'
  }
};

const factory = createPluginFactory(options);
```

### Sistema de Hooks

Los hooks permiten extender la funcionalidad en puntos específicos:

```typescript
// Registrar un hook
pluginFactory.getHooks().register('app:request', async (request) => {
  // Modificar request
  request.headers['X-Plugin'] = 'my-plugin';
  return request;
}, {
  priority: 80, // Mayor prioridad se ejecuta primero
  once: false,  // Se puede ejecutar múltiples veces
  async: true   // Ejecución asíncrona
});

// Ejecutar hooks
const modifiedRequest = await pluginFactory.getHooks().execute('app:request', originalRequest);

// Ejecutar hasta condición
const result = await pluginFactory.getHooks().executeUntil(
  'validation:check',
  validationData,
  (result) => result.valid === false
);

// Obtener estadísticas
const stats = pluginFactory.getHooks().getPerformanceStats('app:request');
console.log(`Executed ${stats.callCount} times, avg: ${stats.averageTime}ms`);
```

### Sistema de Eventos

Comunicación asíncrona entre plugins:

```typescript
const events = pluginFactory.getEvents();

// Escuchar eventos
events.on('user:login', (event) => {
  console.log('User logged in:', event.data);
});

// Escuchar una vez
events.once('app:shutdown', () => {
  console.log('App shutting down');
});

// Emitir eventos
await events.emitAsync('user:login', { 
  userId: 123, 
  timestamp: Date.now() 
});

// Emisión sincrónica
events.emit('notification:show', { message: 'Hello!' });

// Emisión en lote
await events.emitBatch([
  { type: 'user:action', data: { action: 'click' } },
  { type: 'user:action', data: { action: 'scroll' } }
]);

// Filtrar eventos
events.filter('user:*', (event) => {
  return event.data.userId !== undefined;
});
```

### Contenedor de Servicios

Inyección de dependencias y gestión de servicios:

```typescript
const services = pluginFactory.getServices();

// Registrar servicio transitorio (nueva instancia cada vez)
services.transient('logger', () => new Logger());

// Registrar singleton (misma instancia siempre)
services.singleton('database', () => new Database());

// Registrar con ámbito (misma instancia por contexto)
services.scoped('user-session', () => new UserSession());

// Servicio con dependencias
services.register('user-service', (container) => {
  const db = container.get('database');
  const logger = container.get('logger');
  return new UserService(db, logger);
});

// Resolver servicios
const userService = services.get('user-service');

// Crear contenedor hijo
const childContainer = services.createChild();
childContainer.register('child-service', () => new ChildService());

// Verificar existencia
if (services.has('optional-service')) {
  const service = services.get('optional-service');
}
```

## Desarrollo de Plugins

### Estructura de Plugin

```typescript
interface IPlugin {
  // Información básica
  name: string;
  version: string;
  description?: string;
  
  // Ciclo de vida
  initialize?(context: PluginContext): Promise<void> | void;
  configure?(config: any): Promise<void> | void;
  destroy?(): Promise<void> | void;
  
  // Metadatos
  metadata?: Record<string, any>;
}
```

### Contexto de Plugin

El contexto proporciona acceso a todas las APIs del framework:

```typescript
interface PluginContext {
  // Sistema de hooks
  hooks: HooksManager;
  
  // Sistema de eventos
  events: EventsManager;
  
  // Contenedor de servicios
  services: ServiceContainer;
  
  // Configuración del plugin
  config: any;
  
  // Logger específico del plugin
  logger: ILogger;
  
  // Metadatos del plugin
  metadata: PluginMetadata;
  
  // Utilidades
  utils: PluginUtils;
}
```

### Manifiesto del Plugin

```typescript
interface PluginManifest {
  // Información básica
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  
  // Archivos
  main: string;
  files?: string[];
  
  // Dependencias
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // Configuración
  configuration?: PluginConfigurationSchema;
  
  // Permisos requeridos
  permissions?: PluginPermission[];
  
  // Metadatos adicionales
  metadata?: {
    category?: string;
    tags?: string[];
    homepage?: string;
    repository?: string;
    keywords?: string[];
  };
  
  // Compatibilidad
  engines?: {
    fox?: string;
    node?: string;
  };
}
```

## Seguridad

### Permisos

```typescript
// Tipos de permisos disponibles
type PluginPermission = 
  | 'filesystem:read'
  | 'filesystem:write' 
  | 'network:http'
  | 'network:https'
  | 'process:spawn'
  | 'system:env'
  | 'database:read'
  | 'database:write';

// Solicitar permisos en el manifiesto
const manifest: PluginManifest = {
  // ...
  permissions: [
    'filesystem:read',
    'network:http'
  ]
};
```

### Sandboxing

```typescript
// Configurar sandbox
const factory = createPluginFactory({
  security: {
    enabled: true,
    sandboxed: true,
    allowedPermissions: ['filesystem:read'],
    
    // Políticas de seguridad
    policies: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedPaths: ['/tmp', '/var/app'],
      blockedDomains: ['malicious.com'],
      maxNetworkConnections: 5
    }
  }
});
```

## Validación

### Validación de Plugins

```typescript
// Habilitar validación
const factory = createPluginFactory({
  development: {
    validatePlugins: true
  }
});

// El sistema validará automáticamente:
// - Compatibilidad de versiones
// - Dependencias requeridas
// - Estructura del manifiesto
// - Permisos solicitados
// - Integridad del código
```

### Validación Personalizada

```typescript
// Registrar validador personalizado
const validator = factory.getValidator();

validator.addRule('custom-validation', async (plugin, manifest) => {
  if (!manifest.metadata?.category) {
    throw new Error('Plugin must specify a category');
  }
  
  return {
    valid: true,
    warnings: [],
    errors: []
  };
});
```

## Carga Dinámica

### Plugin Loader

```typescript
const loader = factory.getLoader();

// Cargar plugin desde archivo
await loader.loadFromFile('./plugins/my-plugin.js');

// Cargar desde URL
await loader.loadFromUrl('https://registry.com/plugin.tar.gz');

// Cargar desde directorio
await loader.loadFromDirectory('./plugins/my-plugin/');

// Hot reload
loader.enableHotReload('./plugins/', {
  watchPatterns: ['**/*.js', '**/*.json'],
  excludePatterns: ['**/*.test.js'],
  debounceTime: 1000
});
```

### Descarga de Plugins

```typescript
// Descargar plugin
await loader.unload('plugin-name');

// Descargar todos los plugins
await loader.unloadAll();

// Recargar plugin
await loader.reload('plugin-name');
```

## Mejores Prácticas

### 1. Gestión de Errores

```typescript
const plugin: IPlugin = {
  name: 'robust-plugin',
  version: '1.0.0',
  
  async initialize(context) {
    try {
      // Código de inicialización
      await this.setupDatabase();
      
      context.hooks.register('app:error', async (error) => {
        context.logger.error('Application error:', error);
        // Manejar error específico del plugin
      });
      
    } catch (error) {
      context.logger.error('Plugin initialization failed:', error);
      throw error; // Re-throw para que el sistema maneje
    }
  },
  
  async destroy() {
    try {
      await this.cleanup();
    } catch (error) {
      // Log pero no re-throw en destroy
      console.error('Cleanup error:', error);
    }
  }
};
```

### 2. Configuración

```typescript
// Schema de configuración
const configSchema = {
  type: 'object',
  properties: {
    apiKey: { type: 'string', minLength: 1 },
    timeout: { type: 'number', minimum: 1000, default: 5000 },
    retries: { type: 'number', minimum: 0, maximum: 5, default: 3 }
  },
  required: ['apiKey']
};

const plugin: IPlugin = {
  name: 'configurable-plugin',
  version: '1.0.0',
  
  async configure(config) {
    // Validar configuración
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    this.config = {
      timeout: 5000,
      retries: 3,
      ...config
    };
  }
};
```

### 3. Testing

```typescript
// Plugin testeable
export class TestablePlugin implements IPlugin {
  name = 'testable-plugin';
  version = '1.0.0';
  
  private context?: PluginContext;
  
  async initialize(context: PluginContext) {
    this.context = context;
    // Configuración testeable
  }
  
  // Métodos públicos para testing
  public getContext() {
    return this.context;
  }
  
  public async processData(data: any) {
    // Lógica que se puede testear independientemente
    return data.map(item => ({ ...item, processed: true }));
  }
}

// Test del plugin
describe('TestablePlugin', () => {
  it('should process data correctly', async () => {
    const plugin = new TestablePlugin();
    const result = await plugin.processData([{ id: 1 }]);
    expect(result).toEqual([{ id: 1, processed: true }]);
  });
});
```

### 4. Documentación

```typescript
/**
 * Plugin de autenticación JWT
 * 
 * @example
 * ```typescript
 * const authPlugin = new JWTAuthPlugin();
 * await pluginFactory.register(authPlugin, manifest);
 * ```
 */
export class JWTAuthPlugin implements IPlugin {
  name = 'jwt-auth';
  version = '1.0.0';
  description = 'Provides JWT authentication functionality';
  
  /**
   * Inicializa el plugin de autenticación
   * @param context - Contexto del plugin
   */
  async initialize(context: PluginContext) {
    // Documentar hooks disponibles
    
    /**
     * Hook: auth:validate
     * Valida un token JWT
     * @param token - Token JWT a validar
     * @returns Usuario autenticado o null
     */
    context.hooks.register('auth:validate', async (token: string) => {
      return this.validateToken(token);
    });
  }
  
  private async validateToken(token: string) {
    // Implementación
  }
}
```

## Monitoreo y Debugging

### Métricas

```typescript
// Habilitar métricas
const factory = createPluginFactory({
  performance: {
    enableMetrics: true,
    enableProfiling: true
  }
});

// Obtener estadísticas
const stats = factory.getStatistics();
console.log('Plugins loaded:', stats.pluginCount);
console.log('Memory usage:', stats.memoryUsage);
console.log('Hook executions:', stats.hookExecutions);

// Estadísticas por plugin
const pluginStats = factory.getPluginStatistics('my-plugin');
console.log('Plugin memory:', pluginStats.memoryUsage);
console.log('Plugin errors:', pluginStats.errorCount);
```

### Logging

```typescript
// Configurar logging
const factory = createPluginFactory({
  logging: {
    enabled: true,
    level: 'debug',
    logToFile: true,
    logFilePath: './plugins.log'
  }
});

// En el plugin
const plugin: IPlugin = {
  async initialize(context) {
    context.logger.info('Plugin initialized');
    context.logger.debug('Debug information');
    context.logger.error('Error occurred', error);
  }
};
```

## API Reference

Ver [API Reference](./api/plugins.md) para documentación completa de la API.

## Ejemplos

- [Plugin de Cache](../examples/cache-plugin.md)
- [Plugin de Autenticación](../examples/auth-plugin.md)
- [Plugin de Logging](../examples/logging-plugin.md)
- [Plugin de Base de Datos](../examples/database-plugin.md)
