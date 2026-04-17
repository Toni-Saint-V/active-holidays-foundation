import type {
  CaseSignals,
  IntakeQueue,
  IntakeQuestion,
  ProductType,
  SignalDefinition,
  SignalId
} from "@shared/contracts";
import { hasResolvedSignal, signalsRegistry, hasSignal } from "../signals";
import { allTravelRuleDefinitions, residencyRules, insuranceRules } from "../rules";

function rulesForProduct(productType: ProductType) {
  if (productType === "travel") return allTravelRuleDefinitions;
  if (productType === "residency_es") return residencyRules;
  return insuranceRules;
}

function unlocksForSignal(signalId: SignalId, productType: ProductType): string[] {
  return rulesForProduct(productType)
    .filter((rule) => rule.consumesSignals.includes(signalId))
    .map((rule) => rule.id);
}

function informationGainForSignal(
  definition: SignalDefinition,
  signals: CaseSignals,
  productType: ProductType
): number {
  if (hasSignal(signals, definition.id)) return 0;
  const unlocks = rulesForProduct(productType).filter((rule) =>
    rule.consumesSignals.includes(definition.id)
  );
  const resolvable = unlocks.filter((rule) =>
    rule.consumesSignals.every(
      (dep) => dep === definition.id || hasSignal(signals, dep)
    )
  );
  if (unlocks.length === 0) return 0;
  const base = resolvable.length / unlocks.length;
  const mandatoryBoost = definition.mandatory ? 0.25 : 0;
  return Math.min(1, Math.round((base + mandatoryBoost) * 100) / 100);
}

export function toIntakeQuestion(
  definition: SignalDefinition,
  signals: CaseSignals,
  productType: ProductType
): IntakeQuestion {
  return {
    ...definition,
    informationGain: informationGainForSignal(definition, signals, productType),
    unlocksRules: unlocksForSignal(definition.id, productType),
    answered: hasSignal(signals, definition.id)
  };
}

export function rankIntakeQuestions(
  signals: CaseSignals,
  productType: ProductType
): IntakeQuestion[] {
  return signalsRegistry
    .filter((definition) => definition.productTypes.includes(productType))
    .map((definition) => toIntakeQuestion(definition, signals, productType))
    .slice()
    .sort((a, b) => {
      if (a.answered !== b.answered) return a.answered ? 1 : -1;
      if (a.mandatory !== b.mandatory) return a.mandatory ? -1 : 1;
      if (a.informationGain !== b.informationGain) return b.informationGain - a.informationGain;
      return a.id.localeCompare(b.id);
    });
}

export function buildIntakeQueue(
  signals: CaseSignals,
  productType: ProductType = "travel"
): IntakeQueue {
  const ranked = rankIntakeQuestions(signals, productType);
  const completed = ranked.filter((question) => question.answered).map((question) => question.id);
  const remaining = ranked.filter((question) => !question.answered);
  const mandatoryTotal = ranked.filter((item) => item.mandatory).length;
  const mandatoryDone = ranked.filter(
    (question) => question.mandatory && hasResolvedSignal(signals, question.id)
  ).length;
  const progress =
    mandatoryTotal === 0 ? 1 : Math.min(1, mandatoryDone / mandatoryTotal);
  return {
    nextQuestion: remaining[0] ?? null,
    remaining,
    completedSignalIds: completed,
    progress: Math.round(progress * 100) / 100
  };
}
