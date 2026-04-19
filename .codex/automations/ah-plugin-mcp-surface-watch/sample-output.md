# Plugin + MCP Surface Watch · Sample

## CURRENT SURFACE

- `.codex/skills` and `.codex/automations` are present.
- Repo-local `.cursor/mcp.json` is absent.

## NOISE / GAPS

- Context surface is clean but still minimal.
- Missing `.cursor` config is acceptable until there is a concrete repo-local MCP need.

## RECOMMENDED IMPROVEMENT

- Do not add `.cursor/mcp.json` yet.
- Keep Codex-first workflow and revisit only when a repo-local MCP dependency appears.

## PATCH OR TODO

- No config patch this run.

## VERIFY

- `npm run automations:check:context`
