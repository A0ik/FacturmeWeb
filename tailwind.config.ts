import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        primary: {
          DEFAULT: '#1D9E75',
          dark: '#0F6E56',
          light: '#E8F7F2',
        },
        accent: {
          DEFAULT: '#EF9F27',
          light: '#FEF3DC',
        },
        /* Shadcn-compatible tokens */
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
