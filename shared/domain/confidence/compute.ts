import type {
  CaseSignals,
  ConfidenceBreakdown,
  ConfidenceFactor,
  ProductType,
  RuleResult,
  Source
} from "@shared/contracts";
import { mandatorySignalIds, hasSignal } from "../signals";
import { filterRelevantRuleResults, ruleResultAffectsPath } from "../rules/relevance";
import { aggregateVolatility } from "../volatility";

type ConflictReport = {
  count: number;
  pairs: Array<{ pathId: string; boostRule: string; penaltyRule: string }>;
};

export function detectConflicts(
  ruleResults: RuleResult[],
  pathId?: string | null
): ConflictReport {
  const byPath: Record<string, { boosts: string[]; penalties: string[] }> = {};
  for (const result of ruleResults) {
    if (!result.fired || !ruleResultAffectsPath(result, pathId)) continue;
    const pathIds = result.output.pathIds ?? [];
    for (const pathId of pathIds) {
      if (!byPath[pathId]) byPath[pathId] = { boosts: [], penalties: [] };
      if (result.output.type === "path_boost") byPath[pathId].boosts.push(result.ruleId);
      else if (result.output.type === "path_penalty") byPath[pathId].penalties.push(result.ruleId);
    }
  }
  const pairs: ConflictReport["pairs"] = [];
  for (const pathId of Object.keys(byPath).sort()) {
    const entry = byPath[pathId];
    for (const boost of entry.boosts.slice().sort()) {
      for (const penalty of entry.penalties.slice().sort()) {
        pairs.push({ pathId, boostRule: boost, penaltyRule: penalty });
      }
    }
  }
  return { count: pairs.length, pairs };
}

export function computeAmbiguity(
  ruleResults: RuleResult[],
  conflicts: ConflictReport,
  pathId?: string | null
): number {
  const relevantFiredRules = filterRelevantRuleResults(
    ruleResults.filter((result) => result.fired),
    pathId
  );
  const firedCount = relevantFiredRules.length;
  if (firedCount === 0) return 0;
  const conflictShare = Math.min(1, conflicts.count / Math.max(1, firedCount));
  const warnings = relevantFiredRules.filter(
    (result) => result.output.type === "warning"
  ).length;
  const warningShare = Math.min(1, warnings / Math.max(1, firedCount));
  return Math.round((conflictShare * 0.7 + warningShare * 0.3) * 100) / 100;
}

type ComputeConfidenceInput = {
  signals: CaseSignals;
  ruleResults: RuleResult[];
  sources: Source[];
  conflicts: ConflictReport;
  productType: ProductType;
  pathId?: string | null;
};

export function computeConfidenceBreakdown(
  input: ComputeConfidenceInput
): ConfidenceBreakdown {
  const { signals, ruleResults, sources, conflicts, productType, pathId } = input;

  const mandatory = mandatorySignalIds(productType);
  const mandatoryPresent = mandatory.filter((id) => hasSignal(signals, id)).length;
  const completeness = mandatory.length === 0 ? 1 : mandatoryPresent / mandatory.length;

  const firedRules = ruleResults.filter((result) => result.fired);
  const relevantRuleResults = filterRelevantRuleResults(ruleResults, pathId);
  const relevantFiredRules = filterRelevantRuleResults(firedRules, pathId);
  const rulesCovered = relevantFiredRules.length;
  const rulesRatio =
    relevantRuleResults.length === 0 ? null : rulesCovered / relevantRuleResults.length;

  const freshness = 1 - aggregateVolatility(sources);
  const conflictPenalty = Math.min(0.35, conflicts.count * 0.12);
  const warningPenalty = Math.min(
    0.2,
    relevantFiredRules.filter((rule) => rule.output.type === "warning").length * 0.04
  );
  const blockerPresent = relevantFiredRules.some(
    (rule) => rule.output.type === "blocker"
  );
  const humanReviewPresent = relevantFiredRules.some(
    (rule) => rule.output.type === "human_review_trigger"
  );

  const base = 0.5;

  const factors: ConfidenceFactor[] = [
    {
      id: "completeness",
      label: "Полнота сигналов",
      detail: `Собрано обязательных сигналов: ${mandatoryPresent} из ${mandatory.length}.`,
      value: completeness * 2 - 1,
      weight: 0.35,
      children: mandatory.map((id) => ({
        id,
        label: id,
        value: hasSignal(signals, id) ? 1 : -1
      }))
    },
    {
      id: "rule_coverage",
      label: "Срабатывания правил",
      detail:
        relevantRuleResults.length === 0
          ? "Для основного маршрута нет отдельных релевантных правил."
          : `Сработало ${rulesCovered} из ${relevantRuleResults.length} релевантных правил.`,
      value: rulesRatio === null ? 0 : rulesRatio * 2 - 1,
      weight: 0.2,
      children: []
    },
    {
      id: "source_freshness",
      label: "Актуальность источников",
      detail: `Средняя свежесть источников: ${Math.round(freshness * 100)}%.`,
      value: freshness * 2 - 1,
      weight: 0.2,
      children: sources
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((source) => ({
          id: source.id,
          label: source.label,
          value: 1 - source.volatilityScore * 2
        }))
    },
    {
      id: "conflict_penalty",
      label: "Конфликты правил",
      detail:
        conflicts.count === 0
          ? "Конфликтов между правилами нет."
          : `Обнаружено ${conflicts.count} конфликт${conflicts.count === 1 ? "" : "ов"}.`,
      value: -Math.min(1, conflictPenalty * 2),
      weight: 0.15,
      children: conflicts.pairs.map((pair, index) => ({
        id: `${pair.pathId}-${index}`,
        label: `${pair.boostRule} ↔ ${pair.penaltyRule}`,
        value: -1
      }))
    },
    {
      id: "warning_pressure",
      label: "Давление предупреждений",
      detail:
        warningPenalty === 0
          ? "Активных предупреждений нет."
          : `Предупреждений: ${relevantFiredRules.filter((rule) => rule.output.type === "warning").length}.`,
      value: -Math.min(1, warningPenalty * 3),
      weight: 0.1,
      children: []
    }
  ];

  const weighted = factors.reduce(
    (acc, factor) => acc + factor.value * factor.weight,
    0
  );
  let value = Math.min(1, Math.max(0, base + weighted * 0.5 + 0.1));

  const capsApplied: string[] = [];
  if (mandatoryPresent < mandatory.length) {
    if (value > 0.55) {
      capsApplied.push("missing_mandatory_signal");
      value = 0.55;
    }
  }
  if (blockerPresent) {
    if (value > 0.45) {
      capsApplied.push("active_blocker");
      value = 0.45;
    }
  }
  if (conflicts.count > 0) {
    if (value > 0.6) {
      capsApplied.push("rule_conflict");
      value = 0.6;
    }
  }
  if (humanReviewPresent) {
    if (value > 0.55) {
      capsApplied.push("human_review_trigger");
      value = 0.55;
    }
  }

  return {
    value: Math.round(value * 100) / 100,
    base,
    capsApplied: capsApplied.slice().sort(),
    factors
  };
}
