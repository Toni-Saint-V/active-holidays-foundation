import type {
  Case,
  CaseSignals,
  CountryRestriction,
  DecisionSignal,
  DocumentsReadiness,
  InsuranceProductDefinition,
  Offer,
  PathDefinition,
  ProductType,
  ResidencyProgramDefinition,
  ResultPayload,
  Source,
  VisaRule
} from "@shared/contracts";
import {
  isInsuranceOffer,
  isResidencyOffer,
  isTravelOffer
} from "@shared/contracts";
import {
  mandatorySignalIds,
  signalsRegistryById,
  hasSignal,
  getSignalValue,
  signalsForProduct
} from "../signals";
import { evaluateRules } from "../rules";
import { rankOffers, splitOffers } from "../offers";
import { deriveRisks, pickCriticalRisk } from "../risk";
import {
  computeConfidenceBreakdown,
  detectConflicts,
  computeAmbiguity
} from "../confidence";
import { refreshSourcesWithVolatility, aggregateVolatility } from "../volatility";
import { computeVerdict } from "./verdict";
import { generateWhy } from "./why";
import { resolveAction } from "../action";
import { createAuditBuilder } from "../audit";

export type OrchestratorCatalogs = {
  paths: PathDefinition[];
  visaRules: VisaRule[];
  restrictions: CountryRestriction[];
  sources: Source[];
  residencyPrograms: ResidencyProgramDefinition[];
  insuranceProducts: InsuranceProductDefinition[];
};

type RunOptions = {
  preview?: boolean;
  now?: () => Date;
};

const STABLE_NOW = () => new Date("2026-04-17T09:00:00.000Z");

function collectSignals(caseData: Case): CaseSignals {
  const productSignalIds = new Set(signalsForProduct(caseData.productType));
  return caseData.signals.filter((signal) => productSignalIds.has(signal.id));
}

function validateSignals(signals: CaseSignals): {
  valid: CaseSignals;
  invalid: CaseSignals;
} {
  const valid: CaseSignals = [];
  const invalid: CaseSignals = [];
  for (const record of signals) {
    const definition = signalsRegistryById[record.id];
    if (!definition) continue;
    const value = record.value;
    if (definition.kind === "number" && typeof value !== "number") {
      invalid.push(record);
      continue;
    }
    if (definition.kind === "boolean" && typeof value !== "boolean") {
      invalid.push(record);
      continue;
    }
    if (definition.kind === "enum" && typeof value !== "string") {
      invalid.push(record);
      continue;
    }
    if (definition.kind === "enum_multi" && !Array.isArray(value)) {
      invalid.push(record);
      continue;
    }
    valid.push(record);
  }
  return { valid, invalid };
}

function resolveVisaRules(
  productType: ProductType,
  signals: CaseSignals,
  catalog: VisaRule[]
): VisaRule[] {
  if (productType !== "travel" && productType !== "insurance_adult") return [];
  const citizenship = getSignalValue<string>(signals, "citizenship");
  const destination = getSignalValue<string>(signals, "destination");
  if (!citizenship || !destination) return [];
  return catalog.filter(
    (rule) => rule.citizenship === citizenship && rule.destination === destination
  );
}

function formatSignalValue(signal: CaseSignals[number]): string {
  const definition = signalsRegistryById[signal.id];
  if (!definition) return String(signal.value);
  if (definition.kind === "boolean") return signal.value ? "да" : "нет";
  if (definition.kind === "number") return String(signal.value);
  if (definition.kind === "enum_multi") {
    const values = Array.isArray(signal.value) ? signal.value : [];
    return values.map((v) => {
      const option = definition.options?.find((item) => item.value === v);
      return option?.label ?? String(v);
    }).join(", ") || "—";
  }
  const option = definition.options?.find((item) => item.value === signal.value);
  return option?.label ?? String(signal.value);
}

function buildDecisionSignals(
  signals: CaseSignals,
  firedRuleSignalIds: Set<string>,
  productType: ProductType
): DecisionSignal[] {
  const relevant = signalsForProduct(productType);
  return relevant
    .slice()
    .sort()
    .map((signalId) => {
      const definition = signalsRegistryById[signalId];
      const record = signals.find((signal) => signal.id === signalId);
      const importance = firedRuleSignalIds.has(signalId) ? 1 : definition.mandatory ? 0.8 : 0.4;
      return {
        id: definition.id,
        label: definition.label,
        displayValue: record ? formatSignalValue(record) : "—",
        importance,
        present: !!record
      };
    });
}

function buildDocumentsReadiness(
  productType: ProductType,
  signals: CaseSignals,
  primary: Offer | null
): DocumentsReadiness {
  if (productType === "travel" && primary && isTravelOffer(primary)) {
    const ready = getSignalValue<number>(signals, "documents_ready_count") ?? 0;
    const required = Math.max(
      getSignalValue<number>(signals, "documents_required_count") ?? primary.requirements.length,
      primary.requirements.length
    );
    const score = required === 0 ? 0 : Math.min(1, ready / required);
    const items = primary.requirements.map((requirement, index) => {
      const present = index < ready;
      return {
        id: requirement.id,
        label: requirement.label,
        status: present
          ? ("ready" as const)
          : requirement.mandatory
            ? ("blocked" as const)
            : ("attention_needed" as const),
        detail: present
          ? "Документ помечен как готовый."
          : requirement.mandatory
            ? "Обязательный документ — без него подача невозможна."
            : "Желательный документ — подготовьте по возможности.",
        pathId: primary.id
      };
    });
    return { score: Math.round(score * 100) / 100, readyCount: ready, requiredCount: required, items };
  }

  if (productType === "residency_es" && primary && isResidencyOffer(primary)) {
    const ready = getSignalValue<number>(signals, "documents_ready_count") ?? 0;
    const required = Math.max(
      getSignalValue<number>(signals, "documents_required_count") ?? primary.eligibilityRequirements.length,
      primary.eligibilityRequirements.length
    );
    const score = required === 0 ? 0 : Math.min(1, ready / required);
    const items = primary.eligibilityRequirements.map((label, index) => {
      const present = index < ready;
      return {
        id: `req_${index}`,
        label,
        status: present ? ("ready" as const) : ("blocked" as const),
        detail: present ? "Готово." : "Соберите и апостилируйте документ.",
        pathId: primary.id
      };
    });
    return { score: Math.round(score * 100) / 100, readyCount: ready, requiredCount: required, items };
  }

  if (productType === "insurance_adult" && primary && isInsuranceOffer(primary)) {
    const hasChronic = getSignalValue<boolean>(signals, "has_chronic_conditions") ?? false;
    const requiredFeatures: Array<{ id: string; label: string; met: boolean; detail: string }> = [
      {
        id: "schengen",
        label: "Шенген-совместимость",
        met: primary.schengenCompliant,
        detail: primary.schengenCompliant ? "Принимается шенгенскими консульствами." : "Не проходит шенгенский минимум."
      },
      {
        id: "coverage",
        label: "Покрытие ≥ €30 000",
        met: primary.coverageAmountEur >= 30_000,
        detail: `Текущее покрытие: €${primary.coverageAmountEur.toLocaleString("ru-RU")}.`
      },
      {
        id: "chronic",
        label: "Покрытие хроник",
        met: hasChronic ? primary.includes.chronic : true,
        detail: hasChronic
          ? primary.includes.chronic
            ? "Хроники покрываются."
            : "Хроники не покрываются — нужен другой полис."
          : "Хроники не заявлены."
      },
      {
        id: "covid",
        label: "COVID-19",
        met: primary.includes.covid,
        detail: primary.includes.covid ? "Включено." : "Не включено — рекомендуем полис с COVID."
      }
    ];
    const readyCount = requiredFeatures.filter((f) => f.met).length;
    const score = readyCount / requiredFeatures.length;
    return {
      score: Math.round(score * 100) / 100,
      readyCount,
      requiredCount: requiredFeatures.length,
      items: requiredFeatures.map((feature) => ({
        id: feature.id,
        label: feature.label,
        status: feature.met ? ("ready" as const) : ("attention_needed" as const),
        detail: feature.detail,
        pathId: primary.id
      }))
    };
  }

  return { score: 0, readyCount: 0, requiredCount: 0, items: [] };
}

function buildAssumptions(productType: ProductType, signals: CaseSignals): ResultPayload["assumptions"] {
  const assumptions: ResultPayload["assumptions"] = [];
  const mandatory = mandatorySignalIds(productType);
  for (const id of mandatory) {
    if (!hasSignal(signals, id)) {
      assumptions.push({
        id: `assumption_${id}`,
        label: `Предполагаем значение по умолчанию: ${id}`,
        detail: "Итог будет обновлён, когда вы подтвердите этот сигнал."
      });
    }
  }
  return assumptions;
}

export function runDecision(
  input: { case: Case; catalogs: OrchestratorCatalogs },
  options: RunOptions = {}
): ResultPayload {
  const nowFn = options.now ?? STABLE_NOW;
  const audit = createAuditBuilder(nowFn);
  const productType = input.case.productType;

  const finishCollect = audit.start(
    "collectSignals",
    `Передано сигналов: ${input.case.signals.length}, продукт: ${productType}`
  );
  const collectedSignals = collectSignals(input.case);
  finishCollect(`Отобрано сигналов для ${productType}: ${collectedSignals.length}`);

  const finishValidate = audit.start(
    "validateSignals",
    `Проверяем ${collectedSignals.length} сигналов по реестру.`
  );
  const { valid: validSignals, invalid } = validateSignals(collectedSignals);
  finishValidate(
    `Валидных сигналов: ${validSignals.length}, отклонено: ${invalid.length}.`
  );

  const finishVisa = audit.start(
    "resolveVisaRules",
    "Подбираем визовое правило (если применимо)."
  );
  const visaRules = resolveVisaRules(productType, validSignals, input.catalogs.visaRules);
  finishVisa(
    visaRules.length > 0
      ? `Найдено визовых правил: ${visaRules.length}.`
      : "Визовое правило не применимо или не найдено."
  );

  const finishRules = audit.start(
    "evaluateRules",
    `Выполняем правила для ${productType}.`
  );
  const ruleResults = evaluateRules({
    productType,
    signals: validSignals,
    visaRules,
    paths: input.catalogs.paths,
    restrictions: input.catalogs.restrictions,
    residencyPrograms: input.catalogs.residencyPrograms,
    insuranceProducts: input.catalogs.insuranceProducts
  });
  const firedRuleIds = ruleResults.filter((result) => result.fired).map((result) => result.ruleId);
  finishRules(
    `Сработало правил: ${firedRuleIds.length}.`,
    [],
    firedRuleIds
  );

  const finishRank = audit.start(
    "rankPaths",
    `Ранжируем предложения для ${productType}.`
  );
  const rankedOffers = rankOffers({
    productType,
    signals: validSignals,
    visaRules,
    paths: input.catalogs.paths,
    residencyPrograms: input.catalogs.residencyPrograms,
    insuranceProducts: input.catalogs.insuranceProducts,
    ruleResults,
    preferences: input.case.preferences
  });
  const { primary, alternatives } = splitOffers(rankedOffers);
  const focusPathId = primary?.id ?? rankedOffers[0]?.id ?? null;
  finishRank(
    primary
      ? `Основное предложение: ${primary.id}, альтернатив: ${alternatives.length}.`
      : `Подходящего основного предложения нет, кандидатов: ${alternatives.length}.`
  );

  const finishRisks = audit.start(
    "computeRisks",
    "Собираем риски из сработавших правил."
  );
  const risks = deriveRisks(ruleResults, focusPathId);
  const criticalRisk = pickCriticalRisk(risks);
  finishRisks(
    `Рисков: ${risks.length}${criticalRisk ? `, критический: ${criticalRisk.id}` : ""}.`
  );

  const finishConfidence = audit.start(
    "computeConfidence",
    "Считаем уверенность и применяем жёсткие пределы."
  );
  const conflicts = detectConflicts(ruleResults, focusPathId);
  const freshSources = refreshSourcesWithVolatility(input.catalogs.sources, nowFn());
  const confidence = computeConfidenceBreakdown({
    signals: validSignals,
    ruleResults,
    sources: freshSources,
    conflicts,
    productType,
    pathId: focusPathId
  });
  const ambiguity = computeAmbiguity(ruleResults, conflicts, focusPathId);
  finishConfidence(
    `Уверенность: ${confidence.value}, конфликтов: ${conflicts.count}, пределов применено: ${confidence.capsApplied.length}.`
  );

  const finishVerdict = audit.start(
    "computeVerdict",
    "Вычисляем итоговый вердикт."
  );
  const verdict = computeVerdict({
    productType,
    signals: validSignals,
    ruleResults,
    rankedOffers,
    confidence,
    ambiguity,
    conflictCount: conflicts.count,
    pathId: focusPathId
  });
  finishVerdict(`Вердикт: ${verdict}.`);

  const finishAction = audit.start(
    "resolveAction",
    "Выбираем следующее действие по приоритетной цепочке."
  );
  const nextAction = resolveAction({
    productType,
    verdict,
    primary,
    criticalRisk,
    ruleResults,
    signals: validSignals,
    pathId: focusPathId
  });
  finishAction(`Действие: ${nextAction.type} (${nextAction.priority}).`);

  const finishWhy = audit.start("generateWhy", "Собираем объяснительные буллеты.");
  const whyBullets = generateWhy(ruleResults, focusPathId);
  finishWhy(`Буллетов: ${whyBullets.length}.`);

  const firedSignalIds = new Set<string>(
    ruleResults
      .filter((result) => result.fired)
      .flatMap((result) => result.consumedSignals)
  );
  const decisionSignals = buildDecisionSignals(validSignals, firedSignalIds, productType);
  const documents = buildDocumentsReadiness(productType, validSignals, primary);
  const assumptions = buildAssumptions(productType, validSignals);
  const volatilityScore = aggregateVolatility(freshSources);

  const finishAssemble = audit.start(
    "assemblePayload",
    "Формируем итоговый RDC payload."
  );
  const lastCheckedAt = freshSources
    .map((source) => source.lastCheckedAt)
    .sort()
    .slice(-1)[0] ?? nowFn().toISOString();

  const trail = audit.finalize({
    caseId: input.case.id,
    preview: !!options.preview
  });
  const isHumanReview = verdict === "HUMAN_REVIEW";

  const payload: ResultPayload = {
    version: "rdc.v1",
    productType,
    caseId: input.case.id,
    computedAt: nowFn().toISOString(),
    verdict,
    primaryPath: isHumanReview ? null : primary,
    alternativePaths: isHumanReview ? [] : alternatives,
    criticalRisk: isHumanReview ? null : criticalRisk,
    risks: isHumanReview ? [] : risks,
    nextAction,
    decisionSignals,
    whyBullets: isHumanReview ? [] : whyBullets,
    ruleResults,
    documents: isHumanReview
      ? { score: 0, readyCount: 0, requiredCount: 0, items: [] }
      : documents,
    trust: {
      confidence: isHumanReview ? 0 : confidence.value,
      confidenceBreakdown: isHumanReview
        ? { value: 0, base: confidence.base, capsApplied: ["human_review"], factors: [] }
        : confidence,
      volatilityScore: isHumanReview ? 0 : volatilityScore,
      sources: isHumanReview
        ? []
        : freshSources.map((source) => ({
        id: source.id,
        label: source.label,
        url: source.url,
        tier: source.tier,
        lastCheckedAt: source.lastCheckedAt,
        volatilityScore: source.volatilityScore
      })),
      lastCheckedAt
    },
    assumptions,
    auditTrail: trail,
    preview: !!options.preview
  };
  finishAssemble(
    `Payload собран, шагов в аудите: ${payload.auditTrail.steps.length}.`
  );

  return payload;
}
