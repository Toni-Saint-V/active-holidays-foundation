# Plugin + MCP Surface Watch · Sample

## CURRENT SURFACE

- `.codex/skills` and `.codex/automations` are present.
- Repo-local plugin manifests are absent.
- Repo-local plugin marketplace is absent.
- Repo-local `.cursor/mcp.json` is absent.

## NOISE / GAPS

- Context surface is clean but still minimal.
- Plugin routing exists at the docs and validation layer, not as a local plugin scaffold.
- Missing `.cursor` config is acceptable until there is a concrete repo-local MCP need.

## RECOMMENDED IMPROVEMENT

- Do not add `.cursor/mcp.json` yet.
- Do not add a repo-local plugin until runtime plugins or the existing skill layer prove insufficient.
- Keep Codex-first workflow and revisit only when a repo-local MCP or plugin dependency appears.

## PATCH OR TODO

- No config patch this run.

## VERIFY

- `npm run automations:check:context`
