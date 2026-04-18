# Brief Template

Use these fields when drafting or updating Notion Build Briefs.

## Common spine

- `🎯 Goal`
  - Для кого задача
  - Что меняется в поведении продукта
  - Почему это делаем сейчас

- `🔨 What to Build`
  - Конкретные deliverables
  - Никаких общих слов

- `🔄 User Flows`
  - happy path
  - alternate path
  - error / fallback path

- `🖥️ Screens & States`
  - loading
  - empty
  - error
  - success
  - edge states, если есть

- `⚙️ Tech Context`
  - repo path
  - contracts
  - constraints
  - dependencies

- `✅ Acceptance Criteria`
  - проверяемые пункты
  - без “выглядит хорошо”

- `🚫 Out of Scope`
  - что сознательно не делаем

- `🤖 AI Notes`
  - риски
  - частые ошибки
  - запреты

## Codex CLI prompt spine

Always include:
- branch
- source artifacts
- exact verification commands
- request to use agents when available
- final review with `$bank-grade-review`

## Lovable prompt spine

Always include:
- route list
- screen purpose
- exact states
- payload keys
- copy tone
- visual direction
- forbidden inventions
