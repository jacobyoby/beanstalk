/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: '#fffdf7',
        zinc: {
          50: '#f8f6ee', 100: '#efeee4', 200: '#dedfd2', 300: '#c5ccbd',
          400: '#a0ad9a', 500: '#667260', 600: '#53614e', 700: '#3d503d',
          800: '#293c2e', 900: '#1b2d23', 950: '#111e17',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
