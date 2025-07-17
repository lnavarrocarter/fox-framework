# 🚀 Quick Start - GitHub Repository Configuration

## 📖 Overview

Fox Framework v1.0.0 está listo para producción con una infraestructura completa de CI/CD. Esta guía te ayudará a configurar tu repositorio GitHub en **5 pasos simples**.

## ⚡ Quick Setup (5 minutos)

### 1️⃣ Configurar Docker Hub

```bash
# 1. Crear cuenta en Docker Hub (si no tienes)
# 2. Crear Access Token:
#    Docker Hub → Account Settings → Security → New Access Token
# 3. Guardar: usuario y token
```

### 2️⃣ Configurar GitHub Secrets

Ve a tu repositorio GitHub → **Settings** → **Secrets and variables** → **Actions**

**Secrets mínimos requeridos:**
```
DOCKER_USERNAME=tu-usuario-dockerhub
DOCKER_PASSWORD=tu-token-dockerhub
```

### 3️⃣ Configurar Branch Protection

```bash
# GitHub → Settings → Branches → Add rule
Branch name pattern: main
☑️ Require a pull request before merging
☑️ Require status checks to pass before merging
```

### 4️⃣ Primer Deploy

```bash
# En tu terminal local:
git add .
git commit -m "feat: setup complete CI/CD infrastructure"
git push origin main

# Esto trigggerará automáticamente el pipeline de CI/CD
```

### 5️⃣ Monitorear Pipeline

1. Ve a **Actions** en tu repositorio GitHub
2. Observa el workflow **🦊 Fox Framework CI/CD Pipeline**
3. Verifica que todas las fases pasen:
   - ✅ Tests (Unit + Integration)
   - ✅ Security (CodeQL + npm audit)
   - ✅ Build (Docker image)

## 🎯 ¿Qué sucede después del push?

### Pipeline Automático
```
📋 Tests → 🔒 Security → 🐳 Build → 📊 Summary
```

### Resultados Esperados
- **Tests:** 999+ unit tests + 12 integration tests ✅
- **Security:** CodeQL scan + npm audit ✅  
- **Build:** Docker image creada y lista ✅
- **Artifacts:** Docker image disponible en registry ✅

## 🌐 Configuración Avanzada (Opcional)

Si quieres deployment automático, agrega estos secrets adicionales:

```bash
# Para staging
STAGING_HOST=staging.tu-dominio.com
STAGING_USER=deploy
STAGING_SSH_KEY=tu-ssh-private-key

# Para producción  
PRODUCTION_HOST=tu-dominio.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=tu-ssh-private-key
```

## ✅ Validación

Después del primer push exitoso:

```bash
# Verificar que el pipeline pasó
# GitHub → Actions → último workflow run

# Verificar Docker image
docker pull tu-usuario/fox-framework:latest
docker run -p 3000:3000 tu-usuario/fox-framework:latest

# Test local
curl http://localhost:3000/health
```

## 🆘 Troubleshooting

### ❌ Pipeline Falla en Tests
```bash
# Verificar localmente
npm test
npm run test:integration

# Si hay errores, corrígelos y vuelve a hacer push
```

### ❌ Docker Build Falla
```bash
# Verificar build local
docker build -t fox-framework:test .

# Verificar secrets de Docker Hub
# GitHub → Settings → Secrets → Verificar nombres exactos
```

### ❌ Push es Rechazado
```bash
# Si configuraste branch protection muy estricto
# Temporalmente, ve a GitHub → Settings → Branches
# y relaja las reglas para el primer push
```

## 📚 Documentación Completa

Para configuración avanzada, consulta:

- 📖 **Guía Completa:** `.dev/github-setup-guide.md`
- 🔐 **Template de Secrets:** `.dev/github-secrets-template.md`
- 🌍 **Variables de Entorno:** `.dev/environment-template.env`
- ✅ **Checklist:** `.dev/setup-checklist.md`

## 🎊 ¡Listo!

Una vez que el pipeline pase exitosamente, Fox Framework v1.0.0 estará **oficialmente listo para producción**.

---

**Next:** Configurar servidores de staging/producción para deployment automático.
