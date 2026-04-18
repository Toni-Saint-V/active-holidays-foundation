import type { ProductType } from "@shared/contracts";
import type { ScenarioCard } from "@/lib/apiClient";

export const defaultCaseByProduct: Record<ProductType, string> = {
  travel: "s1-rf-italy",
  residency_es: "s4-rf-residency-dnv",
  insurance_adult: "s5-rf-italy-insurance"
};

export function defaultCaseIdForProduct(productType: ProductType): string {
  return defaultCaseByProduct[productType];
}

export function findScenarioCaseId(
  scenarios: ScenarioCard[],
  productType: ProductType
): string {
  return (
    scenarios.find((scenario) => scenario.productType === productType)?.caseId ??
    defaultCaseByProduct[productType]
  );
}

export function findHumanReviewCaseId(scenarios: ScenarioCard[]): string {
  return (
    scenarios.find((scenario) => scenario.expectedVerdict === "HUMAN_REVIEW")?.caseId ??
    "s3-us-spb-business"
  );
}

const productTypeLabels: Record<ProductType, string> = {
  travel: "Визовый маршрут",
  residency_es: "ВНЖ Испании",
  insurance_adult: "Страховой сценарий"
};

export function productTypeLabel(productType: ProductType): string {
  return productTypeLabels[productType];
}
