import type { HealthInsuranceType, IncomeSource, SpanishLevel } from "@shared/contracts";
import { getSignalValue, hasSignal } from "../signals";
import type { EvaluationContext, EvaluatedRule, RuleDefinition } from "./types";

function notFired(rule: RuleDefinition): EvaluatedRule {
  return {
    fired: false,
    output: rule.defaultOutput,
    explanation: `${rule.title}: условия не сработали.`,
    consumedSignals: rule.consumesSignals
  };
}

// Approx monthly IPREM 2026 ~ 600€; 400% = 2400€. DNV threshold ~2646€.
const IPREM_400 = 2400;
const DNV_THRESHOLD = 2646;

// R16 NLV income threshold
export const r16_nlvIncomeThreshold: RuleDefinition = {
  id: "R16",
  title: "Порог дохода NLV",
  priority: 85,
  category: "residency_eligibility",
  productType: "residency_es",
  consumesSignals: ["income_monthly_eur", "has_dependents", "dependents_count"],
  outputType: "path_penalty",
  defaultOutput: { type: "path_penalty", delta: 0.2 },
  explanationTemplate: "NLV требует ≥ 400% IPREM для основного заявителя.",
  evaluate(ctx) {
    const income = getSignalValue<number>(ctx.signals, "income_monthly_eur");
    const hasDeps = getSignalValue<boolean>(ctx.signals, "has_dependents") ?? false;
    const depsCount = getSignalValue<number>(ctx.signals, "dependents_count") ?? 0;
    if (income === undefined) return notFired(this);
    const required = IPREM_400 + (hasDeps ? depsCount * 600 : 0);
    const fired = income < required;
    return {
      fired,
      output: {
        type: "path_penalty",
        delta: 0.3,
        pathIds: ["nlv_espana"]
      },
      explanation: fired
        ? `NLV требует ≥ ${required}€/мес (400% IPREM + иждивенцы), у вас ${income}€ — подача затруднена.`
        : `Доход ${income}€ проходит порог NLV ${required}€.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R17 DNV remote work check
export const r17_dnvRemoteWorkCheck: RuleDefinition = {
  id: "R17",
  title: "Удалённая работа для DNV",
  priority: 80,
  category: "residency_eligibility",
  productType: "residency_es",
  consumesSignals: ["income_source", "remote_employer_country", "income_monthly_eur"],
  outputType: "path_boost",
  defaultOutput: { type: "path_boost", delta: 0.15 },
  explanationTemplate: "DNV одобряет удалённых сотрудников зарубежных компаний.",
  evaluate(ctx) {
    const source = getSignalValue<IncomeSource>(ctx.signals, "income_source");
    const employer = getSignalValue<string>(ctx.signals, "remote_employer_country");
    const income = getSignalValue<number>(ctx.signals, "income_monthly_eur");
    if (!source || !employer || income === undefined) return notFired(this);
    const isRemote = source === "remote_tech" || source === "remote_other" || source === "freelance";
    const foreignEmployer = employer !== "ES" && employer !== "RU";
    if (isRemote && foreignEmployer && income >= DNV_THRESHOLD) {
      return {
        fired: true,
        output: { type: "path_boost", delta: 0.3, pathIds: ["dnv_espana"] },
        explanation: `Удалённый доход ${income}€ из ${employer} покрывает порог DNV ${DNV_THRESHOLD}€.`,
        consumedSignals: this.consumesSignals
      };
    }
    if (!isRemote) {
      return {
        fired: true,
        output: { type: "path_penalty", delta: 0.25, pathIds: ["dnv_espana"] },
        explanation: `Источник дохода «${source}» не проходит под DNV — нужен удалённый контракт.`,
        consumedSignals: this.consumesSignals
      };
    }
    if (income < DNV_THRESHOLD) {
      return {
        fired: true,
        output: { type: "path_penalty", delta: 0.2, pathIds: ["dnv_espana"] },
        explanation: `Доход ${income}€ ниже порога DNV ${DNV_THRESHOLD}€.`,
        consumedSignals: this.consumesSignals
      };
    }
    return notFired(this);
  }
};

// R18 Golden Visa closed
export const r18_goldenVisaStatus: RuleDefinition = {
  id: "R18",
  title: "Статус Golden Visa",
  priority: 96,
  category: "residency_program",
  productType: "residency_es",
  consumesSignals: ["citizenship"],
  outputType: "blocker",
  defaultOutput: { type: "blocker", severity: "critical", pathIds: ["golden_visa_espana"] },
  explanationTemplate: "Golden Visa приостановлена законом от 2025-04-03.",
  evaluate() {
    return {
      fired: true,
      output: {
        type: "blocker",
        severity: "critical",
        pathIds: ["golden_visa_espana"]
      },
      explanation:
        "Golden Visa Испании закрыта с 3 апреля 2025 года — программа больше не принимает заявки. Рекомендуем переключиться на NLV или DNV.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R19 Arraigo residence duration
export const r19_arraigoResidence: RuleDefinition = {
  id: "R19",
  title: "Arraigo Social — срок проживания",
  priority: 70,
  category: "residency_eligibility",
  productType: "residency_es",
  consumesSignals: ["intended_stay_years"],
  outputType: "path_penalty",
  defaultOutput: { type: "path_penalty", delta: 0.4, pathIds: ["arraigo_social"] },
  explanationTemplate: "Arraigo Social требует документального проживания 3+ лет.",
  evaluate(ctx) {
    const years = getSignalValue<number>(ctx.signals, "intended_stay_years");
    if (years === undefined) return notFired(this);
    const fired = years < 3;
    return {
      fired,
      output: {
        type: "path_penalty",
        delta: 0.4,
        pathIds: ["arraigo_social"]
      },
      explanation: fired
        ? `Arraigo Social доступен после 3 лет в Испании, вы планируете ${years} год(а).`
        : `Период ${years} лет покрывает требование Arraigo Social.`,
      consumedSignals: this.consumesSignals
    };
  }
};

// R20 Criminal record requirement
export const r20_criminalRecord: RuleDefinition = {
  id: "R20",
  title: "Справка о несудимости",
  priority: 97,
  category: "residency_compliance",
  productType: "residency_es",
  consumesSignals: ["criminal_record_clean"],
  outputType: "human_review_trigger",
  defaultOutput: { type: "human_review_trigger" },
  explanationTemplate: "Без чистой справки о несудимости подача невозможна без ручной проверки.",
  evaluate(ctx) {
    const clean = getSignalValue<boolean>(ctx.signals, "criminal_record_clean");
    if (clean === undefined) return notFired(this);
    const fired = clean === false;
    return {
      fired,
      output: { type: "human_review_trigger" },
      explanation: fired
        ? "Справка о несудимости не подтверждена чистой — кейс уходит на ручную проверку к миграционному юристу."
        : "Справка о несудимости подтверждена как чистая.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R21 Health insurance ES check
export const r21_healthInsuranceEs: RuleDefinition = {
  id: "R21",
  title: "Медстраховка для ВНЖ",
  priority: 65,
  category: "residency_compliance",
  productType: "residency_es",
  consumesSignals: ["health_insurance_type"],
  outputType: "warning",
  defaultOutput: { type: "warning", severity: "high" },
  explanationTemplate: "ВНЖ требует полную частную страховку без соплатежей.",
  evaluate(ctx) {
    const insurance = getSignalValue<HealthInsuranceType>(ctx.signals, "health_insurance_type");
    if (!insurance) return notFired(this);
    if (insurance === "private_comprehensive" || insurance === "public_es") {
      return {
        fired: false,
        output: { type: "warning", severity: "low" },
        explanation: "Страховка соответствует требованиям ВНЖ.",
        consumedSignals: this.consumesSignals
      };
    }
    const severity = insurance === "none" ? "critical" : "high";
    return {
      fired: true,
      output: { type: "warning", severity },
      explanation:
        insurance === "none"
          ? "Без испанской частной страховки консульство не примет заявку."
          : "Нужна полная частная страховка (Sanitas/Adeslas) без соплатежей и исключений.",
      consumedSignals: this.consumesSignals
    };
  }
};

// R22 Consulate jurisdiction
export const r22_consulateJurisdiction: RuleDefinition = {
  id: "R22",
  title: "Консульская юрисдикция",
  priority: 55,
  category: "residency_compliance",
  productType: "residency_es",
  consumesSignals: ["citizenship", "target_residency_city"],
  outputType: "advisory",
  defaultOutput: { type: "advisory", severity: "medium" },
  explanationTemplate: "Для граждан РФ подача возможна через ограниченный список консульств.",
  evaluate(ctx) {
    const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
    if (citizenship !== "RU") return notFired(this);
    return {
      fired: true,
      output: { type: "advisory", severity: "medium" },
      explanation:
        "Для граждан РФ в 2026 году подача идёт через консульства Алматы, Еревана или Белграда — в Москве приёма нет.",
      consumedSignals: this.consumesSignals
    };
  }
};

export const residencyRules: RuleDefinition[] = [
  r16_nlvIncomeThreshold,
  r17_dnvRemoteWorkCheck,
  r18_goldenVisaStatus,
  r19_arraigoResidence,
  r20_criminalRecord,
  r21_healthInsuranceEs,
  r22_consulateJurisdiction
];

// reference to silence unused imports lint for SpanishLevel if needed later
export type _SpanishLevelRef = SpanishLevel;
void hasSignal;
