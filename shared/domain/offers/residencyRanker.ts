import type {
  CaseSignals,
  IncomeSource,
  PathPreference,
  ResidencyOffer,
  ResidencyProgramDefinition,
  RuleResult,
  SpanishLevel
} from "@shared/contracts";
import { getSignalValue } from "../signals";

type RankContext = {
  programs: ResidencyProgramDefinition[];
  ruleResults: RuleResult[];
  signals: CaseSignals;
  preferences: PathPreference[];
};

const WEIGHTS = {
  success: 0.35,
  speed: 0.25,
  cost: 0.2,
  flexibility: 0.1,
  docLoad: 0.1
} as const;

const languageBoost: Record<SpanishLevel, number> = {
  none: 0,
  A1: 0.05,
  A2: 0.1,
  B1: 0.2,
  B2: 0.3,
  C1: 0.4
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

function baseScoreForProgram(
  program: ResidencyProgramDefinition,
  signals: CaseSignals,
  programs: ResidencyProgramDefinition[]
): number {
  if (program.status === "closed") return 0;
  const success = program.successProbability;
  const maxDays = Math.max(...programs.map((p) => p.processingDays || 1));
  const speed = 1 - normalize(program.processingDays, 0, maxDays);
  const costMid = (program.costRangeEur[0] + program.costRangeEur[1]) / 2;
  const maxCost = Math.max(...programs.map((p) => (p.costRangeEur[0] + p.costRangeEur[1]) / 2));
  const cost = 1 - normalize(costMid, 0, maxCost || 1);
  const incomeSource = getSignalValue<IncomeSource>(signals, "income_source");
  const isRemote = incomeSource === "remote_tech" || incomeSource === "remote_other" || incomeSource === "freelance";
  const flexibility = isRemote && program.id === "dnv_espana" ? 1 : program.id === "nlv_espana" ? 0.7 : 0.4;
  const docLoad = program.id === "student_residency_es" ? 0.85 : program.id === "nlv_espana" ? 0.5 : 0.6;
  const language = getSignalValue<SpanishLevel>(signals, "spanish_language_level") ?? "none";
  const languageDelta = languageBoost[language] * 0.05;
  return (
    success * WEIGHTS.success +
    speed * WEIGHTS.speed +
    cost * WEIGHTS.cost +
    flexibility * WEIGHTS.flexibility +
    docLoad * WEIGHTS.docLoad +
    languageDelta
  );
}

export function rankResidencyOffers(ctx: RankContext): ResidencyOffer[] {
  const offers: ResidencyOffer[] = ctx.programs.map((program) => {
    const baseScore = baseScoreForProgram(program, ctx.signals, ctx.programs);
    const ruleBoosts: ResidencyOffer["ruleBoosts"] = [];
    const blockers: ResidencyOffer["blockers"] = [];
    let delta = 0;
    for (const result of ctx.ruleResults) {
      if (!result.fired || result.productType !== "residency_es") continue;
      const output = result.output;
      const pathIds = output.pathIds ?? null;
      const affects = !pathIds || pathIds.includes(program.id);
      if (!affects) continue;
      if (output.type === "path_boost" && typeof output.delta === "number") {
        ruleBoosts.push({ ruleId: result.ruleId, delta: output.delta });
        delta += output.delta;
      } else if (output.type === "path_penalty" && typeof output.delta === "number") {
        ruleBoosts.push({ ruleId: result.ruleId, delta: -Math.abs(output.delta) });
        delta -= Math.abs(output.delta);
      } else if (output.type === "blocker") {
        blockers.push({ ruleId: result.ruleId, text: result.explanation });
      }
    }
    const closed = program.status === "closed";
    if (closed) {
      blockers.push({
        ruleId: "status_closed",
        text: program.statusReason ?? "Программа временно закрыта."
      });
    }
    const preference = ctx.preferences.find((pref) => pref.id === program.id);
    const preferenceDelta = preference ? preference.weight * 0.12 : 0;
    const finalScore = Math.min(
      1,
      Math.max(0, baseScore + delta + preferenceDelta)
    );
    return {
      ...program,
      productType: "residency_es" as const,
      baseScore: Math.round(baseScore * 100) / 100,
      ruleBoosts: ruleBoosts
        .slice()
        .sort((a, b) => b.delta - a.delta || a.ruleId.localeCompare(b.ruleId)),
      blockers: blockers.slice().sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
      score: Math.round(finalScore * 100) / 100,
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
