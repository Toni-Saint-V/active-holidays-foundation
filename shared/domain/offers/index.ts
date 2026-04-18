import type {
  CaseSignals,
  InsuranceProductDefinition,
  Offer,
  PathDefinition,
  PathPreference,
  ProductType,
  ResidencyProgramDefinition,
  RuleResult,
  VisaRule
} from "@shared/contracts";
import { rankTravelOffers } from "./travelRanker";
import { rankResidencyOffers } from "./residencyRanker";
import { rankInsuranceOffers } from "./insuranceRanker";

type RankInput = {
  productType: ProductType;
  signals: CaseSignals;
  visaRules: VisaRule[];
  paths: PathDefinition[];
  residencyPrograms: ResidencyProgramDefinition[];
  insuranceProducts: InsuranceProductDefinition[];
  ruleResults: RuleResult[];
  preferences: PathPreference[];
};

export function rankOffers(input: RankInput): Offer[] {
  switch (input.productType) {
    case "travel":
      return rankTravelOffers({
        paths: input.paths,
        visaRules: input.visaRules,
        ruleResults: input.ruleResults,
        signals: input.signals,
        preferences: input.preferences
      });
    case "residency_es":
      return rankResidencyOffers({
        programs: input.residencyPrograms,
        ruleResults: input.ruleResults,
        signals: input.signals,
        preferences: input.preferences
      });
    case "insurance_adult":
      return rankInsuranceOffers({
        products: input.insuranceProducts,
        ruleResults: input.ruleResults,
        signals: input.signals,
        preferences: input.preferences
      });
  }
}

export function splitOffers(offers: Offer[]): {
  primary: Offer | null;
  alternatives: Offer[];
} {
  if (offers.length === 0) return { primary: null, alternatives: [] };
  const [primary, ...alternatives] = offers;
  return { primary: primary.eligible ? primary : null, alternatives };
}

export { rankTravelOffers, rankResidencyOffers, rankInsuranceOffers };
