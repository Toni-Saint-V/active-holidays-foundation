import { describe, expect, it } from "vitest";
import {
  defaultCaseIdForProduct,
  findHumanReviewCaseId,
  findScenarioCaseId
} from "@/lib/caseDefaults";
import type { ScenarioCard } from "@/lib/apiClient";

describe("screen routing fallbacks", () => {
  it("keeps trust and documents screens anchored on the seeded travel case by default", () => {
    expect(defaultCaseIdForProduct("travel")).toBe("s1-rf-italy");
  });

  it("resolves product-specific fallback cases from seeded scenarios", () => {
    const scenarios: ScenarioCard[] = [
      {
        caseId: "s1-rf-italy",
        productType: "travel",
        title: "Travel",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: "italy_c_tourism",
        note: ""
      },
      {
        caseId: "s5-rf-italy-insurance",
        productType: "insurance_adult",
        title: "Insurance",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: "ins_basic",
        note: ""
      }
    ];

    expect(findScenarioCaseId(scenarios, "insurance_adult")).toBe("s5-rf-italy-insurance");
    expect(findScenarioCaseId(scenarios, "travel")).toBe("s1-rf-italy");
  });

  it("resolves the seeded human-review case before falling back to the hardcoded default", () => {
    const scenarios: ScenarioCard[] = [
      {
        caseId: "s1-rf-italy",
        productType: "travel",
        title: "Travel",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: "italy_c_tourism",
        note: ""
      },
      {
        caseId: "s3-us-spb-business",
        productType: "travel",
        title: "Human review",
        subtitle: "",
        expectedVerdict: "HUMAN_REVIEW",
        expectedActionType: "send_for_review",
        expectedPrimaryPath: null,
        note: ""
      }
    ];

    expect(findHumanReviewCaseId(scenarios)).toBe("s3-us-spb-business");
    expect(findHumanReviewCaseId([])).toBe("s3-us-spb-business");
  });
});
