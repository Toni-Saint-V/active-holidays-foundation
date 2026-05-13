# Premium Concierge UI State Matrix

Статус: pre-implementation design/process artifact.  
Область: только M1 маршруты `/, /intake, /calculating, /result, /human-review`.  
Ограничение истины: `ResultPayload` каноничен, `PublicReadiness` — только проекция, `AI explains, engine decides`.

## Route: `/`
- Screen purpose: вход в premium concierge flow, выбор страны, запуск проверки.
- Canonical truth owner: локальное UI-состояние выбора страны + `COUNTRIES` (`src/lib/countryData.ts`), без backend-решения.
- Allowed URL params: не требуются.
- Forbidden URL truth: verdict/readiness/confidence/doc verification/case status/human-review status.
- Primary CTA: `Проверить {страну}` -> `/intake?country=<CountryCode>`.
- Secondary CTA: переключение страны (`IT|ES|FR|GR`), fullscreen toggle.
- Empty state: нет критичного empty; fallback — страна `IT` и стандартный hero.
- Loading state: отсутствует блокирующая загрузка; только локальные анимации.
- Error state: при ошибке fullscreen — мягкий fallback без блокировки CTA.
- Success state: выбранная страна отражена в карточке, live-line и чипах риска/документов.
- Stale/unknown state: если неизвестная страна/пустые данные, использовать `IT`, не показывать fake confidence.
- Accessibility requirements: фокус-видимость, минимум `44px` target для CTA/кнопок, `aria-pressed` на country cards/fullscreen.
- Reduced-motion requirements: при `prefers-reduced-motion` отключать pulse/live анимации и smooth-scroll.
- Screenshot requirements: mobile first viewport, desktop viewport, выбранная страна `IT`, выбранная страна `FR`, fullscreen hint on/off.
- Fake-trust risks: визуально «премиум», но без обещаний результата до `/result`; запрещены гарантии визы.
- Conversion risks: слабая видимость primary CTA внизу на малом экране, перегруз country-rail.
- Manual QA checks:
  - CTA всегда видим на iPhone 14/SE высоте.
  - Переключение страны меняет hero/live-line/чипы без layout shift.
  - Focus ring читаем на всех интерактивах.
  - Fullscreen toggle не ломает прокрутку/высоту.
  - Копирайт «Точный вывод — после дат и документов» присутствует.

## Route: `/intake`
- Screen purpose: собрать минимальный профиль поездки и перевести пользователя к расчёту.
- Canonical truth owner: локальная форма (`TravelProfile`) до отправки; после завершения источником должен стать backend case draft (Stream 1).
- Allowed URL params: `country` (`IT|ES|FR|GR`) для prefill.
- Forbidden URL truth: verdict/resultType/analysisConfidence/readiness/human-review sent status.
- Primary CTA: `Дальше` (step progression) и в модалке `Добавить документы`/`Продолжить без документов` как terminal action.
- Secondary CTA: `Назад`, `AI: усилить формулировку`, `Вставить в поле`.
- Empty state: пустые даты/цель/история отказа, disabled progression.
- Loading state: `AI собирает формулировку…`, `AI сверяет пакет` в pre-result modal.
- Error state: AI-драфт отказа не получен -> тихий fallback без падения формы.
- Success state: шаги 2-4 валидны, pre-result modal открыт, переход на `/calculating`.
- Stale/unknown state: неизвестный `country` -> fallback `IT`; невалидный диапазон дат блокирует progression.
- Accessibility requirements: label-подписи, keyboard navigation по step actions, текст ошибок дат, `role="dialog"` для pre-result modal.
- Reduced-motion requirements: модалка/индикаторы проверки не должны быть единственным носителем статуса; при reduced motion — без долгих анимаций.
- Screenshot requirements: step 2 empty, step 2 error (return<departure), step 3 selected purpose, step 4 with refusal + AI block, pre-result modal choice/upload/verifying.
- Fake-trust risks: `analysisConfidence`/`resultType` в query нельзя трактовать как подтверждённую правду без backend case/result.
- Conversion risks: перегруз pre-result modal; неочевидность разницы «с документами/без документов».
- Manual QA checks:
  - Нельзя пройти шаг без валидных данных.
  - `country` prefill корректен для всех 4 стран.
  - `Продолжить без документов` ведёт в preliminary path без fake verification.
  - AI отказа не блокирует основной flow при ошибке.
  - Consent переключатель не меняет правду «проверено/не проверено» сам по себе.

## Route: `/calculating`
- Screen purpose: короткий transition между intake и result с прозрачным ожиданием.
- Canonical truth owner: snapshot intake params для текущей сессии; deterministic decision здесь не вычисляется.
- Allowed URL params: passthrough intake params + `freeze=1` только для preview/debug.
- Forbidden URL truth: генерация нового verdict/readiness/document verification прямо на этом экране.
- Primary CTA: явного CTA нет; primary action — auto-redirect в `/result`.
- Secondary CTA: отсутствует; информирующие блоки RouteMap/progress.
- Empty state: если params неполные, всё равно допускается переход в `/result` с честным fallback.
- Loading state: staged progress blocks + pre-result modal.
- Error state: если redirect не произошёл, пользователь остаётся на честном transition screen без «готово».
- Success state: `router.replace('/result?...')` выполнен.
- Stale/unknown state: при `freeze=1` состояние намеренно «заморожено для превью», не production truth.
- Accessibility requirements: `role="dialog"` у pre-result card, контраст статусов прогресса, понятный заголовок без двусмысленности.
- Reduced-motion requirements: progress/route animations должны сводиться к статичным индикаторам при reduced motion.
- Screenshot requirements: default auto mode, freeze mode, pre-result modal visible.
- Fake-trust risks: визуально «расчёт» может выглядеть как реальный engine pass; обязателен честный текст без claim’ов.
- Conversion risks: слишком долгий/непонятный переход, отсутствие явного recovery при зависании.
- Manual QA checks:
  - Redirect в `/result` ~1.1s при `freeze!=1`.
  - При `freeze=1` redirect не запускается.
  - Текст не обещает «одобрение»/«гарантию».
  - Modal озвучивает предварительный статус, не final verification.
  - Нет интерактивов, которые уводят в side-flow.

## Route: `/result`
- Screen purpose: результат как decision cockpit: главный риск, доказательства, следующий шаг, переход в human review.
- Canonical truth owner: целевой owner — backend `ResultPayload` по `caseId` (Stream 1 first).  
  Текущие query params — только transitional preview surface, не прод-истина.
- Allowed URL params (current transitional): `country`, `departure`, `return`, `purpose`, `days`, `hadRefusal`, `refusalContext`, `documentsUploaded`, `documentsSaveConsent`, `resultType`, `analysisConfidence`, `verdict`.
- Forbidden URL truth: readiness percent, final verdict, verified documents, human-review sent, guarantee claims из URL без backend proof.
- Primary CTA: `Открыть экспертный план` / `Показать план` -> `/human-review?...`.
- Secondary CTA: действия внутри карточек (`Проверить варианты слота`, `Добавить документы`, `Открыть план`).
- Empty state: отсутствуют критичные поля (`departure/return/purpose`) -> derivation в safe mode (`HUMAN_REVIEW`), без fake readiness.
- Loading state: `AI сверяет пакет.` при загрузке документа.
- Error state: ошибка загрузки hero image -> fallback без фоновой картинки; загрузка документа без файла ничего не меняет.
- Success state: карточки видны, CTA доступен, verified/preliminary линия соответствует факту `documentsUploaded`.
- Stale/unknown state: неизвестная страна -> `IT`, невалидные дни -> default `24`; обязательно показать limitation копирайт.
- Accessibility requirements: карусель достижима клавиатурой, кнопки-точки с `aria-label`, CTA ≥44px, контраст текста в overlay.
- Reduced-motion requirements: карусель/подсветки не должны быть единственным носителем смысла; smooth scroll заменяется на instant при reduced motion.
- Screenshot requirements: preliminary result, verified result, card expanded, uploading-doc state, mobile+desktop first viewport.
- Fake-trust risks: hardcoded `86%` и `analysisConfidence` могут выглядеть как backend факт; до Stream 1 пометить как preview/estimate.
- Conversion risks: главный blocker может конкурировать с вторичными CTA в карусели; риск потери фокуса primary next action.
- Manual QA checks:
  - При неполных данных verdict уходит в safe `HUMAN_REVIEW`.
  - `documentsUploaded=false` всегда показывает preliminary copy.
  - `documentsUploaded=true` переключает verified copy только после реального события загрузки.
  - CTA ведёт в `/human-review` c согласованными параметрами.
  - Нет текста про гарантию визы/подтверждение консульства.

## Route: `/human-review`
- Screen purpose: честная эскалация к эксперту-человеку при нестандартном кейсе.
- Canonical truth owner: локальная форма до отправки; после отправки owner должен быть backend human-review request state.
- Allowed URL params: `country`, `verdict`, `departure`, `return`, `resultType`, `analysisConfidence` (контекст только для отображения).
- Forbidden URL truth: `sent=true`/`requestId`/`eta` без реального backend подтверждения.
- Primary CTA: `Отправить эксперту` (доступен только при валидных полях).
- Secondary CTA: `Подготовить AI-бриф`/`Обновить AI-бриф`, `Назад`.
- Empty state: нет имени/контакта -> CTA disabled.
- Loading state: `AI собирает бриф…`.
- Error state: AI-бриф не получен -> форма продолжает работать, без fake sent confirmation.
- Success state: AI-пакет отображён (локальная подготовка), но это не равно «заявка отправлена».
- Stale/unknown state: неизвестные `country/verdict` -> fallback `IT` + `GO_WITH_CONDITIONS`.
- Accessibility requirements: валидируемые поля с ясными подписями, кнопки и inputs >=44px, focus-visible на интерактивах.
- Reduced-motion requirements: glow-декор не должен мешать читаемости; при reduced motion сохраняется статичная версия.
- Screenshot requirements: empty form, form valid, ai loading, ai pack shown, primary CTA enabled/disabled.
- Fake-trust risks: запрещено показывать «отправлено эксперту» без реального server-state.
- Conversion risks: неочевидная ценность перед запросом контакта; важно сохранить value-first.
- Manual QA checks:
  - CTA disabled до заполнения имени и контакта.
  - `MockPreviewBadge` виден, если backend send-state не интегрирован.
  - Ошибка AI-брифа не ломает отправку формы.
  - Текст обещает только экспертный разбор, не гарантии исхода.
  - Back link возвращает в согласованный `/result` контекст.

## Cross-Route Truth and Approval Rules
- Stream 1 first: внедрить `caseId` + backend `ResultPayload` owner для `/result` и связанного контекста.
- Stream 2 blocked until approval: UI-реализация/редизайн только после PNG approval пакета.
- Stream 3 later: evidence chips и документные/security контракты расширяются только на реальных backend полях.
- UI never invents backend/product truth: любой unknown => честный fallback + next step к human review.
