// next.config.js
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  },
});

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'fox-framework'; // Nombre de tu repositorio

module.exports = withNextra({
  reactStrictMode: true,
  
  // Configuración para GitHub Pages
  output: 'export',
  trailingSlash: true,
  basePath: isGitHubPages ? `/${repoName}` : '',
  assetPrefix: isGitHubPages ? `/${repoName}/` : '',
  
  // Configuración de imágenes para static export
  images: {
    unoptimized: true,
    domains: ['raw.githubusercontent.com'],
  },
  
  // Configuración adicional para GitHub Pages
  ...(isGitHubPages && {
    experimental: {
      images: {
        unoptimized: true
      }
    }
  })
});
