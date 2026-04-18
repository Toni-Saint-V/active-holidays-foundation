# Catalog Integrity

## Source discipline

- Один набор правил должен иметь одного явного владельца.
- If Notion contains multiple contradictory pages, do not merge them by intuition.

## Mapping discipline

For each changed field, know:
- where it comes from
- where it lands
- what code reads it
- what tests should fail if it is wrong

## Breaking-change checks

Check for:
- enum changes
- renamed IDs
- threshold changes
- date freshness logic changes
- source tier changes
- rule priority changes

## Verification minimum

- Zod or schema validation
- focused tests
- repo-wide typecheck when shared surfaces moved
- repo-wide build when browser/server contracts moved

## Audit note

Always keep a compact note:
- Notion page or data source URL
- fetch date
- changed files
- downstream risk
