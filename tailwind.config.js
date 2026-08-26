/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: keep this content list in sync with the folder layout below.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
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
