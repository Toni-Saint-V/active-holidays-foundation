# Active Holidays - Control Tower Copy Pack

Этот файл нужен для быстрого копирования. PDF читай глазами, отсюда копируй команды и промты.

## Что запускать

- Любая задача по repo
  ```bash
  npm run skills:autopilot -- --prompt "<task>" --files "<csv paths>"
  ```
- Только понять mode
  ```bash
  npm run skills:detect-mode -- --prompt "<task>" --files "<csv paths>"
  ```
- Packet без полной orchestration
  ```bash
  npm run skills:start -- --prompt "<task>" --files "<csv paths>"
  ```
- Проверить весь skill system
  ```bash
  npm run skills:evaluate-agents && npm run skills:verify
  ```
- Проверить automation контур
  ```bash
  npm run automations:check:all
  ```
- Dry-run sync automations
  ```bash
  npm run automations:sync -- --dry-run
  ```

## Ежедневный локальный дефолт

```bash
npm run skills:autopilot -- --prompt "исправь ownership boundary для AI recommendation" --files "server/lib/recommendations.ts,shared/contracts/recommendations.ts"
```

## Notion control tower prompt для Codex

```text
У тебя есть доступ к repo и ко всему Notion Active Holidays.
Сделай один control tower pass без воды.

Сначала:
- собери repo reality из `AGENTS.md`, `README.md`,
  `AUTOMATIONS_OPERATING_MODEL.md`,
  `.codex/skills/README.md`,
  `.codex/automations/*`,
  `reports/automations/runs/*/latest.md`, если они есть
- затем сверь это с Notion backbone:
  Vision, Execution, Open Decisions,
  roadmap, build briefs, active tasks
- выбери только одну strongest next task,
  которую реально можно начать сейчас

Верни только structured JSON:
{
  "current_state": {
    "repo_truth": [],
    "notion_truth": [],
    "automation_truth": []
  },
  "drift": [],
  "next_ideal_task": {
    "title": "",
    "why_now": "",
    "owner": "",
    "surface": [],
    "acceptance_criteria": [],
    "verify": []
  },
  "codex_prompt": "",
  "lovable_prompt": "",
  "notion_update": {
    "pages_or_dbs": [],
    "update_blocks": []
  },
  "manual_control": []
}

Жесткие правила:
- не выдумывай repo facts, API, ветки, статусы
- не делай backlog flood
- если есть low-complexity / high-impact move,
  приоритизируй его
- если задача не требует Lovable, честно скажи это
```

## Sync-back prompt после выполненной задачи

```text
У тебя есть repo и Notion Active Holidays.
Я только что закончил задачу.
Сделай sync-back pass по всем слоям.

Сначала:
- сверь текущий repo state, relevant diff и latest reports
- затем сверь связанные Notion pages / DB items
- обнови framing без выдумок
- выбери следующую strongest task

Верни только structured JSON:
{
  "what_changed": [],
  "notion_updates": [
    {
      "target": "",
      "update_block": ""
    }
  ],
  "repo_followups": [],
  "next_ideal_task": {
    "title": "",
    "why_now": "",
    "surface": [],
    "acceptance_criteria": [],
    "verify": []
  },
  "risks": [],
  "manual_control": []
}

Если критически не хватает одного артефакта,
запроси ровно один артефакт и остановись.
```

## Notion AI sync-pass prompt

```text
Ты делаешь первый основной sync-pass по Notion для Active Holidays.

Источники:
- master pages: Vision, Execution, Open Decisions
- roadmap pages и relevant DB items
- build briefs
- repo reality summary от Codex

Что сделать:
- выровнять terminology
- убрать stale references
- подтянуть wording под текущую operating model
- отметить противоречия, а не замазывать их
- подготовить список unresolved items
  для ручной проверки Codex

Что не делать:
- не выдумывать repo paths, пакеты, API, ветки, статусы
- не закрывать open decisions
- не менять legal / provider wording без явного источника

Deliverables в Notion:
1. Обновленные страницы
2. Список найденных противоречий
3. Список того, что должен дочистить Codex вручную
```

## Lovable review loop prompt

Твоя задача - не писать код в repo,
а провести premium review интерфейса
и вернуть один сильный consolidated prompt
для следующего прохода в Lovable.

Смотри сразу на слои:
- продуктовая сила экрана
- UX и ясность сценария
- визуальная иерархия и attractiveness
- качество AI слоя или его отсутствие
- современность, innovation и wow-value

Верни только structured JSON:
{
  "what_is_already_strong": [],
  "what_is_weak": [],
  "upgrade_axes": {
    "product": [],
    "ux_ui": [],
    "ai_layer": [],
    "visual": [],
    "innovation": []
  },
  "lovable_super_prompt": ""
}

Важно:
- не давай россыпь мелких замечаний
- не ограничивайся косметикой
- не делай generic advice
- усили именно ценность продукта,
  ясность UX, качество AI слоя
  и силу визуального впечатления

проект https://travel-vision-core.lovable.app

## Прямой super prompt для Lovable

```text
Нужно не косметически подправить текущий экран,
а вывести его на уровень premium product surface.

Сохрани сильные части решения,
но существенно усили:
- продуктовую ясность и ценность
  с первого взгляда
- визуальную иерархию, composition,
  spacing и ощущение premium quality
- UX логику и понятность key next action
- AI слой: он должен быть полезным,
  встроенным и усиливающим core experience
- общую привлекательность приложения
  и ощущение современности
- innovation layer: добавь 1-3 сильные идеи,
  которые реально делают experience умнее
  и запоминающимся

Что хочу в результате:
- сильнее first impression
- выразительнее visual language
- меньше generic blocks,
  больше product-led composition
- AI встроен в основной сценарий
- экран выглядит как часть сильного
  современного приложения

Сделай редизайн смелее, но не ломай usability.
Не делай перегруженный интерфейс.
Избегай generic startup aesthetic.
```

## Второй проход для Lovable

```text
Это уже лучше, но все еще недостаточно сильно.
Сделай второй проход и подними решение еще на уровень выше.

Нужно усилить:
- выразительность и чистоту композиции
- ощущение продукта с реальной ценностью,
  а не просто красивого UI
- глубину AI слоя и его встроенность
  в сценарий
- уникальность и memorability
- premium feel на уровне сильного
  современного приложения

Не распыляйся на мелкие украшения.
Сконцентрируйся на самых сильных изменениях,
которые дают максимальный скачок качества.
```

## Полезные команды под реальные случаи

- Только классифицировать задачу
  ```bash
  npm run skills:detect-mode -- --prompt "<task>" --files "<csv paths>"
  ```
- Получить рабочий packet
  ```bash
  npm run skills:start -- --prompt "<task>" --files "<csv paths>"
  ```
- Лучший локальный дефолт
  ```bash
  npm run skills:autopilot -- --prompt "<task>" --files "<csv paths>"
  ```
- Review diff и ship-or-block
  ```bash
  npm run skills:autopilot -- --review-only --prompt "сделай review diff и скажи ship or block" --files "<csv paths>"
  ```
- AI boundary / ownership
  ```bash
  npm run skills:autopilot -- --prompt "fix AI recommendation ownership boundary" --files "server/lib/recommendations.ts,shared/contracts/recommendations.ts"
  ```
- Plugin / MCP surface
  ```bash
  npm run skills:autopilot -- --prompt "проверь plugin and mcp surface" --files "plugins/foo/.codex-plugin/plugin.json,.cursor/mcp.json"
  ```
- Включить telemetry
  ```bash
  npm run skills:autopilot -- --prompt "<task>" --files "<csv paths>" --telemetry --telemetry-file reports/skills/my-run.jsonl
  ```
- Посмотреть telemetry report
  ```bash
  npm run skills:telemetry:report -- --file reports/skills/my-run.jsonl
  ```
- Закрыть scripts-пасс
  ```bash
  npm run typecheck && npm run test && npm run build
  ```
- Проверить automation changes
  ```bash
  npm run automations:verify && npm run automations:check:all
  ```

## Главный принцип

- Для repo-задач почти всегда начинай с `skills:autopilot`.
- Для repo плюс Notion loop используй prompt, а не npm-команду.
- Для Lovable сначала покажи реальный UI, потом проси consolidated prompt.
- После существенной задачи прогоняй sync-back, чтобы repo и Notion не расходились.
