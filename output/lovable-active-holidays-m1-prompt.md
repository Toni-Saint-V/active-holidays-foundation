# Lovable Prompt — Active Holidays M1

Create a functional Lovable web app for Active Holidays M1: a Russian-language AI travel control tower for visa, migration, residency and insurance decision support. This is not a beautiful demo. It must be a working M1 product with local mock logic, routing, state, documents, trust explanation and human review.

## Mission

Active Holidays helps a user understand a visa/migration/insurance route, see a verdict, collect documents, understand why the system can be trusted, and send the case to human review when automatic decisioning is not reliable.

All visible UI copy must be in Russian.

Mandatory disclaimer on Result, Trust and Human Review surfaces:

> Информация требует проверки по официальным источникам и не является юридической консультацией.

## Routes

- `/` — Landing
- `/intake` — Intake form
- `/result` — Verdict cockpit
- `/documents` — Documents readiness
- `/trust` — Trust / explainability
- `/human-review` — Human review form
- `/human-review/status` — Sent/status confirmation

## Visual Direction

Use two clearly separated visual systems:

- Landing uses Concept A: expressive premium travel-poster hero style.
- Internal product screens use Concept B: premium digital travel pass / ticket / route map system.

Do not mix Concept A and Concept B by default.

Internal screens should feel like a serious digital travel pass:

- ticket cards
- status chips
- route map hints
- confidence indicators
- calm premium typography
- mobile-first responsive layout
- clear next action
- no chaotic dashboard
- no generic SaaS blocks
- no fake government integrations

## State

Implement local app state:

- `selectedScenarioId`
- `intakeDraft`
- `currentResult`
- `documentsReadyByCase`
- `humanReviewRequestByCase`
- loading/submitting states

Use local mock data only. Do not create backend/API calls.

## Product Types

- `travel` — `Поездка / виза`
- `residency_es` — `ВНЖ Испании`
- `insurance_adult` — `Страховка`

## Screens

### Landing

Required copy:

- Brand: `Active Holidays`
- H1: `Пойми маршрут. Собери пакет. Подайся спокойно.`
- Subcopy: `AI control tower для визовых, миграционных и страховых решений: вердикт, документы, риски и следующий шаг в одном маршруте.`
- CTA: `Начать проверку`

Required blocks:

- product type selector
- trust block with source tiers
- preview cards: `Вердикт`, `Документы`, `Следующее действие`
- quick-start scenario cards for all five scenarios

### Intake

Fields:

- product type
- citizenship: `RU`, `TR`, `US`
- destination: `IT`, `RU`, `ES`
- purpose: `tourism`, `business`, `residency`, `insurance`
- dates or duration
- current documents
- insurance status
- risk signals
- scenario selector

UX:

- progress: `Маршрут`, `Данные`, `Проверка`
- inline validation in Russian
- submit state: `Собираем вердикт...`
- CTA: `Рассчитать маршрут`

### Result / Verdict

This must be the strongest screen.

Required sections:

- verdict card
- primary path
- alternative paths
- AI recommendation panel
- critical risks
- why bullets
- decision signals
- next action
- documents readiness score
- trust / confidence
- source references
- disclaimer

Verdict labels:

- `GO` — `Подача возможна`
- `GO_WITH_CONDITIONS` — `Можно идти дальше с условиями`
- `NOT_NOW` / `NO_GO` — `Пока не подавать`
- `HUMAN_REVIEW` — `Нужна ручная проверка`

For `HUMAN_REVIEW`, show:

`Автомат не подтвердил путь. Дальше — ручная проверка.`

### Documents

Required:

- readiness index
- required documents
- ready / missing / optional / blocked states
- ability to mark documents as ready
- next step from result
- empty state if no primary path

For `HUMAN_REVIEW`, gate the flow:

`Пока кейс на ручной проверке, мы не показываем пакет документов и шаги подачи.`

### Trust

Required:

- signals → rules → conclusions
- confidence score
- volatility score
- source tiers: official / operator / crowdsourced
- assumptions
- disclaimer

For `HUMAN_REVIEW`, gate details:

`Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки.`

### Human Review

Required:

- reason for review
- issue severity
- contact channel: email / telegram
- contact input
- message/context field
- submit state
- already-submitted state
- no fake ETA

Form copy:

- label: `Опишите случай`
- placeholder: `Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас.`
- channel label: `Как ответить`
- options: `Почта`, `Телеграм`
- CTA: `Передать менеджеру`
- availability note: `Мы не обещаем точное время ответа. Менеджер посмотрит кейс и вернётся с уточнениями или следующим шагом.`

### Human Review Status

Required:

- title: `Кейс передан на ручную проверку`
- calm confirmation
- fixed snapshot: verdict, next action, channel/contact
- status pipeline: pending / in review / completed / cancelled
- copy: `Мы не показываем фейковый ETA. Статус обновится, когда менеджер возьмёт кейс в работу.`
- CTA: `Вернуться к вердикту`

## Scenarios

### 1. `s1-rf-italy`

- title: `S1 · Петербург → Италия`
- subtitle: `Туризм, 8 недель, нет страховки`
- productType: `travel`
- verdict: `GO_WITH_CONDITIONS`
- nextActionType: `book_appointment`
- primaryPathId: `italy_c_tourism`
- confidence: `0.79`
- note: `Шенген C через VFS Italy — нужно добрать страховку и несколько документов.`

Signals:

- citizenship `RU`
- destination `IT`
- purpose `tourism`
- passport validity `24 months`
- timeline `8 weeks`
- previous Schengen visa `false`
- insurance ok `false`
- payment cards ok `true`
- sanctions exposure `false`
- registration on arrival ok `true`
- documents ready `5`
- documents required `7`
- slot available `3 weeks`

### 2. `s2-tr-spb`

- title: `S2 · Анкара → Санкт-Петербург`
- subtitle: `Туризм, безвиз, регистрация за 7 дней`
- productType: `travel`
- verdict: `GO_WITH_CONDITIONS`
- nextActionType: `start_application`
- primaryPathId: `turkey_visa_free_spb`
- confidence: `0.75`
- note: `Турция → РФ: безвизовый режим, регистрация по прибытии.`

### 3. `s3-us-spb-business`

- title: `S3 · Нью-Йорк → Санкт-Петербург`
- subtitle: `Бизнес, санкции, платежи`
- productType: `travel`
- verdict: `HUMAN_REVIEW`
- nextActionType: `send_for_review`
- primaryPathId: `null`
- confidence: `0`
- note: `Санкционный контекст и платёжные ограничения — передаём менеджеру.`

This scenario must route to Human Review and must not show automatic document flow as available.

### 4. `s4-rf-residency-dnv`

- title: `S4 · Петербург → ВНЖ Испании`
- subtitle: `DNV, удалённый доход 3200€, B1`
- productType: `residency_es`
- verdict: `GO`
- nextActionType: `collect_financial_docs`
- primaryPathId: `dnv_espana`
- confidence: `0.83`
- note: `Digital Nomad Visa: доход выше порога, осталось добрать финансовые документы и апостиль.`

### 5. `s5-rf-italy-insurance`

- title: `S5 · Страховка в Италию`
- subtitle: `42 года, хроники, 10 дней`
- productType: `insurance_adult`
- verdict: `GO_WITH_CONDITIONS`
- nextActionType: `request_medical_questionnaire`
- primaryPathId: `alfa_plus`
- confidence: `0.73`
- note: `Хроники требуют полиса с расширенным покрытием; базовые скрыты фильтром.`

## Local Decision Logic

Implement a deterministic local `generateResult(caseId | intakeDraft)`:

- selected scenario returns exact scenario result
- if `citizenship=US`, `destination=RU`, `purpose=business` → `s3-us-spb-business`
- if `productType=insurance_adult` and chronic conditions are true → `s5-rf-italy-insurance`
- if `productType=residency_es` and income >= 2646 → `s4-rf-residency-dnv`
- if `citizenship=TR` and `destination=RU` → `s2-tr-spb`
- else → `s1-rf-italy`

## Primary Paths

### `italy_c_tourism`

- title: `Италия C — туристическая виза`
- kind: `consular_visa`
- processing: `4 weeks`
- estimated cost: `22000 RUB`
- description: `Классический Шенген C через VFS Italy: бронь отеля, страховка 30000€, выписка и маршрут.`

Documents:

- `Заграничный паспорт с запасом 6 месяцев`
- `Две цветные визовые фотографии`
- `Страховка на весь срок поездки, 30000€`
- `Бронь отелей на весь маршрут`
- `Бронь обратного билета`
- `Выписка со счёта или спонсорское письмо`
- `Заполненная анкета VFS`

### `turkey_visa_free_spb`

- title: `Турция → Санкт-Петербург — безвизовый маршрут`
- kind: `visa_free`
- max stay: `60 days`
- description: `До 60 дней без визы, регистрация в течение 7 дней по прибытии.`

Documents:

- `Заграничный паспорт, действующий 6+ месяцев`
- `Регистрация по месту пребывания в 7 дней`
- optional: `Медицинская страховка на весь срок`

### `dnv_espana`

- title: `DNV — Виза цифрового кочевника`
- description: `Для удалённых сотрудников зарубежных компаний. Даёт право работать на иностранного работодателя из Испании.`
- min income: `2646€/мес`
- processing: `60 days`

Requirements:

- `Стабильный удалённый доход ≥ 2646€/мес`
- `Контракт с зарубежным работодателем ≥ 3 мес`
- `Справка о несудимости с апостилем`
- `Частная медицинская страховка`
- `Подтверждение квалификации`

### `alfa_plus`

- provider: `АльфаСтрахование`
- product: `Премиум с хрониками`
- coverage: `50000€`
- chronic coverage: true
- Schengen compliant: true
- price: `2.1€/день`

## Documents Scores

- `s1-rf-italy`: `5/7`, missing insurance and application
- `s2-tr-spb`: `3/3`
- `s3-us-spb-business`: gated, score `0`
- `s4-rf-residency-dnv`: `2/5`, missing financial docs, apostille/police certificate, employer contract
- `s5-rf-italy-insurance`: `65%`, missing medical questionnaire and expanded policy confirmation

## AI Recommendation Panel

Use deterministic local mock data. No AI calls.

- `s1`: rank 1 Italy C tourism. Caution: missing insurance/application. Next steps: buy Schengen insurance → complete VFS form → book appointment.
- `s2`: rank 1 Turkey → Saint Petersburg visa-free. Caution: registration after arrival. Next steps: verify passport → prepare address → register within 7 days.
- `s3`: do not recommend route. Copy: `AI не выбирает маршрут: санкционный и платёжный контекст требуют менеджера.`
- `s4`: rank 1 DNV Spain. Caution: remote employer evidence and apostille. Mark Golden Visa closed and not recommended.
- `s5`: rank 1 Alfa Plus, rank 2 SOGAZ Premium, rank 3 Rosgosstrakh Family. Do not recommend Tinkoff Basic.

## Sources

Show sources in Trust and Result:

- `Генконсульство Италии в Санкт-Петербурге`, official, volatility `0.15`
- `Визовый центр VFS Italy Санкт-Петербург`, operator, volatility `0.25`
- `МИД России: безвизовый режим с Турцией`, official, volatility `0.10`
- `МИД России: порядок въезда для граждан США`, official, volatility `0.20`
- `Санкционный мониторинг ЕС`, official, volatility `0.20`
- `UGE — управление по крупным проектам (DNV)`, official, volatility `0.20`
- `АльфаСтрахование — страховка для выезжающих`, operator, volatility `0.20`

## Risks

Use these exact risk concepts:

- `Санкционный контекст US↔RU`: `Бизнес-поездки граждан США требуют дополнительной проверки на санкционные списки и контрагентов.`
- `Ограничения платежей`: `Карты, выпущенные американскими банками, в России не принимаются — нужно готовить наличные или альтернативу.`
- `Государственный совет США`: `Госдеп США сохраняет предупреждение уровня 4 для поездок в Россию.`
- `Усиленная проверка туристических виз`: `Консульство усилило проверку целей поездки, сроки по-прежнему в рамках 4 недель.`

## Non-Negotiables

- No fake APIs.
- No invented legal claims.
- No fake ETA.
- No fake government integrations.
- No placeholder UI.
- No generic SaaS dashboard.
- All primary flows clickable.
- HUMAN_REVIEW disables automatic documents.
- All visible UI copy in Russian.
- Result screen is the strongest screen.
- Mobile-first responsive.

## Done When

- User can run each of five scenarios from Landing or Intake.
- Each scenario generates the expected verdict.
- Result drives Documents, Trust and Human Review.
- HUMAN_REVIEW disables automatic documents and routes to review.
- Documents can be marked ready and readiness changes.
- Human review can be submitted and status screen works.
- App is responsive and polished.
- Disclaimer is present where needed.
