import { describe, expect, it } from "vitest";
import type { Case, CaseOverride } from "@shared/contracts";
import { hasSignal } from "@shared/domain/signals";
import { CaseStore } from "./caseStore";
import type { Catalogs } from "./catalogs";

const NOW = "2026-04-17T09:00:00.000Z";

function buildCase(): Case {
  return {
    id: "case_1",
    title: "Тестовый кейс",
    productType: "travel",
    createdAt: NOW,
    updatedAt: NOW,
    signals: [
      { id: "citizenship", value: "RU", source: "user", capturedAt: NOW },
      { id: "destination", value: "IT", source: "user", capturedAt: NOW },
      { id: "travel_purpose", value: "tourism", source: "user", capturedAt: NOW },
      { id: "passport_validity_months", value: 18, source: "user", capturedAt: NOW }
    ],
    overrides: [],
    preferences: [],
    forkedFrom: null
  };
}

function buildCatalogs(caseData: Case): Catalogs {
  return {
    paths: [],
    visaRules: [],
    restrictions: [],
    sources: [],
    cases: [caseData],
    decisionsLog: [],
    residencyPrograms: [],
    insuranceProducts: []
  };
}

describe("CaseStore.overrideSignal", () => {
  it("upserts a missing signal so downstream recompute can read the override", () => {
    const store = new CaseStore(buildCatalogs(buildCase()));
    const override: CaseOverride = {
      signalId: "timeline_weeks",
      value: 6,
      reason: "Уточнили срок вручную.",
      appliedAt: "2026-04-17T10:00:00.000Z"
    };

    const updated = store.overrideSignal("case_1", override, new Date(override.appliedAt));

    expect(updated).not.toBeNull();
    expect(updated?.overrides).toEqual([override]);
    expect(hasSignal(updated?.signals ?? [], "timeline_weeks")).toBe(true);
    expect(updated?.signals.find((signal) => signal.id === "timeline_weeks")).toEqual({
      id: "timeline_weeks",
      value: 6,
      source: "override",
      capturedAt: override.appliedAt
    });
    expect(store.get("case_1")?.signals.find((signal) => signal.id === "timeline_weeks")).toEqual({
      id: "timeline_weeks",
      value: 6,
      source: "override",
      capturedAt: override.appliedAt
    });
  });

  it("rejects overrides with a value type that does not match the signal", () => {
    const store = new CaseStore(buildCatalogs(buildCase()));
    const override: CaseOverride = {
      signalId: "timeline_weeks",
      value: "six",
      reason: "Некорректное значение.",
      appliedAt: "2026-04-17T10:00:00.000Z"
    };

    const updated = store.overrideSignal("case_1", override, new Date(override.appliedAt));

    expect(updated).toBeNull();
    expect(hasSignal(store.get("case_1")?.signals ?? [], "timeline_weeks")).toBe(false);
    expect(store.get("case_1")?.overrides).toEqual([]);
  });
});
