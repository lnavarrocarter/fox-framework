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
}

export default config
