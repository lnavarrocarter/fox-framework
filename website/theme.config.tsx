import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>🦊 Fox Framework</span>,
  project: {
    link: 'https://github.com/lnavarrocarter/fox-framework',
  },
  docsRepositoryBase: 'https://github.com/lnavarrocarter/fox-framework/tree/main/website',
  footer: {
    text: `© ${new Date().getFullYear()} Fox Framework. MIT License.`,
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Fox Framework'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Fox Framework: Un framework web moderno para TypeScript/Node.js" />
      <meta name="og:title" content="Fox Framework" />
      <meta name="og:description" content="Framework web moderno para TypeScript/Node.js con arquitectura escalable" />
      <meta name="og:url" content="https://lnavarrocarter.github.io/fox-framework/" />
      <meta name="og:image" content="https://lnavarrocarter.github.io/fox-framework/fox-framework-og.png" />
      <link rel="canonical" href="https://lnavarrocarter.github.io/fox-framework/" />
    </>
  ),
  faviconGlyph: '🦊',
  chat: {
    link: 'https://discord.gg/fox-framework',
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
  navigation: {
    prev: true,
    next: true,
  },
  // Configuración para GitHub Pages
  editLink: {
    text: 'Editar esta página en GitHub →'
  },
  feedback: {
    content: '¿Alguna pregunta? Danos tu feedback →',
    labels: 'feedback'
  },
}

export default config
