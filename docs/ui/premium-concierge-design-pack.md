# Premium Concierge Design Approval Pack

Статус: design/process gate artifact до UI implementation.  
Scope: docs-only, без изменений runtime UI/logic/dependencies.

## 1) Product Direction
- Продукт: premium AI travel visa concierge, а не «форма на визу».
- Interaction model: не chatbot-first; AI встроен в экран как объясняющий слой.
- Truth law: `AI explains, engine decides`.
- Язык: Russian-first копирайт на всех user-facing поверхностях.
- Form factor: mobile-first shell как первичная композиция, desktop — адаптация, а не отдельный продукт.

## 2) Experience Pillars (Mandatory)
- Result cockpit: результат как рабочая панель решения (риск -> доказательства -> следующий шаг).
- Evidence chips: только по реальным backend/source полям, без synthetic verification.
- AI explanation drawer: краткое объяснение «почему такой следующий шаг», без владения verdict.
- Human review room: честная эскалация к эксперту-человеку.
- Sent confirmation: только при реальном persisted state (requestId/status из backend), никогда из query-параметра.
- One primary CTA per screen: один доминирующий шаг, вторичные действия не спорят с ним.

## 3) Hard Truth-Safety Rules
- No fake readiness.
- No fake verification.
- No guarantee claims (виза/одобрение/исход консульства).
- Нельзя трактовать URL как источник итоговой продуктовой правды.
- Нельзя показывать «human review отправлен», если нет реального server подтверждения.
- Нельзя позволять AI менять deterministic поля (`verdict`, `nextAction`, `documents readiness`).

## 4) Route-Level UX Intent
- `/`: выбрать страну и запустить flow одной сильной CTA.
- `/intake`: быстро собрать минимум данных и показать value перед запросом контакта.
- `/calculating`: короткий, честный transition без иллюзии финального решения.
- `/result`: cockpit с blocker-first логикой и evidence-backed шагами.
- `/human-review`: value-first контактная эскалация к человеку.

## 5) Motion and Accessibility Contract
- Motion premium but honest: анимация только для ориентации и фокуса.
- Reduced-motion support: обязательный fallback для всех route-анимаций, без потери смысла.
- Accessibility baseline:
  - интерактив >=44px,
  - видимый focus state,
  - контраст на фоне photo/overlay,
  - no essential hover-only behavior,
  - dialog semantics там, где есть модалки.

## 6) Copy Contract (Russian-First)
- Тон: спокойный, конкретный, уверенный, без hype.
- Запрещённые claim’ы: «гарантируем визу», «100% готовность», «документы подтверждены» без факта.
- Обязательная смысловая рамка result:
  - главный риск,
  - что подтверждено/не подтверждено,
  - что делать дальше,
  - когда нужен эксперт.

## 7) Implementation Sequencing (Binding)
1. Stream 1 first: `caseId/result` truth ownership.
   - `/result` и `/human-review` опираются на backend-источник (`ResultPayload` и реальный review state), а не на URL truth.
2. Stream 2 only after PNG approval:
   - любые user-visible UI implementation changes разрешены только после явного approval PNG pack.
3. Stream 3 later:
   - документные/security контракты и расширенные evidence chips на реальных полях.
4. Global invariant:
   - UI never invents backend/product truth.

## 8) PNG Approval Gate Requirements (Before UI Code)
- Required artifacts:
  - mobile PNG per route,
  - desktop PNG per route,
  - state pack: empty/loading/error/success/stale-unknown,
  - reduced-motion note per animated screen.
- Required quality threshold:
  - Premium score >=85/100,
  - no category <3/5,
  - UX risk block заполнен,
  - truth-safety confirmation пройдён.
- Approval record template:
  - `approved_by`:
  - `approved_at`:
  - `artifact_paths`:
  - `scope_of_ui_changes`:
  - `known_risks`:

## 9) Non-Goals for This Task
- Нет изменений экранов приложения.
- Нет runtime/backend/dependency изменений.
- Нет CI/script изменений.
- Нет merge в `main`.

## 10) Ready-for-Implementation Exit Criteria
- `docs/ui/concierge-state-matrix.md` заполнен и согласован.
- Этот design pack согласован.
- PNG approval явно зафиксирован.
- Truth owner для result/human-review переведён на case/result backend contract (Stream 1).
- Только после этого открыт UI implementation поток.
