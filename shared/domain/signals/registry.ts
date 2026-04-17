import type {
  CaseSignals,
  ProductType,
  SignalDefinition,
  SignalId,
  SignalsRegistry
} from "@shared/contracts";

export const signalsRegistry: SignalsRegistry = [
  // Shared / travel
  {
    id: "citizenship",
    label: "Гражданство",
    kind: "enum",
    mandatory: true,
    productTypes: ["travel", "residency_es", "insurance_adult"],
    prompt: "Какое у вас действующее гражданство?",
    options: [
      { value: "RU", label: "Россия" },
      { value: "TR", label: "Турция" },
      { value: "US", label: "США" },
      { value: "RS", label: "Сербия" },
      { value: "AE", label: "ОАЭ" },
      { value: "GE", label: "Грузия" },
      { value: "AM", label: "Армения" },
      { value: "BY", label: "Беларусь" }
    ],
    helper: "Используем, чтобы понять визовый режим и консульскую юрисдикцию."
  },
  {
    id: "destination",
    label: "Направление",
    kind: "enum",
    mandatory: true,
    productTypes: ["travel", "insurance_adult"],
    prompt: "Куда вы хотите поехать?",
    options: [
      { value: "IT", label: "Италия" },
      { value: "RU", label: "Россия (Санкт-Петербург)" },
      { value: "TR", label: "Турция" },
      { value: "RS", label: "Сербия" },
      { value: "AE", label: "ОАЭ" },
      { value: "GE", label: "Грузия" },
      { value: "AM", label: "Армения" },
      { value: "ES", label: "Испания" }
    ],
    helper: "Под это направление подбираем маршрут и документы."
  },
  {
    id: "travel_purpose",
    label: "Цель поездки",
    kind: "enum",
    mandatory: true,
    productTypes: ["travel"],
    prompt: "С какой целью вы планируете поездку?",
    options: [
      { value: "tourism", label: "Туризм" },
      { value: "business", label: "Бизнес" },
      { value: "study", label: "Учёба" },
      { value: "family", label: "К семье и друзьям" },
      { value: "transit", label: "Транзит" }
    ]
  },
  {
    id: "passport_validity_months",
    label: "Срок действия паспорта",
    kind: "number",
    mandatory: true,
    productTypes: ["travel", "residency_es"],
    min: 0,
    max: 120,
    prompt: "Сколько полных месяцев действителен ваш загранпаспорт?",
    helper: "Для ВНЖ Испании нужен запас минимум 12 месяцев."
  },
  {
    id: "timeline_weeks",
    label: "Горизонт поездки",
    kind: "number",
    mandatory: true,
    productTypes: ["travel"],
    min: 0,
    max: 104,
    prompt: "Через сколько недель планируете выезд?",
    helper: "Это влияет на выбор консульского или визового трека."
  },
  {
    id: "previous_schengen_visa",
    label: "Был ли шенген",
    kind: "boolean",
    mandatory: false,
    productTypes: ["travel"],
    prompt: "Получали ли вы шенгенскую визу за последние 3 года?"
  },
  {
    id: "insurance_ok",
    label: "Страховка",
    kind: "boolean",
    mandatory: false,
    productTypes: ["travel"],
    prompt: "Готова ли у вас медицинская страховка на все дни поездки?"
  },
  {
    id: "payment_cards_ok",
    label: "Платежи в стране",
    kind: "boolean",
    mandatory: false,
    productTypes: ["travel"],
    prompt: "У вас есть рабочие карты для оплаты в стране назначения?"
  },
  {
    id: "sanctions_exposure",
    label: "Санкционные ограничения",
    kind: "boolean",
    mandatory: false,
    productTypes: ["travel"],
    prompt: "Связаны ли поездка или компания со списками санкций?"
  },
  {
    id: "registration_on_arrival_ok",
    label: "Готовность к регистрации",
    kind: "boolean",
    mandatory: false,
    productTypes: ["travel"],
    prompt: "Готовы ли вы оформить регистрацию по прибытии, если она требуется?"
  },
  {
    id: "documents_ready_count",
    label: "Готовые документы",
    kind: "number",
    mandatory: false,
    productTypes: ["travel", "residency_es"],
    min: 0,
    max: 50,
    prompt: "Сколько документов из чеклиста уже готовы?"
  },
  {
    id: "documents_required_count",
    label: "Необходимые документы",
    kind: "number",
    mandatory: false,
    productTypes: ["travel", "residency_es"],
    min: 0,
    max: 50,
    prompt: "Сколько документов всего требует выбранный трек?"
  },
  {
    id: "slot_available_weeks",
    label: "Ближайший слот",
    kind: "number",
    mandatory: false,
    productTypes: ["travel", "residency_es"],
    min: 0,
    max: 104,
    prompt: "Через сколько недель доступен ближайший слот в консульстве?"
  },
  // Residency ES
  {
    id: "income_monthly_eur",
    label: "Ежемесячный доход, €",
    kind: "number",
    mandatory: true,
    productTypes: ["residency_es"],
    min: 0,
    max: 100000,
    prompt: "Сколько евро в месяц вы можете подтвердить за последние 12 месяцев?",
    helper: "NLV требует ≥ 400% IPREM, DNV — стабильный доход от удалённого работодателя."
  },
  {
    id: "income_source",
    label: "Источник дохода",
    kind: "enum",
    mandatory: true,
    productTypes: ["residency_es"],
    prompt: "Откуда у вас основной доход?",
    options: [
      { value: "remote_tech", label: "Удалённая работа (IT)" },
      { value: "remote_other", label: "Удалённая работа (не IT)" },
      { value: "freelance", label: "Фриланс по контракту" },
      { value: "local_employment", label: "Локальный найм" },
      { value: "savings", label: "Сбережения / пассивный доход" },
      { value: "business_owner", label: "Владение бизнесом" },
      { value: "pension", label: "Пенсия" }
    ]
  },
  {
    id: "savings_eur",
    label: "Сбережения, €",
    kind: "number",
    mandatory: false,
    productTypes: ["residency_es"],
    min: 0,
    max: 10_000_000,
    prompt: "Сколько евро на счёте, которые можно показать как резерв?"
  },
  {
    id: "has_dependents",
    label: "Есть иждивенцы",
    kind: "boolean",
    mandatory: true,
    productTypes: ["residency_es"],
    prompt: "Поедете ли вы с супругом или детьми?"
  },
  {
    id: "dependents_count",
    label: "Количество иждивенцев",
    kind: "number",
    mandatory: false,
    productTypes: ["residency_es"],
    min: 0,
    max: 20,
    prompt: "Сколько членов семьи переезжают с вами?"
  },
  {
    id: "spanish_language_level",
    label: "Уровень испанского",
    kind: "enum",
    mandatory: false,
    productTypes: ["residency_es"],
    prompt: "Какой у вас уровень испанского?",
    options: [
      { value: "none", label: "Не владею" },
      { value: "A1", label: "A1 — начальный" },
      { value: "A2", label: "A2 — базовый" },
      { value: "B1", label: "B1 — пороговый" },
      { value: "B2", label: "B2 — средний" },
      { value: "C1", label: "C1 — продвинутый" }
    ]
  },
  {
    id: "criminal_record_clean",
    label: "Справка о несудимости",
    kind: "boolean",
    mandatory: true,
    productTypes: ["residency_es"],
    prompt: "Есть ли действующая справка о несудимости с апостилем?"
  },
  {
    id: "health_insurance_type",
    label: "Медицинская страховка",
    kind: "enum",
    mandatory: true,
    productTypes: ["residency_es"],
    prompt: "Какая у вас есть медицинская страховка для Испании?",
    options: [
      { value: "none", label: "Нет страховки" },
      { value: "travel_only", label: "Только туристическая" },
      { value: "private_basic", label: "Частная базовая" },
      { value: "private_comprehensive", label: "Частная полная (Sanitas/Adeslas)" },
      { value: "public_es", label: "Уже оформлена испанская" }
    ]
  },
  {
    id: "target_residency_city",
    label: "Целевой город",
    kind: "enum",
    mandatory: false,
    productTypes: ["residency_es"],
    prompt: "В каком городе планируете жить?",
    options: [
      { value: "MAD", label: "Мадрид" },
      { value: "BCN", label: "Барселона" },
      { value: "VAL", label: "Валенсия" },
      { value: "SVQ", label: "Севилья" },
      { value: "BIO", label: "Бильбао" },
      { value: "MLG", label: "Малага" }
    ]
  },
  {
    id: "intended_stay_years",
    label: "Планируемый срок пребывания",
    kind: "number",
    mandatory: false,
    productTypes: ["residency_es"],
    min: 1,
    max: 30,
    prompt: "Сколько лет планируете жить в Испании?"
  },
  {
    id: "remote_employer_country",
    label: "Страна удалённого работодателя",
    kind: "enum",
    mandatory: false,
    productTypes: ["residency_es"],
    prompt: "Где зарегистрирован ваш удалённый работодатель?",
    options: [
      { value: "US", label: "США" },
      { value: "GB", label: "Великобритания" },
      { value: "DE", label: "Германия" },
      { value: "RU", label: "Россия" },
      { value: "AE", label: "ОАЭ" },
      { value: "CY", label: "Кипр" },
      { value: "RS", label: "Сербия" },
      { value: "AM", label: "Армения" }
    ]
  },
  // Insurance adult
  {
    id: "traveler_age",
    label: "Возраст путешественника",
    kind: "number",
    mandatory: true,
    productTypes: ["insurance_adult"],
    min: 0,
    max: 120,
    prompt: "Сколько вам полных лет?"
  },
  {
    id: "has_chronic_conditions",
    label: "Хронические заболевания",
    kind: "boolean",
    mandatory: true,
    productTypes: ["insurance_adult"],
    prompt: "Есть ли у вас хронические заболевания, требующие наблюдения?"
  },
  {
    id: "chronic_list",
    label: "Список хронических",
    kind: "enum_multi",
    mandatory: false,
    productTypes: ["insurance_adult"],
    prompt: "Отметьте, что у вас есть из хронических заболеваний",
    options: [
      { value: "hypertension", label: "Гипертония" },
      { value: "diabetes_type2", label: "Диабет 2 типа" },
      { value: "asthma", label: "Астма" },
      { value: "heart_disease", label: "Болезни сердца" },
      { value: "arthritis", label: "Артрит" },
      { value: "thyroid", label: "Щитовидка" }
    ]
  },
  {
    id: "planned_activities",
    label: "Запланированные активности",
    kind: "enum_multi",
    mandatory: false,
    productTypes: ["insurance_adult"],
    prompt: "Чем планируете заниматься в поездке?",
    options: [
      { value: "city_tour", label: "Городской туризм" },
      { value: "beach", label: "Пляж и бассейн" },
      { value: "ski", label: "Горные лыжи / сноуборд" },
      { value: "diving", label: "Дайвинг" },
      { value: "hiking", label: "Походы и треккинг" },
      { value: "motorsport", label: "Мотоциклы / квадроциклы" },
      { value: "cycling", label: "Велоспорт" }
    ]
  },
  {
    id: "trip_duration_days",
    label: "Длительность поездки",
    kind: "number",
    mandatory: true,
    productTypes: ["insurance_adult"],
    min: 1,
    max: 365,
    prompt: "Сколько дней будет длиться поездка?"
  },
  {
    id: "coverage_amount_needed_eur",
    label: "Покрытие, €",
    kind: "number",
    mandatory: false,
    productTypes: ["insurance_adult"],
    min: 0,
    max: 1_000_000,
    prompt: "Какое минимальное покрытие вам нужно?",
    helper: "Шенген требует минимум €30 000."
  },
  {
    id: "schengen_compliance_required",
    label: "Шенген-совместимость",
    kind: "boolean",
    mandatory: true,
    productTypes: ["insurance_adult"],
    prompt: "Нужен ли полис, принимаемый шенгенскими консульствами?"
  }
];

export const signalsRegistryById: Record<SignalId, SignalDefinition> =
  Object.freeze(
    signalsRegistry.reduce(
      (acc, signal) => {
        acc[signal.id] = signal;
        return acc;
      },
      {} as Record<SignalId, SignalDefinition>
    )
  );

export function getSignalDefinition(id: SignalId): SignalDefinition {
  const definition = signalsRegistryById[id];
  if (!definition) {
    throw new Error(`Неизвестный сигнал: ${id}`);
  }
  return definition;
}

export function getSignalValue<T>(
  signals: CaseSignals,
  id: SignalId
): T | undefined {
  const record = signals.find((signal) => signal.id === id);
  if (!record) return undefined;
  return record.value as T;
}

export function hasSignal(signals: CaseSignals, id: SignalId): boolean {
  return signals.some((signal) => signal.id === id);
}

export function mandatorySignalIds(productType: ProductType = "travel"): SignalId[] {
  return signalsRegistry
    .filter((signal) => signal.mandatory && signal.productTypes.includes(productType))
    .map((signal) => signal.id);
}

export function signalsForProduct(productType: ProductType): SignalId[] {
  return signalsRegistry
    .filter((signal) => signal.productTypes.includes(productType))
    .map((signal) => signal.id);
}
