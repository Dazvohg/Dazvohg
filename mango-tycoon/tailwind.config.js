/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mango: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
        argentina: {
          blue: '#74ACDF',
          'blue-dark': '#4A7FB5',
        },
      },
      fontFamily: {
        game: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
