# Fox Framework Documentation Website

Este directorio contiene el sitio web de documentación de Fox Framework, construido con [Nextra](https://nextra.site/) y [Next.js](https://nextjs.org/).

## 🚀 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# El sitio estará disponible en http://localhost:3000
```

## 📦 Build y Deploy

### Build Local
```bash
# Build para desarrollo local
npm run build:local

# Build para GitHub Pages
npm run build
```

### Deploy Automático

El sitio se despliega automáticamente a GitHub Pages cuando se hacen cambios en:
- `website/**` 
- `docs/**`
- `.github/workflows/deploy-docs.yml`

### Deploy Manual

```bash
# Build y export para GitHub Pages
npm run export

# O ejecutar todo el proceso de deploy
npm run deploy
```

## 📁 Estructura

```
website/
├── pages/           # Páginas de la documentación
│   ├── docs/        # Documentación principal
│   ├── guides/      # Guías y tutoriales
│   ├── examples/    # Ejemplos de código
│   └── api-reference/ # Referencia de API
├── public/          # Assets estáticos
├── components/      # Componentes React personalizados
├── styles/          # Estilos CSS personalizados
├── next.config.js   # Configuración de Next.js
├── theme.config.tsx # Configuración del tema Nextra
└── package.json     # Dependencies y scripts
```

## 🌍 URLs

- **Desarrollo**: http://localhost:3000
- **Producción**: https://lnavarrocarter.github.io/fox-framework/

## 📝 Contribuir

Para contribuir a la documentación:

1. Edita los archivos MDX en `pages/docs/`
2. Agrega nuevas páginas siguiendo la estructura existente
3. Actualiza `_meta.json` para el menú de navegación
4. Haz commit y push - el deploy es automático

## 🛠️ Tecnologías

- **Next.js 13+**: Framework React
- **Nextra**: Generador de sitios de documentación
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Framework CSS
- **GitHub Pages**: Hosting estático
- **GitHub Actions**: CI/CD automático

## Estructura del Proyecto

```
website/
├── components/          # Componentes React reutilizables
├── pages/               # Páginas y documentación (MDX)
│   ├── api-reference/   # Referencia detallada de la API
│   ├── docs/            # Documentación principal
│   ├── examples/        # Ejemplos de código
│   ├── guides/          # Guías paso a paso
│   └── ...
├── public/              # Archivos estáticos (imágenes, etc.)
├── styles/              # CSS global y Tailwind
├── theme.config.tsx     # Configuración del tema Nextra
├── next.config.js       # Configuración de Next.js
└── package.json         # Dependencias
```

## Desarrollo Local

Para ejecutar el sitio en modo desarrollo:

1. Instalar dependencias:

```bash
cd website
npm install
```

2. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

3. Abrir [http://localhost:3000](http://localhost:3000) en tu navegador

## Construir para Producción

Para construir una versión optimizada para producción:

```bash
npm run build
```

Esto generará una versión estática del sitio en la carpeta `out/`.

## Despliegue

El sitio se puede desplegar en cualquier plataforma que soporte sitios web estáticos:

- Vercel (recomendado)
- Netlify
- GitHub Pages
- Servidor web tradicional

## Contribuir

Para contribuir al sitio web:

1. Haz un fork del repositorio principal
2. Crea una rama para tu característica (`git checkout -b feature/nueva-seccion-docs`)
3. Haz tus cambios y realiza un commit (`git commit -m 'Añadir nueva sección de documentación'`)
4. Envía tus cambios (`git push origin feature/nueva-seccion-docs`)
5. Abre un Pull Request

## Pautas para la Documentación

- Usa Markdown para formatear texto
- Incluye ejemplos de código cuando sea relevante
- Mantén un tono claro y consistente
- Sigue la estructura existente para nuevas secciones
- Usa componentes React para elementos complejos o interactivos
