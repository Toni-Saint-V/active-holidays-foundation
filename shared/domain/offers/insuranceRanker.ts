import type {
  Activity,
  CaseSignals,
  InsuranceOffer,
  InsuranceProductDefinition,
  PathPreference,
  RuleResult
} from "@shared/contracts";
import { getSignalValue } from "../signals";

type RankContext = {
  products: InsuranceProductDefinition[];
  ruleResults: RuleResult[];
  signals: CaseSignals;
  preferences: PathPreference[];
};

const WEIGHTS = {
  priceFit: 0.35,
  coverageMatch: 0.25,
  trust: 0.2,
  payoutSpeed: 0.1,
  extrasMatch: 0.1
} as const;

const trustScore = { a_plus: 1, a: 0.75, b: 0.5 } as const;

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

function baseScoreForProduct(
  product: InsuranceProductDefinition,
  signals: CaseSignals,
  products: InsuranceProductDefinition[]
): number {
  const duration = getSignalValue<number>(signals, "trip_duration_days") ?? 7;
  const needCoverage =
    getSignalValue<number>(signals, "coverage_amount_needed_eur") ?? 30_000;
  const age = getSignalValue<number>(signals, "traveler_age") ?? 30;
  const hasChronic = getSignalValue<boolean>(signals, "has_chronic_conditions") ?? false;
  const activities = getSignalValue<Activity[]>(signals, "planned_activities") ?? [];

  const maxPrice = Math.max(...products.map((p) => p.pricePerDayEur * duration));
  const priceFit = 1 - normalize(product.pricePerDayEur * duration, 0, maxPrice || 1);
  const coverageMatch = product.coverageAmountEur >= needCoverage
    ? 1
    : Math.max(0, product.coverageAmountEur / needCoverage);
  const trust = trustScore[product.trustLevel];
  const maxPayout = Math.max(...products.map((p) => p.payoutSpeedDays));
  const payoutSpeed = 1 - normalize(product.payoutSpeedDays, 0, maxPayout || 1);

  let extras = 0;
  if (product.includes.covid) extras += 0.2;
  if (hasChronic && product.includes.chronic) extras += 0.4;
  if (activities.includes("ski") || activities.includes("diving") || activities.includes("motorsport")) {
    extras += product.includes.extreme_sports ? 0.3 : -0.3;
  }
  if (age >= 65 && product.ageMax >= 75) extras += 0.1;
  const extrasMatch = Math.max(0, Math.min(1, extras + 0.5));

  return (
    priceFit * WEIGHTS.priceFit +
    coverageMatch * WEIGHTS.coverageMatch +
    trust * WEIGHTS.trust +
    payoutSpeed * WEIGHTS.payoutSpeed +
    extrasMatch * WEIGHTS.extrasMatch
  );
}

export function rankInsuranceOffers(ctx: RankContext): InsuranceOffer[] {
  const duration = getSignalValue<number>(ctx.signals, "trip_duration_days") ?? 7;
  const age = getSignalValue<number>(ctx.signals, "traveler_age") ?? 30;

  const offers: InsuranceOffer[] = ctx.products.map((product) => {
    const baseScore = baseScoreForProduct(product, ctx.signals, ctx.products);
    const ruleBoosts: InsuranceOffer["ruleBoosts"] = [];
    const blockers: InsuranceOffer["blockers"] = [];
    let delta = 0;
    for (const result of ctx.ruleResults) {
      if (!result.fired || result.productType !== "insurance_adult") continue;
      const output = result.output;
      const pathIds = output.pathIds ?? null;
      const affects = !pathIds || pathIds.includes(product.id);
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
    if (duration < product.minDurationDays || duration > product.maxDurationDays) {
      blockers.push({
        ruleId: "duration_out_of_range",
        text: `Полис работает в диапазоне ${product.minDurationDays}-${product.maxDurationDays} дней, у вас ${duration}.`
      });
    }
    if (age < product.ageMin || age > product.ageMax) {
      blockers.push({
        ruleId: "age_out_of_range",
        text: `Возраст ${age} вне диапазона ${product.ageMin}-${product.ageMax}.`
      });
    }
    const preference = ctx.preferences.find((pref) => pref.id === product.id);
    const preferenceDelta = preference ? preference.weight * 0.1 : 0;
    const finalScore = Math.min(
      1,
      Math.max(0, baseScore + delta + preferenceDelta)
    );
    return {
      ...product,
      productType: "insurance_adult" as const,
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
