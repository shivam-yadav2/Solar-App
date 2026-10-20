/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: keep this content list in sync with the folder layout below.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' lets the app follow the phone's light/dark setting on web too (media mode throws there).
  darkMode: 'class',
  theme: {
    extend: {
      // Mirrors the web app's palette so class names port over 1:1.
      colors: {
        brand: {
          amber: '#f59e0b',
          amberDark: '#d97706',
          ink: '#0B0F17',
        },
      },
    },
  },
  plugins: [],
};
