# Notion Task Database Schema

Use this schema for the Active Holidays Task Orchestrator database.

If this database cannot be detected, do not write task data silently. Keep the orchestrator in dry-run and use this file as the setup document.

## Required Properties

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | Task name |
| Type | Select | feature, bug, ux, design, tech_debt, research, growth, seo, monetization, ops |
| Status | Select | Inbox, Needs Clarification, Ready, In Progress, In Review, Done, Blocked |
| Priority | Select | P0, P1, P2, P3 |
| Product Area | Text | Stable product area key |
| Source | Text | founder_input, qa, product_review, etc. |
| User Problem | Text | Concrete problem |
| Business Value | Text | Why this matters |
| Technical Scope | Text | Engineering scope |
| Design Scope | Text | Design/UI scope |
| Acceptance Criteria | Text | Newline-separated criteria |
| Test Plan | Text | Newline-separated checks |
| Risks | Text | Newline-separated risks |
| Dependencies | Text | Newline-separated dependencies |
| Requires Design Approval | Checkbox | True for visual/design/UI tasks |
| Requires GitHub Issue | Checkbox | True for engineering work |
| Requires Codex Execution | Checkbox | True when Codex should implement |
| Dedupe Key | Text | Stable dedupe identity |
| GitHub Issue URL | URL | Linked engineering issue |
| GitHub PR URL | URL | Linked implementation PR |
| Codex Brief | Text | Generated implementation brief |
| Last Sync | Date | Last orchestrator update |
| Execution Summary | Text | Result after execution |
| Remaining Risks | Text | Open risks after execution |

## Write Rules

- Dry-run is default.
- Production write requires `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `ACTIVE_HOLIDAYS_ENV`, `mode=production`, and `allow_external_writes=true`.
- Updates should prefer `notion_page_id` or exact `Dedupe Key`.
- If the database schema differs, fix the schema or add an explicit adapter. Do not guess property names.
- Existing repo `notion-surface-lock.json` shows multiple operational surfaces are still unbound or schema-divergent; keep live writes blocked until the target task database is confirmed.
