import type { HumanReviewOpsBlocker, ResultPayload } from "@shared/contracts";

function evidenceGateSourceRuleId(ruleId: string): string | null {
  return ruleId.startsWith("EVIDENCE_GATE:") ? ruleId.replace("EVIDENCE_GATE:", "") : null;
}

function warningSeverity(
  severity: "critical" | "high" | "medium" | "low" | undefined
): HumanReviewOpsBlocker["severity"] {
  return severity ?? "medium";
}

function stableTrustBlockerId(result: ResultPayload, detail: string): string {
  const normalizedReason = detail
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `trust:${result.caseId}:${result.trust.evidenceStatus}:${normalizedReason || "review"}`;
}

export function extractHumanReviewBlockers(result: ResultPayload): HumanReviewOpsBlocker[] {
  const blockers: HumanReviewOpsBlocker[] = [];

  for (const rule of result.ruleResults) {
    if (!rule.fired) continue;
    if (rule.output.type === "human_review_trigger") {
      const sourceRuleId = evidenceGateSourceRuleId(rule.ruleId);
      blockers.push({
        id: rule.ruleId,
        type: sourceRuleId ? "evidence_gate" : "human_review_trigger",
        ruleId: sourceRuleId ?? rule.ruleId,
        label: sourceRuleId
          ? `Evidence gate заблокировал ${sourceRuleId}.`
          : "Правило требует ручной проверки.",
        detail: rule.explanation,
        severity: "high",
        triggeredBy: rule.consumedSignals.slice()
      });
      continue;
    }

    if (rule.output.type === "warning") {
      blockers.push({
        id: rule.ruleId,
        type: "warning",
        ruleId: rule.ruleId,
        label: rule.explanation.split(".")[0] || "Предупреждение по кейсу",
        detail: rule.explanation,
        severity: warningSeverity(rule.output.severity),
        triggeredBy: rule.consumedSignals.slice()
      });
    }
  }

  if (result.verdict === "HUMAN_REVIEW") {
    const detail =
      result.trust.humanReviewReason ?? result.trust.blockingReason ?? result.nextAction.detail;
    const hasSameDetail = blockers.some((blocker) => blocker.detail === detail);
    if (!hasSameDetail) {
      blockers.push({
        id: stableTrustBlockerId(result, detail),
        type: "trust",
        ruleId: null,
        label: "Доверие к автоматическому решению недостаточно.",
        detail,
        severity: result.trust.evidenceStatus === "conflicting" ? "critical" : "high",
        triggeredBy: result.nextAction.triggeredBy.slice()
      });
    }
  }

  return blockers;
}
