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
