/** @type {import('tailwindcss').Config} */
const { tailwindPreset } = require('@rallia/design-system/tailwind.preset');

module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    // Include shared components from monorepo
    '../../packages/shared-components/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      ...tailwindPreset.theme.extend,
    },
  },
  darkMode: 'class',
  plugins: [],
};
