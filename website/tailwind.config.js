/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,md,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'fox-orange': '#FF6B35',
        'fox-dark': '#2D3142',
        'fox-light': '#F7F7F9',
        'fox-accent': '#2EC4B6',
      },
    },
  },
  plugins: [],
}
