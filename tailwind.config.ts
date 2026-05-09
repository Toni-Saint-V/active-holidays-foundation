import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)',
          deep: 'var(--primary-deep)',
          foreground: 'var(--primary-foreground)',
        },
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        destructive: 'var(--destructive)',
      },
      borderRadius: { '4xl': '32px' },
    },
  },
} satisfies Config
