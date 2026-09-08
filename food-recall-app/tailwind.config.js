/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 50:"#fef2f2",500:"#dc2626",600:"#b91c1c",900:"#7f1d1d" } } } },
  plugins: []
}
