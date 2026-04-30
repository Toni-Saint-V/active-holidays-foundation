import { describe, expect, it } from "vitest";
import type { Source } from "@shared/contracts";
import { computeSourceVolatility } from "./compute";

const officialSource: Source = {
  id: "src_test",
  label: "Test",
  url: "https://example.com",
  tier: "official",
  lastCheckedAt: "2026-04-30T00:00:00.000Z",
  volatilityScore: 0.1,
  summary: "Test source."
};

describe("computeSourceVolatility", () => {
  it("does not penalize a source checked after the stable engine clock", () => {
    expect(
      computeSourceVolatility(
        officialSource,
        new Date("2026-04-17T09:00:00.000Z")
      )
    ).toBe(0.1);
  });
});
