# Active Holidays Task Orchestrator Setup Checklist

## Local Dry-run

- [ ] Run `npm run yepcode:orchestrator:test`.
- [ ] Run `npm run yepcode:orchestrator:dry-run`.
- [ ] Confirm output contains `task`, `notion`, `github`, `codex_brief`, and `external_write_state`.
- [ ] Confirm no external Notion or GitHub write happened.

## Notion Setup

- [ ] Create or identify the Active Holidays task database.
- [ ] Apply the fields from `notion-database-schema.md`.
- [ ] Share the database with the Notion integration.
- [ ] Set `NOTION_API_KEY`.
- [ ] Set `NOTION_DATABASE_ID`.
- [ ] Test in dry-run before production.

## GitHub Setup

- [ ] Create labels listed in `github-issue-template.md`.
- [ ] Set `GITHUB_TOKEN` with issue write access.
- [ ] Set `GITHUB_OWNER`.
- [ ] Set `GITHUB_REPO`.
- [ ] Confirm Lovable sync is connected through the same repository if Lovable is used.

## YepCode Setup

- [ ] Create a Node.js YepCode process.
- [ ] Use `workflows/index.cjs` / `workflows/orchestrator.cjs` as the process code, preserving `module.exports = { main }`.
- [ ] Add env vars in YepCode secrets/environment, not in code.
- [ ] Start with `mode=dry-run`.
- [ ] Enable production only with `mode=production` and `allow_external_writes=true`.

## Production Gate

- [ ] Dry-run payload reviewed.
- [ ] Notion task database schema confirmed.
- [ ] GitHub labels confirmed.
- [ ] Duplicate behavior tested.
- [ ] Health audit tested.
- [ ] Manual rollback path understood.
