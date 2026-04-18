import type { Activity, ChronicCondition } from "@shared/contracts";
import { getSignalValue } from "../signals";
import type { EvaluationContext, EvaluatedRule, RuleDefinition } from "./types";

function notFired(rule: RuleDefinition): EvaluatedRule {
  return {
    fired: false,
    output: rule.defaultOutput,
    explanation: `${rule.title}: условия не сработали.`,
    consumedSignals: rule.consumesSignals
  };
}

const SCHENGEN_MIN = 30_000;

function productsRequiringSchengen(ctx: EvaluationContext): string[] {
  return ctx.insuranceProducts
    .filter((product) => !product.schengenCompliant || product.coverageAmountEur < SCHENGEN_MIN)
    .map((product) => product.id);
}

// R23 Schengen minimum coverage
export const r23_schengenMinCoverage: RuleDefinition = {
  id: "R23",
  title: "Минимальное шенгенское покрытие",
  priority: 90,
  category: "insurance_compliance",
  productType: "insurance_adult",
  consumesSignals: ["schengen_compliance_required", "destination"],
  outputType: "blocker",
  defaultOutput: { type: "blocker", severity: "high" },
  explanationTemplate: "Шенгенские консульства требуют покрытие ≥ €30 000 и Schengen-сертификацию.",
  evaluate(ctx) {
    const required = getSignalValue<boolean>(ctx.signals, "schengen_compliance_required");
    if (required !== true) return notFired(this);
    const ineligible = productsRequiringSchengen(ctx);
    if (ineligible.length === 0) {
      return {
        fired: false,
        output: { type: "blocker", severity: "low" },
        explanation: "Все доступные полисы проходят шенгенские требования.",
        consumedSignals: this.consumesSignals
      };
    }
    return {
      fired: true,
      output: {
        type: "blocker",
        severity: "high",
        pathIds: ineligible
      },
      explanation: `Полисы ${ineligible.join(", ")} не проходят по шенгенскому минимуму €30 000 — скрываем их из подборки.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R24 Age eligibility
export const r24_ageEligibility: RuleDefinition = {
  id: "R24",
  title: "Возрастные ограничения",
  priority: 88,
  category: "insurance_age",
  productType: "insurance_adult",
  consumesSignals: ["traveler_age"],
  outputType: "path_penalty",
  defaultOutput: { type: "path_penalty", delta: 0.3 },
  explanationTemplate: "Полисы имеют возрастные границы — превышение убирает полис из подборки.",
  evaluate(ctx) {
    const age = getSignalValue<number>(ctx.signals, "traveler_age");
    if (age === undefined) return notFired(this);
    const outOfRange = ctx.insuranceProducts
      .filter((product) => age < product.ageMin || age > product.ageMax)
      .map((product) => product.id);
    if (outOfRange.length === 0) return notFired(this);
    return {
      fired: true,
      output: {
        type: "blocker",
        severity: "medium",
        pathIds: outOfRange
      },
      explanation: `Возраст ${age} лет выходит за диапазон ${outOfRange.join(", ")} — эти полисы не подходят.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R25 Chronic conditions filter
export const r25_chronicConditions: RuleDefinition = {
  id: "R25",
  title: "Хронические заболевания",
  priority: 82,
  category: "insurance_chronic",
  productType: "insurance_adult",
  consumesSignals: ["has_chronic_conditions", "chronic_list"],
  outputType: "path_penalty",
  defaultOutput: { type: "path_penalty", delta: 0.4 },
  explanationTemplate: "Если есть хроники, выбираем только полисы с соответствующим покрытием.",
  evaluate(ctx) {
    const hasChronic = getSignalValue<boolean>(ctx.signals, "has_chronic_conditions");
    const list = getSignalValue<ChronicCondition[]>(ctx.signals, "chronic_list") ?? [];
    if (hasChronic !== true) return notFired(this);
    const ineligible = ctx.insuranceProducts
      .filter((product) => !product.includes.chronic)
      .map((product) => product.id);
    const eligible = ctx.insuranceProducts
      .filter((product) => product.includes.chronic)
      .map((product) => product.id);
    return {
      fired: true,
      output: {
        type: "blocker",
        severity: "medium",
        pathIds: ineligible
      },
      explanation:
        list.length > 0
          ? `Для хроник ${list.join(", ")} подходят только полисы с опцией «хронические»: ${eligible.join(", ")}.`
          : `Хроники есть — оставляем только полисы с покрытием хроник: ${eligible.join(", ")}.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R26 Extreme sports filter
export const r26_extremeSports: RuleDefinition = {
  id: "R26",
  title: "Экстремальные активности",
  priority: 78,
  category: "insurance_activities",
  productType: "insurance_adult",
  consumesSignals: ["planned_activities"],
  outputType: "path_penalty",
  defaultOutput: { type: "path_penalty", delta: 0.35 },
  explanationTemplate: "Для экстремальных активностей нужен полис с соответствующим покрытием.",
  evaluate(ctx) {
    const activities = getSignalValue<Activity[]>(ctx.signals, "planned_activities") ?? [];
    const extremeSet = new Set<Activity>(["ski", "diving", "motorsport", "hiking"]);
    const hasExtreme = activities.some((activity) => extremeSet.has(activity));
    if (!hasExtreme) return notFired(this);
    const ineligible = ctx.insuranceProducts
      .filter((product) => !product.includes.extreme_sports)
      .map((product) => product.id);
    return {
      fired: true,
      output: {
        type: "blocker",
        severity: "medium",
        pathIds: ineligible
      },
      explanation: `Экстремальные активности (${activities.join(", ")}) исключают полисы ${ineligible.join(", ")}.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R27 COVID coverage
export const r27_covidCoverage: RuleDefinition = {
  id: "R27",
  title: "Покрытие COVID-19",
  priority: 45,
  category: "insurance_coverage",
  productType: "insurance_adult",
  consumesSignals: ["schengen_compliance_required"],
  outputType: "advisory",
  defaultOutput: { type: "advisory", severity: "low" },
  explanationTemplate: "COVID-19 покрытие рекомендуется всеми шенгенскими консульствами.",
  evaluate(ctx) {
    const required = getSignalValue<boolean>(ctx.signals, "schengen_compliance_required");
    const missing = ctx.insuranceProducts
      .filter((product) => !product.includes.covid)
      .map((product) => product.id);
    if (missing.length === 0) return notFired(this);
    return {
      fired: true,
      output: {
        type: "advisory",
        severity: required ? "medium" : "low",
        pathIds: missing
      },
      explanation: `Полисы без COVID покрытия: ${missing.join(", ")} — приоритет ниже, особенно если нужен шенген.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R28 Consulate acceptance
export const r28_consulateAcceptance: RuleDefinition = {
  id: "R28",
  title: "Принимается консульством",
  priority: 72,
  category: "insurance_compliance",
  productType: "insurance_adult",
  consumesSignals: ["destination", "schengen_compliance_required"],
  outputType: "path_penalty",
  defaultOutput: { type: "path_penalty", delta: 0.25 },
  explanationTemplate: "Проверяем, что полис принимается консульством целевой страны.",
  evaluate(ctx) {
    const destination = getSignalValue<string>(ctx.signals, "destination");
    const required = getSignalValue<boolean>(ctx.signals, "schengen_compliance_required");
    if (!destination) return notFired(this);
    const ineligible = ctx.insuranceProducts
      .filter((product) => !product.acceptedByConsulates.includes(destination))
      .map((product) => product.id);
    if (ineligible.length === 0) return notFired(this);
    return {
      fired: true,
      output: {
        type: required ? "blocker" : "path_penalty",
        severity: required ? "high" : "medium",
        pathIds: ineligible,
        delta: 0.3
      },
      explanation: `Полисы ${ineligible.join(", ")} не приняты консульством ${destination} — убираем или понижаем приоритет.`,
      consumedSignals: this.consumesSignals
    };
  }
};

export const insuranceRules: RuleDefinition[] = [
  r23_schengenMinCoverage,
  r24_ageEligibility,
  r25_chronicConditions,
  r26_extremeSports,
  r27_covidCoverage,
  r28_consulateAcceptance
];
