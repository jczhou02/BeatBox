const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Include *all* places where you use Tailwind classes:
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        background: '#121212',
        surface: '#1E1E1E',
        primary: {
          DEFAULT: '#FF4081',
          light: '#FF79B0',
          dark: '#C60055',
        },
        secondary: {
          DEFAULT: '#7C4DFF',
          light: '#B47CFF',
          dark: '#3F1DCB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',  // IE 10+
          'scrollbar-width': 'none',       // Firefox
          '&::-webkit-scrollbar': {
            display: 'none',             // Chrome, Safari, Opera
          },
        },
      });
    }),
  ],
};
