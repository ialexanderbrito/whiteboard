/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        miro: {
          blue: '#4262ff',
          yellow: '#fff9b1',
          pink: '#f5d0fe',
          green: '#bbf7d0',
          orange: '#fed7aa',
          cyan: '#bae6fd',
          dark: '#050038',
        }
      }
    },
  },
  plugins: [],
}
