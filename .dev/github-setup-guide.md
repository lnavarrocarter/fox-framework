# 🔧 Configuración del Repositorio GitHub - Fox Framework v1.0.0

Esta guía te llevará paso a paso para configurar tu repositorio GitHub con todos los secretos y configuraciones necesarias para que el pipeline de CI/CD funcione correctamente.

## 📋 Prerrequisitos

- ✅ Repositorio GitHub creado
- ✅ Docker Hub account (o otro registry)
- ✅ Servidor de staging configurado
- ✅ Servidor de producción configurado
- ✅ Slack workspace (opcional para notificaciones)

## 🔐 Paso 1: Configurar GitHub Secrets

Ve a tu repositorio GitHub → **Settings** → **Secrets and variables** → **Actions** y agrega los siguientes secretos:

### 🐳 Docker Registry Secrets

```bash
# Docker Hub credentials
DOCKER_USERNAME=tu-usuario-dockerhub
DOCKER_PASSWORD=tu-token-dockerhub

# Opcional: Registry privado
DOCKER_REGISTRY=registry.ejemplo.com
```

### 🚀 Deployment Secrets

```bash
# Staging Environment
STAGING_HOST=staging.tu-dominio.com
STAGING_USER=deploy
STAGING_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...tu-clave-ssh-privada...
-----END OPENSSH PRIVATE KEY-----

# Production Environment  
PRODUCTION_HOST=produccion.tu-dominio.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...tu-clave-ssh-privada...
-----END OPENSSH PRIVATE KEY-----
```

### 📢 Notification Secrets (Opcional)

```bash
# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ci-cd@tu-dominio.com
SMTP_PASSWORD=tu-password-app
NOTIFICATION_EMAIL=equipo@tu-dominio.com
```

### 🔒 Security Secrets

```bash
# GitHub Token para operaciones avanzadas
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Secrets de aplicación
DATABASE_URL=postgresql://user:password@localhost:5432/foxframework
REDIS_URL=redis://localhost:6379
JWT_SECRET=tu-jwt-secret-super-seguro
API_KEY=tu-api-key-externa
```

## 🛡️ Paso 2: Configurar Branch Protection Rules

1. Ve a **Settings** → **Branches**
2. Haz clic en **Add rule**
3. Configura la regla para `main`:

```yaml
Branch name pattern: main
☑️ Require a pull request before merging
☑️ Require status checks to pass before merging
    - ci-cd / test
    - ci-cd / security  
    - ci-cd / build
☑️ Require branches to be up to date before merging
☑️ Require conversation resolution before merging
☑️ Restrict pushes that create files larger than 100MB
☑️ Do not allow bypassing the above settings
```

## 🌍 Paso 3: Configurar Environments

### Staging Environment

1. Ve a **Settings** → **Environments**
2. Crea ambiente **staging**:

```yaml
Environment name: staging
☑️ Required reviewers: (opcional para staging)
☑️ Wait timer: 0 minutes
☑️ Deployment branches: Only protected branches

Environment secrets:
- STAGING_DATABASE_URL
- STAGING_REDIS_URL
- STAGING_API_KEY

Environment variables:
- NODE_ENV=staging
- LOG_LEVEL=debug
- HEALTH_CHECK_INTERVAL=30
```

### Production Environment

1. Crea ambiente **production**:

```yaml
Environment name: production
☑️ Required reviewers: @tu-usuario, @team-lead
☑️ Wait timer: 5 minutes
☑️ Deployment branches: Only protected branches

Environment secrets:
- PRODUCTION_DATABASE_URL
- PRODUCTION_REDIS_URL
- PRODUCTION_API_KEY

Environment variables:
- NODE_ENV=production
- LOG_LEVEL=warn
- HEALTH_CHECK_INTERVAL=60
```

## 📝 Paso 4: Configurar Variables de Repository

Ve a **Settings** → **Secrets and variables** → **Actions** → **Variables**:

```bash
# Configuración del proyecto
PROJECT_NAME=fox-framework
DOCKER_IMAGE_NAME=fox-framework
REGISTRY_URL=registry.hub.docker.com

# URLs de deployment
STAGING_URL=https://staging.tu-dominio.com
PRODUCTION_URL=https://tu-dominio.com

# Configuración de salud
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_TIMEOUT=30

# Configuración de tests
TEST_TIMEOUT=300
COVERAGE_THRESHOLD=80
```

## 🔄 Paso 5: Verificar Configuración del Workflow

Asegúrate de que el archivo `.github/workflows/ci-cd.yml` esté actualizado con los nombres correctos de secretos:

```yaml
# Ejemplo de uso de secretos en el workflow
env:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
  STAGING_HOST: ${{ secrets.STAGING_HOST }}
  PRODUCTION_HOST: ${{ secrets.PRODUCTION_HOST }}
  SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 🚀 Paso 6: Primer Deploy

### 6.1 Preparar el Primer Push

```bash
# 1. Asegurar que todos los archivos estén en el repo
git add .
git commit -m "feat: complete CI/CD infrastructure setup

- Add GitHub Actions workflow
- Add Docker configuration
- Add monitoring stack
- Add Nginx reverse proxy
- Ready for production deployment"

# 2. Push a main para triggear el pipeline
git push origin main
```

### 6.2 Monitorear la Primera Ejecución

1. Ve a **Actions** en tu repositorio
2. Deberías ver el workflow **CI/CD Pipeline** ejecutándose
3. Monitorea cada step:
   - ✅ **Test**: Unit + Integration tests
   - ✅ **Security**: CodeQL + npm audit
   - ✅ **Build**: Docker image build + push
   - ⏸️ **Staging**: Deploy automático (si está configurado)
   - ⏸️ **Production**: Esperando aprobación manual

### 6.3 Aprobar Deploy a Producción

1. Si el deploy a staging es exitoso
2. Ve a **Actions** → tu workflow run
3. Haz clic en **Review deployments**
4. Selecciona **production** y haz clic en **Approve and deploy**

## 🔧 Paso 7: Configuración de Servidores

### Servidor de Staging

```bash
# SSH al servidor de staging
ssh deploy@staging.tu-dominio.com

# Instalar Docker y docker-compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Crear directorio del proyecto
mkdir -p /opt/fox-framework
sudo chown deploy:deploy /opt/fox-framework

# Configurar variables de entorno
cat > /opt/fox-framework/.env << EOF
NODE_ENV=staging
DATABASE_URL=postgresql://foxuser:foxpass@postgres:5432/foxframework_staging
REDIS_URL=redis://redis:6379
LOG_LEVEL=debug
EOF
```

### Servidor de Producción

```bash
# SSH al servidor de producción
ssh deploy@produccion.tu-dominio.com

# Mismos pasos que staging, pero con configuración de producción
mkdir -p /opt/fox-framework
cat > /opt/fox-framework/.env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://foxuser:securepass@postgres:5432/foxframework
REDIS_URL=redis://redis:6379
LOG_LEVEL=warn
EOF
```

## 📊 Paso 8: Configurar Monitoreo

### 8.1 Acceso a Grafana

1. Accede a `http://tu-servidor:3001`
2. Login inicial: `admin/admin`
3. Cambia la contraseña por defecto
4. Importa dashboards pre-configurados

### 8.2 Configurar Alertas

1. Ve a **Alerting** → **Alert Rules**
2. Configura alertas para:
   - CPU > 80%
   - Memory > 90%
   - Disk > 85%
   - Application down
   - High error rate

### 8.3 Configurar Notificaciones

1. Ve a **Alerting** → **Contact Points**
2. Agrega Slack/Email como canales de notificación
3. Configura routing basado en severidad

## ✅ Paso 9: Validación Final

### 9.1 Checklist de Configuración

- [ ] ✅ Todos los secretos configurados
- [ ] ✅ Branch protection habilitada
- [ ] ✅ Environments configurados
- [ ] ✅ Servidores preparados
- [ ] ✅ Monitoreo configurado
- [ ] ✅ Primer pipeline ejecutado exitosamente

### 9.2 Test de Extremo a Extremo

```bash
# 1. Hacer un cambio pequeño
echo "console.log('Pipeline test');" >> src/server/test-deploy.js

# 2. Commit y push
git add .
git commit -m "test: validate complete CI/CD pipeline"
git push origin main

# 3. Verificar pipeline completo
# - Tests pasan ✅
# - Build exitoso ✅  
# - Deploy a staging ✅
# - Validación de staging ✅
# - Aprobación manual para producción ⏸️
# - Deploy a producción ✅
# - Validación de producción ✅
```

## 🎯 Próximos Pasos

Una vez completada la configuración:

1. **Documentar URLs**: Staging y Producción
2. **Configurar DNS**: Dominios y subdominios
3. **Configurar SSL**: Certificados Let's Encrypt
4. **Configurar CDN**: Para assets estáticos
5. **Configurar Backup**: Base de datos y volúmenes
6. **Configurar Logs**: Agregación centralizada

## 🆘 Troubleshooting

### Pipeline Falla

```bash
# Verificar logs del workflow
# GitHub → Actions → Workflow run → Step específico

# Verificar secrets
# Settings → Secrets → Verificar nombres exactos

# Verificar conectividad a servidores
ssh -T deploy@staging.tu-dominio.com
```

### Deploy Falla

```bash
# SSH al servidor y verificar
docker ps
docker logs container-name
docker-compose logs

# Verificar variables de entorno
cat /opt/fox-framework/.env
```

### Monitoreo No Funciona

```bash
# Verificar servicios
docker ps | grep -E "(prometheus|grafana)"
curl http://localhost:9090/-/healthy
curl http://localhost:3001/api/health
```

---

**¡Listo para el lanzamiento! 🚀**

Con esta configuración completa, Fox Framework v1.0.0 tendrá un pipeline de CI/CD robusto y listo para producción.
