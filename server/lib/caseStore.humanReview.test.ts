import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Case, HumanReviewSnapshot } from "@shared/contracts";
import { CaseStore, initializeCaseStore, getCaseStore } from "./caseStore";
import type { Catalogs } from "./catalogs";
import {
  loadPersistedHumanReviews,
  savePersistedHumanReviews
} from "./humanReviewPersistence";

const NOW = "2026-04-17T09:00:00.000Z";

function buildCase(): Case {
  return {
    id: "case_hr_1",
    title: "Тестовый кейс HR",
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

function buildSnapshot(
  verdict: HumanReviewSnapshot["verdict"] = "HUMAN_REVIEW"
): HumanReviewSnapshot {
  return {
    decisionId: "dec_case_hr_1_1",
    verdict,
    confidence: verdict === "HUMAN_REVIEW" ? 0.42 : 0.88,
    computedAt: "2026-04-17T09:30:00.000Z",
    lastCheckedAt: "2026-04-17T09:30:00.000Z",
    nextActionLabel: verdict === "HUMAN_REVIEW" ? "Передать менеджеру" : "Собрать документы",
    summary: "Снимок для ручной проверки."
  };
}

describe("CaseStore human review lifecycle", () => {
  it("reuses the active request without replacing its snapshot", () => {
    const store = new CaseStore(buildCatalogs(buildCase()));

    const first = store.createOrReuseHumanReview({
      caseId: "case_hr_1",
      request: {
        channel: "email",
        contact: "user@example.com",
        message: "Сложный кейс с прошлым отказом."
      },
      snapshot: buildSnapshot("HUMAN_REVIEW")
    });

    const second = store.createOrReuseHumanReview({
      caseId: "case_hr_1",
      request: {
        channel: "telegram",
        contact: "@new_contact",
        message: "Повторная отправка не должна пересоздавать запрос."
      },
      snapshot: buildSnapshot("GO")
    });

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.request.id).toBe(first.request.id);
    expect(second.request.snapshot.verdict).toBe("HUMAN_REVIEW");
    expect(second.request.contact).toBe("user@example.com");
  });

  it("blocks any mutation after a terminal state", () => {
    const store = new CaseStore(buildCatalogs(buildCase()));
    const created = store.createOrReuseHumanReview({
      caseId: "case_hr_1",
      request: {
        channel: "email",
        contact: "user@example.com",
        message: "Нужно посмотреть вручную."
      },
      snapshot: buildSnapshot()
    });

    const resolved = store.transitionHumanReview({
      requestId: created.request.id,
      status: "resolved",
      changedBy: "ops",
      note: "Эксперт ответил."
    });

    expect(resolved.status).toBe("resolved");
    expect(() =>
      store.transitionHumanReview({
        requestId: created.request.id,
        status: "cancelled",
        changedBy: "ops",
        note: "Повторная мутация запрещена."
      })
    ).toThrow(/уже закрыт/);
  });

  it("does not keep an in-memory request when persistence fails", () => {
    let shouldFail = true;
    const store = new CaseStore(buildCatalogs(buildCase()), {
      persistHumanReviews: () => {
        if (shouldFail) {
          throw new Error("disk full");
        }
      }
    });

    expect(() =>
      store.createOrReuseHumanReview({
        caseId: "case_hr_1",
        request: {
          channel: "email",
          contact: "user@example.com",
          message: "Сначала запись должна упасть."
        },
        snapshot: buildSnapshot()
      })
    ).toThrow(/disk full/);

    expect(store.activeHumanReviewFor("case_hr_1")).toBeNull();

    shouldFail = false;

    const created = store.createOrReuseHumanReview({
      caseId: "case_hr_1",
      request: {
        channel: "email",
        contact: "user@example.com",
        message: "После retry запрос уже должен сохраниться."
      },
      snapshot: buildSnapshot()
    });

    expect(created.reused).toBe(false);
    expect(store.activeHumanReviewFor("case_hr_1")?.id).toBe(created.request.id);
  });

  it("persists requests across a store restart", async () => {
    const caseData = buildCase();
    const catalogs = buildCatalogs(caseData);
    const tempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-store-"));
    const filePath = path.join(tempDir, "human-reviews.json");

    try {
      initializeCaseStore(catalogs, {
        persistHumanReviews: (requests) => savePersistedHumanReviews(requests, filePath)
      });
      const store = getCaseStore();

      const created = store.createOrReuseHumanReview({
        caseId: caseData.id,
        request: {
          channel: "email",
          contact: "user@example.com",
          message: "Проверьте кейс после рестарта."
        },
        snapshot: buildSnapshot()
      });

      expect(created.request.durability).toBe("persisted");
      expect(getCaseStore().latestHumanReviewFor(caseData.id)?.id).toBe(created.request.id);

      const persisted = await loadPersistedHumanReviews(filePath);
      initializeCaseStore(catalogs, {
        humanReviews: persisted,
        persistHumanReviews: (requests) => savePersistedHumanReviews(requests, filePath)
      });

      expect(getCaseStore().latestHumanReviewFor(caseData.id)?.id).toBe(created.request.id);
      expect(getCaseStore().latestHumanReviewFor(caseData.id)?.durability).toBe("persisted");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
