# 🐳 Docker Integration - Fox Framework

Fox Framework incluye soporte completo para Docker con generación automática de archivos de configuración optimizados, commands integrados en el CLI y templates para diferentes tipos de deployment.

## 📋 Índice

- [Características Principales](#características-principales)
- [Configuración Inicial](#configuración-inicial)
- [Comandos CLI](#comandos-cli)
- [Generadores](#generadores)
- [Templates](#templates)
- [Configuración Avanzada](#configuración-avanzada)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Best Practices](#best-practices)

## 🚀 Características Principales

### ✅ Dockerfile Generation

- **Multi-stage builds** automáticos para optimización
- **Package manager detection** (npm, yarn, pnpm)
- **Health checks** integrados
- **Configuración por entorno** (development/production)
- **Base image selection** inteligente

### ✅ Docker Compose

- **Orchestración completa** con servicios relacionados
- **Database integration** (PostgreSQL, MySQL, MongoDB, Redis)
- **Nginx reverse proxy** con SSL support
- **Networks y volumes** configurados automáticamente
- **Environment variables** optimizadas

### ✅ CLI Integration

- **Comandos nativos** integrados en Fox CLI
- **Workflow completo** desde init hasta deploy
- **Hot reload** en desarrollo
- **Production builds** optimizados

## 🔧 Configuración Inicial

### Generar configuración Docker

```bash
# Configuración completa (Dockerfile + docker-compose.yml)
npx -p @foxframework/core tsfox docker init

# Solo Dockerfile
npx -p @foxframework/core tsfox docker init --dockerfile-only

# Con base de datos PostgreSQL
npx -p @foxframework/core tsfox docker init --database postgresql

# Para producción con Nginx
npx -p @foxframework/core tsfox docker init --nginx --env production
```

### Estructura generada

```
project/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── .dockerignore
├── nginx/
│   ├── nginx.conf
│   └── ssl/
└── docker/
    ├── entrypoint.sh
    └── healthcheck.sh
```

## 🎛️ Comandos CLI

### docker init

Genera toda la configuración Docker necesaria.

```bash
npx -p @foxframework/core tsfox docker init [options]
```

**Opciones:**

- `--dockerfile-only` - Genera solo Dockerfile
- `--nginx` - Incluye configuración Nginx
- `--env <environment>` - Especifica entorno (development/production)
- `--database <type>` - Incluye base de datos (postgresql/mysql/mongodb/redis)
- `--base-image <image>` - Imagen base personalizada
- `--port <port>` - Puerto de la aplicación

**Ejemplos:**

```bash
# Configuración básica
npx -p @foxframework/core tsfox docker init

# Solo Dockerfile para desarrollo
npx -p @foxframework/core tsfox docker init --dockerfile-only --env development

# Configuración completa con PostgreSQL y Nginx
npx -p @foxframework/core tsfox docker init --database postgresql --nginx

# Configuración personalizada
npx -p @foxframework/core tsfox docker init --base-image node:18-alpine --port 4000
```

### docker build

Construye la imagen Docker del proyecto.

```bash
npx -p @foxframework/core tsfox docker build [options]
```

**Opciones:**

- `--tag <name>` - Nombre de la imagen (default: nombre del proyecto)
- `--env <environment>` - Entorno de build (development/production)
- `--platform <platform>` - Plataforma de build (linux/amd64, linux/arm64)
- `--no-cache` - Build sin cache

**Ejemplos:**

```bash
# Build básico
npx -p @foxframework/core tsfox docker build

# Build con tag personalizado
npx -p @foxframework/core tsfox docker build --tag my-fox-app:latest

# Build para producción
npx -p @foxframework/core tsfox docker build --env production

# Build multiplataforma
npx -p @foxframework/core tsfox docker build --platform linux/amd64,linux/arm64
```

### docker run

Ejecuta el container de la aplicación.

```bash
npx -p @foxframework/core tsfox docker run [options]
```

**Opciones:**

- `--dev` - Modo desarrollo con hot reload
- `--port <port>` - Puerto de exposición (default: 3000)
- `--env-file <file>` - Archivo de variables de entorno
- `--detach` - Ejecuta en background

**Ejemplos:**

```bash
# Ejecutar en desarrollo
npx -p @foxframework/core tsfox docker run --dev

# Ejecutar en puerto personalizado
npx -p @foxframework/core tsfox docker run --port 8080

# Ejecutar en background
npx -p @foxframework/core tsfox docker run --detach

# Con variables de entorno
npx -p @foxframework/core tsfox docker run --env-file .env.production
```

### docker logs

Muestra los logs del container.

```bash
npx -p @foxframework/core tsfox docker logs [options]
```

**Opciones:**

- `--follow` - Sigue los logs en tiempo real
- `--tail <lines>` - Muestra últimas N líneas
- `--since <time>` - Logs desde timestamp
- `--service <name>` - Logs de servicio específico

### docker compose

Gestiona servicios con docker-compose.

```bash
npx -p @foxframework/core tsfox docker compose <command> [options]
```

**Comandos:**

- `up` - Levanta todos los servicios
- `down` - Para y elimina servicios
- `restart` - Reinicia servicios
- `logs` - Muestra logs de servicios
- `ps` - Lista servicios en ejecución
- `exec <service> <command>` - Ejecuta comando en servicio

**Ejemplos:**

```bash
# Levantar servicios
npx -p @foxframework/core tsfox docker compose up

# Levantar en background
npx -p @foxframework/core tsfox docker compose up -d

# Ver logs de un servicio
npx -p @foxframework/core tsfox docker compose logs app

# Ejecutar comando en container
npx -p @foxframework/core tsfox docker compose exec app npm run migration
```

## 🏭 Generadores

### DockerfileGenerator

Genera Dockerfiles optimizados para aplicaciones Fox Framework.

```typescript
import { DockerfileGenerator } from '@foxframework/cli/generators';

const generator = new DockerfileGenerator();

// Configuración básica
const config = {
  baseImage: 'node:18-alpine',
  workDir: '/app',
  port: 3000,
  environment: 'production' as const,
  packageManager: 'npm' as const,
  healthCheck: true,
  multiStage: true
};

// Generar Dockerfile
const dockerfile = generator.generate(config);
console.log(dockerfile);
```

**Configuración DockerfileGenerator:**

```typescript
interface DockerfileConfig {
  baseImage?: string;           // Imagen base (default: node:18-alpine)
  workDir?: string;            // Directorio de trabajo (default: /app)
  port?: number;               // Puerto de exposición (default: 3000)
  environment?: 'development' | 'production';
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  healthCheck?: boolean;       // Incluir health check
  multiStage?: boolean;        // Build multi-stage
  user?: string;              // Usuario no-root
  entrypoint?: string[];      // Entrypoint personalizado
  labels?: Record<string, string>; // Labels de metadata
}
```

### ComposeGenerator

Genera archivos docker-compose.yml para orchestración completa.

```typescript
import { ComposeGenerator } from '@foxframework/cli/generators';

const generator = new ComposeGenerator();

// Configuración básica
const config = {
  appName: 'fox-app',
  services: ['app', 'database', 'cache'],
  database: 'postgresql' as const,
  includeNginx: true,
  environment: 'production' as const
};

// Generar docker-compose.yml
const compose = generator.generate(config);
console.log(compose);
```

**Configuración ComposeGenerator:**

```typescript
interface ComposeConfig {
  version?: string;                    // Versión compose (default: 3.8)
  appName: string;                    // Nombre de la aplicación
  services: string[];                 // Servicios a incluir
  networks?: string[];                // Networks personalizadas
  volumes?: string[];                 // Volumes personalizados
  environment?: Record<string, string>; // Variables globales
  database?: DatabaseConfig;          // Configuración de DB
  nginx?: NginxConfig;               // Configuración Nginx
  includeNginx?: boolean;            // Incluir Nginx
  includeRedis?: boolean;            // Incluir Redis
  includeMonitoring?: boolean;       // Incluir monitoring
}
```

## 📝 Templates

### Dockerfile Templates

Fox Framework incluye templates optimizados para diferentes escenarios:

#### Production Multi-Stage

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Runtime stage  
FROM node:18-alpine AS runner
RUN addgroup -g 1001 -S nodejs
RUN adduser -S foxapp -u 1001
WORKDIR /app
COPY --from=builder --chown=foxapp:nodejs /app/node_modules ./node_modules
COPY --chown=foxapp:nodejs . .
USER foxapp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["npm", "start"]
```

#### Development

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
VOLUME ["/app/src", "/app/logs"]
CMD ["npm", "run", "dev"]
```

### Docker Compose Templates

#### Production Stack

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://fox:foxpass@db:5432/foxapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    networks:
      - fox-network
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: foxapp
      POSTGRES_USER: fox
      POSTGRES_PASSWORD: foxpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fox-network
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - fox-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - fox-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  fox-network:
    driver: bridge
```

#### Development Stack

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: development
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://fox:foxpass@db:5432/foxapp_dev
    volumes:
      - ./src:/app/src
      - ./logs:/app/logs
      - node_modules:/app/node_modules
    depends_on:
      - db
    networks:
      - fox-dev-network

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: foxapp_dev
      POSTGRES_USER: fox
      POSTGRES_PASSWORD: foxpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    networks:
      - fox-dev-network

volumes:
  postgres_dev_data:
  node_modules:

networks:
  fox-dev-network:
    driver: bridge
```

## ⚙️ Configuración Avanzada

### Variables de Entorno

El sistema Docker de Fox Framework maneja automáticamente las variables de entorno:

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@db:5432/foxapp
REDIS_URL=redis://cache:6379
JWT_SECRET=your-super-secret-key
LOG_LEVEL=info

# .env.development  
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://fox:foxpass@localhost:5432/foxapp_dev
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Health Checks

Los Dockerfiles generados incluyen health checks automáticos:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

Para que funcione, tu aplicación Fox debe exponer un endpoint `/health`:

```typescript
import { startServer } from 'fox-framework';

const config = {
  port: 3000,
  requests: [
    {
      method: 'GET',
      path: '/health',
      callback: (req, res) => {
        res.json({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      }
    }
  ]
};

startServer(config);
```

### Nginx Configuration

Cuando se incluye Nginx, se genera una configuración optimizada:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream foxapp {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://foxapp;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            access_log off;
            proxy_pass http://foxapp/health;
        }
    }
}
```

## 📚 Ejemplos de Uso

### Ejemplo 1: Setup Básico

```bash
# 1. Crear proyecto Fox
npx create-fox-app my-app
cd my-app

# 2. Generar configuración Docker
npx -p @foxframework/core tsfox docker init

# 3. Construir imagen
npx -p @foxframework/core tsfox docker build

# 4. Ejecutar aplicación
npx -p @foxframework/core tsfox docker run
```

### Ejemplo 2: Stack Completo con Base de Datos

```bash
# 1. Generar configuración con PostgreSQL
npx -p @foxframework/core tsfox docker init --database postgresql

# 2. Levantar stack completo
npx -p @foxframework/core tsfox docker compose up -d

# 3. Ver logs
npx -p @foxframework/core tsfox docker compose logs -f app

# 4. Ejecutar migraciones
npx -p @foxframework/core tsfox docker compose exec app npm run migration
```

### Ejemplo 3: Deploy en Producción

```bash
# 1. Generar configuración de producción
npx -p @foxframework/core tsfox docker init --env production --nginx

# 2. Build optimizado
npx -p @foxframework/core tsfox docker build --env production

# 3. Deploy con docker-compose
npx -p @foxframework/core tsfox docker compose -f docker-compose.yml up -d
```

### Ejemplo 4: Desarrollo con Hot Reload

```bash
# 1. Generar configuración de desarrollo
npx -p @foxframework/core tsfox docker init --env development

# 2. Desarrollo con hot reload
npx -p @foxframework/core tsfox docker run --dev

# O con docker-compose
npx -p @foxframework/core tsfox docker compose -f docker-compose.dev.yml up
```

## 🎯 Best Practices

### 📦 Optimización de Imagen

1. **Multi-stage builds**: Separa dependencias de build y runtime
2. **Base images**: Usa Alpine para images más pequeñas
3. **Layer caching**: Copia package.json antes que el código
4. **Cleanup**: Limpia cache de package managers

### 🔒 Seguridad

1. **Non-root user**: Ejecuta como usuario no privilegiado
2. **Secrets**: Usa Docker secrets para datos sensibles
3. **Network isolation**: Configura networks privadas
4. **Resource limits**: Define limits de CPU y memoria

### 🚀 Performance

1. **Health checks**: Implementa health checks apropiados
2. **Graceful shutdown**: Maneja SIGTERM correctamente
3. **Connection pooling**: Configura pools de DB apropiados
4. **Monitoring**: Incluye métricas y logging

### 🔧 Desarrollo

1. **Volume mounts**: Monta código fuente en desarrollo
2. **Debug ports**: Expone puertos de debug
3. **Hot reload**: Configura watchers automáticos
4. **Environment parity**: Mantén consistency entre entornos

## 📊 Métricas y Monitoring

### Health Endpoints

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.ping();
    
    // Check cache connection  
    await cache.ping();
    
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message 
    });
  }
});
```

### Monitoring con Prometheus

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  app:
    # ... configuración existente
    labels:
      - "prometheus.scrape=true"
      - "prometheus.port=3000"
      - "prometheus.path=/metrics"

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - fox-network

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - fox-network

volumes:
  grafana_data:
```

## 🔗 Enlaces Relacionados

- [CLI Reference](../cli/README.md)
- [Environment Configuration](../configuration/environments.md)
- [Deployment Guide](../deployment/README.md)
- [Monitoring & Observability](../monitoring/README.md)

---

**🎯 Próximos Pasos:**
1. Revisar [CLI Documentation](../cli/README.md) para más comandos
2. Configurar [CI/CD Pipeline](../deployment/cicd.md) con Docker
3. Implementar [Monitoring Stack](../monitoring/docker.md) completo
