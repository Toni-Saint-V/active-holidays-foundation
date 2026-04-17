import type { CaseSignals, TravelPurpose, VisaRule } from "@shared/contracts";
import { getSignalValue, hasSignal } from "../signals";
import type { EvaluationContext, EvaluatedRule, RuleDefinition } from "./types";

function resolveVisaRule(
  ctx: EvaluationContext,
  citizenship: string,
  destination: string
): VisaRule | null {
  return (
    ctx.visaRules.find(
      (rule) =>
        rule.citizenship === citizenship && rule.destination === destination
    ) ?? null
  );
}

function eligiblePaths(ctx: EvaluationContext): typeof ctx.paths {
  const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
  const destination = getSignalValue<string>(ctx.signals, "destination");
  if (!citizenship || !destination) return [];
  return ctx.paths.filter(
    (path) => path.citizenship === citizenship && path.destination === destination
  );
}

function notFiredEvaluation(rule: RuleDefinition): EvaluatedRule {
  return {
    fired: false,
    output: rule.defaultOutput,
    explanation: `${rule.title}: условия не сработали.`,
    consumedSignals: rule.consumesSignals
  };
}

// R01 — паспорт не действует достаточно долго
export const r01_passportValidity: RuleDefinition = {
  id: "R01",
  title: "Срок действия паспорта",
  priority: 95,
  category: "document",
  productType: "travel",
  consumesSignals: ["passport_validity_months", "timeline_weeks", "destination"],
  outputType: "blocker",
  defaultOutput: { type: "blocker", severity: "critical" },
  explanationTemplate: "Паспорт должен быть действителен минимум на 6 месяцев после поездки.",
  evaluate(ctx) {
    const months = getSignalValue<number>(ctx.signals, "passport_validity_months");
    const timelineWeeks = getSignalValue<number>(ctx.signals, "timeline_weeks") ?? 0;
    if (months === undefined) return notFiredEvaluation(this);
    const tripMonths = Math.ceil(timelineWeeks / 4);
    const fired = months < tripMonths + 6;
    return {
      fired,
      output: { type: "blocker", severity: "critical" },
      explanation: fired
        ? `Паспорт действует ${months} мес., для поездки через ~${tripMonths} мес. нужно ещё минимум 6 мес. запаса.`
        : `Паспорт действует ${months} мес. — срок действия достаточен.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R02 — требуется виза
export const r02_visaRequired: RuleDefinition = {
  id: "R02",
  title: "Требование визы",
  priority: 90,
  category: "visa",
  productType: "travel",
  consumesSignals: ["citizenship", "destination"],
  outputType: "advisory",
  defaultOutput: { type: "advisory", severity: "medium" },
  explanationTemplate: "Визовый режим зависит от пары гражданство и направление.",
  evaluate(ctx) {
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (!citizenship || !destination) return notFiredEvaluation(this);
    const visaRule = resolveVisaRule(ctx, citizenship, destination);
    if (!visaRule) {
      return {
        fired: true,
        output: { type: "human_review_trigger" },
        explanation: `Для пары ${citizenship}→${destination} нет готового визового правила — нужно ручное уточнение.`,
        consumedSignals: this.consumesSignals
      };
    }
    const fired = visaRule.regime === "consular_visa" || visaRule.regime === "e_visa";
    return {
      fired,
      output: fired
        ? { type: "advisory", severity: "medium" }
        : { type: "advisory", severity: "low" },
      explanation: fired
        ? `Требуется ${visaRule.regime === "e_visa" ? "электронная" : "консульская"} виза (${visaRule.processingWeeks} нед., ~${visaRule.feeEur}€).`
        : `Визовый режим: ${visaRule.regime === "visa_free" ? "без визы" : "виза по прибытии"}.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R03 — предыдущий шенген повышает приоритет
export const r03_previousVisaBonus: RuleDefinition = {
  id: "R03",
  title: "История шенгенских виз",
  priority: 45,
  category: "visa",
  productType: "travel",
  consumesSignals: ["previous_schengen_visa", "destination"],
  outputType: "path_boost",
  defaultOutput: { type: "path_boost", delta: 0.15 },
  explanationTemplate: "Повторное обращение в Шенген обычно проще и быстрее.",
  evaluate(ctx) {
    const hadSchengen = getSignalValue<boolean>(ctx.signals, "previous_schengen_visa");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    const schengenDestinations = new Set([
      "IT",
      "FR",
      "DE",
      "ES",
      "GR",
      "PT",
      "AT",
      "NL",
      "BE",
      "FI",
      "SE",
      "DK",
      "PL",
      "CZ",
      "HU"
    ]);
    if (!destination || !schengenDestinations.has(destination)) {
      return notFiredEvaluation(this);
    }
    const fired = hadSchengen === true;
    const pathIds = eligiblePaths(ctx).map((path) => path.id);
    return {
      fired,
      output: { type: "path_boost", delta: 0.15, pathIds },
      explanation: fired
        ? "Есть недавний шенген — повторное обращение обычно проходит быстрее и с меньшим количеством вопросов."
        : "История шенгенских виз не подтверждена — маршрут рассчитывается как для первого обращения.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R04 — доступность слота
export const r04_slotAvailability: RuleDefinition = {
  id: "R04",
  title: "Доступность слота",
  priority: 70,
  category: "slot",
  productType: "travel",
  consumesSignals: ["slot_available_weeks", "timeline_weeks"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "medium" },
  explanationTemplate: "Сверяем ближайший слот с горизонтом поездки.",
  evaluate(ctx) {
    const slot = getSignalValue<number>(ctx.signals, "slot_available_weeks");
    const timeline = getSignalValue<number>(ctx.signals, "timeline_weeks");
    if (slot === undefined || timeline === undefined) return notFiredEvaluation(this);
    const fired = slot > timeline;
    return {
      fired,
      output: { type: "warning", severity: fired ? "high" : "low" },
      explanation: fired
        ? `Ближайший слот через ${slot} нед., но выезд запланирован через ${timeline} нед. — нужен план Б или альтернативный трек.`
        : `Слот доступен раньше выезда (${slot} против ${timeline} нед.) — ок.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R05 — сроки подачи реалистичны
export const r05_processingFeasibility: RuleDefinition = {
  id: "R05",
  title: "Реалистичность сроков",
  priority: 75,
  category: "timeline",
  productType: "travel",
  consumesSignals: ["timeline_weeks", "citizenship", "destination"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "medium" },
  explanationTemplate: "Сроки обработки документов должны вписываться в горизонт поездки.",
  evaluate(ctx) {
    const timeline = getSignalValue<number>(ctx.signals, "timeline_weeks");
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (timeline === undefined || !citizenship || !destination) {
      return notFiredEvaluation(this);
    }
    const visaRule = resolveVisaRule(ctx, citizenship, destination);
    if (!visaRule) return notFiredEvaluation(this);
    const fired = visaRule.processingWeeks > timeline - 1;
    return {
      fired,
      output: { type: "warning", severity: fired ? "high" : "low" },
      explanation: fired
        ? `Оформление занимает ~${visaRule.processingWeeks} нед., горизонт только ${timeline} нед. — риск не успеть.`
        : `Оформление (~${visaRule.processingWeeks} нед.) укладывается в горизонт ${timeline} нед.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R06 — санкционные ограничения
export const r06_sanctions: RuleDefinition = {
  id: "R06",
  title: "Санкционные ограничения",
  priority: 98,
  category: "sanctions",
  productType: "travel",
  consumesSignals: ["sanctions_exposure", "citizenship", "destination", "travel_purpose"],
  outputType: "human_review_trigger",
  defaultOutput: { type: "human_review_trigger" },
  explanationTemplate: "Санкционные пересечения требуют ручной проверки.",
  evaluate(ctx) {
    const exposure = getSignalValue<boolean>(ctx.signals, "sanctions_exposure");
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    const purpose = getSignalValue<TravelPurpose>(ctx.signals, "travel_purpose");
    if (exposure === undefined || !citizenship || !destination) return notFiredEvaluation(this);
    const restriction = ctx.restrictions.find(
      (item) =>
        item.citizenship === citizenship &&
        item.destination === destination &&
        item.severity === "sanctions"
    );
    const fired = exposure === true || (!!restriction && purpose === "business");
    return {
      fired,
      output: { type: "human_review_trigger" },
      explanation: fired
        ? `Санкционный контекст (${restriction?.label ?? "самодекларация"}) требует ручной проверки менеджером.`
        : "Явных санкционных пересечений не выявлено.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R07 — тревел-предупреждения
export const r07_travelAdvisory: RuleDefinition = {
  id: "R07",
  title: "Путевые предупреждения",
  priority: 55,
  category: "advisory",
  productType: "travel",
  consumesSignals: ["citizenship", "destination"],
  outputType: "advisory",
  defaultOutput: { type: "advisory", severity: "low" },
  explanationTemplate: "Учитываем активные предупреждения по направлению.",
  evaluate(ctx) {
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (!citizenship || !destination) return notFiredEvaluation(this);
    const advisory = ctx.restrictions.find(
      (item) =>
        item.citizenship === citizenship &&
        item.destination === destination &&
        item.severity === "advisory"
    );
    if (!advisory) return notFiredEvaluation(this);
    return {
      fired: true,
      output: { type: "advisory", severity: "medium" },
      explanation: advisory.detail,
      consumedSignals: this.consumesSignals
    };
  }
};

// R08 — платежные ограничения
export const r08_paymentRestriction: RuleDefinition = {
  id: "R08",
  title: "Платёжные ограничения",
  priority: 65,
  category: "payment",
  productType: "travel",
  consumesSignals: ["payment_cards_ok", "citizenship", "destination"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "medium" },
  explanationTemplate: "Оценка возможности оплаты в стране назначения.",
  evaluate(ctx) {
    const cardsOk = getSignalValue<boolean>(ctx.signals, "payment_cards_ok");
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (!citizenship || !destination) return notFiredEvaluation(this);
    const restriction = ctx.restrictions.find(
      (item) =>
        item.citizenship === citizenship &&
        item.destination === destination &&
        item.severity === "payment"
    );
    if (!restriction) {
      if (cardsOk === false) {
        return {
          fired: true,
          output: { type: "warning", severity: "low" },
          explanation: "Карты для поездки не подтверждены — заложите наличные или заранее оформите альтернативу.",
          consumedSignals: this.consumesSignals
        };
      }
      return notFiredEvaluation(this);
    }
    const fired = cardsOk !== true;
    return {
      fired,
      output: { type: "warning", severity: "high" },
      explanation: fired
        ? `${restriction.label}: без проверенного платёжного канала поездка будет некомфортной.`
        : `${restriction.label}: карты подтверждены как рабочие, основной риск снят.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R09 — пробел в страховке
export const r09_insuranceGap: RuleDefinition = {
  id: "R09",
  title: "Медицинская страховка",
  priority: 60,
  category: "insurance",
  productType: "travel",
  consumesSignals: ["insurance_ok", "destination"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "medium" },
  explanationTemplate: "Страховка должна покрывать все дни поездки.",
  evaluate(ctx) {
    const insuranceOk = getSignalValue<boolean>(ctx.signals, "insurance_ok");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (insuranceOk === undefined || !destination) return notFiredEvaluation(this);
    const fired = insuranceOk === false;
    return {
      fired,
      output: { type: "warning", severity: fired ? "medium" : "low" },
      explanation: fired
        ? "Страховка не подтверждена — нужно оформить полис с покрытием 30000€ и более."
        : "Страховка подтверждена.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R10 — полнота документов
export const r10_documentCompleteness: RuleDefinition = {
  id: "R10",
  title: "Полнота документов",
  priority: 68,
  category: "completeness",
  productType: "travel",
  consumesSignals: ["documents_ready_count", "documents_required_count"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "medium" },
  explanationTemplate: "Сравниваем готовые и необходимые документы.",
  evaluate(ctx) {
    const ready = getSignalValue<number>(ctx.signals, "documents_ready_count");
    const required = getSignalValue<number>(ctx.signals, "documents_required_count");
    if (ready === undefined || required === undefined || required === 0) {
      return notFiredEvaluation(this);
    }
    const share = ready / required;
    if (share >= 1) {
      return {
        fired: false,
        output: { type: "warning", severity: "low" },
        explanation: "Все документы по чеклисту готовы.",
        consumedSignals: this.consumesSignals
      };
    }
    const missing = required - ready;
    const fired = share < 0.8;
    return {
      fired,
      output: {
        type: "warning",
        severity: share < 0.5 ? "high" : "medium"
      },
      explanation: fired
        ? `Не хватает ${missing} документов из ${required} — доготовить перед подачей.`
        : `Готово ${ready} из ${required} документов — последние ${missing} можно довезти.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R11 — первый шенген
export const r11_firstSchengenPriority: RuleDefinition = {
  id: "R11",
  title: "Первый шенген — приоритет",
  priority: 50,
  category: "path_strategy",
  productType: "travel",
  consumesSignals: ["previous_schengen_visa", "destination"],
  outputType: "path_boost",
  defaultOutput: { type: "path_boost", delta: 0.1 },
  explanationTemplate: "Для первого шенгена выбираем консервативный и понятный трек.",
  evaluate(ctx) {
    const hadSchengen = getSignalValue<boolean>(ctx.signals, "previous_schengen_visa");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (hadSchengen === undefined || !destination) return notFiredEvaluation(this);
    const italianPath = ctx.paths.find(
      (path) => path.id === "italy_c_tourism" && path.destination === destination
    );
    const fired = hadSchengen === false && !!italianPath;
    return {
      fired,
      output: {
        type: "path_boost",
        delta: 0.12,
        pathIds: italianPath ? [italianPath.id] : []
      },
      explanation: fired
        ? "Первый шенген — итальянский турвизовый трек даёт самый понятный сценарий одобрения."
        : "Стратегия первого шенгена не применяется.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R12 — оптимизация стоимости
export const r12_costOptimization: RuleDefinition = {
  id: "R12",
  title: "Оптимизация стоимости",
  priority: 35,
  category: "cost",
  productType: "travel",
  consumesSignals: ["citizenship", "destination"],
  outputType: "path_boost",
  defaultOutput: { type: "path_boost", delta: 0.05 },
  explanationTemplate: "Маршруты без визы или по прибытии получают приоритет по стоимости.",
  evaluate(ctx) {
    const eligible = eligiblePaths(ctx);
    const cheap = eligible
      .filter((path) => path.kind === "visa_free" || path.kind === "visa_on_arrival")
      .map((path) => path.id);
    if (cheap.length === 0) return notFiredEvaluation(this);
    return {
      fired: true,
      output: { type: "path_boost", delta: 0.08, pathIds: cheap },
      explanation: "Есть маршруты без консульской визы — они заметно дешевле и быстрее.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R13 — транзитный маршрут
export const r13_transitRoute: RuleDefinition = {
  id: "R13",
  title: "Транзитный маршрут",
  priority: 40,
  category: "transit",
  productType: "travel",
  consumesSignals: ["travel_purpose", "citizenship", "destination"],
  outputType: "advisory",
  defaultOutput: { type: "advisory", severity: "low" },
  explanationTemplate: "Транзит требует отдельного внимания к пересадкам.",
  evaluate(ctx) {
    const purpose = getSignalValue<TravelPurpose>(ctx.signals, "travel_purpose");
    if (purpose !== "transit") return notFiredEvaluation(this);
    return {
      fired: true,
      output: { type: "advisory", severity: "medium" },
      explanation: "Транзитный сценарий: проверьте визы на пересадочные страны и зону прилёта.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R14 — требование регистрации
export const r14_registrationRequirement: RuleDefinition = {
  id: "R14",
  title: "Регистрация по прибытии",
  priority: 58,
  category: "registration",
  productType: "travel",
  consumesSignals: ["registration_on_arrival_ok", "citizenship", "destination"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "low" },
  explanationTemplate: "Некоторые страны требуют регистрацию в течение нескольких дней.",
  evaluate(ctx) {
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    const ready = getSignalValue<boolean>(ctx.signals, "registration_on_arrival_ok");
    if (!citizenship || !destination) return notFiredEvaluation(this);
    const rule = resolveVisaRule(ctx, citizenship, destination);
    if (!rule || !rule.registrationRequired) return notFiredEvaluation(this);
    const fired = ready !== true;
    return {
      fired,
      output: {
        type: "warning",
        severity: fired ? "medium" : "low"
      },
      explanation: fired
        ? `Страна требует регистрацию в течение ${rule.regime === "visa_free" ? "7" : "3"} дней — нужно подтвердить готовность.`
        : "Регистрация по прибытии подтверждена как выполнимая.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R15 — сезонный спрос
export const r15_seasonalDemand: RuleDefinition = {
  id: "R15",
  title: "Сезонный спрос",
  priority: 30,
  category: "seasonal",
  productType: "travel",
  consumesSignals: ["timeline_weeks", "destination"],
  outputType: "advisory",
  defaultOutput: { type: "advisory", severity: "low" },
  explanationTemplate: "Узкий горизонт в высокий сезон снижает доступность слотов.",
  evaluate(ctx) {
    const timeline = getSignalValue<number>(ctx.signals, "timeline_weeks");
    const destination = getSignalValue<string>(ctx.signals, "destination");
    if (timeline === undefined || !destination) return notFiredEvaluation(this);
    const hotDestinations = new Set(["IT", "ES", "GR", "TR"]);
    const fired = timeline <= 6 && hotDestinations.has(destination);
    return {
      fired,
      output: { type: "advisory", severity: fired ? "medium" : "low" },
      explanation: fired
        ? "Высокий сезон и короткий горизонт — слоты расхватывают заранее, берите ближайший из доступных."
        : "Сезонный риск по горизонту не критичен.",
      consumedSignals: this.consumesSignals
    };
  }
};

export const allTravelRuleDefinitions: RuleDefinition[] = [
  r01_passportValidity,
  r02_visaRequired,
  r03_previousVisaBonus,
  r04_slotAvailability,
  r05_processingFeasibility,
  r06_sanctions,
  r07_travelAdvisory,
  r08_paymentRestriction,
  r09_insuranceGap,
  r10_documentCompleteness,
  r11_firstSchengenPriority,
  r12_costOptimization,
  r13_transitRoute,
  r14_registrationRequirement,
  r15_seasonalDemand
];

import { residencyRules as _residencyRules } from "./residencyRules";
import { insuranceRules as _insuranceRules } from "./insuranceRules";

export function getRuleDefinitionById(id: string): RuleDefinition | null {
  return (
    allTravelRuleDefinitions.find((rule) => rule.id === id) ??
    _residencyRules.find((rule) => rule.id === id) ??
    _insuranceRules.find((rule) => rule.id === id) ??
    null
  );
}

export function hasRequiredSignalsForRule(
  rule: RuleDefinition,
  signals: CaseSignals
): boolean {
  return rule.consumesSignals.every((signalId) => hasSignal(signals, signalId));
}
