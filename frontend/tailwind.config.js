/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface / background scale (dark = near-black, light = near-white)
        brand: {
          50:  '#f8f9fc',
          100: '#f0f1f7',
          200: '#e2e4ed',
          300: '#94a3b8',
          400: '#64748b',
          500: '#475569',
          600: '#334155',
          700: '#1e293b',
          800: '#111827',
          900: '#0a0f1e',
          950: '#06080f',
        },
        // Sphere accent — violet/purple
        sphere: {
          50:  '#f5f0ff',
          100: '#ede8ff',
          200: '#ddd2ff',
          300: '#c4b0ff',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                          to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glow-sphere': '0 0 24px -4px rgba(139,92,246,0.35)',
        'glow-sm':     '0 0 12px -2px rgba(139,92,246,0.25)',
        'card':        '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover':  '0 4px 16px 0 rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
