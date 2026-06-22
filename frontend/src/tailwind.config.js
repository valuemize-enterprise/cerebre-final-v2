/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [
    // Powers the `animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-right-8`
    // utility classes used by the Modal component and the client onboarding tour.
    // Install with: npm install -D tailwindcss-animate
    require('tailwindcss-animate'),
  ],
};
