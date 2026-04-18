# Repo-Local Custom Skills

This repository tracks the custom Codex skills created and refined for the Active Holidays delivery workflow.

Path:

- `.codex/skills/`

Included skills:

- `bank-grade-review`
- `product-os-audit`
- `build-brief-orchestrator`
- `lovable-redline`
- `notion-catalog-sync`
- `phase-gate-sync`
- `notion-ai-sync-director`
- `lovable-step-prompts`
- `ai-interactive-screen-audit`
- `ui-motion-performance-polish`
- `delivery-control-tower`
- `market-reality-product-innovation`

Purpose:

- keep the chat-created custom skills versioned in git
- make them available from the repository `main` branch
- preserve the delivery workflow, review logic, and supporting references alongside the codebase

Maintenance rules:

- update repo-local copies when a custom skill is improved in chat
- keep references and agent configs inside each skill directory
- avoid pointing skills to absolute home-directory paths when a repo-local path is sufficient
