# Sync Pass Template

Use this structure when writing the prompt for Notion AI.

## Prompt spine

1. Role
- Ты делаешь первый основной sync-pass по Notion для Active Holidays.

2. Sources
- перечислить master docs
- перечислить roadmap pages / DB
- перечислить build briefs
- перечислить страницу с audit repo reality

3. What to do
- выровнять terminology
- убрать устаревшие references
- подтянуть roadmap/task wording под текущую operating model
- отметить противоречия, а не замазывать их
- подготовить список unresolved items для ручной проверки Codex

4. What not to do
- не выдумывать пакеты, модули, API, ветки, статусы
- не закрывать open decisions
- не трогать юридические формулировки без явного источника

5. Deliverables
- обновлённые страницы
- список найденных противоречий
- список того, что должен дочистить Codex

## Codex cleanup spine

После prompt для Notion AI всегда отдельно зафиксируй:
- какие страницы нужно перепроверить вручную
- какие DB items можно обновлять только после repo-review
- какие brief pages надо переписать полностью
