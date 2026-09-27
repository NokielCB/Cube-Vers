/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Alabaster — złamana biel z ciepłym podtonem
        alabaster: {
          50: '#FAF9F6',
          100: '#F4F3EE',
          200: '#EBEAE3',
          300: '#DEDCD3',
        },
        // Grafit / aksamitna czerń
        ink: {
          950: '#0A0A0A',
          900: '#171717',
          700: '#404040',
          500: '#737373',
          400: '#A3A3A3',
        },
        // Jedyny akcent chromatyczny: stonowana, matowa ochra (naklejki kostki)
        ochre: {
          DEFAULT: '#C9A961',
          soft: '#D9C48F',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      borderRadius: {
        bento: '32px',
      },
      boxShadow: {
        // Miękkie, rozproszone cienie — trójwymiarowość bez czarnych krawędzi
        soft: '0 1px 2px rgba(20,18,12,0.03), 0 8px 30px rgba(20,18,12,0.05)',
        'soft-lg': '0 2px 4px rgba(20,18,12,0.04), 0 16px 50px rgba(20,18,12,0.09)',
        hairline: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
      },
    },
  },
  plugins: [],
}
