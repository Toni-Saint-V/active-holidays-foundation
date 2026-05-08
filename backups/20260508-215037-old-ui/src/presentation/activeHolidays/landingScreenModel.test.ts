import { describe, expect, it } from "vitest";
import { buildLandingScreenModel } from "./landingScreenModel";

describe("buildLandingScreenModel", () => {
  it("builds scenario-aware travel navigation targets", () => {
    const model = buildLandingScreenModel({
      productType: "travel",
      selectedScenarioCaseId: "s1-rf-italy"
    });

    expect(model.productPills).toHaveLength(1);
    expect(model.productPills[0]?.productType).toBe("travel");
    expect(model.bridge.leftChip).toBe("Паспорт");
    expect(model.cta.startPath).toBe("/intake?case=s1-rf-italy");
    expect(model.cta.examplePath).toBe("/result?case=s1-rf-italy");
  });

  it("locks non-M1 product requests to travel landing framing", () => {
    const model = buildLandingScreenModel({
      productType: "insurance_adult"
    });

    expect(model.eyebrow).toBe("умный помощник по визам");
    expect(model.cta.startPath).toBe("/intake");
    expect(model.cta.examplePath).toBe("/result");
    expect(model.productPills).toEqual([
      {
        productType: "travel",
        label: "Поездка"
      }
    ]);
    expect(model.ai.summary).toContain("выписку");
  });
});
