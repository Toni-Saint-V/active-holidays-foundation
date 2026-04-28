# Plugin + MCP Surface Watch · Sample

## CURRENT SURFACE

- `.codex/skills` and `.codex/automations` are present.
- Repo-local plugin manifests are absent.
- Repo-local plugin marketplace is absent.
- Repo-local `.cursor/mcp.json` is absent.
- `npm run automations:intelligence:contract` exposes the Product/System split:
  - Memory MCP = decision memory, currently `required_not_configured` with absent binding evidence
  - GitHub control = tasks, PRs, reviews, CI checks
  - LangGraph = complex agent flows and runtime checkpoint state

## NOISE / GAPS

- Context surface is clean but still minimal.
- Plugin routing exists at the docs and validation layer, not as a local plugin scaffold.
- Missing `.cursor` config is acceptable until there is a concrete repo-local MCP need.
- A fake Landgraf DB/API is not an acceptable Memory MCP substitute.

## RECOMMENDED IMPROVEMENT

- Do not add `.cursor/mcp.json` yet.
- Do not add a repo-local plugin until runtime plugins or the existing skill layer prove insufficient.
- Do not configure durable Memory MCP writes until a real binding is selected.
- Keep Codex-first workflow and revisit only when a repo-local MCP or plugin dependency appears.

## PATCH OR TODO

- No config patch this run.

## VERIFY

- `npm run automations:check:context`
- `npm run automations:intelligence:contract -- --compact`
