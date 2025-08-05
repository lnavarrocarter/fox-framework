# Sitio Web de Fox Framework

Este directorio contiene el código fuente del sitio web oficial de Fox Framework, que sirve como documentación, guía y portal de recursos para desarrolladores.

## Tecnologías Utilizadas

- [Next.js](https://nextjs.org/) - Framework React con renderizado del lado del servidor
- [Nextra](https://nextra.site/) - Framework de documentación construido sobre Next.js
- [Tailwind CSS](https://tailwindcss.com/) - Framework de CSS utilitario
- [MDX](https://mdxjs.com/) - Markdown con componentes JSX

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
