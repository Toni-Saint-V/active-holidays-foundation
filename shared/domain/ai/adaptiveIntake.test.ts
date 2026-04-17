import { describe, expect, it } from "vitest";
import type { CaseSignals } from "@shared/contracts";
import { buildIntakeQueue } from "./adaptiveIntake";

const NOW = "2026-04-17T09:00:00.000Z";

describe("buildIntakeQueue", () => {
  it("treats an explicit unknown boolean answer as answered but not resolved", () => {
    const signals: CaseSignals = [
      { id: "citizenship", value: "RU", source: "user", capturedAt: NOW },
      { id: "destination", value: "IT", source: "user", capturedAt: NOW },
      { id: "travel_purpose", value: "tourism", source: "user", capturedAt: NOW },
      { id: "passport_validity_months", value: 18, source: "user", capturedAt: NOW },
      { id: "timeline_weeks", value: 6, source: "user", capturedAt: NOW },
      { id: "insurance_ok", value: null, source: "user", capturedAt: NOW }
    ];

    const queue = buildIntakeQueue(signals, "travel");

    expect(queue.completedSignalIds).toContain("insurance_ok");
    expect(queue.remaining.some((question) => question.id === "insurance_ok")).toBe(false);
    expect(queue.progress).toBe(1);
  });

  it("does not count an unresolved mandatory boolean as completed progress", () => {
    const signals: CaseSignals = [
      { id: "citizenship", value: "RU", source: "user", capturedAt: NOW },
      { id: "income_monthly_eur", value: 5000, source: "user", capturedAt: NOW },
      { id: "income_source", value: "remote_tech", source: "user", capturedAt: NOW },
      { id: "has_dependents", value: true, source: "user", capturedAt: NOW },
      { id: "criminal_record_clean", value: null, source: "user", capturedAt: NOW },
      {
        id: "health_insurance_type",
        value: "private_comprehensive",
        source: "user",
        capturedAt: NOW
      }
    ];

    const queue = buildIntakeQueue(signals, "residency_es");

    expect(queue.completedSignalIds).toContain("criminal_record_clean");
    expect(queue.remaining.some((question) => question.id === "criminal_record_clean")).toBe(false);
    expect(queue.progress).toBeLessThan(1);
  });
});
