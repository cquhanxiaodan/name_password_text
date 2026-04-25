/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6c5ce7',
        secondary: '#a29bfe',
        accent: '#fd79a8',
        neutral: '#1c2030',
        'base-100': '#151822',
        'base-200': '#1c2030',
        'base-300': '#232838',
        info: '#0984e3',
        success: '#51cf94',
        warning: '#ffc078',
        error: '#ff6b6b',
      },
    },
  },
}
