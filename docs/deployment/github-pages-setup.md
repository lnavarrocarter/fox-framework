# 🚀 Configuración de GitHub Pages para Fox Framework

Esta documentación explica cómo está configurado el deployment automático de la documentación a GitHub Pages.

## 📋 Configuración Realizada

### 1. GitHub Actions Workflow

Se creó `.github/workflows/deploy-docs.yml` que:

- **Triggers**: Se ejecuta en push a `main` cuando cambian:
  - `website/**`
  - `docs/**` 
  - El propio workflow

- **Build Process**:
  - Instala Node.js 18
  - Instala dependencias con `npm ci`
  - Configura GitHub Pages
  - Construye el sitio con `npm run build`
  - Crea archivo `.nojekyll`
  - Sube los artifacts

- **Deploy Process**:
  - Despliega a GitHub Pages automáticamente
  - Proporciona URL de acceso

### 2. Configuración de Next.js

Se modificó `website/next.config.js` para:

- **Static Export**: `output: 'export'` para generar sitio estático
- **Base Path**: Configuración automática para GitHub Pages
- **Asset Prefix**: URLs correctas para assets
- **Images**: Deshabilitada optimización para static export
- **Trailing Slash**: URLs consistentes

### 3. Scripts de NPM

Se agregaron scripts en `website/package.json`:

```json
{
  "build": "GITHUB_PAGES=true next build",
  "build:local": "next build", 
  "export": "GITHUB_PAGES=true next build && next export",
  "deploy": "npm run export && touch out/.nojekyll"
}
```

### 4. Configuración del Tema

Se actualizó `website/theme.config.tsx` con:

- Meta tags optimizados para SEO
- Open Graph para redes sociales
- Enlaces canónicos
- Configuración de feedback y edición

## 🌍 URLs de Acceso

- **Desarrollo**: http://localhost:3000
- **Producción**: https://lnavarrocarter.github.io/fox-framework/

## 🔧 Cómo Funciona

### Proceso Automático

1. **Desarrollador hace push** a `main` con cambios en documentación
2. **GitHub Actions detecta** cambios en las rutas configuradas
3. **Build automático** se ejecuta en Ubuntu
4. **Next.js genera** sitio estático en carpeta `out/`
5. **GitHub Pages despliega** automáticamente
6. **Sitio actualizado** disponible en minutos

### Variables de Entorno

- `GITHUB_PAGES=true`: Activa configuración para GitHub Pages
- `NODE_ENV=production`: Optimizaciones de producción

## 🛠️ Testing Local

### Opción 1: Script Automático
```bash
# Desde la raíz del proyecto
./scripts/test-github-pages.sh
```

### Opción 2: Manual
```bash
cd website

# Build para GitHub Pages
GITHUB_PAGES=true npm run build

# Crear .nojekyll
touch out/.nojekyll

# Servir localmente
npx serve out -p 8080
# O con Python: cd out && python3 -m http.server 8080
```

## 📁 Estructura de Output

```
website/out/
├── index.html              # Página principal
├── docs/                   # Documentación
│   ├── getting-started.html
│   ├── fundamentals.html
│   └── ...
├── _next/                  # Assets de Next.js
│   ├── static/
│   └── ...
├── .nojekyll              # Deshabilita Jekyll
└── 404.html               # Página de error 404
```

## ⚙️ Configuración en GitHub

### 1. Habilitar GitHub Pages

1. Ve a **Settings** > **Pages** en tu repositorio
2. En **Source** selecciona **GitHub Actions**
3. ✅ Listo - no necesitas configurar nada más

### 2. Verificar Permisos

En **Settings** > **Actions** > **General**:
- ✅ **Workflow permissions**: Read and write permissions
- ✅ **Allow GitHub Actions to create and approve pull requests**

## 🔍 Troubleshooting

### Build Falla

```bash
# Verificar logs en GitHub Actions
# Ir a: https://github.com/tu-usuario/fox-framework/actions

# Test local
cd website
npm ci
npm run build
```

### URLs Rotas

- Verificar `basePath` en `next.config.js`
- Confirmar `assetPrefix` correcto
- Revisar enlaces relativos vs absolutos

### Assets No Cargan

- Verificar que `images.unoptimized = true`
- Confirmar rutas en `public/`
- Revisar CORS si hay errores de red

### CSS No Aplica

- Verificar que Tailwind CSS esté compilando
- Confirmar que `globals.css` se importa
- Revisar build de Next.js

## 🚦 Status del Deploy

Puedes verificar el status en:

- **GitHub Actions**: https://github.com/lnavarrocarter/fox-framework/actions
- **GitHub Pages**: Settings > Pages
- **Site URL**: https://lnavarrocarter.github.io/fox-framework/

## 📈 Optimizaciones Incluidas

- ✅ **SEO**: Meta tags completos
- ✅ **Performance**: Static generation optimizada
- ✅ **Cache**: Headers correctos para cache
- ✅ **Compression**: Gzip automático por GitHub Pages
- ✅ **CDN**: GitHub's global CDN
- ✅ **HTTPS**: SSL automático
- ✅ **Search**: Búsqueda integrada con Nextra

## 🔄 Actualizaciones

Para actualizar la documentación:

1. **Edita archivos** en `website/pages/docs/`
2. **Commit y push** a `main`
3. **Espera 2-5 minutos** para deploy automático
4. **Verifica** en la URL de producción

¡Es así de simple! 🎉

## 📞 Soporte

Si tienes problemas:

1. Revisa logs en GitHub Actions
2. Prueba build local
3. Verifica configuración en Settings > Pages
4. Crea issue en GitHub si persiste el problema
