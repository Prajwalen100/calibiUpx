/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // small-phone breakpoint: iPhone SE / Galaxy S are 360-375px wide
        xs: '400px',
      },
      colors: {
        calibiai: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
        navy: {
          900: '#0B1220',
          800: '#151E32',
          700: '#1E2A44',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Display face for wordmarks and partner lockups. A class beats the
        // global `* { font-family: Inter }` rule on specificity, so this works
        // without !important.
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
