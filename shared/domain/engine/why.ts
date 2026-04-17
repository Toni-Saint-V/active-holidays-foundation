import type { RuleResult, WhyBullet } from "@shared/contracts";

function toneFor(result: RuleResult): WhyBullet["tone"] {
  switch (result.output.type) {
    case "blocker":
      return "negative";
    case "human_review_trigger":
      return "review";
    case "warning":
      return "warning";
    case "path_boost":
      return "positive";
    case "path_penalty":
      return "warning";
    case "advisory":
      return "neutral";
    case "confidence_modifier":
      return "neutral";
  }
}

export function generateWhy(ruleResults: RuleResult[]): WhyBullet[] {
  return ruleResults
    .filter((result) => result.fired)
    .slice()
    .sort((a, b) => b.priority - a.priority || a.ruleId.localeCompare(b.ruleId))
    .map((result) => ({
      id: `why_${result.ruleId}`,
      text: result.explanation,
      ruleId: result.ruleId,
      signalIds: result.consumedSignals,
      tone: toneFor(result)
    }));
}
