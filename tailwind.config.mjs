/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'term-bg':     '#0a0a0a',
        'term-card':   '#111111',
        'term-raised': '#161616',
        'term-border': '#1c1c1c',
        'term-line':   '#2a2a2a',
        'term-green':  '#00ff41',
        'term-gdim':   '#00cc33',
        'term-red':    '#ff3c3c',
        'term-yellow': '#ffd700',
        'term-blue':   '#4fc3f7',
        'term-purple': '#c792ea',
        'term-orange': '#ff9800',
        'term-text':   '#c9d1d9',
        'term-muted':  '#6e7681',
        'term-dim':    '#444d56',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'glitch': 'glitch 0.3s ease-in-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glitch: {
          '0%':   { transform: 'translate(0)' },
          '20%':  { transform: 'translate(-2px, 2px)' },
          '40%':  { transform: 'translate(-2px, -2px)' },
          '60%':  { transform: 'translate(2px, 2px)' },
          '80%':  { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#c9d1d9',
            maxWidth: '72ch',
          },
        },
      },
    },
  },
  plugins: [],
};
