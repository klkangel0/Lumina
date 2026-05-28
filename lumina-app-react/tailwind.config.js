/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lumina: {
          blue: {
            500: '#6E9EFF',
            600: '#5B8FFF',
            'light': 'rgba(110, 158, 255, 0.1)',
          },
          green: {
            500: '#10b981',
          },
          red: {
            500: '#dc3545',
            600: '#c82333',
          },
          yellow: {
            500: '#f59e0b',
          }
        },
        background: {
          main: '#f5f5f7',
          card: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}
