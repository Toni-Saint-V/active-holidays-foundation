# Notion AI Handoff

Use this prompt after a live Notion audit.

Current limitation:

- The Notion connector was unavailable during this repo pass, so the prompt below is repo-grounded and must verify live page names, database names, and hierarchy before making changes.

Repo-owned schema contract to preserve:

- operational database names are contract-owned until the repo stores live Notion ids:
  - `Execution`
  - `Open Decisions`
  - `Build Briefs`
  - `Release Gate`
  - `Automation Inbox`
  - `Opportunities`
  - `Review Findings & Learnings`
- these surfaces must not be renamed, split, merged, or silently replaced
- each operational surface must keep the required properties defined in `AUTOMATIONS_OPERATING_MODEL.md`
- if live workspace uses different names or incompatible schemas, the correct action is `Decision Required`, not silent restructuring

## Paste-Ready Prompt

```text
Ты Notion AI для Active Holidays.

Твоя задача:
- сначала провести живой аудит текущего Notion workspace по Active Holidays
- затем улучшить структуру, связи и операционную полезность Notion без потери текущего смысла

Сначала проверь live reality:
- какие страницы и базы сейчас реально существуют
- где сейчас лежат `P0 · Master Doc — Vision & Boundaries`, `P0 · Definition of Final`, `P1 · UX Architecture — Flow / State / Screens`, `P2 · Screen Contracts for Lovable`
- существует ли `RDC v3.0 — Companion` и как он сейчас позиционирован
- есть ли отдельные поверхности для `Execution`, `Open Decisions`, `Build Briefs`, `Release Gate`, `Automation Inbox`, `Opportunities`, `Review Findings & Learnings`
- какие страницы дублируют друг друга, противоречат друг другу или устарели

Репо-grounded assumptions, которые нужно подтвердить или опровергнуть:
- Notion должен быть source of truth для шага, а не архивом заметок
- canonical docs сейчас должны строиться вокруг `P0`, `P1`, `P2`
- `RDC v3.0 — Companion` должен быть reference-only, а не главным execution doc для текущего цикла
- нужно отделить canonical pages от operational databases
- automation-safe updates должны идти в operational layer, а canonical layer должен получать только suggested updates / drift notes / decision-required notes

Repo-owned operational schema contract, который нельзя нарушать:
- exact database names:
  - `Execution`
  - `Open Decisions`
  - `Build Briefs`
  - `Release Gate`
  - `Automation Inbox`
  - `Opportunities`
  - `Review Findings & Learnings`
- required properties:
  - `Execution`: `Record`, `Sync Key`, `Area`, `Status`, `Source`, `Confidence`, `Last Verified At`, `Action Needed`, `Evidence`
  - `Open Decisions`: `Record`, `Sync Key`, `Layer`, `Decision Status`, `Recommendation`, `Why Now`, `Urgency`, `Owner`, `Source`, `Confidence`, `Last Verified At`, `Action Needed`, `Evidence`
  - `Build Briefs`: `Record`, `Sync Key`, `Scope`, `Ready`, `Inputs Verified`, `Acceptance Criteria`, `Verify`, `Prompt Block`, `Source`
  - `Release Gate`: `Record`, `Sync Key`, `Surface`, `Gate`, `Status`, `Blocking Reason`, `Source`, `Confidence`, `Last Verified At`, `Evidence`
  - `Automation Inbox`: `Record`, `Sync Key`, `Packet Type`, `Severity`, `Status`, `Action Needed`, `Routed To`, `Source`, `Confidence`, `Last Verified At`
  - `Opportunities`: `Record`, `Sync Key`, `Idea`, `Why Now`, `Impact`, `Complexity`, `Source`, `Confidence`, `Status`
  - `Review Findings & Learnings`: `Record`, `Sync Key`, `Layer`, `Severity`, `Fix Path`, `Source`, `Confidence`, `Status`, `Evidence`
- allowed changes:
  - additive properties
  - views, filters, relations
- lifecycle values to preserve:
  - `Open Decisions.Decision Status`: `open`, `in_review`, `decided`, `blocked`
  - `Automation Inbox.Status`: `open`, `in_review`, `blocked`, `resolved`
- disallowed without explicit human decision:
  - rename database
  - rename/remove required property
  - split one surface into multiple databases
  - merge multiple surfaces into one database

Что сделать после аудита:
1. Собери короткую карту текущей структуры:
   - что canonical
   - что operational
   - что stale
   - что duplicate
2. Предложи и по возможности внеси минимальную clean restructuring:
   - canonical pages
   - operational databases
   - понятные связи между ними
3. Убери или явно пометь stale / legacy surfaces, которые мешают execution clarity.
4. Создай или докрути operational layer:
   - используй exact names из repo-owned contract
   - если surface уже существует под другим именем, не переименовывай молча; подними `Decision Required`
5. Для каждой operational базы проверь наличие required properties из repo contract и добавь только недостающие compatible properties или views.
6. Для canonical pages не переписывай смысл радикально; если не уверен, оставляй `Suggested Update` вместо destructive rewrite.
7. Подготовь короткий derived summary внутри workspace, а не второй canonical source of truth:
   - дай ссылку на repo-owned operating model как на primary source
   - явно пометь summary как `non-authoritative`
   - кратко покажи, что обновляет automation layer, что обновляет человек, что считается canonical truth и куда попадает drift

Жёсткие правила:
- не плодить новые страницы без явной пользы
- не дублировать уже существующие поверхности под новыми именами
- не делать “красиво”, если от этого не становится яснее execution flow
- не переписывать canonical docs вслепую
- не менять repo-owned schema contract без явного `Decision Required`
- если структура спорная, лучше создать `Decision Required`, чем silently mutate truth

Итоговый deliverable:
1) CURRENT STRUCTURE
2) PROBLEMS
3) CLEAN TARGET STRUCTURE
4) CHANGES MADE
5) CHANGES RECOMMENDED
6) OPEN DECISIONS
7) WHAT SHOULD BE UPDATED BY AUTOMATIONS VS HUMANS
```
