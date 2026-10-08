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
        brand: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
        },
        cyber: {
          dark: '#0a0d14',
          card: '#121824',
          border: '#1f293d',
          accent: '#00f2fe',
          purple: '#7928ca',
          pink: '#ff0080',
          emerald: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'scan-line': 'scanLine 2.5s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)' },
          '50%': { opacity: 0.7, boxShadow: '0 0 25px rgba(99, 102, 241, 0.8)' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '100%': { top: '100%' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      }
    },
  },
  plugins: [],
}
