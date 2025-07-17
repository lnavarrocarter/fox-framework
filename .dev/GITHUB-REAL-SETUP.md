# 🚀 Fox Framework - Configuración GitHub Real

## ⚡ **Pasos Immediatos para Configurar GitHub**

### 1. 🔐 **Configurar Secrets en GitHub**

Ve a: `https://github.com/lnavarrocarter/fox-framework/settings/secrets/actions`

#### **Required Secrets:**
```
DOCKER_USERNAME=lnavarrocarter  
DOCKER_PASSWORD=[tu-dockerhub-token]
```

#### **Staging Secrets:**
```
STAGING_HOST=staging.foxframework.com
STAGING_USER=deploy
STAGING_SSH_KEY=[tu-ssh-key-privada]
```

#### **Production Secrets:**
```
PRODUCTION_HOST=foxframework.com
PRODUCTION_USER=deploy  
PRODUCTION_SSH_KEY=[tu-ssh-key-privada]
```

### 2. 🛡️ **Configurar Branch Protection**

Ve a: `https://github.com/lnavarrocarter/fox-framework/settings/branch_protection_rules/new`

**Configurar para branch `main`:**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Status checks que deben pasar:
  - `test / 🧪 Test Suite`
  - `security / 🔐 Security Scan`
  - `build / 🏗️ Build & Package`

### 3. 🌍 **Crear Environments**

Ve a: `https://github.com/lnavarrocarter/fox-framework/settings/environments`

#### **Environment: staging**
```
Name: staging
Protection rules: None
Environment secrets: 
  - STAGING_URL=https://staging.foxframework.com
```

#### **Environment: production**  
```
Name: production
Protection rules:
  ✅ Required reviewers (1 reviewer minimum)
  ✅ Wait timer (0 minutes)
Environment secrets:
  - PRODUCTION_URL=https://foxframework.com
```

### 4. 🎯 **Variables de Repository**

Ve a: `https://github.com/lnavarrocarter/fox-framework/settings/variables/actions`

```
STAGING_URL=https://staging.foxframework.com
PRODUCTION_URL=https://foxframework.com
```

---

## 🛠️ **Configuración de Servidores (Opcional)**

Si tienes servidores reales, configura:

### **Staging Server:**
```bash
# En el servidor staging
sudo useradd -m deploy
sudo mkdir /home/deploy/.ssh
sudo chown deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Agregar tu SSH public key
echo "tu-ssh-public-key" | sudo tee /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
```

### **Production Server:**
```bash
# Mismos pasos que staging server
# Pero con configuración de producción
```

---

## ✅ **Verificación Final**

Una vez configurado todo, ejecuta:

```bash
# Push un pequeño cambio para triggear el pipeline
git commit --allow-empty -m "test: trigger CI/CD pipeline"
git push origin main
```

Ve a: `https://github.com/lnavarrocarter/fox-framework/actions` para verificar que el pipeline se ejecute correctamente.

---

## 🚨 **Troubleshooting**

### Pipeline falla en Docker step:
- Verificar DOCKER_USERNAME y DOCKER_PASSWORD
- Asegurar que el token Docker tiene permisos write

### Pipeline falla en deployment:
- Verificar SSH keys y conectividad
- Revisar que el usuario deploy existe en el servidor

### Tests fallan:
- Ejecutar `npm test` localmente primero
- Verificar que todos los tests pasen localmente

---

## 📞 **Siguiente Paso**

Una vez completada esta configuración, el Fox Framework estará **100% listo para producción** con un pipeline CI/CD completamente funcional.

**¡Vamos a configurar GitHub ahora! 🚀**
