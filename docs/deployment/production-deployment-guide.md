# 📦 Guía de Deployment - Fox Framework v1.0.0

## 🎯 Descripción General

Esta guía cubre todos los aspectos necesarios para deployar Fox Framework v1.0.0 en producción de manera segura y eficiente.

## 📋 Prerrequisitos

### Ambiente del Sistema

- **Node.js**: v18.0.0 o superior
- **npm**: v8.0.0 o superior  
- **TypeScript**: v5.0.0 o superior
- **Memoria RAM**: Mínimo 512MB, recomendado 2GB
- **Espacio en disco**: Mínimo 1GB libre
- **Sistema Operativo**: Linux (Ubuntu 20.04+), macOS 10.15+, Windows 10+

### Dependencias Requeridas

```bash
# Dependencias de producción
npm install express
npm install axios
npm install compression
npm install helmet
npm install cors
npm install morgan

# Dependencias de desarrollo (opcional para compilación)
npm install -D typescript
npm install -D @types/node
npm install -D @types/express
npm install -D ts-node
```

## 🚀 Proceso de Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd fox-framework
```

### 2. Instalar Dependencias

```bash
# Instalar todas las dependencias
npm install

# Solo dependencias de producción
npm install --production
```

### 3. Compilar TypeScript

```bash
# Compilar para producción
npm run build

# Verificar compilación
npm run test
```

### 4. Configurar Variables de Entorno

Crear archivo `.env`:

```env
# Configuración del servidor
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Configuración de logging
LOG_LEVEL=info
LOG_FILE=./logs/fox-framework.log

# Configuración de health checks
HEALTH_CHECK_INTERVAL=30000
MEMORY_THRESHOLD=90

# Configuración de performance
ENABLE_COMPRESSION=true
ENABLE_HELMET=true
ENABLE_CORS=true

# Configuración de métricas
METRICS_ENDPOINT=/metrics
ENABLE_PROMETHEUS=true
```

## 🏗️ Modos de Deployment

### Opción 1: Deployment Directo

```bash
# Iniciar servidor de producción
npm start

# Con configuración específica
NODE_ENV=production PORT=3000 npm start
```

### Opción 2: Deployment con PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'fox-framework',
    script: './dist/tsfox/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Deployar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Opción 3: Deployment con Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Configurar usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S foxuser -u 1001
USER foxuser

# Comando de inicio
CMD ["npm", "start"]
```

```bash
# Construir imagen
docker build -t fox-framework:v1.0.0 .

# Ejecutar contenedor
docker run -d \
  --name fox-framework \
  -p 3000:3000 \
  --restart unless-stopped \
  -v $(pwd)/logs:/app/logs \
  fox-framework:v1.0.0
```

### Opción 4: Deployment con Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  fox-framework:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - fox-framework
    restart: unless-stopped
```

## ⚙️ Configuración de Producción

### Nginx Reverse Proxy

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream fox_framework {
        server fox-framework:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://fox_framework;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /health {
            proxy_pass http://fox_framework/health;
            access_log off;
        }

        location /metrics {
            proxy_pass http://fox_framework/metrics;
            allow 127.0.0.1;
            deny all;
        }
    }
}
```

### Configuración de SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d yourdomain.com

# Auto-renovación
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoreo y Logging

### Health Checks

El framework incluye health checks automáticos en:

- **Endpoint**: `GET /health`
- **Métricas**: Memory usage, uptime, CPU
- **Intervalo**: Configurable (default: 30s)

### Métricas Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fox-framework'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Logging Configuración

```javascript
// logger.config.js
module.exports = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  timestamp: true,
  transports: [
    {
      type: 'file',
      filename: './logs/fox-framework.log',
      maxsize: '10MB',
      maxFiles: 5
    },
    {
      type: 'console',
      colorize: true
    }
  ]
};
```

## 🔐 Seguridad

### Configuración de Seguridad

```typescript
// Configuración incluida en Fox Framework
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
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

### Variables Sensibles

- Nunca commitear archivos `.env` al repositorio
- Usar variables de entorno para configuración sensible
- Rotar secrets regularmente
- Usar herramientas como HashiCorp Vault para secrets management

## 📈 Optimización de Performance

### Configuraciones Recomendadas

```bash
# Variables de entorno para optimización
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=128
```

### Caching

```typescript
// Configuración de caché incluida
app.use(compression());
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Puerto en uso**
   ```bash
   # Verificar procesos en puerto 3000
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Problemas de memoria**
   ```bash
   # Verificar uso de memoria
   free -h
   ps aux | grep node
   ```

3. **Logs no aparecen**
   ```bash
   # Verificar permisos del directorio logs
   mkdir -p logs
   chmod 755 logs
   ```

### Scripts de Diagnostico

```bash
# health-check.sh
#!/bin/bash
echo "🔍 Fox Framework Health Check"
echo "================================"

# Verificar proceso
if pgrep -f "fox-framework" > /dev/null; then
    echo "✅ Proceso corriendo"
else
    echo "❌ Proceso no encontrado"
fi

# Verificar puerto
if nc -z localhost 3000; then
    echo "✅ Puerto 3000 accesible"
else
    echo "❌ Puerto 3000 no accesible"
fi

# Verificar health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$response" = "200" ]; then
    echo "✅ Health check OK"
else
    echo "❌ Health check failed (HTTP $response)"
fi
```

## 🎯 Checklist de Deployment

### Pre-deployment

- [ ] Tests pasando (99%+ success rate)
- [ ] Validación de staging completada
- [ ] Variables de entorno configuradas
- [ ] SSL certificados configurados
- [ ] Backup de datos existentes
- [ ] Notificación a stakeholders

### Durante Deployment

- [ ] Servidor de aplicación deployado
- [ ] Health checks funcionando
- [ ] Logs generándose correctamente
- [ ] Métricas siendo recolectadas
- [ ] Load balancer configurado
- [ ] CDN configurado (si aplica)

### Post-deployment

- [ ] Smoke tests ejecutados
- [ ] Performance baseline establecido
- [ ] Monitoreo configurado
- [ ] Alertas configuradas
- [ ] Documentación actualizada
- [ ] Equipo notificado

## 📞 Soporte

### Contactos de Emergencia

- **DevOps Lead**: [contacto]
- **Technical Lead**: [contacto]
- **Product Owner**: [contacto]

### Recursos Adicionales

- [Documentación técnica](./docs/api/)
- [Guía de troubleshooting](./docs/troubleshooting.md)
- [Changelog](./CHANGELOG.md)
- [Issues conocidos](./docs/known-issues.md)

---

**Fox Framework v1.0.0 Deployment Guide**  
*Última actualización: Julio 17, 2025*
