import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--color-base)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface-2)",
        surface3: "var(--color-surface-3)",
        surface4: "var(--color-surface-4)",
        border: "var(--color-border)",
        borderStrong: "var(--color-border-strong)",
        textPrimary: "var(--color-text-primary)",
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        accent: "var(--color-accent)",
        accentHover: "var(--color-accent-hover)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        ai: "var(--color-ai)",
        route: "var(--color-route)",
        manual: "var(--color-manual)"
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px"
      },
      boxShadow: {
        soft: "0 20px 50px -30px rgba(0,0,0,0.7)"
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: []
} satisfies Config;
