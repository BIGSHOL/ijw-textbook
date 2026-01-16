/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.tsx",
    "./components/**/*.tsx",
    "./services/**/*.ts",
    "./data/**/*.ts",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
        serif: ['"Noto Serif KR"', 'serif'],
      },
      colors: {
        brand: {
          green: '#6d8e42',
          brown: '#5d4037',
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

