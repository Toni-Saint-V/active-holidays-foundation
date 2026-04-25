import { describe, expect, it } from "vitest";
import { buildLandingScreenModel } from "./landingScreenModel";

describe("buildLandingScreenModel", () => {
  it("builds scenario-aware travel navigation targets", () => {
    const model = buildLandingScreenModel({
      productType: "travel",
      selectedScenarioCaseId: "s1-rf-italy"
    });

    expect(model.productPills).toHaveLength(3);
    expect(model.bridge.leftChip).toBe("Паспорт");
    expect(model.cta.startPath).toBe("/intake?case=s1-rf-italy");
    expect(model.cta.examplePath).toBe("/result?case=s1-rf-italy");
  });

  it("keeps insurance landing copy and fallback routes stable without a scenario", () => {
    const model = buildLandingScreenModel({
      productType: "insurance_adult"
    });

    expect(model.eyebrow).toBe("умный помощник по страховке");
    expect(model.cta.startPath).toBe("/intake");
    expect(model.cta.examplePath).toBe("/insurance-adult");
    expect(model.ai.summary).toContain("покрытие");
  });
});
