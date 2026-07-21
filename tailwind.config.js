/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: '#0B2D5B',
          claro: '#1C7ED6',
        },
        fondo: '#F4F6F9',
        yema: '#E8A33D',
        perdida: '#C1443C',
        fresco: '#3C9F6E',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
