import type {
  CaseSignals,
  PathDefinition,
  PathPreference,
  RuleResult,
  TravelOffer,
  VisaRule
} from "@shared/contracts";
import { getSignalValue } from "../signals";

type RankContext = {
  paths: PathDefinition[];
  ruleResults: RuleResult[];
  visaRules: VisaRule[];
  signals: CaseSignals;
  preferences: PathPreference[];
};

function baseScoreForPath(path: PathDefinition, signals: CaseSignals): number {
  let score = 0.5;
  switch (path.kind) {
    case "domestic":
      score += 0.3;
      break;
    case "visa_free":
      score += 0.2;
      break;
    case "visa_on_arrival":
      score += 0.12;
      break;
    case "e_visa":
      score += 0.08;
      break;
    case "consular_visa":
      score += 0.02;
      break;
    case "transit":
      score += 0.0;
      break;
  }
  const timeline = getSignalValue<number>(signals, "timeline_weeks");
  if (timeline !== undefined) {
    const slack = timeline - path.processingWeeks;
    if (slack >= 0) score += Math.min(0.1, slack * 0.015);
    else score -= Math.min(0.35, Math.abs(slack) * 0.05);
  }
  return score;
}

export function rankTravelOffers(ctx: RankContext): TravelOffer[] {
  const citizenship = getSignalValue<string>(ctx.signals, "citizenship");
  const destination = getSignalValue<string>(ctx.signals, "destination");
  const eligible = ctx.paths.filter(
    (path) =>
      (!citizenship || path.citizenship === citizenship) &&
      (!destination || path.destination === destination)
  );

  const offers: TravelOffer[] = eligible.map((path) => {
    const baseScore = baseScoreForPath(path, ctx.signals);
    const ruleBoosts: TravelOffer["ruleBoosts"] = [];
    const blockers: TravelOffer["blockers"] = [];
    let delta = 0;
    for (const result of ctx.ruleResults) {
      if (!result.fired || result.productType !== "travel") continue;
      const output = result.output;
      const pathIds = output.pathIds ?? null;
      const affects = !pathIds || pathIds.includes(path.id);
      if (!affects) continue;
      if (output.type === "path_boost" && typeof output.delta === "number") {
        ruleBoosts.push({ ruleId: result.ruleId, delta: output.delta });
        delta += output.delta;
      } else if (output.type === "path_penalty" && typeof output.delta === "number") {
        ruleBoosts.push({ ruleId: result.ruleId, delta: -Math.abs(output.delta) });
        delta -= Math.abs(output.delta);
      } else if (output.type === "blocker" && result.category !== "document") {
        blockers.push({ ruleId: result.ruleId, text: result.explanation });
      }
    }
    const preference = ctx.preferences.find((pref) => pref.id === path.id);
    const preferenceDelta = preference ? preference.weight * 0.15 : 0;
    const finalScore = Math.min(1, Math.max(0, baseScore + delta + preferenceDelta));
    return {
      ...path,
      productType: "travel" as const,
      baseScore,
      ruleBoosts: ruleBoosts
        .slice()
        .sort((a, b) => b.delta - a.delta || a.ruleId.localeCompare(b.ruleId)),
      blockers: blockers.slice().sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
      score: finalScore,
      eligible: blockers.length === 0
    };
  });

  return offers
    .slice()
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.score - a.score ||
        a.id.localeCompare(b.id)
    );
}
