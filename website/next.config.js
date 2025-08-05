// next.config.js
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  },
});

module.exports = withNextra({
  reactStrictMode: true,
  images: {
    domains: ['raw.githubusercontent.com'],
  },
});
