## Configuration


### .env.example

````
PORT=3001
OPENAI_API_KEY=
OPENAI_RECOMMENDATION_MODEL=gpt-4o-mini
ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN=
ACTIVE_HOLIDAYS_ENV=dev
NOTION_API_KEY=
NOTION_DATABASE_ID=
GITHUB_TOKEN=
GITHUB_OWNER=Toni-Saint-V
GITHUB_REPO=active-holidays-foundation
YEP_CODE_API_KEY=

````

### .gitignore

````
node_modules
dist
.DS_Store
coverage
.env
.env.*
!.env.example
npm-debug.log*
*.tsbuildinfo
reports/automations/runs
reports/automations/state/*
!reports/automations/state/runtime-maturity.json
!reports/automations/state/notion-writeback-promotion.json
!reports/automations/state/open-decisions-legacy-bridge.json
!reports/automations/state/manual-approvals.json
!reports/automations/state/gate-eligibility-snapshot.json
reports/automations/state/runtime-observed/
reports/automations/state/execution-runs/
output/server-state
output/playwright/
output/pdf/
automation/yepcode/**/runs
automation/yepcode/**/.env
automation/yepcode/**/.env.*
.superpowers/
reports/autonomous/
reports/design/
.playwright-cli/
tmp/

````

### index.html

````
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Active Holidays Foundation</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
  </html>

````

### package.json

````
{
  "name": "active-holidays-foundation",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server": "tsx watch server/index.ts",
    "dev:all": "concurrently -k \"npm run server\" \"npm run dev\"",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify:engine": "tsx scripts/verify-engine-drift.ts",
    "verify:engine:update": "tsx scripts/verify-engine-drift.ts --update",
    "skills:verify": "node --experimental-strip-types scripts/codex/verify-skills.ts",
    "skills:evaluate-agents": "node --experimental-strip-types scripts/codex/evaluate-agent-system.ts",
    "skills:detect-mode": "node --experimental-strip-types scripts/codex/detect-skill-mode.ts",
    "skills:start": "node --experimental-strip-types scripts/codex/start-skill-mode.ts",
    "skills:autopilot": "node --experimental-strip-types scripts/codex/run-skill-autopilot.ts",
    "skills:telemetry:report": "node --experimental-strip-types scripts/codex/skill-mode-telemetry.ts --report",
    "automations:sync": "node --experimental-strip-types scripts/codex/sync-automations.ts",
    "automations:verify": "node --experimental-strip-types scripts/codex/verify-automations.ts",
    "automations:snapshot:write": "node --experimental-strip-types scripts/codex/write-gate-eligibility-snapshot.ts",
    "automations:verify:negative": "node --experimental-strip-types scripts/codex/verify-automations-negative-fixtures.ts",
    "automations:check:truth": "node --experimental-strip-types scripts/automations/check-source-freshness.ts",
    "automations:check:screens": "node --experimental-strip-types scripts/automations/check-screen-surface.ts",
    "automations:check:flow": "node --experimental-strip-types scripts/automations/check-flow-instrumentation.ts",
    "automations:check:skills": "node --experimental-strip-types scripts/automations/check-skill-duplication.ts",
    "automations:check:context": "node --experimental-strip-types scripts/automations/check-context-surface.ts",
    "automations:check:all": "npm run automations:verify && npm run automations:verify:negative && npm run automations:check:truth && npm run automations:check:screens && npm run automations:check:flow && npm run automations:check:skills && npm run automations:check:context",
    "yepcode:orchestrator:dry-run": "node automation/yepcode/active-holidays-orchestrator/workflows/index.cjs --input automation/yepcode/active-holidays-orchestrator/examples/example-inputs.json --case feature-idea",
    "yepcode:orchestrator:test": "node automation/yepcode/active-holidays-orchestrator/tests/orchestrator.check.cjs",
    "autonomous:next": "tsx scripts/autonomous/next-best-task-loop.ts",
    "autonomous:next:write": "tsx scripts/autonomous/next-best-task-loop.ts --write",
    "autonomous:cycle": "tsx scripts/autonomous/run-autonomous-cycle.ts",
    "autonomous:execute": "tsx scripts/autonomous/execute-autonomous-task.ts",
    "autonomous:verify": "tsx scripts/autonomous/verify-autonomous-os.ts"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "framer-motion": "^12.23.24",
    "lucide-react": "^0.542.0",
    "openai": "^6.34.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.1.11",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/node": "^24.5.2",
    "@types/react": "^18.3.24",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^5.0.2",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.1",
    "jsdom": "^27.0.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.20.5",
    "typescript": "^5.9.2",
    "vite": "^7.1.7",
    "vitest": "^3.2.4"
  }
}

````

### postcss.config.cjs

````
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

````

### tailwind.config.ts

````
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

````

### tsconfig.json

````
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["shared/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src", "server", "shared", "scripts", "vite.config.ts"],
  "references": []
}

````

### vite.config.ts

````
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared")
    }
  },
  server: {
    port: 5173
  },
  test: {
    environment: "jsdom",
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "server/**/*.{test,spec}.{ts,tsx}",
      "shared/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}"
    ],
    setupFiles: "./src/test/setup.ts",
    globals: true
  }
});

````
