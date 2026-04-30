import type {
  CaseSignals,
  ProductType,
  RuleEvidenceDecision,
  RuleEvidenceRecord,
  RuleResult,
  Source
} from "@shared/contracts";
import { getSignalValue } from "../signals";
import { filterRelevantRuleResults } from "../rules/relevance";
import { evaluateRuleEvidence } from "./evaluate";

type ApplyEvidenceGateInput = {
  productType: ProductType;
  signals: CaseSignals;
  ruleResults: RuleResult[];
  ruleEvidence: RuleEvidenceRecord[];
  sources: Source[];
  pathId?: string | null;
  now: Date;
};

type ApplyEvidenceGateOutput = {
  ruleResults: RuleResult[];
  decisions: RuleEvidenceDecision[];
  blockedRuleIds: string[];
};

export function resolveEvidenceScope(
  productType: ProductType,
  signals: CaseSignals
): string {
  const citizenship = getSignalValue<string>(signals, "citizenship");
  const destination = getSignalValue<string>(signals, "destination");
  if (citizenship && destination) return `${citizenship}->${destination}`;
  return `product:${productType}`;
}

function evidenceGateRuleResult(
  original: RuleResult,
  decision: RuleEvidenceDecision
): RuleResult {
  return {
    ruleId: `EVIDENCE_GATE:${original.ruleId}`,
    fired: true,
    category: original.category,
    priority: 100,
    productType: original.productType,
    output: { type: "human_review_trigger" },
    consumedSignals: original.consumedSignals,
    explanation:
      `Evidence gate blocked ${original.ruleId}: ${decision.evidenceStatus}; ` +
      `automation=${decision.automationClass}; scope=${decision.countryOrScope}. ` +
      decision.rationale
  };
}

export function applyEvidenceGate(
  input: ApplyEvidenceGateInput
): ApplyEvidenceGateOutput {
  const scope = resolveEvidenceScope(input.productType, input.signals);
  const relevantFired = filterRelevantRuleResults(
    input.ruleResults.filter((result) => result.fired),
    input.pathId
  );
  const decisions = relevantFired.map((result) =>
    evaluateRuleEvidence({
      ruleId: result.ruleId,
      countryOrScope: scope,
      records: input.ruleEvidence,
      sources: input.sources,
      now: input.now
    })
  );
  const blocked = decisions.filter((decision) => decision.blocksAutomation);
  const gateResults = blocked.map((decision) => {
    const original = relevantFired.find((result) => result.ruleId === decision.ruleId);
    if (!original) {
      throw new Error(`Missing rule result for evidence decision ${decision.ruleId}`);
    }
    return evidenceGateRuleResult(original, decision);
  });

  return {
    ruleResults: input.ruleResults.concat(gateResults),
    decisions,
    blockedRuleIds: gateResults.map((result) => result.ruleId)
  };
}
