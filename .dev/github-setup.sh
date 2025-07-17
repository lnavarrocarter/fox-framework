#!/bin/bash

# 🚀 Fox Framework v1.0.0 - GitHub Repository Setup Script
# Este script automatiza la configuración inicial del repositorio

set -e

echo "🦊 Fox Framework v1.0.0 - GitHub Setup"
echo "======================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar dependencias
check_dependencies() {
    log_info "Verificando dependencias..."
    
    if ! command -v git &> /dev/null; then
        log_error "Git no está instalado"
        exit 1
    fi
    
    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI no está instalado. Algunas funciones no estarán disponibles."
        log_info "Instala con: brew install gh (macOS) o https://cli.github.com/"
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    log_success "Dependencias verificadas"
}

# Verificar estado del repositorio
check_repo_status() {
    log_info "Verificando estado del repositorio..."
    
    if [ ! -d ".git" ]; then
        log_error "No estás en un repositorio Git"
        exit 1
    fi
    
    # Verificar si hay cambios sin commitear
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Hay cambios sin commitear en el repositorio"
        read -p "¿Deseas continuare anyway? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Repositorio verificado"
}

# Verificar archivos necesarios
check_required_files() {
    log_info "Verificando archivos de CI/CD..."
    
    required_files=(
        ".github/workflows/ci-cd.yml"
        "Dockerfile" 
        "docker-compose.yml"
        "package.json"
        "nginx/nginx.conf"
    )
    
    missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_error "Archivos faltantes:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    log_success "Todos los archivos necesarios están presentes"
}

# Generar template de secrets
generate_secrets_template() {
    log_info "Generando template de secrets..."
    
    cat > .dev/github-secrets-template.md << 'EOF'
# 🔐 GitHub Secrets Configuration Template

Copia estos valores a GitHub → Settings → Secrets and variables → Actions

## 🐳 Docker Registry Secrets

```
DOCKER_USERNAME=tu-usuario-dockerhub
DOCKER_PASSWORD=tu-token-dockerhub
```

## 🚀 Deployment Secrets

```
STAGING_HOST=staging.tu-dominio.com
STAGING_USER=deploy
STAGING_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...tu-clave-ssh-privada...
-----END OPENSSH PRIVATE KEY-----

PRODUCTION_HOST=produccion.tu-dominio.com  
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...tu-clave-ssh-privada...
-----END OPENSSH PRIVATE KEY-----
```

## 📢 Notification Secrets (Opcional)

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## 🔒 Application Secrets

```
DATABASE_URL=postgresql://user:password@localhost:5432/foxframework
REDIS_URL=redis://localhost:6379  
JWT_SECRET=tu-jwt-secret-super-seguro
```

---

Personaliza estos valores para tu entorno antes de agregarlos a GitHub.
EOF

    log_success "Template de secrets generado en .dev/github-secrets-template.md"
}

# Generar environment template
generate_env_template() {
    log_info "Generando template de environments..."
    
    cat > .dev/environment-template.env << 'EOF'
# 🌍 Environment Variables Template for Fox Framework

# ===============================
# 🏗️ APPLICATION CONFIGURATION
# ===============================
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# ===============================
# 🗄️ DATABASE CONFIGURATION  
# ===============================
DATABASE_URL=postgresql://foxuser:foxpass@postgres:5432/foxframework
DATABASE_SSL=true
DATABASE_POOL_SIZE=10

# ===============================
# 🔴 REDIS CONFIGURATION
# ===============================
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# ===============================
# 🔐 SECURITY CONFIGURATION
# ===============================
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
SESSION_SECRET=super-secret-session-key-change-in-production

# ===============================
# 📧 EMAIL CONFIGURATION (Opcional)
# ===============================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tu-dominio.com
SMTP_PASS=tu-password-app

# ===============================
# 📊 MONITORING CONFIGURATION
# ===============================
HEALTH_CHECK_INTERVAL=30
METRICS_ENABLED=true
PROMETHEUS_PORT=9090

# ===============================
# 🚀 DEPLOYMENT CONFIGURATION
# ===============================
DEPLOY_TIMEOUT=300
ROLLBACK_ENABLED=true
BACKUP_BEFORE_DEPLOY=true

# ===============================
# 🌐 CDN & ASSETS (Producción)
# ===============================
CDN_URL=https://cdn.tu-dominio.com
STATIC_ASSETS_URL=https://assets.tu-dominio.com

# ===============================
# 🔍 EXTERNAL APIs (Si aplica)
# ===============================
API_KEY=tu-api-key-externa
THIRD_PARTY_URL=https://api.servicio-externo.com
EOF

    log_success "Template de environment generado en .dev/environment-template.env"
}

# Validar workflow
validate_workflow() {
    log_info "Validando workflow de CI/CD..."
    
    # Verificar sintaxis básica del workflow
    if ! grep -q "CI/CD Pipeline" .github/workflows/ci-cd.yml; then
        log_error "Workflow no tiene el nombre correcto"
        return 1
    fi
    
    if ! grep -q "docker/build-push-action\|docker build" .github/workflows/ci-cd.yml; then
        log_error "Workflow no incluye build de Docker"
        return 1
    fi
    
    if ! grep -q "npm test\|npm run test" .github/workflows/ci-cd.yml; then
        log_error "Workflow no incluye tests"
        return 1
    fi
    
    log_success "Workflow validado correctamente"
}

# Crear checklist de setup
create_setup_checklist() {
    log_info "Creando checklist de setup..."
    
    cat > .dev/setup-checklist.md << 'EOF'
# ✅ Fox Framework GitHub Setup Checklist

## 🔐 Secrets Configuration

- [ ] DOCKER_USERNAME configurado
- [ ] DOCKER_PASSWORD configurado  
- [ ] STAGING_HOST configurado
- [ ] STAGING_USER configurado
- [ ] STAGING_SSH_KEY configurado
- [ ] PRODUCTION_HOST configurado
- [ ] PRODUCTION_USER configurado
- [ ] PRODUCTION_SSH_KEY configurado
- [ ] SLACK_WEBHOOK_URL configurado (opcional)

## 🛡️ Branch Protection

- [ ] Branch protection rule para `main` creada
- [ ] Status checks requeridos configurados
- [ ] Require PR before merging habilitado
- [ ] Require up-to-date branches habilitado

## 🌍 Environments

- [ ] Environment `staging` creado
- [ ] Environment `production` creado
- [ ] Required reviewers para production configurados
- [ ] Environment secrets configurados

## 🚀 Servers Setup

- [ ] Servidor de staging preparado
- [ ] Docker instalado en staging
- [ ] Servidor de producción preparado  
- [ ] Docker instalado en producción
- [ ] SSH keys configuradas

## 🧪 Testing

- [ ] Primer push a main realizado
- [ ] Pipeline ejecuta correctamente
- [ ] Tests pasan
- [ ] Build exitoso
- [ ] Deploy a staging funciona
- [ ] Deploy a production funciona
- [ ] Health checks responden

## 📊 Monitoring

- [ ] Prometheus accesible
- [ ] Grafana accesible
- [ ] Dashboards configurados
- [ ] Alertas configuradas
- [ ] Notificaciones funcionando

---

Marca cada item cuando esté completado.
EOF

    log_success "Checklist generado en .dev/setup-checklist.md"
}

# Función principal
main() {
    echo
    log_info "Iniciando setup de Fox Framework v1.0.0..."
    echo
    
    # Ejecutar verificaciones
    check_dependencies
    check_repo_status
    check_required_files
    validate_workflow
    
    echo
    log_info "Generando templates y documentación..."
    
    # Crear directorio .dev si no existe
    mkdir -p .dev
    
    # Generar templates
    generate_secrets_template
    generate_env_template
    create_setup_checklist
    
    echo
    log_success "🎉 Setup inicial completado!"
    echo
    log_info "Próximos pasos:"
    echo "1. Revisa .dev/github-secrets-template.md y configura los secrets en GitHub"
    echo "2. Revisa .dev/environment-template.env para configurar tus servidores"
    echo "3. Sigue .dev/setup-checklist.md para completar la configuración"
    echo "4. Lee .dev/github-setup-guide.md para instrucciones detalladas"
    echo
    log_info "Cuando esté listo, ejecuta: git add . && git commit -m 'feat: complete GitHub setup' && git push origin main"
    echo
}

# Ejecutar si se llama directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
