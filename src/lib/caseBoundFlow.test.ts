import { describe, expect, it, vi } from "vitest";
import type { ProductType } from "@shared/contracts";
import {
  buildTravelSignalPatchSet,
  createOrReuseTravelCaseFromIntakeDraft,
  extractTravelIntakeDraftFromQuery,
  FORBIDDEN_RESULT_TRUTH_QUERY_KEYS
} from "./caseBoundFlow";

function parseQuery(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("caseBoundFlow", () => {
  it("builds deterministic travel signal patch set from intake draft", () => {
    const now = new Date("2026-05-10T00:00:00.000Z");
    const draft = {
      country: "ES",
      departureDate: "2026-06-05",
      purpose: "По работе"
    } as const;

    const patches = buildTravelSignalPatchSet(draft, now);

    expect(patches).toEqual([
      {
        id: "citizenship",
        value: "RU",
        source: "user",
        capturedAt: "2026-05-10T00:00:00.000Z"
      },
      {
        id: "destination",
        value: "ES",
        source: "user",
        capturedAt: "2026-05-10T00:00:00.000Z"
      },
      {
        id: "timeline_weeks",
        value: 4,
        source: "user",
        capturedAt: "2026-05-10T00:00:00.000Z"
      },
      {
        id: "travel_purpose",
        value: "business",
        source: "user",
        capturedAt: "2026-05-10T00:00:00.000Z"
      }
    ]);
  });

  it("ignores forbidden result-truth params in query parsing", () => {
    const query = parseQuery(
      "country=FR&departure=2026-08-01&purpose=%D0%A2%D1%83%D1%80%D0%B8%D0%B7%D0%BC&verdict=GO&resultType=verified&analysisConfidence=high&documentsUploaded=true&days=999"
    );

    const parsed = extractTravelIntakeDraftFromQuery(query);

    expect(parsed.draft).toMatchObject({
      country: "FR",
      departureDate: "2026-08-01",
      purpose: "Туризм"
    });
    expect(parsed.ignoredTruthQueryKeys.sort()).toEqual(
      [...FORBIDDEN_RESULT_TRUTH_QUERY_KEYS].sort()
    );
  });

  it("creates a new case via fork+patch and returns case metadata", async () => {
    const forkCaseWithSignals = vi.fn(async (_id: string, _payload: { title?: string }) => ({
      case: {
        id: "s1-rf-italy-fork-77",
        productType: "travel" as ProductType
      }
    }));

    const client = {
      forkCaseWithSignals,
      patchSignals: vi.fn()
    };

    const outcome = await createOrReuseTravelCaseFromIntakeDraft(
      {
        draft: {
          country: "IT",
          departureDate: "2026-06-20",
          purpose: "Туризм"
        },
        baseCaseId: "s1-rf-italy",
        forkTitle: "Intake draft"
      },
      client
    );

    expect(forkCaseWithSignals).toHaveBeenCalledTimes(1);
    expect(forkCaseWithSignals).toHaveBeenCalledWith(
      "s1-rf-italy",
      expect.objectContaining({ title: "Intake draft" })
    );
    expect(outcome.caseId).toBe("s1-rf-italy-fork-77");
    expect(outcome.reusedExistingCase).toBe(false);
    expect(outcome.productType).toBe("travel");
    expect(outcome.patchedSignalIds).toEqual([
      "citizenship",
      "destination",
      "timeline_weeks",
      "travel_purpose"
    ]);
  });

  it("reuses existing caseId and does not fork", async () => {
    const patchSignals = vi.fn(async () => ({
      case: {
        id: "case-live-42",
        productType: "travel" as ProductType
      }
    }));
    const forkCaseWithSignals = vi.fn();

    const client = {
      patchSignals,
      forkCaseWithSignals
    };

    const outcome = await createOrReuseTravelCaseFromIntakeDraft(
      {
        existingCaseId: "case-live-42",
        draft: {
          country: "GR",
          departureDate: "2026-06-20",
          purpose: "К родственникам"
        }
      },
      client
    );

    expect(forkCaseWithSignals).not.toHaveBeenCalled();
    expect(patchSignals).toHaveBeenCalledTimes(1);
    expect(patchSignals).toHaveBeenCalledWith("case-live-42", expect.any(Array));
    expect(outcome.caseId).toBe("case-live-42");
    expect(outcome.reusedExistingCase).toBe(true);
  });
});
