## Tests


### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/02_contracts/shared-contracts/decisions.compat.test.ts

````
import { describe, expect, it } from "vitest";
import {
  decisionLedgerSchema,
  decisionsLogSchema,
  decisionLedgerEntrySchema,
  decisionLogEntrySchema,
  decisionRecordSchema,
  decisionRecordToLogEntry,
  isDecisionRecord,
  type DecisionLogEntry,
  type DecisionRecord
} from "./decisions";

const LEGACY: DecisionLogEntry = {
  id: "log_s1_init",
  caseId: "s1-rf-italy",
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.62,
  summary: "Исходный пересчёт: шенген C возможен, но нужна страховка и проверка дат.",
  kind: "recompute",
  changedSignalIds: [],
  recordedAt: "2026-04-15T10:00:00.000Z"
};

const RECORD: DecisionRecord = {
  decisionId: "dec_s1_1",
  caseId: "s1-rf-italy",
  engineVersion: "rdc.v1",
  engineRevision: "2026.04.18",
  computedAt: "2026-04-17T09:00:00.000Z",
  recordedAt: "2026-04-17T09:00:00.000Z",
  inputFingerprint: "a".repeat(64),
  catalogFingerprint: "b".repeat(64),
  resultFingerprint: "c".repeat(64),
  replayableSnapshot: null,
  result: null,
  auditTrail: null,
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.79,
  summary: "recompute",
  kind: "recompute",
  changedSignalIds: [],
  changedPreferenceIds: []
};

describe("decisionLedgerEntrySchema", () => {
  it("accepts the legacy DecisionLogEntry shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(LEGACY);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(false);
    }
  });

  it("accepts the new DecisionRecord shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(RECORD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(true);
    }
  });

  it("rejects entries that match neither shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse({
      id: "missing_case_id"
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps decisionsLogSchema legacy-only for old API consumers", () => {
    const parsed = decisionsLogSchema.safeParse([LEGACY]);
    expect(parsed.success).toBe(true);
  });

  it("accepts mixed legacy and full records in decisionLedgerSchema", () => {
    const parsed = decisionLedgerSchema.safeParse([LEGACY, RECORD]);
    expect(parsed.success).toBe(true);
  });
});

describe("decisionRecordToLogEntry", () => {
  it("projects a record onto the legacy shape that the old API uses", () => {
    const entry = decisionRecordToLogEntry(RECORD);
    const parsed = decisionLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    expect(entry.id).toBe(RECORD.decisionId);
    expect(entry.verdict).toBe(RECORD.verdict);
    expect(entry.confidence).toBe(RECORD.confidence);
    expect(entry.summary).toBe(RECORD.summary);
    expect(entry.kind).toBe(RECORD.kind);
    expect(entry.changedSignalIds).toEqual(RECORD.changedSignalIds);
    expect(entry.recordedAt).toBe(RECORD.recordedAt);
  });
});

describe("decisionRecordSchema", () => {
  it("rejects a record with an invalid fingerprint", () => {
    const bad = { ...RECORD, inputFingerprint: "not-a-hash" };
    const parsed = decisionRecordSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/documentsScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildDocumentsScreenModel } from "./documentsScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.6,
      readyCount: 3,
      requiredCount: 5,
      items: [
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "ready",
          detail: "Полис уже загружен.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.7,
      confidenceBreakdown: {
        value: 0.7,
        base: 0.7,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.1,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildDocumentsScreenModel", () => {
  it("builds readiness and next-step copy from result payload", () => {
    const model = buildDocumentsScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.readiness.badgeTone).toBe("warning");
    expect(model.requirements.items).toHaveLength(2);
    expect(model.nextStep.description).toBe("Закройте недостающий чеклист.");
  });

  it("switches to a review gate for human-review verdicts", () => {
    const model = buildDocumentsScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Документный трек откроет оператор");
    expect(model.gate?.actionLabel).toBe("Вернуться к ручной проверке");
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/humanReviewScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { buildHumanReviewScreenModel } from "./humanReviewScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s5-rf-italy-insurance",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "blocking",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["confidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "HR-1",
        fired: true,
        category: "timeline",
        priority: 90,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Нужна ручная проверка по истории отказов."
      },
      {
        ruleId: "WARN-1",
        fired: true,
        category: "document",
        priority: 80,
        productType: "travel",
        output: { type: "warning", severity: "high" },
        consumedSignals: [],
        explanation: "Не хватает страховки. Нужна допроверка пакета."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: ["manual_review"],
        factors: []
      },
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s5-rf-italy-insurance",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 10,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 10,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createRequest(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: "s5-rf-italy-insurance",
    status: "in_review",
    channel: "telegram",
    contact: "@traveler",
    message: "Есть прошлый отказ и спорная страховка, прошу проверить кейс вручную.",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:30:00.000Z",
    closedAt: null,
    durability: "persisted",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-21T00:00:00.000Z",
      lastCheckedAt: "2026-04-21T00:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно подтвердить маршрут."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-21T00:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

function createAudit(): { trail: AuditTrail; decisions: DecisionLogEntry[] } {
  return {
    trail: createResult().auditTrail,
    decisions: [
      {
        id: "decision-1",
        caseId: "s5-rf-italy-insurance",
        verdict: "HUMAN_REVIEW",
        confidence: 0.42,
        summary: "Ушли в ручную проверку.",
        kind: "recompute",
        changedSignalIds: [],
        recordedAt: "2026-04-21T00:40:00.000Z"
      }
    ]
  };
}

describe("buildHumanReviewScreenModel", () => {
  it("builds an honest pipeline view for active requests", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: createRequest(),
      audit: null,
      humanReviewStatus: "ready"
    });

    expect(model.header.heading).toBe("Запрос уже в работе");
    expect(model.openReview?.pipeline[2]).toEqual({
      id: "in_review",
      label: "У человека",
      state: "current"
    });
    expect(model.openReview?.verdictLabel).toBe("Нужна ручная проверка");
    expect(model.overview.rows[2]?.text).toContain("хранится на сервере");
    expect(model.submitForm).toBeNull();
  });

  it("keeps submit flow and warning or audit sections ready for future UI", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult({ verdict: "GO" }),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: createAudit(),
      humanReviewStatus: "ready"
    });

    expect(model.submitForm?.channels).toHaveLength(2);
    expect(model.warningsSection?.items[0]?.pulseAmplitude).toBe(0.75);
    expect(model.auditSection?.history[0]?.label).toContain("Ушли в ручную проверку");
  });

  it("exposes a loading mode before the current case review state is known", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: null,
      humanReviewStatus: "loading"
    });

    expect(model.mode).toBe("loading");
    expect(model.loadingState?.title).toContain("Проверяем");
    expect(model.submitForm).toBeNull();
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/landingScreenModel.test.ts

````
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

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/resultScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildResultScreenModel } from "./resultScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    ruleResults: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 14.2,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 14.2,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createScenarioLab(): ScenarioLabPayload {
  const baseResult = createBaseResult();

  return {
    version: "scenario-lab.v1",
    caseId: "s1-rf-italy",
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать обязательные документы",
        summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
        recommended: true,
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Перейти к документам",
          detail: "Закройте недостающий чеклист.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        comparison: {
          verdictBefore: "GO",
          verdictAfter: "GO",
          confidenceBefore: 0.74,
          confidenceAfter: 0.82,
          primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
          primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
          resolvedRisks: [],
          remainingRisks: [],
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            requiredCount: 7,
            itemsToCollect: []
          },
          whyChanged: ["Чеклист становится полным."]
        },
        plan: {
          headline: "После этого сценария следующий шаг — перейти к документам.",
          firstSteps: ["Подготовить страховку."],
          criticalSteps: ["Не отправлять заявку с неполным пакетом."],
          canWait: [],
          humanReviewRequired: false,
          humanReviewReason: null
        }
      }
    ],
    recommendedScenarioId: "documents-ready",
    noHelpfulScenarios: false,
    humanReviewEscalation: {
      required: false,
      title: "Ручная проверка не нужна",
      detail: "По текущему кейсу есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildResultScreenModel", () => {
  it("keeps missing-docs cases anchored on the documents node", () => {
    const model = buildResultScreenModel({
      result: createBaseResult(),
      scenarioLab: createScenarioLab()
    });

    expect(model.heading).toBe("Подача возможна");
    expect(model.bridge.activeNodeId).toBe("docs");
    expect(model.workSection.rows[0]?.title).toBe("Страховка");
    expect(model.compareCard?.title).toBe("Добрать обязательные документы");
  });

  it("switches to honest review mode for human review verdicts", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "blocking",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["confidence"]
        }
      }),
      scenarioLab: null
    });

    expect(model.eyebrow).toBe("ручная проверка");
    expect(model.bridge.activeNodeId).toBe("review");
    expect(model.ai.summary).toContain("менеджера");
    expect(model.cta.targetScreen).toBe("human-review");
  });

  it("uses the next action as the work row when documents are already ready", () => {
    const result = createBaseResult({
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "documents",
        triggeredBy: ["primary_path"]
      },
      documents: {
        score: 1,
        readyCount: 7,
        requiredCount: 7,
        items: [
          {
            id: "insurance",
            label: "Страховка",
            status: "ready",
            detail: "Документ готов.",
            pathId: "italy_c_tourism"
          }
        ]
      }
    });

    const model = buildResultScreenModel({
      result,
      scenarioLab: null
    });

    expect(model.bridge.activeNodeId).toBe("step");
    expect(model.workSection.rows).toEqual([
      {
        id: "next-action",
        title: "Начать заявку",
        meta: "Можно переходить к следующему шагу.",
        status: "дальше",
        tone: "result"
      }
    ]);
  });

  it("falls back to product label when the primary path is absent", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        primaryPath: null,
        productType: "insurance_adult"
      }),
      scenarioLab: null
    });

    expect(model.meta).toBe("Страховой сценарий");
    expect(model.bridge.rightChip).toBe("Шенген 🇪🇺");
  });

  it("uses the canonical recommended scenario across compare, work section, and ai copy", () => {
    const scenarioLab = createScenarioLab();
    scenarioLab.scenarios = [
      {
        ...scenarioLab.scenarios[0],
        id: "fallback",
        title: "Первый, но не рекомендованный",
        summary: "Это просто запасной сценарий.",
        recommended: false
      },
      {
        ...scenarioLab.scenarios[0],
        id: "recommended-second",
        title: "Рекомендованный сценарий",
        summary: "Этот сценарий должен стать единым owner-ом на экране.",
        recommended: true
      }
    ];
    scenarioLab.recommendedScenarioId = "recommended-second";

    const model = buildResultScreenModel({
      result: createBaseResult({
        documents: {
          score: 1,
          readyCount: 7,
          requiredCount: 7,
          items: []
        }
      }),
      scenarioLab
    });

    expect(model.compareCard?.title).toBe("Рекомендованный сценарий");
    expect(model.workSection.rows[0]?.title).toBe("Рекомендованный сценарий");
    expect(model.ai.summary).toContain("Рекомендованный сценарий");
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/trustScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildTrustScreenModel } from "./trustScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить дальше.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 1,
      readyCount: 5,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.83,
      confidenceBreakdown: {
        value: 0.83,
        base: 0.83,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.14,
      sources: [
        {
          id: "src_consulate",
          label: "Консульство",
          url: "https://example.com/consulate",
          tier: "official",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.1
        },
        {
          id: "src_operator",
          label: "Оператор",
          url: "https://example.com/operator",
          tier: "operator",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.2
        }
      ],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildTrustScreenModel", () => {
  it("adds stable source summaries and volatility copy", () => {
    const model = buildTrustScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.hero.badgeTone).toBe("positive");
    expect(model.sourcesSection.items[0]?.summary).toContain("Официальный источник");
    expect(model.sourcesSection.volatilityLabel).toContain("14%");
  });

  it("blocks trust details for human-review verdicts", () => {
    const model = buildTrustScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Доверие уточнит оператор");
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/human-review/HumanReviewScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { HumanReviewScreen } from "./HumanReviewScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  Briefcase: iconStub,
  Phone: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "case-a",
      title: "Case A",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    },
    activeCaseId: "case-a",
    activeResult: {
      version: "rdc.v1",
      productType: "travel",
      caseId: "case-a",
      computedAt: "2026-04-21T00:00:00.000Z",
      verdict: "GO",
      primaryPath: null,
      alternativePaths: [],
      criticalRisk: null,
      risks: [],
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить дальше.",
        targetScreen: "result",
        triggeredBy: ["primary_path"]
      },
      decisionSignals: [],
      whyBullets: [],
      ruleResults: [],
      documents: {
        score: 1,
        readyCount: 5,
        requiredCount: 5,
        items: []
      },
      trust: {
        confidence: 0.8,
        confidenceBreakdown: {
          value: 0.8,
          base: 0.8,
          capsApplied: [],
          factors: []
        },
        volatilityScore: 0.1,
        sources: [],
        lastCheckedAt: "2026-04-21T00:00:00.000Z"
      },
      assumptions: [],
      auditTrail: {
        version: "rdc.v1",
        caseId: "case-a",
        startedAt: "2026-04-21T00:00:00.000Z",
        finishedAt: "2026-04-21T00:00:00.000Z",
        totalMs: 10,
        steps: [
          {
            index: 0,
            name: "assemblePayload",
            tookMs: 10,
            inputsSummary: "result",
            outputSummary: "payload",
            firedRuleIds: [],
            notes: []
          }
        ],
        preview: false
      },
      preview: false
    },
    activeHumanReview: null,
    scenarios: [
      {
        caseId: "case-a",
        productType: "travel",
        title: "A",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    loadHumanReview: vi.fn().mockResolvedValue(undefined),
    submitHumanReview: vi.fn().mockResolvedValue({ reused: false }),
    status: "ready",
    errorMessage: null,
    humanReviewStatus: "ready",
    humanReviewError: null,
    ...overrides
  } as any;
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("HumanReviewScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading block while current-case review state is still loading", () => {
    useCaseStoreMock.mockReturnValue(
      createStore({
        humanReviewStatus: "loading"
      })
    );

    renderScreen(<HumanReviewScreen />);

    expect(screen.getByText("Проверяем, есть ли активный запрос")).toBeInTheDocument();
  });

  it("resets draft fields when the case id changes", async () => {
    useCaseStoreMock.mockReturnValue(createStore());
    const view = renderScreen(<HumanReviewScreen />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
      ),
      { target: { value: "Черновик для первого кейса" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Телеграм" }));
    fireEvent.change(screen.getByPlaceholderText("@username"), {
      target: { value: "@draft_case_a" }
    });

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "case-b",
          title: "Case B",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-21T01:00:00.000Z",
          updatedAt: "2026-04-21T01:00:00.000Z"
        },
        activeCaseId: "case-b",
        activeResult: {
          ...createStore().activeResult,
          caseId: "case-b",
          auditTrail: {
            ...createStore().activeResult.auditTrail,
            caseId: "case-b"
          }
        }
      })
    );
    view.rerender(
      <MemoryRouter>
        <HumanReviewScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
        )
      ).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
    });
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/result/AiRecommendationPanel.test.tsx

````
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

const { apiClientMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }
  return {
    apiClientMock: {
      recommendationShortlist: vi.fn(),
      recommendationDetail: vi.fn(),
      compareScenario: vi.fn()
    },
    ApiErrorMock
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiClient: apiClientMock,
  ApiError: ApiErrorMock
}));

function renderPanel(overrides: Partial<ComponentProps<typeof AiRecommendationPanel>> = {}) {
  const onOpenScenario = vi.fn();
  render(
    <AiRecommendationPanel
      caseId="s1-rf-italy"
      computedAt="2026-04-19T09:55:00.000Z"
      preferences={[]}
      onOpenScenario={onOpenScenario}
      {...overrides}
    />
  );
  return { onOpenScenario };
}

describe("AiRecommendationPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads shortlist and the default detail view", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Самый прямой путь по текущему кейсу.",
          fitReason: "Сейчас это главный match по движку.",
          caution: "Нужно добрать документы."
        }
      ],
      disclaimer: "Fallback shortlist."
    });
    apiClientMock.recommendationDetail.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      offerId: "italy_c_tourism",
      generatedAt: "2026-04-19T10:00:05.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      fit: "best_match",
      title: "Шенген C",
      summary: "Подходит лучше других по текущим сигналам.",
      whyThisFits: ["Есть рабочий путь.", "Сроки понятны."],
      watchouts: ["Нужно добрать документы."],
      nextSteps: ["Перейти к документам."],
      trustSignals: ["Уверенность 74%."],
      disclaimer: "Fallback detail."
    });

    renderPanel();

    expect(screen.getByText("AI-разбор рекомендаций")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClientMock.recommendationShortlist).toHaveBeenCalledWith("s1-rf-italy");
    });

    expect((await screen.findAllByText("Шенген C")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Подходит лучше других по текущим сигналам.")).toBeInTheDocument();
    expect(screen.getByText("уже основной вариант")).toBeInTheDocument();
    expect(screen.getByText("Fallback detail.")).toBeInTheDocument();
  });

  it("loads follow-up detail when the user switches shortlist item", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    expect(await screen.findByText("Главный путь.")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);

    await waitFor(() => {
      expect(apiClientMock.recommendationDetail).toHaveBeenCalledWith(
        "s1-rf-italy",
        "italy_d_digital_nomad"
      );
    });

    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить движком" })).toBeInTheDocument();
    expect(screen.getByText("Detail 2.")).toBeInTheDocument();
  });

  it("shows non-primary pre-compare steps from detail payload", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Перейти к документам."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: [
          "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
          "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
          "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
        ],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();

    expect(screen.getByText("Что проверить перед compare")).toBeInTheDocument();
    expect(screen.queryAllByText("Следующие шаги")).toHaveLength(0);
    expect(
      screen.queryAllByText("Заполнить baseline-форму по текущему next action.")
    ).toHaveLength(0);
    expect(
      screen.getByText(
        "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта."
      )
    ).toBeInTheDocument();
  });

  it("runs deterministic compare for an alternative and opens the fork scenario", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });
    apiClientMock.compareScenario.mockResolvedValue({
      rootCaseId: "s1-rf-italy",
      baseline: {
        outcome: {
          verdict: "GO",
          confidence: 0.74,
          primaryPathLabel: "Шенген C"
        }
      },
      candidateCase: {
        id: "s1-rf-italy-fork-1"
      },
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу."
          },
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          }
        },
        delta: {
          confidenceDelta: -0.13
        }
      }
    });

    const { onOpenScenario } = renderPanel({
      preferences: [{ id: "italy_c_tourism", weight: 0.4 }]
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByRole("button", { name: "Проверить движком" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Проверить движком" }));

    await waitFor(() => {
      expect(apiClientMock.compareScenario).toHaveBeenCalledWith("s1-rf-italy", {
        title: "AI-проверка · Digital Nomad",
        signals: [],
        preferences: [
          { id: "italy_c_tourism", weight: 0.4 },
          { id: "italy_d_digital_nomad", weight: 1 }
        ]
      });
    });

    expect(await screen.findByText("Можно ехать → Нужна проверка менеджером")).toBeInTheDocument();
    expect(screen.getByText("Нужна ручная сверка по доходу.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный сценарий" }));
    expect(onOpenScenario).toHaveBeenCalledWith("s1-rf-italy-fork-1");
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/result/ResultScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  layoutId: _layoutId,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  layoutId?: string;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  ArrowLeft: iconStub,
  ArrowRight: iconStub,
  MoreHorizontal: iconStub,
  Sparkles: iconStub,
  X: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/instrumentation/events", () => ({
  track: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

vi.mock("./AiRecommendationPanel", () => ({
  AiRecommendationPanel: () => <div data-testid="ai-recommendation-panel">AI panel</div>
}));

vi.mock("./ResultCompareSurface", () => ({
  ResultCompareSurface: () => <div data-testid="compare-surface">Compare surface</div>
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  const activeResult = {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-17T10:00:00.000Z",
    verdict: "GO",
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить к следующему шагу.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-17T10:00:00.000Z"
    },
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    decisionSignals: [],
    ruleResults: [],
    assumptions: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    auditTrail: {
      totalMs: 14.2
    },
    preview: false
  };

  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult,
    activeScenarioLab: {
      version: "scenario-lab.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-17T10:00:00.000Z",
      baseResult: activeResult,
      issues: [],
      scenarios: [
        {
          id: "documents-ready",
          type: "documents",
          title: "Добрать обязательные документы",
          summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
          recommended: true,
          nextAction: {
            type: "upload_missing_docs",
            priority: "blocking",
            label: "Перейти к документам",
            detail: "Закройте недостающий чеклист.",
            targetScreen: "documents",
            triggeredBy: ["documents_ready_count"]
          },
          comparison: {
            verdictBefore: "GO",
            verdictAfter: "GO",
            confidenceBefore: 0.74,
            confidenceAfter: 0.82,
            primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
            primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
            resolvedRisks: [],
            remainingRisks: [],
            documents: {
              readyCountBefore: 5,
              readyCountAfter: 7,
              requiredCount: 7,
              itemsToCollect: []
            },
            whyChanged: ["Чеклист становится полным."]
          },
          plan: {
            headline: "После этого сценария следующий шаг — перейти к документам.",
            firstSteps: ["Подготовить страховку."],
            criticalSteps: ["Не отправлять заявку с неполным пакетом."],
            canWait: [],
            humanReviewRequired: false,
            humanReviewReason: null
          }
        }
      ],
      recommendedScenarioId: "documents-ready",
      noHelpfulScenarios: false,
      humanReviewEscalation: {
        required: false,
        title: "Ручная проверка не нужна",
        detail: "По текущему кейсу есть автоматический сценарий.",
        triggeredBy: []
      }
    },
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
    scenarioLabStatus: "ready",
    scenarioLabError: null,
    status: "ready",
    errorMessage: null,
    ...overrides
  } as any;
}

function renderScreen(screenNode: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{screenNode}</MemoryRouter>);
}

describe("ResultScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the vertical default case when the active case belongs to another product", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("ignores a foreign case query param on product-specific routes", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        scenarios: [
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
        ],
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />, [
      "/insurance-adult?case=s1-rf-italy"
    ]);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("renders manual review state without a fake confirmed path", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          primaryPath: null,
          nextAction: {
            type: "send_for_review",
            priority: "human_review",
            label: "Передать менеджеру",
            detail: "Автомат не может честно подтвердить маршрут.",
            targetScreen: "human-review",
            triggeredBy: ["human_review_trigger"]
          }
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getByText("Нужна ручная проверка")).toBeInTheDocument();
    expect(screen.getAllByText("Передать менеджеру").length).toBeGreaterThan(0);
    expect(screen.getByText("Нужен оператор")).toBeInTheDocument();
    expect(screen.queryByText("Маршрут подтверждён")).not.toBeInTheDocument();
  });

  it("opens the basis sheet from the utility action", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Основание" }));

    await waitFor(() => {
      expect(screen.getByText("Основание решения")).toBeInTheDocument();
      expect(screen.getByText("Маршрут подтверждён по текущим сигналам.")).toBeInTheDocument();
    });
  });

  it("opens compare and AI sheets from secondary actions", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Сравнить" }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-surface")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /AI: сначала/i }));
    fireEvent.click(screen.getByRole("button", { name: "Полный разбор" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-recommendation-panel")).toBeInTheDocument();
    });
  });
});

````

### output/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/screenRouting.test.tsx

````
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

````

### output/m1-input-pack/stage/02_contracts/shared-contracts/decisions.compat.test.ts

````
import { describe, expect, it } from "vitest";
import {
  decisionLedgerSchema,
  decisionsLogSchema,
  decisionLedgerEntrySchema,
  decisionLogEntrySchema,
  decisionRecordSchema,
  decisionRecordToLogEntry,
  isDecisionRecord,
  type DecisionLogEntry,
  type DecisionRecord
} from "./decisions";

const LEGACY: DecisionLogEntry = {
  id: "log_s1_init",
  caseId: "s1-rf-italy",
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.62,
  summary: "Исходный пересчёт: шенген C возможен, но нужна страховка и проверка дат.",
  kind: "recompute",
  changedSignalIds: [],
  recordedAt: "2026-04-15T10:00:00.000Z"
};

const RECORD: DecisionRecord = {
  decisionId: "dec_s1_1",
  caseId: "s1-rf-italy",
  engineVersion: "rdc.v1",
  engineRevision: "2026.04.18",
  computedAt: "2026-04-17T09:00:00.000Z",
  recordedAt: "2026-04-17T09:00:00.000Z",
  inputFingerprint: "a".repeat(64),
  catalogFingerprint: "b".repeat(64),
  resultFingerprint: "c".repeat(64),
  replayableSnapshot: null,
  result: null,
  auditTrail: null,
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.79,
  summary: "recompute",
  kind: "recompute",
  changedSignalIds: [],
  changedPreferenceIds: []
};

describe("decisionLedgerEntrySchema", () => {
  it("accepts the legacy DecisionLogEntry shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(LEGACY);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(false);
    }
  });

  it("accepts the new DecisionRecord shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(RECORD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(true);
    }
  });

  it("rejects entries that match neither shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse({
      id: "missing_case_id"
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps decisionsLogSchema legacy-only for old API consumers", () => {
    const parsed = decisionsLogSchema.safeParse([LEGACY]);
    expect(parsed.success).toBe(true);
  });

  it("accepts mixed legacy and full records in decisionLedgerSchema", () => {
    const parsed = decisionLedgerSchema.safeParse([LEGACY, RECORD]);
    expect(parsed.success).toBe(true);
  });
});

describe("decisionRecordToLogEntry", () => {
  it("projects a record onto the legacy shape that the old API uses", () => {
    const entry = decisionRecordToLogEntry(RECORD);
    const parsed = decisionLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    expect(entry.id).toBe(RECORD.decisionId);
    expect(entry.verdict).toBe(RECORD.verdict);
    expect(entry.confidence).toBe(RECORD.confidence);
    expect(entry.summary).toBe(RECORD.summary);
    expect(entry.kind).toBe(RECORD.kind);
    expect(entry.changedSignalIds).toEqual(RECORD.changedSignalIds);
    expect(entry.recordedAt).toBe(RECORD.recordedAt);
  });
});

describe("decisionRecordSchema", () => {
  it("rejects a record with an invalid fingerprint", () => {
    const bad = { ...RECORD, inputFingerprint: "not-a-hash" };
    const parsed = decisionRecordSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});

````

### output/m1-input-pack/stage/03_screen_models/activeHolidays/documentsScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildDocumentsScreenModel } from "./documentsScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.6,
      readyCount: 3,
      requiredCount: 5,
      items: [
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "ready",
          detail: "Полис уже загружен.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.7,
      confidenceBreakdown: {
        value: 0.7,
        base: 0.7,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.1,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildDocumentsScreenModel", () => {
  it("builds readiness and next-step copy from result payload", () => {
    const model = buildDocumentsScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.readiness.badgeTone).toBe("warning");
    expect(model.requirements.items).toHaveLength(2);
    expect(model.nextStep.description).toBe("Закройте недостающий чеклист.");
  });

  it("switches to a review gate for human-review verdicts", () => {
    const model = buildDocumentsScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Документный трек откроет оператор");
    expect(model.gate?.actionLabel).toBe("Вернуться к ручной проверке");
  });
});

````

### output/m1-input-pack/stage/03_screen_models/activeHolidays/humanReviewScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { buildHumanReviewScreenModel } from "./humanReviewScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s5-rf-italy-insurance",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "blocking",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["confidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "HR-1",
        fired: true,
        category: "timeline",
        priority: 90,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Нужна ручная проверка по истории отказов."
      },
      {
        ruleId: "WARN-1",
        fired: true,
        category: "document",
        priority: 80,
        productType: "travel",
        output: { type: "warning", severity: "high" },
        consumedSignals: [],
        explanation: "Не хватает страховки. Нужна допроверка пакета."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: ["manual_review"],
        factors: []
      },
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s5-rf-italy-insurance",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 10,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 10,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createRequest(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: "s5-rf-italy-insurance",
    status: "in_review",
    channel: "telegram",
    contact: "@traveler",
    message: "Есть прошлый отказ и спорная страховка, прошу проверить кейс вручную.",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:30:00.000Z",
    closedAt: null,
    durability: "persisted",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-21T00:00:00.000Z",
      lastCheckedAt: "2026-04-21T00:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно подтвердить маршрут."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-21T00:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

function createAudit(): { trail: AuditTrail; decisions: DecisionLogEntry[] } {
  return {
    trail: createResult().auditTrail,
    decisions: [
      {
        id: "decision-1",
        caseId: "s5-rf-italy-insurance",
        verdict: "HUMAN_REVIEW",
        confidence: 0.42,
        summary: "Ушли в ручную проверку.",
        kind: "recompute",
        changedSignalIds: [],
        recordedAt: "2026-04-21T00:40:00.000Z"
      }
    ]
  };
}

describe("buildHumanReviewScreenModel", () => {
  it("builds an honest pipeline view for active requests", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: createRequest(),
      audit: null,
      humanReviewStatus: "ready"
    });

    expect(model.header.heading).toBe("Запрос уже в работе");
    expect(model.openReview?.pipeline[2]).toEqual({
      id: "in_review",
      label: "У человека",
      state: "current"
    });
    expect(model.openReview?.verdictLabel).toBe("Нужна ручная проверка");
    expect(model.overview.rows[2]?.text).toContain("хранится на сервере");
    expect(model.submitForm).toBeNull();
  });

  it("keeps submit flow and warning or audit sections ready for future UI", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult({ verdict: "GO" }),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: createAudit(),
      humanReviewStatus: "ready"
    });

    expect(model.submitForm?.channels).toHaveLength(2);
    expect(model.warningsSection?.items[0]?.pulseAmplitude).toBe(0.75);
    expect(model.auditSection?.history[0]?.label).toContain("Ушли в ручную проверку");
  });

  it("exposes a loading mode before the current case review state is known", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: null,
      humanReviewStatus: "loading"
    });

    expect(model.mode).toBe("loading");
    expect(model.loadingState?.title).toContain("Проверяем");
    expect(model.submitForm).toBeNull();
  });
});

````

### output/m1-input-pack/stage/03_screen_models/activeHolidays/landingScreenModel.test.ts

````
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

````

### output/m1-input-pack/stage/03_screen_models/activeHolidays/resultScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildResultScreenModel } from "./resultScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    ruleResults: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 14.2,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 14.2,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createScenarioLab(): ScenarioLabPayload {
  const baseResult = createBaseResult();

  return {
    version: "scenario-lab.v1",
    caseId: "s1-rf-italy",
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать обязательные документы",
        summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
        recommended: true,
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Перейти к документам",
          detail: "Закройте недостающий чеклист.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        comparison: {
          verdictBefore: "GO",
          verdictAfter: "GO",
          confidenceBefore: 0.74,
          confidenceAfter: 0.82,
          primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
          primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
          resolvedRisks: [],
          remainingRisks: [],
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            requiredCount: 7,
            itemsToCollect: []
          },
          whyChanged: ["Чеклист становится полным."]
        },
        plan: {
          headline: "После этого сценария следующий шаг — перейти к документам.",
          firstSteps: ["Подготовить страховку."],
          criticalSteps: ["Не отправлять заявку с неполным пакетом."],
          canWait: [],
          humanReviewRequired: false,
          humanReviewReason: null
        }
      }
    ],
    recommendedScenarioId: "documents-ready",
    noHelpfulScenarios: false,
    humanReviewEscalation: {
      required: false,
      title: "Ручная проверка не нужна",
      detail: "По текущему кейсу есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildResultScreenModel", () => {
  it("keeps missing-docs cases anchored on the documents node", () => {
    const model = buildResultScreenModel({
      result: createBaseResult(),
      scenarioLab: createScenarioLab()
    });

    expect(model.heading).toBe("Подача возможна");
    expect(model.bridge.activeNodeId).toBe("docs");
    expect(model.workSection.rows[0]?.title).toBe("Страховка");
    expect(model.compareCard?.title).toBe("Добрать обязательные документы");
  });

  it("switches to honest review mode for human review verdicts", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "blocking",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["confidence"]
        }
      }),
      scenarioLab: null
    });

    expect(model.eyebrow).toBe("ручная проверка");
    expect(model.bridge.activeNodeId).toBe("review");
    expect(model.ai.summary).toContain("менеджера");
    expect(model.cta.targetScreen).toBe("human-review");
  });

  it("uses the next action as the work row when documents are already ready", () => {
    const result = createBaseResult({
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "documents",
        triggeredBy: ["primary_path"]
      },
      documents: {
        score: 1,
        readyCount: 7,
        requiredCount: 7,
        items: [
          {
            id: "insurance",
            label: "Страховка",
            status: "ready",
            detail: "Документ готов.",
            pathId: "italy_c_tourism"
          }
        ]
      }
    });

    const model = buildResultScreenModel({
      result,
      scenarioLab: null
    });

    expect(model.bridge.activeNodeId).toBe("step");
    expect(model.workSection.rows).toEqual([
      {
        id: "next-action",
        title: "Начать заявку",
        meta: "Можно переходить к следующему шагу.",
        status: "дальше",
        tone: "result"
      }
    ]);
  });

  it("falls back to product label when the primary path is absent", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        primaryPath: null,
        productType: "insurance_adult"
      }),
      scenarioLab: null
    });

    expect(model.meta).toBe("Страховой сценарий");
    expect(model.bridge.rightChip).toBe("Шенген 🇪🇺");
  });

  it("uses the canonical recommended scenario across compare, work section, and ai copy", () => {
    const scenarioLab = createScenarioLab();
    scenarioLab.scenarios = [
      {
        ...scenarioLab.scenarios[0],
        id: "fallback",
        title: "Первый, но не рекомендованный",
        summary: "Это просто запасной сценарий.",
        recommended: false
      },
      {
        ...scenarioLab.scenarios[0],
        id: "recommended-second",
        title: "Рекомендованный сценарий",
        summary: "Этот сценарий должен стать единым owner-ом на экране.",
        recommended: true
      }
    ];
    scenarioLab.recommendedScenarioId = "recommended-second";

    const model = buildResultScreenModel({
      result: createBaseResult({
        documents: {
          score: 1,
          readyCount: 7,
          requiredCount: 7,
          items: []
        }
      }),
      scenarioLab
    });

    expect(model.compareCard?.title).toBe("Рекомендованный сценарий");
    expect(model.workSection.rows[0]?.title).toBe("Рекомендованный сценарий");
    expect(model.ai.summary).toContain("Рекомендованный сценарий");
  });
});

````

### output/m1-input-pack/stage/03_screen_models/activeHolidays/trustScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildTrustScreenModel } from "./trustScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить дальше.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 1,
      readyCount: 5,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.83,
      confidenceBreakdown: {
        value: 0.83,
        base: 0.83,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.14,
      sources: [
        {
          id: "src_consulate",
          label: "Консульство",
          url: "https://example.com/consulate",
          tier: "official",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.1
        },
        {
          id: "src_operator",
          label: "Оператор",
          url: "https://example.com/operator",
          tier: "operator",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.2
        }
      ],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildTrustScreenModel", () => {
  it("adds stable source summaries and volatility copy", () => {
    const model = buildTrustScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.hero.badgeTone).toBe("positive");
    expect(model.sourcesSection.items[0]?.summary).toContain("Официальный источник");
    expect(model.sourcesSection.volatilityLabel).toContain("14%");
  });

  it("blocks trust details for human-review verdicts", () => {
    const model = buildTrustScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Доверие уточнит оператор");
  });
});

````

### output/m1-input-pack/stage/04_screens/src-screens/human-review/HumanReviewScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { HumanReviewScreen } from "./HumanReviewScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  Briefcase: iconStub,
  Phone: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "case-a",
      title: "Case A",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    },
    activeCaseId: "case-a",
    activeResult: {
      version: "rdc.v1",
      productType: "travel",
      caseId: "case-a",
      computedAt: "2026-04-21T00:00:00.000Z",
      verdict: "GO",
      primaryPath: null,
      alternativePaths: [],
      criticalRisk: null,
      risks: [],
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить дальше.",
        targetScreen: "result",
        triggeredBy: ["primary_path"]
      },
      decisionSignals: [],
      whyBullets: [],
      ruleResults: [],
      documents: {
        score: 1,
        readyCount: 5,
        requiredCount: 5,
        items: []
      },
      trust: {
        confidence: 0.8,
        confidenceBreakdown: {
          value: 0.8,
          base: 0.8,
          capsApplied: [],
          factors: []
        },
        volatilityScore: 0.1,
        sources: [],
        lastCheckedAt: "2026-04-21T00:00:00.000Z"
      },
      assumptions: [],
      auditTrail: {
        version: "rdc.v1",
        caseId: "case-a",
        startedAt: "2026-04-21T00:00:00.000Z",
        finishedAt: "2026-04-21T00:00:00.000Z",
        totalMs: 10,
        steps: [
          {
            index: 0,
            name: "assemblePayload",
            tookMs: 10,
            inputsSummary: "result",
            outputSummary: "payload",
            firedRuleIds: [],
            notes: []
          }
        ],
        preview: false
      },
      preview: false
    },
    activeHumanReview: null,
    scenarios: [
      {
        caseId: "case-a",
        productType: "travel",
        title: "A",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    loadHumanReview: vi.fn().mockResolvedValue(undefined),
    submitHumanReview: vi.fn().mockResolvedValue({ reused: false }),
    status: "ready",
    errorMessage: null,
    humanReviewStatus: "ready",
    humanReviewError: null,
    ...overrides
  } as any;
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("HumanReviewScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading block while current-case review state is still loading", () => {
    useCaseStoreMock.mockReturnValue(
      createStore({
        humanReviewStatus: "loading"
      })
    );

    renderScreen(<HumanReviewScreen />);

    expect(screen.getByText("Проверяем, есть ли активный запрос")).toBeInTheDocument();
  });

  it("resets draft fields when the case id changes", async () => {
    useCaseStoreMock.mockReturnValue(createStore());
    const view = renderScreen(<HumanReviewScreen />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
      ),
      { target: { value: "Черновик для первого кейса" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Телеграм" }));
    fireEvent.change(screen.getByPlaceholderText("@username"), {
      target: { value: "@draft_case_a" }
    });

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "case-b",
          title: "Case B",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-21T01:00:00.000Z",
          updatedAt: "2026-04-21T01:00:00.000Z"
        },
        activeCaseId: "case-b",
        activeResult: {
          ...createStore().activeResult,
          caseId: "case-b",
          auditTrail: {
            ...createStore().activeResult.auditTrail,
            caseId: "case-b"
          }
        }
      })
    );
    view.rerender(
      <MemoryRouter>
        <HumanReviewScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
        )
      ).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
    });
  });
});

````

### output/m1-input-pack/stage/04_screens/src-screens/result/AiRecommendationPanel.test.tsx

````
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

const { apiClientMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }
  return {
    apiClientMock: {
      recommendationShortlist: vi.fn(),
      recommendationDetail: vi.fn(),
      compareScenario: vi.fn()
    },
    ApiErrorMock
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiClient: apiClientMock,
  ApiError: ApiErrorMock
}));

function renderPanel(overrides: Partial<ComponentProps<typeof AiRecommendationPanel>> = {}) {
  const onOpenScenario = vi.fn();
  render(
    <AiRecommendationPanel
      caseId="s1-rf-italy"
      computedAt="2026-04-19T09:55:00.000Z"
      preferences={[]}
      onOpenScenario={onOpenScenario}
      {...overrides}
    />
  );
  return { onOpenScenario };
}

describe("AiRecommendationPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads shortlist and the default detail view", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Самый прямой путь по текущему кейсу.",
          fitReason: "Сейчас это главный match по движку.",
          caution: "Нужно добрать документы."
        }
      ],
      disclaimer: "Fallback shortlist."
    });
    apiClientMock.recommendationDetail.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      offerId: "italy_c_tourism",
      generatedAt: "2026-04-19T10:00:05.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      fit: "best_match",
      title: "Шенген C",
      summary: "Подходит лучше других по текущим сигналам.",
      whyThisFits: ["Есть рабочий путь.", "Сроки понятны."],
      watchouts: ["Нужно добрать документы."],
      nextSteps: ["Перейти к документам."],
      trustSignals: ["Уверенность 74%."],
      disclaimer: "Fallback detail."
    });

    renderPanel();

    expect(screen.getByText("AI-разбор рекомендаций")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClientMock.recommendationShortlist).toHaveBeenCalledWith("s1-rf-italy");
    });

    expect((await screen.findAllByText("Шенген C")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Подходит лучше других по текущим сигналам.")).toBeInTheDocument();
    expect(screen.getByText("уже основной вариант")).toBeInTheDocument();
    expect(screen.getByText("Fallback detail.")).toBeInTheDocument();
  });

  it("loads follow-up detail when the user switches shortlist item", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    expect(await screen.findByText("Главный путь.")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);

    await waitFor(() => {
      expect(apiClientMock.recommendationDetail).toHaveBeenCalledWith(
        "s1-rf-italy",
        "italy_d_digital_nomad"
      );
    });

    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить движком" })).toBeInTheDocument();
    expect(screen.getByText("Detail 2.")).toBeInTheDocument();
  });

  it("shows non-primary pre-compare steps from detail payload", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Перейти к документам."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: [
          "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
          "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
          "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
        ],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();

    expect(screen.getByText("Что проверить перед compare")).toBeInTheDocument();
    expect(screen.queryAllByText("Следующие шаги")).toHaveLength(0);
    expect(
      screen.queryAllByText("Заполнить baseline-форму по текущему next action.")
    ).toHaveLength(0);
    expect(
      screen.getByText(
        "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта."
      )
    ).toBeInTheDocument();
  });

  it("runs deterministic compare for an alternative and opens the fork scenario", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });
    apiClientMock.compareScenario.mockResolvedValue({
      rootCaseId: "s1-rf-italy",
      baseline: {
        outcome: {
          verdict: "GO",
          confidence: 0.74,
          primaryPathLabel: "Шенген C"
        }
      },
      candidateCase: {
        id: "s1-rf-italy-fork-1"
      },
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу."
          },
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          }
        },
        delta: {
          confidenceDelta: -0.13
        }
      }
    });

    const { onOpenScenario } = renderPanel({
      preferences: [{ id: "italy_c_tourism", weight: 0.4 }]
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByRole("button", { name: "Проверить движком" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Проверить движком" }));

    await waitFor(() => {
      expect(apiClientMock.compareScenario).toHaveBeenCalledWith("s1-rf-italy", {
        title: "AI-проверка · Digital Nomad",
        signals: [],
        preferences: [
          { id: "italy_c_tourism", weight: 0.4 },
          { id: "italy_d_digital_nomad", weight: 1 }
        ]
      });
    });

    expect(await screen.findByText("Можно ехать → Нужна проверка менеджером")).toBeInTheDocument();
    expect(screen.getByText("Нужна ручная сверка по доходу.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный сценарий" }));
    expect(onOpenScenario).toHaveBeenCalledWith("s1-rf-italy-fork-1");
  });
});

````

### output/m1-input-pack/stage/04_screens/src-screens/result/ResultScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  layoutId: _layoutId,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  layoutId?: string;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  ArrowLeft: iconStub,
  ArrowRight: iconStub,
  MoreHorizontal: iconStub,
  Sparkles: iconStub,
  X: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/instrumentation/events", () => ({
  track: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

vi.mock("./AiRecommendationPanel", () => ({
  AiRecommendationPanel: () => <div data-testid="ai-recommendation-panel">AI panel</div>
}));

vi.mock("./ResultCompareSurface", () => ({
  ResultCompareSurface: () => <div data-testid="compare-surface">Compare surface</div>
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  const activeResult = {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-17T10:00:00.000Z",
    verdict: "GO",
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить к следующему шагу.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-17T10:00:00.000Z"
    },
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    decisionSignals: [],
    ruleResults: [],
    assumptions: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    auditTrail: {
      totalMs: 14.2
    },
    preview: false
  };

  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult,
    activeScenarioLab: {
      version: "scenario-lab.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-17T10:00:00.000Z",
      baseResult: activeResult,
      issues: [],
      scenarios: [
        {
          id: "documents-ready",
          type: "documents",
          title: "Добрать обязательные документы",
          summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
          recommended: true,
          nextAction: {
            type: "upload_missing_docs",
            priority: "blocking",
            label: "Перейти к документам",
            detail: "Закройте недостающий чеклист.",
            targetScreen: "documents",
            triggeredBy: ["documents_ready_count"]
          },
          comparison: {
            verdictBefore: "GO",
            verdictAfter: "GO",
            confidenceBefore: 0.74,
            confidenceAfter: 0.82,
            primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
            primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
            resolvedRisks: [],
            remainingRisks: [],
            documents: {
              readyCountBefore: 5,
              readyCountAfter: 7,
              requiredCount: 7,
              itemsToCollect: []
            },
            whyChanged: ["Чеклист становится полным."]
          },
          plan: {
            headline: "После этого сценария следующий шаг — перейти к документам.",
            firstSteps: ["Подготовить страховку."],
            criticalSteps: ["Не отправлять заявку с неполным пакетом."],
            canWait: [],
            humanReviewRequired: false,
            humanReviewReason: null
          }
        }
      ],
      recommendedScenarioId: "documents-ready",
      noHelpfulScenarios: false,
      humanReviewEscalation: {
        required: false,
        title: "Ручная проверка не нужна",
        detail: "По текущему кейсу есть автоматический сценарий.",
        triggeredBy: []
      }
    },
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
    scenarioLabStatus: "ready",
    scenarioLabError: null,
    status: "ready",
    errorMessage: null,
    ...overrides
  } as any;
}

function renderScreen(screenNode: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{screenNode}</MemoryRouter>);
}

describe("ResultScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the vertical default case when the active case belongs to another product", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("ignores a foreign case query param on product-specific routes", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        scenarios: [
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
        ],
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />, [
      "/insurance-adult?case=s1-rf-italy"
    ]);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("renders manual review state without a fake confirmed path", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          primaryPath: null,
          nextAction: {
            type: "send_for_review",
            priority: "human_review",
            label: "Передать менеджеру",
            detail: "Автомат не может честно подтвердить маршрут.",
            targetScreen: "human-review",
            triggeredBy: ["human_review_trigger"]
          }
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getByText("Нужна ручная проверка")).toBeInTheDocument();
    expect(screen.getAllByText("Передать менеджеру").length).toBeGreaterThan(0);
    expect(screen.getByText("Нужен оператор")).toBeInTheDocument();
    expect(screen.queryByText("Маршрут подтверждён")).not.toBeInTheDocument();
  });

  it("opens the basis sheet from the utility action", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Основание" }));

    await waitFor(() => {
      expect(screen.getByText("Основание решения")).toBeInTheDocument();
      expect(screen.getByText("Маршрут подтверждён по текущим сигналам.")).toBeInTheDocument();
    });
  });

  it("opens compare and AI sheets from secondary actions", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Сравнить" }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-surface")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /AI: сначала/i }));
    fireEvent.click(screen.getByRole("button", { name: "Полный разбор" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-recommendation-panel")).toBeInTheDocument();
    });
  });
});

````

### output/m1-input-pack/stage/04_screens/src-screens/screenRouting.test.tsx

````
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

````

### scripts/automations/check-source-freshness.test.ts

````
import { describe, expect, it } from "vitest";
import { buildSourceFreshnessReport, renderMarkdownReport, type Source } from "./check-source-freshness";

const now = new Date("2026-04-24T12:00:00.000Z");

const freshOfficial: Source = {
  id: "src_official_fresh",
  label: "Official fresh source",
  url: "https://example.com/official",
  tier: "official",
  lastCheckedAt: "2026-04-23T12:00:00.000Z",
  volatilityScore: 0.1
};

function buildReport(overrides: {
  sources: Source[];
  records?: Array<{ sourceId?: string; sources?: Array<{ id: string }> }>;
}) {
  return buildSourceFreshnessReport({
    now,
    sources: overrides.sources,
    waiverState: { waivers: [] },
    datasets: [
      {
        path: "data/db/visa_rules.json",
        records: overrides.records ?? [{ sourceId: "src_official_fresh" }]
      }
    ]
  });
}

describe("buildSourceFreshnessReport", () => {
  it("turns referenced official/operator stale failures into product-impact next tasks", () => {
    const staleOperator: Source = {
      id: "src_operator_stale",
      label: "Operator stale source",
      url: "https://example.com/operator",
      tier: "operator",
      lastCheckedAt: "2026-04-10T12:00:00.000Z",
      volatilityScore: 0.4
    };

    const report = buildReport({
      sources: [freshOfficial, staleOperator],
      records: [{ sourceId: "src_operator_stale" }]
    });

    expect(report.status).toBe("blocked");
    expect(report.failures).toContain("src_operator_stale stale 14d > 5d (operator)");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        sourceId: "src_operator_stale",
        kind: "stale_referenced",
        severity: "blocker",
        productImpact: expect.stringContaining("can make user-facing guidance stale")
      })
    );
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-refresh-src_operator_stale",
        title: "Refresh stale operator source: Operator stale source",
        sourceId: "src_operator_stale",
        productArea: "truth_trust",
        evidence: ["data/db/sources.json", "data/db/visa_rules.json"],
        blockedByManualReview: true,
        actionNeeded: expect.stringContaining("Manually re-check Operator stale source"),
        acceptanceCriteria: expect.arrayContaining([
          expect.stringContaining("Manual review boundary is explicit")
        ]),
        codexBrief: expect.stringContaining("Truth freshness task"),
        notionSync: expect.objectContaining({
          surface: "Automation Inbox",
          syncKey: "automation:ah-truth-freshness-watch:truth-refresh-src_operator_stale",
          status: "Ready",
          severity: "blocker"
        }),
        verification: ["npm run automations:check:truth"]
      })
    );
  });

  it("keeps waived referenced freshness drift actionable without failing the gate", () => {
    const waivedOfficial: Source = {
      id: "src_official_waived",
      label: "Official waived source",
      url: "https://example.com/waived",
      tier: "official",
      lastCheckedAt: "2026-04-10T12:00:00.000Z",
      volatilityScore: 0.2
    };

    const report = buildSourceFreshnessReport({
      now,
      sources: [waivedOfficial],
      waiverState: {
        waivers: [
          {
            appliesTo: "src_official_waived",
            affectedChecks: ["freshness:ah-truth-freshness-watch"],
            affectedAutomationIds: ["ah-truth-freshness-watch"],
            reason: "Temporary source outage.",
            expiresAt: "2026-04-25T12:00:00.000Z"
          }
        ]
      },
      datasets: [{ path: "data/db/visa_rules.json", records: [{ sourceId: "src_official_waived" }] }]
    });

    expect(report.status).toBe("pass");
    expect(report.failures).toEqual([]);
    expect(report.warnings).toContain("src_official_waived stale 14d > 7d (official)");
    expect(report.warnings).toContain("src_official_waived freshness waiver active");
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-refresh-src_official_waived",
        severity: "warning",
        productReason: expect.stringContaining("time-boxed waiver"),
        blockedByManualReview: true,
        notionSync: expect.objectContaining({
          confidence: "medium"
        })
      })
    );
  });

  it("creates a repair task for missing source references", () => {
    const report = buildReport({
      sources: [freshOfficial],
      records: [{ sourceId: "src_missing_source" }]
    });

    expect(report.status).toBe("blocked");
    expect(report.failures).toContain("missing source reference: src_missing_source");
    expect(report.nextTasks).toContainEqual(
      expect.objectContaining({
        id: "truth-fix-missing-source-src_missing_source",
        title: "Fix missing source mapping: src_missing_source",
        evidence: ["data/db/sources.json", "data/db/visa_rules.json"],
        productReason: expect.stringContaining("cannot show reliable evidence"),
        blockedByManualReview: false,
        notionSync: expect.objectContaining({
          confidence: "high"
        })
      })
    );
  });

  it("renders deterministic report frontmatter for gate freshness projection", () => {
    const report = buildReport({ sources: [freshOfficial] });

    expect(renderMarkdownReport(report)).toMatch(
      /^---\nlastVerifiedAt: 2026-04-24T12:00:00\.000Z\n---\n\n# Truth \+ Freshness Watch/
    );
  });
});

````

### scripts/autonomous/runtime.test.ts

````
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAutonomousBranchName,
  prepareExecutionPacket,
  runAutonomousCycle,
  selectNextTask
} from "./runtime";

let tempDir = "";

async function writeRepoFile(relativePath: string, content: string) {
  const targetPath = path.join(tempDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

async function writeScoringModel(
  overrides: Record<string, unknown> = {}
) {
  await writeRepoFile(
    ".autonomous/scoring-model.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        impactWeights: {
          trust: 0.26,
          conversion: 0.2,
          polish: 0.18,
          engineeringHealth: 0.22,
          strategicFit: 0.14
        },
        costWeights: {
          risk: 0.18,
          effort: 0.12
        },
        tieBreakers: [
          { field: "balancedScore", direction: "desc" },
          { field: "impact", direction: "desc" },
          { field: "cost", direction: "asc" },
          { field: "scores.strategicFit", direction: "desc" },
          { field: "scores.engineeringHealth", direction: "desc" },
          { field: "id", direction: "asc" }
        ],
        ...overrides
      },
      null,
      2
    )
  );
}

async function writeTaskStatus(
  tasks: Array<Record<string, unknown>> = []
) {
  await writeRepoFile(
    ".autonomous/task-status.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        tasks
      },
      null,
      2
    )
  );
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "autonomous-runtime-"));
  await writeScoringModel();
  await writeTaskStatus();
});

afterEach(async () => {
  if (tempDir) {
    const { rm } = await import("node:fs/promises");
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("autonomous runtime", () => {
  it("excludes completed candidates from selection while keeping them auditable", async () => {
    await writeTaskStatus([
      {
        id: "completed-top-task",
        status: "completed",
        updatedAt: "2026-04-24T10:43:20.000Z",
        evidence: ["https://github.com/Toni-Saint-V/active-holidays-foundation/pull/7"],
        note: "Merged through PR #7"
      }
    ]);
    await writeRepoFile("evidence/task.md", "# task");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "completed-top-task",
              title: "Completed top task",
              productReason: "Already shipped",
              evidence: ["evidence/task.md"],
              category: "engineering_health",
              scores: {
                trust: 10,
                conversion: 10,
                polish: 10,
                engineeringHealth: 10,
                strategicFit: 10,
                risk: 0,
                effort: 0
              },
              requiresApproval: []
            },
            {
              id: "ready-next-task",
              title: "Ready next task",
              productReason: "Should be selected",
              evidence: ["evidence/task.md"],
              category: "trust",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 8,
                strategicFit: 8,
                risk: 2,
                effort: 3
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const result = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "executor",
      gitStatus: [],
      trackedGitStatus: []
    });
    const completed = result.blockedCandidates.find(
      (candidate) => candidate.id === "completed-top-task"
    );

    expect(result.selected?.id).toBe("ready-next-task");
    expect(completed?.taskStatus).toBe("completed");
    expect(completed?.blockedLifecycleStatus).toBe("completed");
  });

  it("fails fast when task status references an unknown candidate", async () => {
    await writeTaskStatus([
      {
        id: "missing-candidate",
        status: "completed",
        updatedAt: "2026-04-24T10:43:20.000Z",
        evidence: ["https://github.com/Toni-Saint-V/active-holidays-foundation/pull/7"],
        note: "Should not silently drift"
      }
    ]);
    await writeRepoFile("evidence/task.md", "# task");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "known-candidate",
              title: "Known candidate",
              productReason: "Valid task",
              evidence: ["evidence/task.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 8,
                strategicFit: 8,
                risk: 2,
                effort: 3
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    expect(() =>
      selectNextTask({
        currentRepoRoot: tempDir,
        mode: "executor",
        gitStatus: [],
        trackedGitStatus: []
      })
    ).toThrow(/unknown candidate/i);
  });

  it("uses repo-owned scoring weights instead of hardcoded constants", async () => {
    await writeScoringModel({
      impactWeights: {
        trust: 0,
        conversion: 1,
        polish: 0,
        engineeringHealth: 0,
        strategicFit: 0
      },
      costWeights: {
        risk: 0,
        effort: 0
      }
    });
    await writeRepoFile("evidence/task.md", "# task");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "trust-heavy",
              title: "Trust heavy",
              productReason: "Would win with old hardcoded trust weight",
              evidence: ["evidence/task.md"],
              category: "trust",
              scores: {
                trust: 10,
                conversion: 0,
                polish: 0,
                engineeringHealth: 0,
                strategicFit: 0,
                risk: 0,
                effort: 0
              },
              requiresApproval: []
            },
            {
              id: "conversion-heavy",
              title: "Conversion heavy",
              productReason: "Should win with JSON conversion weight",
              evidence: ["evidence/task.md"],
              category: "conversion",
              scores: {
                trust: 0,
                conversion: 9,
                polish: 0,
                engineeringHealth: 0,
                strategicFit: 0,
                risk: 0,
                effort: 0
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const result = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "executor",
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(result.selected?.id).toBe("conversion-heavy");
  });

  it("sorts equal balanced scores with explicit deterministic tie-breakers", async () => {
    await writeScoringModel({
      impactWeights: {
        trust: 1,
        conversion: 0,
        polish: 0,
        engineeringHealth: 0,
        strategicFit: 0
      },
      costWeights: {
        risk: 1,
        effort: 0
      }
    });
    await writeRepoFile("evidence/task.md", "# task");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "efficient-first-in-file",
              title: "Efficient first in file",
              productReason: "Same balanced score but lower impact",
              evidence: ["evidence/task.md"],
              category: "engineering_health",
              scores: {
                trust: 5,
                conversion: 0,
                polish: 0,
                engineeringHealth: 5,
                strategicFit: 5,
                risk: 0,
                effort: 0
              },
              requiresApproval: []
            },
            {
              id: "higher-impact-second-in-file",
              title: "Higher impact second in file",
              productReason: "Same balanced score but higher impact",
              evidence: ["evidence/task.md"],
              category: "trust",
              scores: {
                trust: 8,
                conversion: 0,
                polish: 0,
                engineeringHealth: 5,
                strategicFit: 5,
                risk: 3,
                effort: 0
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const result = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "executor",
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(result.selected?.id).toBe("higher-impact-second-in-file");
    expect(result.topCandidates.map((candidate) => candidate.id)).toEqual([
      "higher-impact-second-in-file",
      "efficient-first-in-file"
    ]);
  });

  it("fails fast when the scoring model is malformed", async () => {
    await writeScoringModel({
      impactWeights: {
        trust: 1,
        conversion: 1,
        polish: 1,
        strategicFit: 1
      }
    });
    await writeRepoFile("evidence/task.md", "# task");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "safe-task",
              title: "Safe task",
              productReason: "No gates",
              evidence: ["evidence/task.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    expect(() =>
      selectNextTask({
        currentRepoRoot: tempDir,
        mode: "executor",
        gitStatus: [],
        trackedGitStatus: []
      })
    ).toThrow(/scoring model/i);
  });

  it("includes a compact scoring model summary in next task output", async () => {
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const result = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "executor",
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(result.scoringModel).toEqual({
      schemaVersion: 1,
      tieBreakers: [
        "balancedScore:desc",
        "impact:desc",
        "cost:asc",
        "scores.strategicFit:desc",
        "scores.engineeringHealth:desc",
        "id:asc"
      ]
    });
    expect(result.eligibleCandidates.map((candidate) => candidate.id)).toEqual(["backend-hardening"]);
  });

  it("blocks ui approval candidates in executor mode but not in planning mode", async () => {
    await writeRepoFile("evidence/ui.md", "# ui");
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "ui-polish",
              title: "UI polish",
              productReason: "Needs PNG approval",
              evidence: ["evidence/ui.md"],
              category: "polish",
              scores: {
                trust: 8,
                conversion: 8,
                polish: 10,
                engineeringHealth: 5,
                strategicFit: 8,
                risk: 3,
                effort: 3
              },
              requiresApproval: ["ui_design_approval"]
            },
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const planning = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "planning",
      gitStatus: [],
      trackedGitStatus: []
    });
    const executor = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "executor",
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(planning.selected?.id).toBe("ui-polish");
    expect(executor.selected?.id).toBe("backend-hardening");
    expect(executor.blockedCandidates.some((candidate) => candidate.id === "ui-polish")).toBe(true);
  });

  it("fails closed when tracked state is dirty or write mode starts outside main", async () => {
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const packet = prepareExecutionPacket({
      currentRepoRoot: tempDir,
      write: true,
      currentBranch: "feature/test",
      gitStatus: ["?? scratch.txt"],
      trackedGitStatus: ["M package.json"]
    });

    expect(packet.blocked).toBe(true);
    expect(packet.blockedReasons).toEqual(
      expect.arrayContaining([
        "Tracked working tree не чистый; local executor fail-closed.",
        "Local executor может стартовать только из `main`, сейчас `feature/test`."
      ])
    );
  });

  it("blocks unknown approval gates instead of treating them as safe", async () => {
    await writeRepoFile("evidence/task.md", "# task");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "unknown-gate-task",
              title: "Unknown gate task",
              productReason: "Should be blocked",
              evidence: ["evidence/task.md"],
              category: "trust",
              scores: {
                trust: 10,
                conversion: 5,
                polish: 5,
                engineeringHealth: 8,
                strategicFit: 9,
                risk: 2,
                effort: 2
              },
              requiresApproval: ["live_notion_writebak"]
            },
            {
              id: "safe-task",
              title: "Safe task",
              productReason: "No gates",
              evidence: ["evidence/task.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const executor = selectNextTask({
      currentRepoRoot: tempDir,
      mode: "executor",
      gitStatus: [],
      trackedGitStatus: []
    });
    const blocked = executor.blockedCandidates.find((candidate) => candidate.id === "unknown-gate-task");

    expect(executor.selected?.id).toBe("safe-task");
    expect(blocked?.unknownApprovalGates).toEqual(["live_notion_writebak"]);
    expect(blocked?.blockedGates).toEqual(["live_notion_writebak"]);
  });

  it("reports untracked working-tree entries without blocking write mode", async () => {
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const packet = prepareExecutionPacket({
      currentRepoRoot: tempDir,
      write: true,
      currentBranch: "main",
      gitStatus: ["?? src/new-test.ts"],
      trackedGitStatus: []
    });

    expect(packet.blocked).toBe(false);
    expect(packet.blockedReasons).not.toContain("Tracked working tree не чистый; local executor fail-closed.");
    expect(packet.gitStatus).toContain("?? src/new-test.ts");
  });

  it("blocks untracked entries that collide with selected task evidence", async () => {
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const packet = prepareExecutionPacket({
      currentRepoRoot: tempDir,
      write: true,
      currentBranch: "main",
      gitStatus: ["?? evidence/backend.md"],
      trackedGitStatus: []
    });

    expect(packet.blocked).toBe(true);
    expect(packet.blockedReasons).toContain(
      "Untracked files collide with selected task scope: evidence/backend.md."
    );
  });

  it("blocks untracked directories that contain selected task evidence", async () => {
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const packet = prepareExecutionPacket({
      currentRepoRoot: tempDir,
      write: true,
      currentBranch: "main",
      gitStatus: ["?? evidence/"],
      trackedGitStatus: []
    });

    expect(packet.blocked).toBe(true);
    expect(packet.blockedReasons).toContain("Untracked files collide with selected task scope: evidence.");
  });

  it("writes a complete dry-run cycle artifact set without external writes", async () => {
    await writeRepoFile("evidence/backend.md", "# backend");
    await writeRepoFile(
      ".autonomous/task-candidates.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          candidates: [
            {
              id: "backend-hardening",
              title: "Backend hardening",
              productReason: "Safe backend task",
              evidence: ["evidence/backend.md"],
              category: "engineering_health",
              scores: {
                trust: 7,
                conversion: 5,
                polish: 4,
                engineeringHealth: 9,
                strategicFit: 8,
                risk: 2,
                effort: 2
              },
              requiresApproval: []
            }
          ]
        },
        null,
        2
      )
    );

    const result = runAutonomousCycle({
      currentRepoRoot: tempDir,
      verify: false,
      currentBranch: "main",
      gitStatus: [],
      trackedGitStatus: []
    });
    const cycleJson = await readFile(path.join(tempDir, "reports/autonomous/cycle-latest.json"), "utf8");
    const cycleReport = await readFile(path.join(tempDir, "reports/autonomous/cycle-report-latest.md"), "utf8");
    const nextTaskJson = await readFile(
      path.join(tempDir, "reports/autonomous/next-best-task-latest.json"),
      "utf8"
    );

    expect(result.selectedTaskId).toBe("backend-hardening");
    expect(result.blocked).toBe(false);
    expect(result.executionPacket.externalWriteState.writePerformed).toBe(false);
    expect(JSON.parse(cycleJson).selectedTaskId).toBe("backend-hardening");
    expect(JSON.parse(nextTaskJson).eligibleCandidates).toHaveLength(1);
    expect(cycleReport).toContain("Autonomous Cycle Report");
  });

  it("builds a stable codex branch name", () => {
    expect(buildAutonomousBranchName("Conversion CTA instrumentation!")).toBe(
      "codex/autonomous-conversion-cta-instrumentation"
    );
  });
});

````

### scripts/verifyEngineDrift.test.ts

````
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyEngineDrift } from "./verify-engine-drift";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "verify-engine-"));
});

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("verifyEngineDrift", () => {
  it("returns ok=true on freshly generated baselines", async () => {
    const generated = await verifyEngineDrift({
      update: true,
      baselineDir: tempDir
    });
    expect(generated.ok).toBe(true);

    const verified = await verifyEngineDrift({ baselineDir: tempDir });
    expect(verified.ok).toBe(true);
    expect(verified.drifted).toEqual([]);
    expect(verified.missingBaselines).toEqual([]);
    expect(verified.checked).toBeGreaterThan(0);

    const files = await readdir(tempDir);
    expect(files.length).toBe(verified.checked);
  });

  it("reports missing baselines when the directory is empty", async () => {
    const report = await verifyEngineDrift({ baselineDir: tempDir });
    expect(report.ok).toBe(false);
    expect(report.missingBaselines.length).toBeGreaterThan(0);
  });

  it("detects drift when a baseline is tampered with", async () => {
    const initial = await verifyEngineDrift({
      update: true,
      baselineDir: tempDir
    });
    expect(initial.ok).toBe(true);

    const files = await readdir(tempDir);
    const target = files[0];
    if (!target) throw new Error("expected at least one baseline");
    const targetPath = path.join(tempDir, target);
    const raw = JSON.parse(await readFile(targetPath, "utf8"));
    raw.resultFingerprint = "0".repeat(64);
    await writeFile(targetPath, JSON.stringify(raw, null, 2), "utf8");

    const report = await verifyEngineDrift({ baselineDir: tempDir });
    expect(report.ok).toBe(false);
    expect(report.drifted.length).toBe(1);
    expect(
      report.messages.some((message) => message.includes("resultFingerprint"))
    ).toBe(true);
  });
});

````

### server/lib/caseStore.humanReview.test.ts

````
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

````

### server/lib/caseStore.ledger.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  Case,
  DecisionLedgerEntry,
  DecisionRecord
} from "@shared/contracts";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { CaseStore } from "./caseStore";
import { loadCatalogs, type Catalogs } from "./catalogs";

const NOW = new Date("2026-04-17T09:00:00.000Z");

function toOrchestrator(catalogs: Catalogs): OrchestratorCatalogs {
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
}

function findCase(catalogs: Catalogs, id: string): Case {
  const entry = catalogs.cases.find((item) => item.id === id);
  if (!entry) throw new Error(`Missing seed case ${id}`);
  return entry;
}

describe("CaseStore ledger", () => {
  it("deduplicates identical recomputes under the same engine revision", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const orchestrator = toOrchestrator(catalogs);
    const caseData = findCase(catalogs, "s1-rf-italy");
    const result = runDecision({ case: caseData, catalogs: orchestrator });

    const first = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "first",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });
    const second = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "second",
      kind: "override",
      changedSignalIds: ["citizenship"],
      now: new Date("2026-04-17T10:00:00.000Z")
    });

    expect(first.decisionId).toBe(second.decisionId);
    expect(store.recordsFor(caseData.id)).toHaveLength(1);
    expect(store.latestRecordFor(caseData.id)?.decisionId).toBe(first.decisionId);
  });

  it("creates a new record when the case input changes", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const orchestrator = toOrchestrator(catalogs);
    const base = findCase(catalogs, "s1-rf-italy");
    const resultA = runDecision({ case: base, catalogs: orchestrator });

    const a = store.snapshotDecisionRecord({
      case: base,
      catalogs: orchestrator,
      result: resultA,
      summary: "initial",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });

    const mutated: Case = {
      ...base,
      signals: base.signals.map((signal) =>
        signal.id === "timeline_weeks"
          ? { ...signal, value: 2 }
          : signal
      )
    };
    const resultB = runDecision({ case: mutated, catalogs: orchestrator });
    const b = store.snapshotDecisionRecord({
      case: mutated,
      catalogs: orchestrator,
      result: resultB,
      summary: "after signal patch",
      kind: "recompute",
      changedSignalIds: ["timeline_weeks"],
      now: new Date("2026-04-17T11:00:00.000Z")
    });

    expect(a.decisionId).not.toBe(b.decisionId);
    expect(store.recordsFor(base.id).map((r) => r.decisionId)).toEqual([
      b.decisionId,
      a.decisionId
    ]);
    expect(store.latestRecordFor(base.id)?.decisionId).toBe(b.decisionId);
  });

  it("migrates legacy seed rows to DecisionRecords with engineVersion=legacy", async () => {
    const catalogs = await loadCatalogs();
    const legacy: DecisionLedgerEntry = {
      id: "log_legacy_1",
      caseId: "s1-rf-italy",
      verdict: "GO",
      confidence: 0.55,
      summary: "legacy row",
      kind: "recompute",
      changedSignalIds: [],
      recordedAt: "2026-04-01T10:00:00.000Z"
    };
    const store = new CaseStore({ ...catalogs, decisionsLog: [legacy] });

    const record = store.getRecord("log_legacy_1");
    expect(record).not.toBeNull();
    expect(record?.engineVersion).toBe("legacy");
    expect(record?.replayableSnapshot).toBeNull();
    expect(record?.result).toBeNull();
    expect(record?.inputFingerprint.startsWith("legacy:")).toBe(true);

    const summary = store.allDecisions().find((entry) => entry.id === "log_legacy_1");
    expect(summary).toBeDefined();
    expect(summary?.summary).toBe("legacy row");
  });

  it("accepts preloaded full DecisionRecords without migration", async () => {
    const catalogs = await loadCatalogs();
    const record: DecisionRecord = {
      decisionId: "dec_s1-rf-italy_7",
      caseId: "s1-rf-italy",
      engineVersion: "rdc.v1",
      engineRevision: "2026.04.18",
      computedAt: "2026-04-17T09:00:00.000Z",
      recordedAt: "2026-04-17T09:00:00.000Z",
      inputFingerprint: "a".repeat(64),
      catalogFingerprint: "b".repeat(64),
      resultFingerprint: "c".repeat(64),
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict: "GO",
      confidence: 0.66,
      summary: "preloaded full record",
      kind: "recompute",
      changedSignalIds: [],
      changedPreferenceIds: []
    };
    const store = new CaseStore({ ...catalogs, decisionsLog: [record] });

    expect(store.getRecord(record.decisionId)).toEqual(record);
  });

  it("exposes getRecord, latestRecordFor, and allRecords after recompute", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const orchestrator = toOrchestrator(catalogs);
    const caseData = findCase(catalogs, "s1-rf-italy");
    const result = runDecision({ case: caseData, catalogs: orchestrator });

    const record = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "recompute",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });

    expect(store.getRecord(record.decisionId)?.decisionId).toBe(record.decisionId);
    expect(store.latestRecordFor(caseData.id)?.decisionId).toBe(record.decisionId);
    expect(store.allRecords().some((item) => item.decisionId === record.decisionId)).toBe(true);
  });

  it("insertRecordForTest lets tests simulate stale records", async () => {
    const catalogs = await loadCatalogs();
    const store = new CaseStore({ ...catalogs, decisionsLog: [] });
    const synthetic: DecisionRecord = {
      decisionId: "dec_synthetic_1",
      caseId: "s1-rf-italy",
      engineVersion: "rdc.v1",
      engineRevision: "2099.99.99",
      computedAt: "2026-04-17T09:00:00.000Z",
      recordedAt: "2026-04-17T09:00:00.000Z",
      inputFingerprint: "a".repeat(64),
      catalogFingerprint: "b".repeat(64),
      resultFingerprint: "c".repeat(64),
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict: "GO",
      confidence: 0.5,
      summary: "synthetic",
      kind: "recompute",
      changedSignalIds: [],
      changedPreferenceIds: []
    };
    store.insertRecordForTest(synthetic);
    expect(store.getRecord("dec_synthetic_1")).not.toBeNull();
    expect(store.latestRecordFor("s1-rf-italy")?.decisionId).toBe("dec_synthetic_1");
  });

  it("advances the generated record counter past preloaded decision ids", async () => {
    const catalogs = await loadCatalogs();
    const orchestrator = toOrchestrator(catalogs);
    const caseData = findCase(catalogs, "s1-rf-italy");
    const result = runDecision({ case: caseData, catalogs: orchestrator });
    const preloaded: DecisionRecord = {
      decisionId: "dec_s1-rf-italy_7",
      caseId: caseData.id,
      engineVersion: "rdc.v1",
      engineRevision: "2026.04.18",
      computedAt: "2026-04-17T08:00:00.000Z",
      recordedAt: "2026-04-17T08:00:00.000Z",
      inputFingerprint: "d".repeat(64),
      catalogFingerprint: "e".repeat(64),
      resultFingerprint: "f".repeat(64),
      replayableSnapshot: null,
      result: null,
      auditTrail: null,
      verdict: "GO",
      confidence: 0.7,
      summary: "preloaded",
      kind: "recompute",
      changedSignalIds: [],
      changedPreferenceIds: []
    };
    const store = new CaseStore({ ...catalogs, decisionsLog: [preloaded] });

    const next = store.snapshotDecisionRecord({
      case: caseData,
      catalogs: orchestrator,
      result,
      summary: "after preload",
      kind: "recompute",
      changedSignalIds: [],
      now: NOW
    });

    expect(next.decisionId).toBe("dec_s1-rf-italy_8");
    expect(store.getRecord("dec_s1-rf-italy_7")?.summary).toBe("preloaded");
  });
});

````

### server/lib/caseStore.test.ts

````
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

````

### server/lib/decisionScenarioLab.test.ts

````
import { describe, expect, it } from "vitest";
import { loadCatalogs } from "./catalogs";
import { buildDecisionScenarioLab } from "./decisionScenarioLab";
import { runDecision } from "@shared/domain/engine";

describe("buildDecisionScenarioLab", () => {
  it("builds concrete improvement scenarios for a recoverable case", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s1-rf-italy");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(lab.noHelpfulScenarios).toBe(false);
    expect(lab.issues.length).toBeGreaterThan(0);
    expect(lab.scenarios.length).toBeGreaterThan(0);
    expect(lab.scenarios.some((scenario) => scenario.id === "documents-ready")).toBe(true);
    expect(lab.scenarios[0]?.comparison.whyChanged.length).toBeGreaterThan(0);
  });

  it("falls back to honest human review when automatic scenarios do not help", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s3-us-spb-business");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(lab.noHelpfulScenarios).toBe(true);
    expect(lab.recommendedScenarioId).toBe("human-review");
    expect(lab.scenarios).toHaveLength(1);
    expect(lab.scenarios[0]?.type).toBe("human_review");
    expect(lab.scenarios[0]?.comparison.verdictAfter).toBe("HUMAN_REVIEW");
    expect(lab.scenarios[0]?.nextAction.type).toBe("send_for_review");
    expect(lab.scenarios[0]?.nextAction.targetScreen).toBe("human-review");
    expect(lab.humanReviewEscalation.required).toBe(true);
  });

  it("does not treat a bare path relabel as an improvement scenario", async () => {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const result = runDecision({ case: caseData, catalogs });
    const lab = buildDecisionScenarioLab(caseData, catalogs, result);

    expect(lab.scenarios.some((scenario) => scenario.type === "path_switch")).toBe(false);
  });
});

````

### server/lib/recommendations.test.ts

````
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runDecision, type OrchestratorCatalogs } from "@shared/domain/engine";
import { loadCatalogs } from "./catalogs";
import {
  buildRecommendationDetail,
  buildRecommendationShortlist,
  resetRecommendationClientForTests
} from "./recommendations";

const { createResponseMock } = vi.hoisted(() => ({
  createResponseMock: vi.fn()
}));

vi.mock("openai", () => {
  class OpenAIMock {
    readonly responses = {
      create: createResponseMock
    };
  }

  return { default: OpenAIMock };
});

const previousApiKey = process.env.OPENAI_API_KEY;

describe("recommendation boundary ownership", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    createResponseMock.mockReset();
    resetRecommendationClientForTests();
  });

  afterAll(() => {
    if (previousApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }
    process.env.OPENAI_API_KEY = previousApiKey;
    resetRecommendationClientForTests();
  });

  async function loadFixture() {
    const catalogs = await loadCatalogs();
    const caseData = catalogs.cases.find((entry) => entry.id === "s5-rf-italy-insurance");
    if (!caseData) {
      throw new Error("Fixture case s5-rf-italy-insurance not found.");
    }
    const engineCatalogs: OrchestratorCatalogs = {
      paths: catalogs.paths,
      visaRules: catalogs.visaRules,
      restrictions: catalogs.restrictions,
      sources: catalogs.sources,
      residencyPrograms: catalogs.residencyPrograms,
      insuranceProducts: catalogs.insuranceProducts
    };
    const result = runDecision({ case: caseData, catalogs: engineCatalogs });
    if (!result.primaryPath) {
      throw new Error("Fixture result does not contain a primary path.");
    }
    const primaryOfferId = result.primaryPath.id;
    const alternativeOfferId = result.alternativePaths.find(
      (offer) => offer && offer.id !== primaryOfferId
    )?.id;
    if (!alternativeOfferId) {
      throw new Error("Fixture result does not contain an alternative path.");
    }
    return { caseData, result, primaryOfferId, alternativeOfferId };
  }

  it("keeps primary deterministic recommendation even when model selects a non-primary offer", async () => {
    const { caseData, result, primaryOfferId, alternativeOfferId } = await loadFixture();

    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        recommendedOfferId: alternativeOfferId,
        items: [
          {
            offerId: alternativeOfferId,
            title: "Модель пытается продвинуть альтернативу",
            summary: "Искусственно ставим альтернативу первой.",
            fitReason: "Модель считает этот вариант лучшим.",
            caution: "Проверьте детали."
          },
          {
            offerId: primaryOfferId,
            title: "Основной путь",
            summary: "Вторым в ответе модели.",
            fitReason: "Модель занижает приоритет.",
            caution: "Нет."
          }
        ]
      })
    });

    const shortlist = await buildRecommendationShortlist(caseData, result);
    expect(shortlist).not.toBeNull();
    if (!shortlist) return;

    expect(shortlist.source).toBe("openai");
    expect(shortlist.recommendedOfferId).toBe(primaryOfferId);
    expect(shortlist.items[0]).toMatchObject({
      offerId: primaryOfferId,
      rank: 1,
      fit: "best_match"
    });

    const alternative = shortlist.items.find((item) => item.offerId === alternativeOfferId);
    expect(alternative).toBeTruthy();
    expect(alternative?.rank).toBeGreaterThan(1);
    expect(alternative?.fit).not.toBe("best_match");
  });

  it("keeps non-primary detail steps deterministic even if model returns baseline-like actions", async () => {
    const { caseData, result, alternativeOfferId } = await loadFixture();
    createResponseMock.mockResolvedValue({
      output: [],
      output_text: JSON.stringify({
        title: "Детальный разбор альтернативы",
        summary: "Текст от модели.",
        whyThisFits: ["Есть альтернативный путь."],
        watchouts: ["Нужна проверка условий."],
        nextSteps: [result.nextAction.label, result.nextAction.detail],
        trustSignals: ["Сигнал доверия от модели."]
      })
    });

    const detail = await buildRecommendationDetail(caseData, result, alternativeOfferId);

    expect(detail.source).toBe("openai");
    expect(detail.fit).not.toBe("best_match");
    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
    expect(detail.nextSteps[0]).toContain("Проверить движком");
  });
});

````

### server/routes/decisions.integration.test.ts

````
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import { createApp } from "../index";
import { getCatalogsOrThrow } from "../lib/catalogs";
import { getCaseStore } from "../lib/caseStore";
import type { DecisionRecord } from "@shared/contracts";

let app: Express;

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = [];
  remoteAddress = "127.0.0.1";

  _read(): void {}

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setTimeout(): this {
    return this;
  }

  setNoDelay(): this {
    return this;
  }

  setKeepAlive(): this {
    return this;
  }

  connect(): this {
    return this;
  }

  resetAndDestroy(): void {
    this.destroy();
  }

  address() {
    return { address: "127.0.0.1", family: "IPv4", port: 0 };
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }

  destroySoon(): void {
    this.destroy();
  }
}

beforeAll(async () => {
  app = await createApp();
});

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown
) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as never);
  req.method = method;
  req.url = path;
  req.headers = payload
    ? {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload))
      }
    : {};
  if (payload) {
    req.push(payload);
  }
  req.push(null);

  const res = new ServerResponse(req);
  res.assignSocket(socket as never);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    res.on("finish", resolveOnce);
    res.on("close", () => {
      if (res.writableEnded) {
        resolveOnce();
      }
    });
    res.on("error", reject);
    app(req as never, res as never, (error?: unknown) => {
      if (error instanceof Error) {
        rejectOnce(error);
        return;
      }
      if (res.writableEnded) {
        resolveOnce();
      }
    });
  });

  const raw = Buffer.concat(socket.chunks).toString("utf8");
  const bodyText = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");
  const json = bodyText.length > 0 ? JSON.parse(bodyText) : null;
  return { status: res.statusCode, json } as const;
}

async function postJson(path: string, body?: unknown) {
  return requestJson("POST", path, body);
}

async function getJson(path: string) {
  return requestJson("GET", path);
}

describe("decision integrity HTTP surface", () => {
  it("POST /api/cases/:id/recompute returns a decisionRecordId and makes it fetchable", async () => {
    const recompute = await postJson("/api/cases/s1-rf-italy/recompute");
    expect(recompute.status).toBe(200);
    const recordId = recompute.json.decisionRecordId as string;
    expect(typeof recordId).toBe("string");
    expect(recordId).toMatch(/^dec_s1-rf-italy_\d+$/);

    const fetched = await getJson(`/api/decisions/${recordId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.json.record.decisionId).toBe(recordId);
    expect(fetched.json.record.replayableSnapshot).toBeTruthy();
    expect(fetched.json.record.result).toBeTruthy();
  });

  it("POST /api/decisions/:id/replay returns diff:null on a fresh record", async () => {
    const recompute = await postJson("/api/cases/s2-tr-spb/recompute");
    const recordId = recompute.json.decisionRecordId as string;

    const replay = await postJson(`/api/decisions/${recordId}/replay`);
    expect(replay.status).toBe(200);
    expect(replay.json.drifted).toBe(false);
    expect(replay.json.diff).toBeNull();
    expect(replay.json.replay.resultFingerprint).toBe(replay.json.original.resultFingerprint);
  });

  it("GET /api/cases/:id/drift returns drifted:false right after recompute", async () => {
    await postJson("/api/cases/s4-rf-residency-dnv/recompute");
    const drift = await getJson("/api/cases/s4-rf-residency-dnv/drift");
    expect(drift.status).toBe(200);
    expect(drift.json.drifted).toBe(false);
    expect(drift.json.diff).toBeNull();
    expect(drift.json.latestResultFingerprint).toBe(drift.json.replayResultFingerprint);
  });

  it("GET /api/cases/:id/drift surfaces a structured diff when the stored record is stale", async () => {
    const recompute = await postJson("/api/cases/s5-rf-italy-insurance/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh || !fresh.result) return;

    const stale: DecisionRecord = {
      ...fresh,
      decisionId: `${fresh.decisionId}_stale`,
      recordedAt: "2099-01-01T00:00:00.000Z",
      verdict: "HUMAN_REVIEW",
      result: {
        ...fresh.result,
        verdict: "HUMAN_REVIEW",
        primaryPath: null,
        nextAction: {
          ...fresh.result.nextAction,
          type: "send_for_review",
          label: "Передать менеджеру"
        }
      }
    };
    store.insertRecordForTest(stale);

    const drift = await getJson("/api/cases/s5-rf-italy-insurance/drift");
    expect(drift.status).toBe(200);
    expect(drift.json.drifted).toBe(true);
    expect(drift.json.diff.verdict).toEqual({
      before: "HUMAN_REVIEW",
      after: fresh.result.verdict
    });
    expect(drift.json.diff.nextActionType).toBeDefined();
    expect(drift.json.diff.primaryPathId).toBeDefined();
  });

  it("GET /api/cases/:id/drift flags drift by fingerprint even when driftDiff returns null", async () => {
    const recompute = await postJson("/api/cases/s2-tr-spb/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh || !fresh.result) return;

    // Stale record has the same result payload (so driftDiff === null) but
    // an obviously wrong stored resultFingerprint. Replay must still report
    // drifted: true.
    const stale = {
      ...fresh,
      decisionId: `${fresh.decisionId}_fp_only`,
      recordedAt: "2099-02-02T00:00:00.000Z",
      resultFingerprint: "0".repeat(64)
    };
    store.insertRecordForTest(stale);

    const drift = await getJson("/api/cases/s2-tr-spb/drift");
    expect(drift.status).toBe(200);
    expect(drift.json.drifted).toBe(true);
    expect(drift.json.diff).toBeNull();
    expect(drift.json.latestResultFingerprint).toBe("0".repeat(64));
    expect(drift.json.replayResultFingerprint).not.toBe("0".repeat(64));
  });

  it("GET /api/cases/:id/drift compares against current catalogs, while /replay stays historical", async () => {
    const recompute = await postJson("/api/cases/s1-rf-italy/recompute");
    const recordId = recompute.json.decisionRecordId as string;
    const primaryPathId = recompute.json.result.primaryPath?.id as string | undefined;
    expect(primaryPathId).toBeTruthy();
    if (!primaryPathId) return;

    const catalogs = getCatalogsOrThrow();
    const currentPath = catalogs.paths.find((path) => path.id === primaryPathId);
    expect(currentPath).toBeDefined();
    if (!currentPath) return;

    const originalTitle = currentPath.title;
    currentPath.title = `${originalTitle} (updated)`;
    try {
      const drift = await getJson("/api/cases/s1-rf-italy/drift");
      expect(drift.status).toBe(200);
      expect(drift.json.drifted).toBe(true);
      expect(drift.json.diff).toBeNull();
      expect(drift.json.latestResultFingerprint).not.toBe(drift.json.replayResultFingerprint);

      const replay = await postJson(`/api/decisions/${recordId}/replay`);
      expect(replay.status).toBe(200);
      expect(replay.json.drifted).toBe(false);
      expect(replay.json.diff).toBeNull();
    } finally {
      currentPath.title = originalTitle;
    }
  });

  it("POST /api/decisions/:id/replay flags drift by fingerprint even when driftDiff returns null", async () => {
    const recompute = await postJson("/api/cases/s4-rf-residency-dnv/recompute");
    const store = getCaseStore();
    const fresh = store.getRecord(recompute.json.decisionRecordId);
    expect(fresh).not.toBeNull();
    if (!fresh || !fresh.result) return;

    const stale = {
      ...fresh,
      decisionId: `${fresh.decisionId}_fp_replay`,
      recordedAt: "2099-02-02T00:00:00.000Z",
      resultFingerprint: "0".repeat(64)
    };
    store.insertRecordForTest(stale);

    const replay = await postJson(`/api/decisions/${stale.decisionId}/replay`);
    expect(replay.status).toBe(200);
    expect(replay.json.diff).toBeNull();
    expect(replay.json.drifted).toBe(true);
    expect(replay.json.original.resultFingerprint).toBe("0".repeat(64));
    expect(replay.json.replay.resultFingerprint).not.toBe("0".repeat(64));
  });

  it("GET /api/decisions/:id returns 404 with Russian message for unknown id", async () => {
    const response = await getJson("/api/decisions/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.json.error).toBe("decision_not_found");
    expect(response.json.message).toMatch(/не найдено/);
  });

  it("POST /api/decisions/:id/replay returns 409 for legacy seed rows", async () => {
    const response = await postJson("/api/decisions/log_s1_init/replay");
    expect(response.status).toBe(409);
    expect(response.json.error).toBe("replay_unavailable");
  });
});

````

### server/routes/humanReview.integration.test.ts

````
import type { Express } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { Duplex } from "node:stream";
import { createApp } from "../index";

let app: Express;
let humanReviewTempDir: string;
const previousInternalApiToken = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
const INTERNAL_API_TOKEN = "test-internal-human-review-token";

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = [];
  remoteAddress = "127.0.0.1";

  _read(): void {}

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setTimeout(): this {
    return this;
  }

  setNoDelay(): this {
    return this;
  }

  setKeepAlive(): this {
    return this;
  }

  connect(): this {
    return this;
  }

  resetAndDestroy(): void {
    this.destroy();
  }

  address() {
    return { address: "127.0.0.1", family: "IPv4", port: 0 };
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }

  destroySoon(): void {
    this.destroy();
  }
}

beforeAll(async () => {
  humanReviewTempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-http-"));
  process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
    humanReviewTempDir,
    "human-reviews.json"
  );
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = INTERNAL_API_TOKEN;
  app = await createApp();
});

afterAll(async () => {
  delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
  if (previousInternalApiToken) {
    process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = previousInternalApiToken;
  } else {
    delete process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
  }
  if (humanReviewTempDir) {
    await rm(humanReviewTempDir, { recursive: true, force: true });
  }
});

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  targetApp: Express = app,
  headers?: Record<string, string>
) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as never);
  req.method = method;
  req.url = path;
  req.headers = {
    ...(payload
      ? {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(payload))
        }
      : {}),
    ...(headers ?? {})
  };
  if (payload) req.push(payload);
  req.push(null);

  const res = new ServerResponse(req);
  res.assignSocket(socket as never);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    res.on("finish", resolveOnce);
    res.on("close", () => {
      if (res.writableEnded) resolveOnce();
    });
    res.on("error", reject);
    targetApp(req as never, res as never, (error?: unknown) => {
      if (error instanceof Error) {
        rejectOnce(error);
        return;
      }
      if (res.writableEnded) resolveOnce();
    });
  });

  const raw = Buffer.concat(socket.chunks).toString("utf8");
  const bodyText = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");
  const json = bodyText.length > 0 ? JSON.parse(bodyText) : null;
  return { status: res.statusCode, json } as const;
}

describe("human review HTTP surface", () => {
  it("creates one active request and reuses it on repeated submit", async () => {
    const first = await requestJson("POST", "/api/cases/s3-us-spb-business/human-review", {
      channel: "email",
      contact: "user@example.com",
      message: "Был отказ, хочу проверить кейс вручную."
    });
    expect(first.status).toBe(200);
    expect(first.json.reused).toBe(false);
    expect(first.json.request.status).toBe("submitted");

    const second = await requestJson("POST", "/api/cases/s3-us-spb-business/human-review", {
      channel: "telegram",
      contact: "@other_contact",
      message: "Повторная отправка не должна пересоздать запрос."
    });
    expect(second.status).toBe(200);
    expect(second.json.reused).toBe(true);
    expect(second.json.request.id).toBe(first.json.request.id);
    expect(second.json.request.contact).toBe("user@example.com");

    const fetched = await requestJson("GET", "/api/cases/s3-us-spb-business/human-review");
    expect(fetched.status).toBe(200);
    expect(fetched.json.request.id).toBe(first.json.request.id);
    expect(fetched.json.request.durability).toBe("persisted");

    const recomputed = await requestJson("POST", "/api/cases/s3-us-spb-business/recompute", {});
    expect(recomputed.status).toBe(200);

    const afterRecompute = await requestJson("GET", "/api/cases/s3-us-spb-business/human-review");
    expect(afterRecompute.status).toBe(200);
    expect(afterRecompute.json.request.id).toBe(first.json.request.id);
    expect(afterRecompute.json.request.durability).toBe("persisted");

    app = await createApp();

    const restarted = await requestJson("GET", "/api/cases/s3-us-spb-business/human-review");
    expect(restarted.status).toBe(200);
    expect(restarted.json.request.id).toBe(first.json.request.id);
    expect(restarted.json.request.durability).toBe("persisted");
  });

  it("rejects client-supplied changedBy at the public boundary", async () => {
    const response = await requestJson("POST", "/api/cases/s1-rf-italy/human-review", {
      channel: "email",
      contact: "user@example.com",
      message: "Проверьте спорный кейс.",
      changedBy: "ops"
    });

    expect(response.status).toBe(400);
  });

  it("allows the server-owned transition surface to move the request lifecycle", async () => {
    const created = await requestJson("POST", "/api/cases/s1-rf-italy/human-review", {
      channel: "email",
      contact: "ops@example.com",
      message: "Нужен ручной прогон кейса по внутреннему каналу."
    });

    expect(created.status).toBe(200);

    const inQueue = await requestJson("POST", "/api/cases/s1-rf-italy/human-review/transition", {
      requestId: created.json.request.id,
      status: "in_queue",
      note: "Передали в очередь."
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });
    expect(inQueue.status).toBe(200);
    expect(inQueue.json.request.status).toBe("in_queue");
    expect(inQueue.json.request.events.at(-1).changedBy).toBe("system");

    const resolved = await requestJson("POST", "/api/cases/s1-rf-italy/human-review/transition", {
      requestId: created.json.request.id,
      status: "resolved",
      note: "Проверка завершена."
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });
    expect(resolved.status).toBe(200);
    expect(resolved.json.request.status).toBe("resolved");
    expect(resolved.json.request.closedAt).toBeTruthy();

    const invalid = await requestJson("POST", "/api/cases/s1-rf-italy/human-review/transition", {
      requestId: created.json.request.id,
      status: "cancelled",
      note: "После terminal state менять нельзя."
    }, app, {
      "x-active-holidays-internal-token": INTERNAL_API_TOKEN
    });
    expect(invalid.status).toBe(409);
    expect(invalid.json.error).toBe("human_review_invalid_transition");
  });

  it("rejects transition requests without the internal token", async () => {
    const created = await requestJson("POST", "/api/cases/s2-tr-spb/human-review", {
      channel: "email",
      contact: "user@example.com",
      message: "Нужна повторная проверка спорного кейса."
    });

    expect(created.status).toBe(200);

    const forbidden = await requestJson("POST", "/api/cases/s2-tr-spb/human-review/transition", {
      requestId: created.json.request.id,
      status: "in_queue",
      note: "Попытка без внутреннего токена."
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.json.error).toBe("internal_api_forbidden");
  });

  it("starts with an empty review state when persisted storage is corrupted", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "ah-human-review-corrupt-"));
    const corruptFile = path.join(tempDir, "human-reviews.json");
    const previous = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;

    try {
      await writeFile(corruptFile, "{broken json", "utf8");
      process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = corruptFile;

      const corruptedApp = await createApp();
      const response = await requestJson(
        "GET",
        "/api/cases/s2-tr-spb/human-review",
        undefined,
        corruptedApp
      );

      expect(response.status).toBe(200);
      expect(response.json.request).toBeNull();

      const entries = await readdir(tempDir);
      expect(entries.some((entry) => entry.startsWith("human-reviews.json.corrupt-"))).toBe(true);
    } finally {
      if (previous) {
        process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previous;
      } else {
        delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

````

### server/routes/recommendations.integration.test.ts

````
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import {
  resultPayloadSchema,
  recommendationDetailSchema,
  recommendationShortlistSchema
} from "@shared/contracts";
import { createApp } from "../index";
import { resetRecommendationClientForTests } from "../lib/recommendations";

const { createResponseMock } = vi.hoisted(() => ({
  createResponseMock: vi.fn()
}));

vi.mock("openai", () => {
  class OpenAIMock {
    readonly responses = {
      create: createResponseMock
    };
  }

  return { default: OpenAIMock };
});

let app: Express;
let server: Server;
let baseUrl = "";
const previousApiKey = process.env.OPENAI_API_KEY;

beforeAll(async () => {
  delete process.env.OPENAI_API_KEY;
  app = await createApp();
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  createResponseMock.mockReset();
  resetRecommendationClientForTests();
});

afterAll(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  if (previousApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
    return;
  }
  process.env.OPENAI_API_KEY = previousApiKey;
});

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body
      ? {
          "content-type": "application/json",
          connection: "close"
        }
      : { connection: "close" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const json = text.length > 0 ? JSON.parse(text) : null;
  return { status: response.status, json } as const;
}

describe("recommendation HTTP surface", () => {
  it("returns a structured shortlist for the current main recommendation flow", async () => {
    const response = await requestJson(
      "GET",
      "/api/cases/s1-rf-italy/recommendations/shortlist"
    );

    expect(response.status).toBe(200);

    const parsed = recommendationShortlistSchema.parse(response.json);
    expect(parsed.source).toBe("fallback");
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.recommendedOfferId).toBeTruthy();
  });

  it("returns a structured detail view for a shortlisted offer", async () => {
    const shortlist = await requestJson(
      "GET",
      "/api/cases/s1-rf-italy/recommendations/shortlist"
    );
    const offerId = shortlist.json.items[0].offerId as string;

    const response = await requestJson(
      "POST",
      "/api/cases/s1-rf-italy/recommendations/detail",
      { offerId }
    );

    expect(response.status).toBe(200);

    const parsed = recommendationDetailSchema.parse(response.json);
    expect(parsed.offerId).toBe(offerId);
    expect(parsed.source).toBe("fallback");
    expect(parsed.whyThisFits.length).toBeGreaterThan(0);
  });

  it("does not expose baseline nextAction steps in alternative detail", async () => {
    const caseId = "s5-rf-italy-insurance";
    const resultResponse = await requestJson("GET", `/api/cases/${caseId}/result`);
    expect(resultResponse.status).toBe(200);
    const result = resultPayloadSchema.parse(resultResponse.json);

    const shortlistResponse = await requestJson(
      "GET",
      `/api/cases/${caseId}/recommendations/shortlist`
    );
    expect(shortlistResponse.status).toBe(200);
    const shortlist = recommendationShortlistSchema.parse(shortlistResponse.json);
    const alternative = shortlist.items.find((item) => item.offerId !== shortlist.recommendedOfferId);
    expect(alternative).toBeTruthy();

    const detailResponse = await requestJson(
      "POST",
      `/api/cases/${caseId}/recommendations/detail`,
      { offerId: alternative?.offerId }
    );
    expect(detailResponse.status).toBe(200);
    const detail = recommendationDetailSchema.parse(detailResponse.json);

    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
  });

  it("rejects details for offers outside the current shortlist", async () => {
    const response = await requestJson(
      "POST",
      "/api/cases/s1-rf-italy/recommendations/detail",
      { offerId: "unknown_offer" }
    );

    expect(response.status).toBe(404);
    expect(response.json.error).toBe("recommendation_offer_not_found");
  });

  it("preserves deterministic recommendation boundary in openai route mode", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    resetRecommendationClientForTests();

    const caseId = "s5-rf-italy-insurance";
    const resultResponse = await requestJson("GET", `/api/cases/${caseId}/result`);
    expect(resultResponse.status).toBe(200);
    const result = resultPayloadSchema.parse(resultResponse.json);
    const primaryOfferId = result.primaryPath?.id;
    const alternativeOfferId = result.alternativePaths.find(
      (offer) => offer && offer.id !== primaryOfferId
    )?.id;
    expect(primaryOfferId).toBeTruthy();
    expect(alternativeOfferId).toBeTruthy();

    createResponseMock
      .mockResolvedValueOnce({
        output: [],
        output_text: JSON.stringify({
          recommendedOfferId: alternativeOfferId,
          items: [
            {
              offerId: alternativeOfferId,
              title: "Модель пытается поднять альтернативу",
              summary: "Неправильный приоритет от модели.",
              fitReason: "Модель считает это лучшим.",
              caution: "Сомнительно."
            },
            {
              offerId: primaryOfferId,
              title: "Primary",
              summary: "Вторым у модели.",
              fitReason: "Занижение приоритета.",
              caution: "Нет."
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        output: [],
        output_text: JSON.stringify({
          title: "Detail по альтернативе",
          summary: "Текст модели.",
          whyThisFits: ["Есть альтернативный путь."],
          watchouts: ["Нужно проверить условия."],
          nextSteps: [result.nextAction.label, result.nextAction.detail],
          trustSignals: ["Нужна верификация."]
        })
      });

    const shortlistResponse = await requestJson(
      "GET",
      `/api/cases/${caseId}/recommendations/shortlist`
    );
    expect(shortlistResponse.status).toBe(200);
    const shortlist = recommendationShortlistSchema.parse(shortlistResponse.json);
    expect(shortlist.source).toBe("openai");
    expect(shortlist.recommendedOfferId).toBe(primaryOfferId);
    expect(shortlist.items[0]?.offerId).toBe(primaryOfferId);
    expect(shortlist.items[0]?.fit).toBe("best_match");

    const detailResponse = await requestJson(
      "POST",
      `/api/cases/${caseId}/recommendations/detail`,
      { offerId: alternativeOfferId }
    );
    expect(detailResponse.status).toBe(200);
    const detail = recommendationDetailSchema.parse(detailResponse.json);
    expect(detail.source).toBe("openai");
    expect(detail.fit).not.toBe("best_match");
    expect(detail.nextSteps).not.toContain(result.nextAction.label);
    expect(detail.nextSteps).not.toContain(result.nextAction.detail);
  });
});

````

### server/routes/scenarioLab.integration.test.ts

````
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import { createApp } from "../index";

let app: Express;

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = [];
  remoteAddress = "127.0.0.1";

  _read(): void {}

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setTimeout(): this {
    return this;
  }

  setNoDelay(): this {
    return this;
  }

  setKeepAlive(): this {
    return this;
  }

  connect(): this {
    return this;
  }

  resetAndDestroy(): void {
    this.destroy();
  }

  address() {
    return { address: "127.0.0.1", family: "IPv4", port: 0 };
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }

  destroySoon(): void {
    this.destroy();
  }
}

beforeAll(async () => {
  app = await createApp();
});

async function requestJson(
  method: "GET" | "POST",
  path: string,
  body?: unknown
) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as never);
  req.method = method;
  req.url = path;
  req.headers = payload
    ? {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload))
      }
    : {};
  if (payload) req.push(payload);
  req.push(null);

  const res = new ServerResponse(req);
  res.assignSocket(socket as never);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    res.on("finish", resolveOnce);
    res.on("close", () => {
      if (res.writableEnded) resolveOnce();
    });
    res.on("error", rejectOnce);
    app(req as never, res as never, (error?: unknown) => {
      if (error instanceof Error) {
        rejectOnce(error);
        return;
      }
      if (res.writableEnded) resolveOnce();
    });
  });

  const raw = Buffer.concat(socket.chunks).toString("utf8");
  const bodyText = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");
  const json = bodyText.length > 0 ? JSON.parse(bodyText) : null;
  return { status: res.statusCode, json } as const;
}

async function getJson(path: string) {
  return requestJson("GET", path);
}

async function postJson(path: string, body?: unknown) {
  return requestJson("POST", path, body);
}

describe("scenario lab HTTP surface", () => {
  it("rejects empty compare requests instead of creating noop forks", async () => {
    const compare = await postJson("/api/cases/s1-rf-italy/scenarios/compare", {});

    expect(compare.status).toBe(400);
    expect(compare.json.error).toBe("validation_failed");
    expect(
      compare.json.issues.some((issue: { message: string }) =>
        /хотя бы один сценарный сдвиг/i.test(issue.message)
      )
    ).toBe(true);
  });

  it("creates a scenario fork, compares it with the baseline, and records the decision", async () => {
    const compare = await postJson("/api/cases/s1-rf-italy/scenarios/compare", {
      title: "S1 — страховка и комплект документов готовы",
      signals: [
        {
          id: "insurance_ok",
          value: true,
          source: "override",
          capturedAt: "2026-04-18T10:00:00.000Z"
        },
        {
          id: "documents_ready_count",
          value: 7,
          source: "override",
          capturedAt: "2026-04-18T10:00:00.000Z"
        }
      ]
    });

    expect(compare.status).toBe(200);
    expect(compare.json.rootCaseId).toBe("s1-rf-italy");
    expect(compare.json.candidateCase.forkedFrom).toBe("s1-rf-italy");
    expect(compare.json.candidateDecisionRecordId).toMatch(/^dec_s1-rf-italy-fork-\d+_\d+$/);
    expect(compare.json.comparison.delta.changedSignalIds).toEqual([
      "documents_ready_count",
      "insurance_ok"
    ]);
    expect(compare.json.comparison.candidate.actionPlan.steps.length).toBeGreaterThan(0);
    expect(compare.json.comparison.candidate.outcome.primaryPathId).toBeTruthy();
  });

  it("records changed preferences separately for preference-only compare forks", async () => {
    const compare = await postJson("/api/cases/s1-rf-italy/scenarios/compare", {
      title: "S1 — фокус на альтернативном пути",
      preferences: [{ id: "italy_d_digital_nomad", weight: 1 }]
    });

    expect(compare.status).toBe(200);
    expect(compare.json.comparison.delta.changedSignalIds).toEqual([]);
    expect(compare.json.comparison.delta.changedPreferenceIds).toEqual([
      "italy_d_digital_nomad"
    ]);

    const decision = await getJson(
      `/api/decisions/${compare.json.candidateDecisionRecordId}`
    );
    expect(decision.status).toBe(200);
    expect(decision.json.record.changedSignalIds).toEqual([]);
    expect(decision.json.record.changedPreferenceIds).toEqual([
      "italy_d_digital_nomad"
    ]);
  });

  it("returns the whole fork family with comparisons relative to the root scenario", async () => {
    const compare = await postJson("/api/cases/s4-rf-residency-dnv/scenarios/compare", {
      title: "S4 — доход выше и документов больше",
      signals: [
        {
          id: "income_monthly_eur",
          value: 4200,
          source: "override",
          capturedAt: "2026-04-18T10:15:00.000Z"
        },
        {
          id: "documents_ready_count",
          value: 5,
          source: "override",
          capturedAt: "2026-04-18T10:15:00.000Z"
        }
      ]
    });
    const candidateId = compare.json.candidateCase.id as string;

    const family = await getJson(`/api/cases/${candidateId}/scenarios`);
    expect(family.status).toBe(200);
    expect(family.json.rootCaseId).toBe("s4-rf-residency-dnv");
    expect(family.json.focusCaseId).toBe(candidateId);
    expect(family.json.scenarios.map((item: { caseId: string }) => item.caseId)).toContain(candidateId);

    const candidateComparison = family.json.comparisons.find(
      (item: { candidate: { caseId: string } }) => item.candidate.caseId === candidateId
    );
    expect(candidateComparison).toBeTruthy();
    expect(candidateComparison.delta.changedSignalIds).toEqual([
      "documents_ready_count",
      "income_monthly_eur"
    ]);
  });

  it("marks the action plan as human review when the scenario has no normal automatic outcome", async () => {
    const compare = await postJson("/api/cases/s3-us-spb-business/scenarios/compare", {
      title: "S3 — baseline fork для лаборатории"
    });

    expect(compare.status).toBe(200);
    expect(compare.json.comparison.candidate.outcome.humanReview).toBe(true);
    expect(compare.json.comparison.candidate.actionPlan.status).toBe("human_review");
    expect(compare.json.comparison.candidate.actionPlan.escalationReason).toBeTruthy();
    expect(
      compare.json.comparison.candidate.actionPlan.steps.some(
        (step: { kind: string }) => step.kind === "review"
      )
    ).toBe(true);
  });
});

````

### shared/contracts/decisions.compat.test.ts

````
import { describe, expect, it } from "vitest";
import {
  decisionLedgerSchema,
  decisionsLogSchema,
  decisionLedgerEntrySchema,
  decisionLogEntrySchema,
  decisionRecordSchema,
  decisionRecordToLogEntry,
  isDecisionRecord,
  type DecisionLogEntry,
  type DecisionRecord
} from "./decisions";

const LEGACY: DecisionLogEntry = {
  id: "log_s1_init",
  caseId: "s1-rf-italy",
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.62,
  summary: "Исходный пересчёт: шенген C возможен, но нужна страховка и проверка дат.",
  kind: "recompute",
  changedSignalIds: [],
  recordedAt: "2026-04-15T10:00:00.000Z"
};

const RECORD: DecisionRecord = {
  decisionId: "dec_s1_1",
  caseId: "s1-rf-italy",
  engineVersion: "rdc.v1",
  engineRevision: "2026.04.18",
  computedAt: "2026-04-17T09:00:00.000Z",
  recordedAt: "2026-04-17T09:00:00.000Z",
  inputFingerprint: "a".repeat(64),
  catalogFingerprint: "b".repeat(64),
  resultFingerprint: "c".repeat(64),
  replayableSnapshot: null,
  result: null,
  auditTrail: null,
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.79,
  summary: "recompute",
  kind: "recompute",
  changedSignalIds: [],
  changedPreferenceIds: []
};

describe("decisionLedgerEntrySchema", () => {
  it("accepts the legacy DecisionLogEntry shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(LEGACY);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(false);
    }
  });

  it("accepts the new DecisionRecord shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(RECORD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(true);
    }
  });

  it("rejects entries that match neither shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse({
      id: "missing_case_id"
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps decisionsLogSchema legacy-only for old API consumers", () => {
    const parsed = decisionsLogSchema.safeParse([LEGACY]);
    expect(parsed.success).toBe(true);
  });

  it("accepts mixed legacy and full records in decisionLedgerSchema", () => {
    const parsed = decisionLedgerSchema.safeParse([LEGACY, RECORD]);
    expect(parsed.success).toBe(true);
  });
});

describe("decisionRecordToLogEntry", () => {
  it("projects a record onto the legacy shape that the old API uses", () => {
    const entry = decisionRecordToLogEntry(RECORD);
    const parsed = decisionLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    expect(entry.id).toBe(RECORD.decisionId);
    expect(entry.verdict).toBe(RECORD.verdict);
    expect(entry.confidence).toBe(RECORD.confidence);
    expect(entry.summary).toBe(RECORD.summary);
    expect(entry.kind).toBe(RECORD.kind);
    expect(entry.changedSignalIds).toEqual(RECORD.changedSignalIds);
    expect(entry.recordedAt).toBe(RECORD.recordedAt);
  });
});

describe("decisionRecordSchema", () => {
  it("rejects a record with an invalid fingerprint", () => {
    const bad = { ...RECORD, inputFingerprint: "not-a-hash" };
    const parsed = decisionRecordSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});

````

### shared/domain/ai/adaptiveIntake.test.ts

````
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

````

### shared/domain/engine/fingerprint.test.ts

````
import { describe, expect, it } from "vitest";
import type { Case, Source } from "@shared/contracts";
import type { OrchestratorCatalogs } from "./orchestrator";
import {
  fingerprintCase,
  fingerprintCatalogs,
  fingerprintResult,
  hash,
  projectResultForFingerprint
} from "./fingerprint";
import { runDecision } from "./orchestrator";
import { loadCatalogs } from "../../../server/lib/catalogs";

const NOW = "2026-04-17T09:00:00.000Z";

function buildCase(): Case {
  return {
    id: "fp_case_1",
    title: "Fingerprint case",
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

function toOrchestrator(
  catalogs: Awaited<ReturnType<typeof loadCatalogs>>
): OrchestratorCatalogs {
  return {
    paths: catalogs.paths,
    visaRules: catalogs.visaRules,
    restrictions: catalogs.restrictions,
    sources: catalogs.sources,
    residencyPrograms: catalogs.residencyPrograms,
    insuranceProducts: catalogs.insuranceProducts
  };
}

describe("hash() canonicalization", () => {
  it("is invariant under object key order", () => {
    expect(hash({ a: 1, b: 2, c: 3 })).toBe(hash({ c: 3, b: 2, a: 1 }));
  });

  it("rounds floats so equivalent representations hash equally", () => {
    expect(hash({ v: 0.1 + 0.2 })).toBe(hash({ v: 0.3 }));
  });

  it("distinguishes semantically different values", () => {
    expect(hash({ a: 1 })).not.toBe(hash({ a: 2 }));
  });
});

describe("fingerprintCase", () => {
  it("is stable regardless of signal input order", () => {
    const original = buildCase();
    const reordered: Case = {
      ...original,
      signals: [...original.signals].reverse()
    };
    expect(fingerprintCase(original)).toBe(fingerprintCase(reordered));
  });

  it("flips when a signal value changes", () => {
    const original = buildCase();
    const changed: Case = {
      ...original,
      signals: original.signals.map((signal) =>
        signal.id === "passport_validity_months"
          ? { ...signal, value: 6 }
          : signal
      )
    };
    expect(fingerprintCase(original)).not.toBe(fingerprintCase(changed));
  });

  it("is stable when only volatile timestamps change (resubmit of the same case)", () => {
    const original = buildCase();
    const REFRESHED_CAPTURED = "2027-09-11T14:30:00.000Z";
    const refreshed: Case = {
      ...original,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2027-09-11T15:00:00.000Z",
      signals: original.signals.map((signal) => ({
        ...signal,
        capturedAt: REFRESHED_CAPTURED
      })),
      overrides: [
        {
          signalId: "timeline_weeks",
          value: 6,
          reason: "manual tweak",
          appliedAt: "2026-04-17T10:00:00.000Z"
        }
      ]
    };
    const rerecorded: Case = {
      ...refreshed,
      updatedAt: "2099-12-31T23:59:59.000Z",
      signals: refreshed.signals.map((signal) => ({
        ...signal,
        capturedAt: "2099-12-31T23:59:59.000Z"
      })),
      overrides: refreshed.overrides.map((override) => ({
        ...override,
        appliedAt: "2099-12-31T23:59:59.000Z"
      }))
    };
    expect(fingerprintCase(refreshed)).toBe(fingerprintCase(rerecorded));
  });
});

describe("fingerprintCatalogs", () => {
  it("is stable when volatile source fields change", async () => {
    const catalogs = toOrchestrator(await loadCatalogs());
    const drifted: OrchestratorCatalogs = {
      ...catalogs,
      sources: catalogs.sources.map<Source>((source) => ({
        ...source,
        lastCheckedAt: "2099-01-01T00:00:00.000Z"
      }))
    };
    expect(fingerprintCatalogs(catalogs)).toBe(fingerprintCatalogs(drifted));
  });

  it("flips when a path definition is removed", async () => {
    const base = toOrchestrator(await loadCatalogs());
    const lighter: OrchestratorCatalogs = {
      ...base,
      paths: base.paths.slice(1)
    };
    expect(fingerprintCatalogs(base)).not.toBe(fingerprintCatalogs(lighter));
  });

  it("flips when source array order is identical but a source label changes", async () => {
    const base = toOrchestrator(await loadCatalogs());
    const nudged: OrchestratorCatalogs = {
      ...base,
      sources: base.sources.map((source, index) =>
        index === 0 ? { ...source, label: `${source.label}*` } : source
      )
    };
    expect(fingerprintCatalogs(base)).not.toBe(fingerprintCatalogs(nudged));
  });
});

describe("fingerprintResult", () => {
  it("is stable across different audit timing fields", async () => {
    const catalogs = await loadCatalogs();
    const orchestrator = toOrchestrator(catalogs);
    const caseData = catalogs.cases.find((entry) => entry.id === "s1-rf-italy");
    expect(caseData).toBeDefined();
    if (!caseData) return;

    const first = runDecision({ case: caseData, catalogs: orchestrator });
    const second = runDecision({ case: caseData, catalogs: orchestrator });

    expect(fingerprintResult(first)).toBe(fingerprintResult(second));

    // Sanity-check: projection zeroes out tookMs / startedAt / finishedAt.
    const projected = projectResultForFingerprint(first);
    expect(projected.auditTrail.startedAt).toBe("normalized");
    expect(projected.auditTrail.totalMs).toBe(0);
  });
});

````

### shared/domain/engine/pathScope.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  CaseSignals,
  RuleResult,
  Source,
  TravelOffer
} from "@shared/contracts";
import {
  computeAmbiguity,
  computeConfidenceBreakdown,
  detectConflicts
} from "../confidence";
import { previewVerdict } from "../ai/livePreview";
import { resolveAction } from "../action";
import { generateWhy } from "./why";
import { computeVerdict } from "./verdict";
import { deriveRisks, pickCriticalRisk } from "../risk";

const NOW = "2026-04-17T09:00:00.000Z";

function buildTravelOffer(
  id: string,
  eligible: boolean
): TravelOffer {
  return {
    id,
    productType: "travel",
    title: `Маршрут ${id}`,
    kind: "visa_free",
    citizenship: "RU",
    destination: "IT",
    processingWeeks: 2,
    estCostRub: 25_000,
    description: "Тестовый маршрут.",
    requirements: [{ id: "passport", label: "Загранпаспорт", mandatory: true }],
    score: eligible ? 0.92 : 0.41,
    baseScore: eligible ? 0.82 : 0.31,
    ruleBoosts: [],
    blockers: eligible ? [] : [{ ruleId: "alt_blocker", text: "Альтернативный маршрут заблокирован." }],
    eligible
  };
}

const signals: CaseSignals = [
  { id: "citizenship", value: "RU", source: "user", capturedAt: NOW },
  { id: "destination", value: "IT", source: "user", capturedAt: NOW },
  { id: "travel_purpose", value: "tourism", source: "user", capturedAt: NOW },
  { id: "passport_validity_months", value: 18, source: "user", capturedAt: NOW },
  { id: "timeline_weeks", value: 6, source: "user", capturedAt: NOW }
];

const sources: Source[] = [
  {
    id: "consulate",
    label: "Консульство",
    url: "https://example.com/consulate",
    tier: "official",
    lastCheckedAt: NOW,
    volatilityScore: 0,
    summary: "Тестовый источник."
  }
];

const alternativePathRuleResults: RuleResult[] = [
  {
    ruleId: "alt_blocker",
    fired: true,
    category: "document",
    priority: 90,
    productType: "travel",
    output: {
      type: "blocker",
      severity: "critical",
      pathIds: ["alt_path"]
    },
    consumedSignals: ["destination"],
    explanation: "Альтернативный маршрут заблокирован: слот недоступен."
  },
  {
    ruleId: "alt_warning",
    fired: true,
    category: "timeline",
    priority: 80,
    productType: "travel",
    output: {
      type: "warning",
      severity: "medium",
      pathIds: ["alt_path"]
    },
    consumedSignals: ["timeline_weeks"],
    explanation: "Альтернативный маршрут под давлением по срокам."
  }
];

describe("path-scoped travel rules", () => {
  it("ignores blockers and warnings that only affect an alternative path", () => {
    const primary = buildTravelOffer("primary_path", true);
    const alternative = buildTravelOffer("alt_path", false);
    const conflicts = detectConflicts(alternativePathRuleResults, primary.id);
    const confidence = computeConfidenceBreakdown({
      signals,
      ruleResults: alternativePathRuleResults,
      sources,
      conflicts,
      productType: "travel",
      pathId: primary.id
    });
    const ambiguity = computeAmbiguity(
      alternativePathRuleResults,
      conflicts,
      primary.id
    );
    const verdict = computeVerdict({
      productType: "travel",
      signals,
      ruleResults: alternativePathRuleResults,
      rankedOffers: [primary, alternative],
      confidence,
      ambiguity,
      conflictCount: conflicts.count,
      pathId: primary.id
    });
    const risks = deriveRisks(alternativePathRuleResults, primary.id);
    const nextAction = resolveAction({
      productType: "travel",
      verdict,
      primary,
      criticalRisk: pickCriticalRisk(risks),
      ruleResults: alternativePathRuleResults,
      signals,
      pathId: primary.id
    });

    expect(confidence.capsApplied).not.toContain("active_blocker");
    expect(confidence.value).toBeGreaterThan(0.8);
    expect(ambiguity).toBe(0);
    expect(verdict).toBe("GO");
    expect(risks).toEqual([]);
    expect(nextAction.type).toBe("start_application");
    expect(nextAction.triggeredBy).toEqual(["primary_path"]);
    expect(
      confidence.factors.find((factor) => factor.id === "rule_coverage")?.value
    ).toBe(0);
    expect(generateWhy(alternativePathRuleResults, primary.id)).toEqual([]);
  });

  it("keeps intake preview clear when only an alternative path is blocked", () => {
    const preview = previewVerdict(
      {
        case: {
          id: "case_preview",
          title: "Preview",
          productType: "travel",
          createdAt: NOW,
          updatedAt: NOW,
          signals,
          overrides: [],
          preferences: [],
          forkedFrom: null
        },
        catalogs: {
          paths: [buildTravelOffer("primary_path", true), buildTravelOffer("alt_path", false)],
          visaRules: [
            {
              citizenship: "RU",
              destination: "IT",
              regime: "visa_free",
              maxStayDays: 90,
              processingWeeks: 0,
              feeEur: 0,
              registrationRequired: false,
              sourceId: "consulate",
              note: "Тестовое правило."
            }
          ],
          restrictions: [],
          sources,
          residencyPrograms: [],
          insuranceProducts: []
        }
      },
      {
        now: () => new Date(NOW)
      }
    );

    expect(preview.hasBlockingRule).toBe(false);
    expect(preview.hasHumanReviewTrigger).toBe(false);
  });
});

````

### shared/domain/engine/scenariosAlignment.test.ts

````
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalogs } from "../../../server/lib/catalogs";
import { runDecision } from "./orchestrator";

type ScenarioExpectation = {
  caseId: string;
  expectedVerdict: string;
  expectedActionType: string;
  expectedPrimaryPath: string | null;
};

describe("seed scenarios", () => {
  it("stay aligned with the live decision engine", async () => {
    const catalogs = await loadCatalogs();
    const raw = readFileSync(
      path.resolve(process.cwd(), "data/scenarios/scenarios.json"),
      "utf8"
    );
    const scenarios = JSON.parse(raw) as ScenarioExpectation[];

    for (const scenario of scenarios) {
      const caseData = catalogs.cases.find((entry) => entry.id === scenario.caseId);
      expect(caseData, `missing case ${scenario.caseId}`).toBeDefined();
      if (!caseData) continue;

      const result = runDecision({ case: caseData, catalogs });

      expect(result.verdict).toBe(scenario.expectedVerdict);
      expect(result.nextAction.type).toBe(scenario.expectedActionType);
      expect(result.primaryPath?.id ?? null).toBe(scenario.expectedPrimaryPath);
    }
  });
});

````

### src/lib/caseDefaults.test.ts

````
import { describe, expect, it } from "vitest";
import { productTypeSchema } from "@shared/contracts";
import {
  defaultCaseByProduct,
  productTypeLabel
} from "./caseDefaults";

describe("caseDefaults", () => {
  it("covers every declared ProductType with a default case and label", () => {
    const productTypes = [...productTypeSchema.options].sort();

    expect(Object.keys(defaultCaseByProduct).sort()).toEqual(productTypes);
    expect(productTypes.map((productType) => productTypeLabel(productType))).toEqual([
      "Страховой сценарий",
      "ВНЖ Испании",
      "Визовый маршрут"
    ]);
  });
});

````

### src/presentation/activeHolidays/documentsScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildDocumentsScreenModel } from "./documentsScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.6,
      readyCount: 3,
      requiredCount: 5,
      items: [
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "ready",
          detail: "Полис уже загружен.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.7,
      confidenceBreakdown: {
        value: 0.7,
        base: 0.7,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.1,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildDocumentsScreenModel", () => {
  it("builds readiness and next-step copy from result payload", () => {
    const model = buildDocumentsScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.readiness.badgeTone).toBe("warning");
    expect(model.requirements.items).toHaveLength(2);
    expect(model.nextStep.description).toBe("Закройте недостающий чеклист.");
  });

  it("switches to a review gate for human-review verdicts", () => {
    const model = buildDocumentsScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Документный трек откроет оператор");
    expect(model.gate?.actionLabel).toBe("Вернуться к ручной проверке");
  });
});

````

### src/presentation/activeHolidays/humanReviewScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { buildHumanReviewScreenModel } from "./humanReviewScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s5-rf-italy-insurance",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "blocking",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["confidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "HR-1",
        fired: true,
        category: "timeline",
        priority: 90,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Нужна ручная проверка по истории отказов."
      },
      {
        ruleId: "WARN-1",
        fired: true,
        category: "document",
        priority: 80,
        productType: "travel",
        output: { type: "warning", severity: "high" },
        consumedSignals: [],
        explanation: "Не хватает страховки. Нужна допроверка пакета."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: ["manual_review"],
        factors: []
      },
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s5-rf-italy-insurance",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 10,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 10,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createRequest(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: "s5-rf-italy-insurance",
    status: "in_review",
    channel: "telegram",
    contact: "@traveler",
    message: "Есть прошлый отказ и спорная страховка, прошу проверить кейс вручную.",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:30:00.000Z",
    closedAt: null,
    durability: "persisted",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-21T00:00:00.000Z",
      lastCheckedAt: "2026-04-21T00:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно подтвердить маршрут."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-21T00:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

function createAudit(): { trail: AuditTrail; decisions: DecisionLogEntry[] } {
  return {
    trail: createResult().auditTrail,
    decisions: [
      {
        id: "decision-1",
        caseId: "s5-rf-italy-insurance",
        verdict: "HUMAN_REVIEW",
        confidence: 0.42,
        summary: "Ушли в ручную проверку.",
        kind: "recompute",
        changedSignalIds: [],
        recordedAt: "2026-04-21T00:40:00.000Z"
      }
    ]
  };
}

describe("buildHumanReviewScreenModel", () => {
  it("builds an honest pipeline view for active requests", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: createRequest(),
      audit: null,
      humanReviewStatus: "ready"
    });

    expect(model.header.heading).toBe("Запрос уже в работе");
    expect(model.openReview?.pipeline[2]).toEqual({
      id: "in_review",
      label: "У человека",
      state: "current"
    });
    expect(model.openReview?.verdictLabel).toBe("Нужна ручная проверка");
    expect(model.overview.rows[2]?.text).toContain("хранится на сервере");
    expect(model.submitForm).toBeNull();
  });

  it("keeps submit flow and warning or audit sections ready for future UI", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult({ verdict: "GO" }),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: createAudit(),
      humanReviewStatus: "ready"
    });

    expect(model.submitForm?.channels).toHaveLength(2);
    expect(model.warningsSection?.items[0]?.pulseAmplitude).toBe(0.75);
    expect(model.auditSection?.history[0]?.label).toContain("Ушли в ручную проверку");
  });

  it("exposes a loading mode before the current case review state is known", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: null,
      humanReviewStatus: "loading"
    });

    expect(model.mode).toBe("loading");
    expect(model.loadingState?.title).toContain("Проверяем");
    expect(model.submitForm).toBeNull();
  });
});

````

### src/presentation/activeHolidays/landingScreenModel.test.ts

````
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

````

### src/presentation/activeHolidays/resultScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildResultScreenModel } from "./resultScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    ruleResults: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 14.2,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 14.2,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createScenarioLab(): ScenarioLabPayload {
  const baseResult = createBaseResult();

  return {
    version: "scenario-lab.v1",
    caseId: "s1-rf-italy",
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать обязательные документы",
        summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
        recommended: true,
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Перейти к документам",
          detail: "Закройте недостающий чеклист.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        comparison: {
          verdictBefore: "GO",
          verdictAfter: "GO",
          confidenceBefore: 0.74,
          confidenceAfter: 0.82,
          primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
          primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
          resolvedRisks: [],
          remainingRisks: [],
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            requiredCount: 7,
            itemsToCollect: []
          },
          whyChanged: ["Чеклист становится полным."]
        },
        plan: {
          headline: "После этого сценария следующий шаг — перейти к документам.",
          firstSteps: ["Подготовить страховку."],
          criticalSteps: ["Не отправлять заявку с неполным пакетом."],
          canWait: [],
          humanReviewRequired: false,
          humanReviewReason: null
        }
      }
    ],
    recommendedScenarioId: "documents-ready",
    noHelpfulScenarios: false,
    humanReviewEscalation: {
      required: false,
      title: "Ручная проверка не нужна",
      detail: "По текущему кейсу есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildResultScreenModel", () => {
  it("keeps missing-docs cases anchored on the documents node", () => {
    const model = buildResultScreenModel({
      result: createBaseResult(),
      scenarioLab: createScenarioLab()
    });

    expect(model.heading).toBe("Подача возможна");
    expect(model.bridge.activeNodeId).toBe("docs");
    expect(model.workSection.rows[0]?.title).toBe("Страховка");
    expect(model.compareCard?.title).toBe("Добрать обязательные документы");
  });

  it("switches to honest review mode for human review verdicts", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "blocking",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["confidence"]
        }
      }),
      scenarioLab: null
    });

    expect(model.eyebrow).toBe("ручная проверка");
    expect(model.bridge.activeNodeId).toBe("review");
    expect(model.ai.summary).toContain("менеджера");
    expect(model.cta.targetScreen).toBe("human-review");
  });

  it("uses the next action as the work row when documents are already ready", () => {
    const result = createBaseResult({
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "documents",
        triggeredBy: ["primary_path"]
      },
      documents: {
        score: 1,
        readyCount: 7,
        requiredCount: 7,
        items: [
          {
            id: "insurance",
            label: "Страховка",
            status: "ready",
            detail: "Документ готов.",
            pathId: "italy_c_tourism"
          }
        ]
      }
    });

    const model = buildResultScreenModel({
      result,
      scenarioLab: null
    });

    expect(model.bridge.activeNodeId).toBe("step");
    expect(model.workSection.rows).toEqual([
      {
        id: "next-action",
        title: "Начать заявку",
        meta: "Можно переходить к следующему шагу.",
        status: "дальше",
        tone: "result"
      }
    ]);
  });

  it("falls back to product label when the primary path is absent", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        primaryPath: null,
        productType: "insurance_adult"
      }),
      scenarioLab: null
    });

    expect(model.meta).toBe("Страховой сценарий");
    expect(model.bridge.rightChip).toBe("Шенген 🇪🇺");
  });

  it("uses the canonical recommended scenario across compare, work section, and ai copy", () => {
    const scenarioLab = createScenarioLab();
    scenarioLab.scenarios = [
      {
        ...scenarioLab.scenarios[0],
        id: "fallback",
        title: "Первый, но не рекомендованный",
        summary: "Это просто запасной сценарий.",
        recommended: false
      },
      {
        ...scenarioLab.scenarios[0],
        id: "recommended-second",
        title: "Рекомендованный сценарий",
        summary: "Этот сценарий должен стать единым owner-ом на экране.",
        recommended: true
      }
    ];
    scenarioLab.recommendedScenarioId = "recommended-second";

    const model = buildResultScreenModel({
      result: createBaseResult({
        documents: {
          score: 1,
          readyCount: 7,
          requiredCount: 7,
          items: []
        }
      }),
      scenarioLab
    });

    expect(model.compareCard?.title).toBe("Рекомендованный сценарий");
    expect(model.workSection.rows[0]?.title).toBe("Рекомендованный сценарий");
    expect(model.ai.summary).toContain("Рекомендованный сценарий");
  });
});

````

### src/presentation/activeHolidays/trustScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildTrustScreenModel } from "./trustScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить дальше.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 1,
      readyCount: 5,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.83,
      confidenceBreakdown: {
        value: 0.83,
        base: 0.83,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.14,
      sources: [
        {
          id: "src_consulate",
          label: "Консульство",
          url: "https://example.com/consulate",
          tier: "official",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.1
        },
        {
          id: "src_operator",
          label: "Оператор",
          url: "https://example.com/operator",
          tier: "operator",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.2
        }
      ],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildTrustScreenModel", () => {
  it("adds stable source summaries and volatility copy", () => {
    const model = buildTrustScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.hero.badgeTone).toBe("positive");
    expect(model.sourcesSection.items[0]?.summary).toContain("Официальный источник");
    expect(model.sourcesSection.volatilityLabel).toContain("14%");
  });

  it("blocks trust details for human-review verdicts", () => {
    const model = buildTrustScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Доверие уточнит оператор");
  });
});

````

### src/screens/human-review/HumanReviewScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { HumanReviewScreen } from "./HumanReviewScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  Briefcase: iconStub,
  Phone: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "case-a",
      title: "Case A",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    },
    activeCaseId: "case-a",
    activeResult: {
      version: "rdc.v1",
      productType: "travel",
      caseId: "case-a",
      computedAt: "2026-04-21T00:00:00.000Z",
      verdict: "GO",
      primaryPath: null,
      alternativePaths: [],
      criticalRisk: null,
      risks: [],
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить дальше.",
        targetScreen: "result",
        triggeredBy: ["primary_path"]
      },
      decisionSignals: [],
      whyBullets: [],
      ruleResults: [],
      documents: {
        score: 1,
        readyCount: 5,
        requiredCount: 5,
        items: []
      },
      trust: {
        confidence: 0.8,
        confidenceBreakdown: {
          value: 0.8,
          base: 0.8,
          capsApplied: [],
          factors: []
        },
        volatilityScore: 0.1,
        sources: [],
        lastCheckedAt: "2026-04-21T00:00:00.000Z"
      },
      assumptions: [],
      auditTrail: {
        version: "rdc.v1",
        caseId: "case-a",
        startedAt: "2026-04-21T00:00:00.000Z",
        finishedAt: "2026-04-21T00:00:00.000Z",
        totalMs: 10,
        steps: [
          {
            index: 0,
            name: "assemblePayload",
            tookMs: 10,
            inputsSummary: "result",
            outputSummary: "payload",
            firedRuleIds: [],
            notes: []
          }
        ],
        preview: false
      },
      preview: false
    },
    activeHumanReview: null,
    scenarios: [
      {
        caseId: "case-a",
        productType: "travel",
        title: "A",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    loadHumanReview: vi.fn().mockResolvedValue(undefined),
    submitHumanReview: vi.fn().mockResolvedValue({ reused: false }),
    status: "ready",
    errorMessage: null,
    humanReviewStatus: "ready",
    humanReviewError: null,
    ...overrides
  } as any;
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("HumanReviewScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading block while current-case review state is still loading", () => {
    useCaseStoreMock.mockReturnValue(
      createStore({
        humanReviewStatus: "loading"
      })
    );

    renderScreen(<HumanReviewScreen />);

    expect(screen.getByText("Проверяем, есть ли активный запрос")).toBeInTheDocument();
  });

  it("resets draft fields when the case id changes", async () => {
    useCaseStoreMock.mockReturnValue(createStore());
    const view = renderScreen(<HumanReviewScreen />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
      ),
      { target: { value: "Черновик для первого кейса" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Телеграм" }));
    fireEvent.change(screen.getByPlaceholderText("@username"), {
      target: { value: "@draft_case_a" }
    });

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "case-b",
          title: "Case B",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-21T01:00:00.000Z",
          updatedAt: "2026-04-21T01:00:00.000Z"
        },
        activeCaseId: "case-b",
        activeResult: {
          ...createStore().activeResult,
          caseId: "case-b",
          auditTrail: {
            ...createStore().activeResult.auditTrail,
            caseId: "case-b"
          }
        }
      })
    );
    view.rerender(
      <MemoryRouter>
        <HumanReviewScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
        )
      ).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
    });
  });
});

````

### src/screens/result/AiRecommendationPanel.test.tsx

````
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

const { apiClientMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }
  return {
    apiClientMock: {
      recommendationShortlist: vi.fn(),
      recommendationDetail: vi.fn(),
      compareScenario: vi.fn()
    },
    ApiErrorMock
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiClient: apiClientMock,
  ApiError: ApiErrorMock
}));

function renderPanel(overrides: Partial<ComponentProps<typeof AiRecommendationPanel>> = {}) {
  const onOpenScenario = vi.fn();
  render(
    <AiRecommendationPanel
      caseId="s1-rf-italy"
      computedAt="2026-04-19T09:55:00.000Z"
      preferences={[]}
      onOpenScenario={onOpenScenario}
      {...overrides}
    />
  );
  return { onOpenScenario };
}

describe("AiRecommendationPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads shortlist and the default detail view", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Самый прямой путь по текущему кейсу.",
          fitReason: "Сейчас это главный match по движку.",
          caution: "Нужно добрать документы."
        }
      ],
      disclaimer: "Fallback shortlist."
    });
    apiClientMock.recommendationDetail.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      offerId: "italy_c_tourism",
      generatedAt: "2026-04-19T10:00:05.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      fit: "best_match",
      title: "Шенген C",
      summary: "Подходит лучше других по текущим сигналам.",
      whyThisFits: ["Есть рабочий путь.", "Сроки понятны."],
      watchouts: ["Нужно добрать документы."],
      nextSteps: ["Перейти к документам."],
      trustSignals: ["Уверенность 74%."],
      disclaimer: "Fallback detail."
    });

    renderPanel();

    expect(screen.getByText("AI-разбор рекомендаций")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClientMock.recommendationShortlist).toHaveBeenCalledWith("s1-rf-italy");
    });

    expect((await screen.findAllByText("Шенген C")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Подходит лучше других по текущим сигналам.")).toBeInTheDocument();
    expect(screen.getByText("уже основной вариант")).toBeInTheDocument();
    expect(screen.getByText("Fallback detail.")).toBeInTheDocument();
  });

  it("loads follow-up detail when the user switches shortlist item", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    expect(await screen.findByText("Главный путь.")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);

    await waitFor(() => {
      expect(apiClientMock.recommendationDetail).toHaveBeenCalledWith(
        "s1-rf-italy",
        "italy_d_digital_nomad"
      );
    });

    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить движком" })).toBeInTheDocument();
    expect(screen.getByText("Detail 2.")).toBeInTheDocument();
  });

  it("shows non-primary pre-compare steps from detail payload", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Перейти к документам."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: [
          "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
          "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
          "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
        ],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();

    expect(screen.getByText("Что проверить перед compare")).toBeInTheDocument();
    expect(screen.queryAllByText("Следующие шаги")).toHaveLength(0);
    expect(
      screen.queryAllByText("Заполнить baseline-форму по текущему next action.")
    ).toHaveLength(0);
    expect(
      screen.getByText(
        "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта."
      )
    ).toBeInTheDocument();
  });

  it("runs deterministic compare for an alternative and opens the fork scenario", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });
    apiClientMock.compareScenario.mockResolvedValue({
      rootCaseId: "s1-rf-italy",
      baseline: {
        outcome: {
          verdict: "GO",
          confidence: 0.74,
          primaryPathLabel: "Шенген C"
        }
      },
      candidateCase: {
        id: "s1-rf-italy-fork-1"
      },
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу."
          },
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          }
        },
        delta: {
          confidenceDelta: -0.13
        }
      }
    });

    const { onOpenScenario } = renderPanel({
      preferences: [{ id: "italy_c_tourism", weight: 0.4 }]
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByRole("button", { name: "Проверить движком" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Проверить движком" }));

    await waitFor(() => {
      expect(apiClientMock.compareScenario).toHaveBeenCalledWith("s1-rf-italy", {
        title: "AI-проверка · Digital Nomad",
        signals: [],
        preferences: [
          { id: "italy_c_tourism", weight: 0.4 },
          { id: "italy_d_digital_nomad", weight: 1 }
        ]
      });
    });

    expect(await screen.findByText("Можно ехать → Нужна проверка менеджером")).toBeInTheDocument();
    expect(screen.getByText("Нужна ручная сверка по доходу.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный сценарий" }));
    expect(onOpenScenario).toHaveBeenCalledWith("s1-rf-italy-fork-1");
  });
});

````

### src/screens/result/ResultScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  layoutId: _layoutId,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  layoutId?: string;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  ArrowLeft: iconStub,
  ArrowRight: iconStub,
  MoreHorizontal: iconStub,
  Sparkles: iconStub,
  X: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/instrumentation/events", () => ({
  track: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

vi.mock("./AiRecommendationPanel", () => ({
  AiRecommendationPanel: () => <div data-testid="ai-recommendation-panel">AI panel</div>
}));

vi.mock("./ResultCompareSurface", () => ({
  ResultCompareSurface: () => <div data-testid="compare-surface">Compare surface</div>
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  const activeResult = {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-17T10:00:00.000Z",
    verdict: "GO",
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить к следующему шагу.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-17T10:00:00.000Z"
    },
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    decisionSignals: [],
    ruleResults: [],
    assumptions: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    auditTrail: {
      totalMs: 14.2
    },
    preview: false
  };

  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult,
    activeScenarioLab: {
      version: "scenario-lab.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-17T10:00:00.000Z",
      baseResult: activeResult,
      issues: [],
      scenarios: [
        {
          id: "documents-ready",
          type: "documents",
          title: "Добрать обязательные документы",
          summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
          recommended: true,
          nextAction: {
            type: "upload_missing_docs",
            priority: "blocking",
            label: "Перейти к документам",
            detail: "Закройте недостающий чеклист.",
            targetScreen: "documents",
            triggeredBy: ["documents_ready_count"]
          },
          comparison: {
            verdictBefore: "GO",
            verdictAfter: "GO",
            confidenceBefore: 0.74,
            confidenceAfter: 0.82,
            primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
            primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
            resolvedRisks: [],
            remainingRisks: [],
            documents: {
              readyCountBefore: 5,
              readyCountAfter: 7,
              requiredCount: 7,
              itemsToCollect: []
            },
            whyChanged: ["Чеклист становится полным."]
          },
          plan: {
            headline: "После этого сценария следующий шаг — перейти к документам.",
            firstSteps: ["Подготовить страховку."],
            criticalSteps: ["Не отправлять заявку с неполным пакетом."],
            canWait: [],
            humanReviewRequired: false,
            humanReviewReason: null
          }
        }
      ],
      recommendedScenarioId: "documents-ready",
      noHelpfulScenarios: false,
      humanReviewEscalation: {
        required: false,
        title: "Ручная проверка не нужна",
        detail: "По текущему кейсу есть автоматический сценарий.",
        triggeredBy: []
      }
    },
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
    scenarioLabStatus: "ready",
    scenarioLabError: null,
    status: "ready",
    errorMessage: null,
    ...overrides
  } as any;
}

function renderScreen(screenNode: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{screenNode}</MemoryRouter>);
}

describe("ResultScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the vertical default case when the active case belongs to another product", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("ignores a foreign case query param on product-specific routes", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        scenarios: [
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
        ],
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />, [
      "/insurance-adult?case=s1-rf-italy"
    ]);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("renders manual review state without a fake confirmed path", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          primaryPath: null,
          nextAction: {
            type: "send_for_review",
            priority: "human_review",
            label: "Передать менеджеру",
            detail: "Автомат не может честно подтвердить маршрут.",
            targetScreen: "human-review",
            triggeredBy: ["human_review_trigger"]
          }
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getByText("Нужна ручная проверка")).toBeInTheDocument();
    expect(screen.getAllByText("Передать менеджеру").length).toBeGreaterThan(0);
    expect(screen.getByText("Нужен оператор")).toBeInTheDocument();
    expect(screen.queryByText("Маршрут подтверждён")).not.toBeInTheDocument();
  });

  it("opens the basis sheet from the utility action", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Основание" }));

    await waitFor(() => {
      expect(screen.getByText("Основание решения")).toBeInTheDocument();
      expect(screen.getByText("Маршрут подтверждён по текущим сигналам.")).toBeInTheDocument();
    });
  });

  it("opens compare and AI sheets from secondary actions", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Сравнить" }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-surface")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /AI: сначала/i }));
    fireEvent.click(screen.getByRole("button", { name: "Полный разбор" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-recommendation-panel")).toBeInTheDocument();
    });
  });
});

````

### src/screens/screenRouting.test.tsx

````
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

````

### src/state/caseStore.test.ts

````
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCaseStore } from "./caseStore";
import { apiClient } from "@/lib/apiClient";
import type { HumanReviewRequest } from "@shared/contracts";

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    recompute: vi.fn(),
    paths: vi.fn(),
    decisionScenarioLab: vi.fn(),
    humanReview: vi.fn(),
    submitHumanReview: vi.fn()
  }
}));

const apiClientMock = vi.mocked(apiClient);
const initialState = useCaseStore.getState();

const CASE_ID = "s1-rf-italy";

const caseStub = {
  id: CASE_ID,
  title: "Тестовый кейс",
  productType: "travel",
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z",
  signals: [],
  overrides: [],
  preferences: [],
  forkedFrom: null
} as const;

const resultStub = {
  verdict: "GO",
  productType: "travel",
  computedAt: "2026-04-17T10:00:00.000Z",
  nextAction: {
    type: "start_application",
    priority: "path",
    label: "Начать заявку",
    detail: "Можно переходить дальше.",
    targetScreen: "result",
    triggeredBy: []
  },
  trust: {
    confidence: 0.77,
    confidenceBreakdown: {
      value: 0.77,
      capsApplied: [],
      factors: []
    }
  },
  primaryPath: {
    id: "italy_c_tourism",
    productType: "travel",
    title: "Шенген C"
  },
  alternativePaths: [],
  criticalRisk: null,
  risks: [],
  whyBullets: [],
  decisionSignals: [],
  ruleResults: [],
  assumptions: [],
  version: "rdc.v1",
  documents: {
    score: 0.8,
    readyCount: 6,
    requiredCount: 7,
    items: []
  },
  auditTrail: {
    totalMs: 10
  }
} as const;

const scenarioLabStub = {
  version: "scenario-lab.v1",
  caseId: CASE_ID,
  generatedAt: "2026-04-17T10:00:00.000Z",
  baseResult: resultStub,
  issues: [],
  scenarios: [],
  recommendedScenarioId: null,
  noHelpfulScenarios: false,
  humanReviewEscalation: {
    required: false,
    title: "Ручная проверка не нужна",
    detail: "Есть рабочий автоматический сценарий.",
    triggeredBy: []
  }
} as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createHumanReviewRequest(
  overrides: Partial<HumanReviewRequest> = {}
): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: CASE_ID,
    status: "submitted",
    channel: "email",
    contact: "traveler@example.com",
    message: "Прошу проверить кейс вручную.",
    createdAt: "2026-04-17T10:00:00.000Z",
    updatedAt: "2026-04-17T10:00:00.000Z",
    closedAt: null,
    durability: "volatile",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-17T10:00:00.000Z",
      lastCheckedAt: "2026-04-17T10:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно закрыть неоднозначность."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-17T10:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

describe("useCaseStore scenario lab refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCaseStore.setState(initialState, true);
  });

  it("keeps the last successful scenario lab when refresh fails after recompute", async () => {
    apiClientMock.recompute.mockResolvedValue({
      case: caseStub,
      result: resultStub
    } as any);
    apiClientMock.paths.mockResolvedValue([]);
    apiClientMock.decisionScenarioLab.mockRejectedValue(new Error("timeout"));

    useCaseStore.setState(
      {
        ...useCaseStore.getState(),
        activeCaseId: CASE_ID,
        activeCase: caseStub as any,
        activeResult: resultStub as any,
        activeScenarioLab: scenarioLabStub as any,
        scenarioLabStatus: "ready",
        scenarioLabError: null
      },
      true
    );

    await useCaseStore.getState().setPreferences(CASE_ID, []);

    const state = useCaseStore.getState();
    expect(state.activeScenarioLab).toEqual(scenarioLabStub);
    expect(state.scenarioLabStatus).toBe("error");
    expect(state.scenarioLabError).toBe("timeout");
  });

  it("ignores stale human review responses after the active case token changes", async () => {
    const pendingReview = deferred<HumanReviewRequest | null>();
    apiClientMock.humanReview.mockReturnValueOnce(pendingReview.promise as Promise<any>);

    const loadPromise = useCaseStore.getState().loadHumanReview(CASE_ID);

    useCaseStore.setState({
      humanReviewCaseId: "case-b",
      humanReviewRequestToken: useCaseStore.getState().humanReviewRequestToken + 1,
      humanReviewStatus: "loading",
      activeHumanReview: null
    });

    pendingReview.resolve(createHumanReviewRequest());
    await loadPromise;

    const state = useCaseStore.getState();
    expect(state.humanReviewCaseId).toBe("case-b");
    expect(state.activeHumanReview).toBeNull();
    expect(state.humanReviewStatus).toBe("loading");
  });

  it("keeps the newer submit result when an older human review load resolves later", async () => {
    const pendingLoad = deferred<HumanReviewRequest | null>();
    const pendingSubmit = deferred<{ reused: boolean; request: HumanReviewRequest }>();
    const olderRequest = createHumanReviewRequest({
      id: "hr-load",
      status: "submitted",
      message: "Старый ответ"
    });
    const newerRequest = createHumanReviewRequest({
      id: "hr-submit",
      status: "in_review",
      message: "Новый запрос",
      channel: "telegram",
      contact: "@traveler"
    });

    apiClientMock.humanReview.mockReturnValueOnce(pendingLoad.promise as Promise<any>);
    apiClientMock.submitHumanReview.mockReturnValueOnce(pendingSubmit.promise as Promise<any>);

    const loadPromise = useCaseStore.getState().loadHumanReview(CASE_ID);
    const submitPromise = useCaseStore.getState().submitHumanReview(CASE_ID, {
      channel: "telegram",
      contact: "@traveler",
      message: "Новый запрос"
    });

    pendingLoad.resolve(olderRequest);
    pendingSubmit.resolve({ reused: false, request: newerRequest });

    await Promise.all([loadPromise, submitPromise]);

    const state = useCaseStore.getState();
    expect(state.activeHumanReview?.id).toBe("hr-submit");
    expect(state.activeHumanReview?.message).toBe("Новый запрос");
    expect(state.humanReviewStatus).toBe("ready");
    await expect(submitPromise).resolves.toEqual({ reused: false });
  });
});

````

### src/test/setup.ts

````
import "@testing-library/jest-dom";

````

### src/ui/QuestionCard.test.tsx

````
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { QuestionCard } from "./QuestionCard";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: ComponentProps<"div">) => <div {...props}>{children}</div>,
    span: ({
      children,
      layoutId: _layoutId,
      ...props
    }: ComponentProps<"span"> & { layoutId?: string }) => <span {...props}>{children}</span>
  }
}));

describe("QuestionCard", () => {
  it("persists an explicit unresolved boolean answer as null", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(
      <QuestionCard
        question={{
          id: "insurance_ok",
          label: "Страховка",
          kind: "boolean",
          mandatory: true,
          productTypes: ["travel"],
          prompt: "Есть страховка?",
          informationGain: 0.7,
          unlocksRules: ["r09_insurance_gap"],
          answered: false
        }}
        onAnswer={onAnswer}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Не знаю" }));

    expect(onAnswer).toHaveBeenCalledWith(null);
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/02_contracts/shared-contracts/decisions.compat.test.ts

````
import { describe, expect, it } from "vitest";
import {
  decisionLedgerSchema,
  decisionsLogSchema,
  decisionLedgerEntrySchema,
  decisionLogEntrySchema,
  decisionRecordSchema,
  decisionRecordToLogEntry,
  isDecisionRecord,
  type DecisionLogEntry,
  type DecisionRecord
} from "./decisions";

const LEGACY: DecisionLogEntry = {
  id: "log_s1_init",
  caseId: "s1-rf-italy",
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.62,
  summary: "Исходный пересчёт: шенген C возможен, но нужна страховка и проверка дат.",
  kind: "recompute",
  changedSignalIds: [],
  recordedAt: "2026-04-15T10:00:00.000Z"
};

const RECORD: DecisionRecord = {
  decisionId: "dec_s1_1",
  caseId: "s1-rf-italy",
  engineVersion: "rdc.v1",
  engineRevision: "2026.04.18",
  computedAt: "2026-04-17T09:00:00.000Z",
  recordedAt: "2026-04-17T09:00:00.000Z",
  inputFingerprint: "a".repeat(64),
  catalogFingerprint: "b".repeat(64),
  resultFingerprint: "c".repeat(64),
  replayableSnapshot: null,
  result: null,
  auditTrail: null,
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.79,
  summary: "recompute",
  kind: "recompute",
  changedSignalIds: [],
  changedPreferenceIds: []
};

describe("decisionLedgerEntrySchema", () => {
  it("accepts the legacy DecisionLogEntry shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(LEGACY);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(false);
    }
  });

  it("accepts the new DecisionRecord shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(RECORD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(true);
    }
  });

  it("rejects entries that match neither shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse({
      id: "missing_case_id"
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps decisionsLogSchema legacy-only for old API consumers", () => {
    const parsed = decisionsLogSchema.safeParse([LEGACY]);
    expect(parsed.success).toBe(true);
  });

  it("accepts mixed legacy and full records in decisionLedgerSchema", () => {
    const parsed = decisionLedgerSchema.safeParse([LEGACY, RECORD]);
    expect(parsed.success).toBe(true);
  });
});

describe("decisionRecordToLogEntry", () => {
  it("projects a record onto the legacy shape that the old API uses", () => {
    const entry = decisionRecordToLogEntry(RECORD);
    const parsed = decisionLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    expect(entry.id).toBe(RECORD.decisionId);
    expect(entry.verdict).toBe(RECORD.verdict);
    expect(entry.confidence).toBe(RECORD.confidence);
    expect(entry.summary).toBe(RECORD.summary);
    expect(entry.kind).toBe(RECORD.kind);
    expect(entry.changedSignalIds).toEqual(RECORD.changedSignalIds);
    expect(entry.recordedAt).toBe(RECORD.recordedAt);
  });
});

describe("decisionRecordSchema", () => {
  it("rejects a record with an invalid fingerprint", () => {
    const bad = { ...RECORD, inputFingerprint: "not-a-hash" };
    const parsed = decisionRecordSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/documentsScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildDocumentsScreenModel } from "./documentsScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.6,
      readyCount: 3,
      requiredCount: 5,
      items: [
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "ready",
          detail: "Полис уже загружен.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.7,
      confidenceBreakdown: {
        value: 0.7,
        base: 0.7,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.1,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildDocumentsScreenModel", () => {
  it("builds readiness and next-step copy from result payload", () => {
    const model = buildDocumentsScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.readiness.badgeTone).toBe("warning");
    expect(model.requirements.items).toHaveLength(2);
    expect(model.nextStep.description).toBe("Закройте недостающий чеклист.");
  });

  it("switches to a review gate for human-review verdicts", () => {
    const model = buildDocumentsScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Документный трек откроет оператор");
    expect(model.gate?.actionLabel).toBe("Вернуться к ручной проверке");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/humanReviewScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { buildHumanReviewScreenModel } from "./humanReviewScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s5-rf-italy-insurance",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "blocking",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["confidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "HR-1",
        fired: true,
        category: "timeline",
        priority: 90,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Нужна ручная проверка по истории отказов."
      },
      {
        ruleId: "WARN-1",
        fired: true,
        category: "document",
        priority: 80,
        productType: "travel",
        output: { type: "warning", severity: "high" },
        consumedSignals: [],
        explanation: "Не хватает страховки. Нужна допроверка пакета."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: ["manual_review"],
        factors: []
      },
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s5-rf-italy-insurance",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 10,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 10,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createRequest(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: "s5-rf-italy-insurance",
    status: "in_review",
    channel: "telegram",
    contact: "@traveler",
    message: "Есть прошлый отказ и спорная страховка, прошу проверить кейс вручную.",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:30:00.000Z",
    closedAt: null,
    durability: "persisted",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-21T00:00:00.000Z",
      lastCheckedAt: "2026-04-21T00:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно подтвердить маршрут."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-21T00:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

function createAudit(): { trail: AuditTrail; decisions: DecisionLogEntry[] } {
  return {
    trail: createResult().auditTrail,
    decisions: [
      {
        id: "decision-1",
        caseId: "s5-rf-italy-insurance",
        verdict: "HUMAN_REVIEW",
        confidence: 0.42,
        summary: "Ушли в ручную проверку.",
        kind: "recompute",
        changedSignalIds: [],
        recordedAt: "2026-04-21T00:40:00.000Z"
      }
    ]
  };
}

describe("buildHumanReviewScreenModel", () => {
  it("builds an honest pipeline view for active requests", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: createRequest(),
      audit: null,
      humanReviewStatus: "ready"
    });

    expect(model.header.heading).toBe("Запрос уже в работе");
    expect(model.openReview?.pipeline[2]).toEqual({
      id: "in_review",
      label: "У человека",
      state: "current"
    });
    expect(model.openReview?.verdictLabel).toBe("Нужна ручная проверка");
    expect(model.overview.rows[2]?.text).toContain("хранится на сервере");
    expect(model.submitForm).toBeNull();
  });

  it("keeps submit flow and warning or audit sections ready for future UI", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult({ verdict: "GO" }),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: createAudit(),
      humanReviewStatus: "ready"
    });

    expect(model.submitForm?.channels).toHaveLength(2);
    expect(model.warningsSection?.items[0]?.pulseAmplitude).toBe(0.75);
    expect(model.auditSection?.history[0]?.label).toContain("Ушли в ручную проверку");
  });

  it("exposes a loading mode before the current case review state is known", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: null,
      humanReviewStatus: "loading"
    });

    expect(model.mode).toBe("loading");
    expect(model.loadingState?.title).toContain("Проверяем");
    expect(model.submitForm).toBeNull();
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/landingScreenModel.test.ts

````
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

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/resultScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildResultScreenModel } from "./resultScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    ruleResults: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 14.2,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 14.2,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createScenarioLab(): ScenarioLabPayload {
  const baseResult = createBaseResult();

  return {
    version: "scenario-lab.v1",
    caseId: "s1-rf-italy",
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать обязательные документы",
        summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
        recommended: true,
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Перейти к документам",
          detail: "Закройте недостающий чеклист.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        comparison: {
          verdictBefore: "GO",
          verdictAfter: "GO",
          confidenceBefore: 0.74,
          confidenceAfter: 0.82,
          primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
          primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
          resolvedRisks: [],
          remainingRisks: [],
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            requiredCount: 7,
            itemsToCollect: []
          },
          whyChanged: ["Чеклист становится полным."]
        },
        plan: {
          headline: "После этого сценария следующий шаг — перейти к документам.",
          firstSteps: ["Подготовить страховку."],
          criticalSteps: ["Не отправлять заявку с неполным пакетом."],
          canWait: [],
          humanReviewRequired: false,
          humanReviewReason: null
        }
      }
    ],
    recommendedScenarioId: "documents-ready",
    noHelpfulScenarios: false,
    humanReviewEscalation: {
      required: false,
      title: "Ручная проверка не нужна",
      detail: "По текущему кейсу есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildResultScreenModel", () => {
  it("keeps missing-docs cases anchored on the documents node", () => {
    const model = buildResultScreenModel({
      result: createBaseResult(),
      scenarioLab: createScenarioLab()
    });

    expect(model.heading).toBe("Подача возможна");
    expect(model.bridge.activeNodeId).toBe("docs");
    expect(model.workSection.rows[0]?.title).toBe("Страховка");
    expect(model.compareCard?.title).toBe("Добрать обязательные документы");
  });

  it("switches to honest review mode for human review verdicts", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "blocking",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["confidence"]
        }
      }),
      scenarioLab: null
    });

    expect(model.eyebrow).toBe("ручная проверка");
    expect(model.bridge.activeNodeId).toBe("review");
    expect(model.ai.summary).toContain("менеджера");
    expect(model.cta.targetScreen).toBe("human-review");
  });

  it("uses the next action as the work row when documents are already ready", () => {
    const result = createBaseResult({
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "documents",
        triggeredBy: ["primary_path"]
      },
      documents: {
        score: 1,
        readyCount: 7,
        requiredCount: 7,
        items: [
          {
            id: "insurance",
            label: "Страховка",
            status: "ready",
            detail: "Документ готов.",
            pathId: "italy_c_tourism"
          }
        ]
      }
    });

    const model = buildResultScreenModel({
      result,
      scenarioLab: null
    });

    expect(model.bridge.activeNodeId).toBe("step");
    expect(model.workSection.rows).toEqual([
      {
        id: "next-action",
        title: "Начать заявку",
        meta: "Можно переходить к следующему шагу.",
        status: "дальше",
        tone: "result"
      }
    ]);
  });

  it("falls back to product label when the primary path is absent", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        primaryPath: null,
        productType: "insurance_adult"
      }),
      scenarioLab: null
    });

    expect(model.meta).toBe("Страховой сценарий");
    expect(model.bridge.rightChip).toBe("Шенген 🇪🇺");
  });

  it("uses the canonical recommended scenario across compare, work section, and ai copy", () => {
    const scenarioLab = createScenarioLab();
    scenarioLab.scenarios = [
      {
        ...scenarioLab.scenarios[0],
        id: "fallback",
        title: "Первый, но не рекомендованный",
        summary: "Это просто запасной сценарий.",
        recommended: false
      },
      {
        ...scenarioLab.scenarios[0],
        id: "recommended-second",
        title: "Рекомендованный сценарий",
        summary: "Этот сценарий должен стать единым owner-ом на экране.",
        recommended: true
      }
    ];
    scenarioLab.recommendedScenarioId = "recommended-second";

    const model = buildResultScreenModel({
      result: createBaseResult({
        documents: {
          score: 1,
          readyCount: 7,
          requiredCount: 7,
          items: []
        }
      }),
      scenarioLab
    });

    expect(model.compareCard?.title).toBe("Рекомендованный сценарий");
    expect(model.workSection.rows[0]?.title).toBe("Рекомендованный сценарий");
    expect(model.ai.summary).toContain("Рекомендованный сценарий");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/03_screen_models/activeHolidays/trustScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildTrustScreenModel } from "./trustScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить дальше.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 1,
      readyCount: 5,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.83,
      confidenceBreakdown: {
        value: 0.83,
        base: 0.83,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.14,
      sources: [
        {
          id: "src_consulate",
          label: "Консульство",
          url: "https://example.com/consulate",
          tier: "official",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.1
        },
        {
          id: "src_operator",
          label: "Оператор",
          url: "https://example.com/operator",
          tier: "operator",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.2
        }
      ],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildTrustScreenModel", () => {
  it("adds stable source summaries and volatility copy", () => {
    const model = buildTrustScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.hero.badgeTone).toBe("positive");
    expect(model.sourcesSection.items[0]?.summary).toContain("Официальный источник");
    expect(model.sourcesSection.volatilityLabel).toContain("14%");
  });

  it("blocks trust details for human-review verdicts", () => {
    const model = buildTrustScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Доверие уточнит оператор");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/human-review/HumanReviewScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { HumanReviewScreen } from "./HumanReviewScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  Briefcase: iconStub,
  Phone: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "case-a",
      title: "Case A",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    },
    activeCaseId: "case-a",
    activeResult: {
      version: "rdc.v1",
      productType: "travel",
      caseId: "case-a",
      computedAt: "2026-04-21T00:00:00.000Z",
      verdict: "GO",
      primaryPath: null,
      alternativePaths: [],
      criticalRisk: null,
      risks: [],
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить дальше.",
        targetScreen: "result",
        triggeredBy: ["primary_path"]
      },
      decisionSignals: [],
      whyBullets: [],
      ruleResults: [],
      documents: {
        score: 1,
        readyCount: 5,
        requiredCount: 5,
        items: []
      },
      trust: {
        confidence: 0.8,
        confidenceBreakdown: {
          value: 0.8,
          base: 0.8,
          capsApplied: [],
          factors: []
        },
        volatilityScore: 0.1,
        sources: [],
        lastCheckedAt: "2026-04-21T00:00:00.000Z"
      },
      assumptions: [],
      auditTrail: {
        version: "rdc.v1",
        caseId: "case-a",
        startedAt: "2026-04-21T00:00:00.000Z",
        finishedAt: "2026-04-21T00:00:00.000Z",
        totalMs: 10,
        steps: [
          {
            index: 0,
            name: "assemblePayload",
            tookMs: 10,
            inputsSummary: "result",
            outputSummary: "payload",
            firedRuleIds: [],
            notes: []
          }
        ],
        preview: false
      },
      preview: false
    },
    activeHumanReview: null,
    scenarios: [
      {
        caseId: "case-a",
        productType: "travel",
        title: "A",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    loadHumanReview: vi.fn().mockResolvedValue(undefined),
    submitHumanReview: vi.fn().mockResolvedValue({ reused: false }),
    status: "ready",
    errorMessage: null,
    humanReviewStatus: "ready",
    humanReviewError: null,
    ...overrides
  } as any;
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("HumanReviewScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading block while current-case review state is still loading", () => {
    useCaseStoreMock.mockReturnValue(
      createStore({
        humanReviewStatus: "loading"
      })
    );

    renderScreen(<HumanReviewScreen />);

    expect(screen.getByText("Проверяем, есть ли активный запрос")).toBeInTheDocument();
  });

  it("resets draft fields when the case id changes", async () => {
    useCaseStoreMock.mockReturnValue(createStore());
    const view = renderScreen(<HumanReviewScreen />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
      ),
      { target: { value: "Черновик для первого кейса" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Телеграм" }));
    fireEvent.change(screen.getByPlaceholderText("@username"), {
      target: { value: "@draft_case_a" }
    });

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "case-b",
          title: "Case B",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-21T01:00:00.000Z",
          updatedAt: "2026-04-21T01:00:00.000Z"
        },
        activeCaseId: "case-b",
        activeResult: {
          ...createStore().activeResult,
          caseId: "case-b",
          auditTrail: {
            ...createStore().activeResult.auditTrail,
            caseId: "case-b"
          }
        }
      })
    );
    view.rerender(
      <MemoryRouter>
        <HumanReviewScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
        )
      ).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
    });
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/result/AiRecommendationPanel.test.tsx

````
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

const { apiClientMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }
  return {
    apiClientMock: {
      recommendationShortlist: vi.fn(),
      recommendationDetail: vi.fn(),
      compareScenario: vi.fn()
    },
    ApiErrorMock
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiClient: apiClientMock,
  ApiError: ApiErrorMock
}));

function renderPanel(overrides: Partial<ComponentProps<typeof AiRecommendationPanel>> = {}) {
  const onOpenScenario = vi.fn();
  render(
    <AiRecommendationPanel
      caseId="s1-rf-italy"
      computedAt="2026-04-19T09:55:00.000Z"
      preferences={[]}
      onOpenScenario={onOpenScenario}
      {...overrides}
    />
  );
  return { onOpenScenario };
}

describe("AiRecommendationPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads shortlist and the default detail view", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Самый прямой путь по текущему кейсу.",
          fitReason: "Сейчас это главный match по движку.",
          caution: "Нужно добрать документы."
        }
      ],
      disclaimer: "Fallback shortlist."
    });
    apiClientMock.recommendationDetail.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      offerId: "italy_c_tourism",
      generatedAt: "2026-04-19T10:00:05.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      fit: "best_match",
      title: "Шенген C",
      summary: "Подходит лучше других по текущим сигналам.",
      whyThisFits: ["Есть рабочий путь.", "Сроки понятны."],
      watchouts: ["Нужно добрать документы."],
      nextSteps: ["Перейти к документам."],
      trustSignals: ["Уверенность 74%."],
      disclaimer: "Fallback detail."
    });

    renderPanel();

    expect(screen.getByText("AI-разбор рекомендаций")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClientMock.recommendationShortlist).toHaveBeenCalledWith("s1-rf-italy");
    });

    expect((await screen.findAllByText("Шенген C")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Подходит лучше других по текущим сигналам.")).toBeInTheDocument();
    expect(screen.getByText("уже основной вариант")).toBeInTheDocument();
    expect(screen.getByText("Fallback detail.")).toBeInTheDocument();
  });

  it("loads follow-up detail when the user switches shortlist item", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    expect(await screen.findByText("Главный путь.")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);

    await waitFor(() => {
      expect(apiClientMock.recommendationDetail).toHaveBeenCalledWith(
        "s1-rf-italy",
        "italy_d_digital_nomad"
      );
    });

    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить движком" })).toBeInTheDocument();
    expect(screen.getByText("Detail 2.")).toBeInTheDocument();
  });

  it("shows non-primary pre-compare steps from detail payload", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Перейти к документам."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: [
          "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
          "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
          "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
        ],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();

    expect(screen.getByText("Что проверить перед compare")).toBeInTheDocument();
    expect(screen.queryAllByText("Следующие шаги")).toHaveLength(0);
    expect(
      screen.queryAllByText("Заполнить baseline-форму по текущему next action.")
    ).toHaveLength(0);
    expect(
      screen.getByText(
        "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта."
      )
    ).toBeInTheDocument();
  });

  it("runs deterministic compare for an alternative and opens the fork scenario", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });
    apiClientMock.compareScenario.mockResolvedValue({
      rootCaseId: "s1-rf-italy",
      baseline: {
        outcome: {
          verdict: "GO",
          confidence: 0.74,
          primaryPathLabel: "Шенген C"
        }
      },
      candidateCase: {
        id: "s1-rf-italy-fork-1"
      },
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу."
          },
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          }
        },
        delta: {
          confidenceDelta: -0.13
        }
      }
    });

    const { onOpenScenario } = renderPanel({
      preferences: [{ id: "italy_c_tourism", weight: 0.4 }]
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByRole("button", { name: "Проверить движком" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Проверить движком" }));

    await waitFor(() => {
      expect(apiClientMock.compareScenario).toHaveBeenCalledWith("s1-rf-italy", {
        title: "AI-проверка · Digital Nomad",
        signals: [],
        preferences: [
          { id: "italy_c_tourism", weight: 0.4 },
          { id: "italy_d_digital_nomad", weight: 1 }
        ]
      });
    });

    expect(await screen.findByText("Можно ехать → Нужна проверка менеджером")).toBeInTheDocument();
    expect(screen.getByText("Нужна ручная сверка по доходу.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный сценарий" }));
    expect(onOpenScenario).toHaveBeenCalledWith("s1-rf-italy-fork-1");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/result/ResultScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  layoutId: _layoutId,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  layoutId?: string;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  ArrowLeft: iconStub,
  ArrowRight: iconStub,
  MoreHorizontal: iconStub,
  Sparkles: iconStub,
  X: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/instrumentation/events", () => ({
  track: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

vi.mock("./AiRecommendationPanel", () => ({
  AiRecommendationPanel: () => <div data-testid="ai-recommendation-panel">AI panel</div>
}));

vi.mock("./ResultCompareSurface", () => ({
  ResultCompareSurface: () => <div data-testid="compare-surface">Compare surface</div>
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  const activeResult = {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-17T10:00:00.000Z",
    verdict: "GO",
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить к следующему шагу.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-17T10:00:00.000Z"
    },
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    decisionSignals: [],
    ruleResults: [],
    assumptions: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    auditTrail: {
      totalMs: 14.2
    },
    preview: false
  };

  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult,
    activeScenarioLab: {
      version: "scenario-lab.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-17T10:00:00.000Z",
      baseResult: activeResult,
      issues: [],
      scenarios: [
        {
          id: "documents-ready",
          type: "documents",
          title: "Добрать обязательные документы",
          summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
          recommended: true,
          nextAction: {
            type: "upload_missing_docs",
            priority: "blocking",
            label: "Перейти к документам",
            detail: "Закройте недостающий чеклист.",
            targetScreen: "documents",
            triggeredBy: ["documents_ready_count"]
          },
          comparison: {
            verdictBefore: "GO",
            verdictAfter: "GO",
            confidenceBefore: 0.74,
            confidenceAfter: 0.82,
            primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
            primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
            resolvedRisks: [],
            remainingRisks: [],
            documents: {
              readyCountBefore: 5,
              readyCountAfter: 7,
              requiredCount: 7,
              itemsToCollect: []
            },
            whyChanged: ["Чеклист становится полным."]
          },
          plan: {
            headline: "После этого сценария следующий шаг — перейти к документам.",
            firstSteps: ["Подготовить страховку."],
            criticalSteps: ["Не отправлять заявку с неполным пакетом."],
            canWait: [],
            humanReviewRequired: false,
            humanReviewReason: null
          }
        }
      ],
      recommendedScenarioId: "documents-ready",
      noHelpfulScenarios: false,
      humanReviewEscalation: {
        required: false,
        title: "Ручная проверка не нужна",
        detail: "По текущему кейсу есть автоматический сценарий.",
        triggeredBy: []
      }
    },
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
    scenarioLabStatus: "ready",
    scenarioLabError: null,
    status: "ready",
    errorMessage: null,
    ...overrides
  } as any;
}

function renderScreen(screenNode: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{screenNode}</MemoryRouter>);
}

describe("ResultScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the vertical default case when the active case belongs to another product", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("ignores a foreign case query param on product-specific routes", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        scenarios: [
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
        ],
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />, [
      "/insurance-adult?case=s1-rf-italy"
    ]);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("renders manual review state without a fake confirmed path", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          primaryPath: null,
          nextAction: {
            type: "send_for_review",
            priority: "human_review",
            label: "Передать менеджеру",
            detail: "Автомат не может честно подтвердить маршрут.",
            targetScreen: "human-review",
            triggeredBy: ["human_review_trigger"]
          }
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getByText("Нужна ручная проверка")).toBeInTheDocument();
    expect(screen.getAllByText("Передать менеджеру").length).toBeGreaterThan(0);
    expect(screen.getByText("Нужен оператор")).toBeInTheDocument();
    expect(screen.queryByText("Маршрут подтверждён")).not.toBeInTheDocument();
  });

  it("opens the basis sheet from the utility action", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Основание" }));

    await waitFor(() => {
      expect(screen.getByText("Основание решения")).toBeInTheDocument();
      expect(screen.getByText("Маршрут подтверждён по текущим сигналам.")).toBeInTheDocument();
    });
  });

  it("opens compare and AI sheets from secondary actions", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Сравнить" }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-surface")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /AI: сначала/i }));
    fireEvent.click(screen.getByRole("button", { name: "Полный разбор" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-recommendation-panel")).toBeInTheDocument();
    });
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/active-holidays-m1-input-pack-2026-04-25/04_screens/src-screens/screenRouting.test.tsx

````
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

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/02_contracts/shared-contracts/decisions.compat.test.ts

````
import { describe, expect, it } from "vitest";
import {
  decisionLedgerSchema,
  decisionsLogSchema,
  decisionLedgerEntrySchema,
  decisionLogEntrySchema,
  decisionRecordSchema,
  decisionRecordToLogEntry,
  isDecisionRecord,
  type DecisionLogEntry,
  type DecisionRecord
} from "./decisions";

const LEGACY: DecisionLogEntry = {
  id: "log_s1_init",
  caseId: "s1-rf-italy",
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.62,
  summary: "Исходный пересчёт: шенген C возможен, но нужна страховка и проверка дат.",
  kind: "recompute",
  changedSignalIds: [],
  recordedAt: "2026-04-15T10:00:00.000Z"
};

const RECORD: DecisionRecord = {
  decisionId: "dec_s1_1",
  caseId: "s1-rf-italy",
  engineVersion: "rdc.v1",
  engineRevision: "2026.04.18",
  computedAt: "2026-04-17T09:00:00.000Z",
  recordedAt: "2026-04-17T09:00:00.000Z",
  inputFingerprint: "a".repeat(64),
  catalogFingerprint: "b".repeat(64),
  resultFingerprint: "c".repeat(64),
  replayableSnapshot: null,
  result: null,
  auditTrail: null,
  verdict: "GO_WITH_CONDITIONS",
  confidence: 0.79,
  summary: "recompute",
  kind: "recompute",
  changedSignalIds: [],
  changedPreferenceIds: []
};

describe("decisionLedgerEntrySchema", () => {
  it("accepts the legacy DecisionLogEntry shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(LEGACY);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(false);
    }
  });

  it("accepts the new DecisionRecord shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse(RECORD);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isDecisionRecord(parsed.data)).toBe(true);
    }
  });

  it("rejects entries that match neither shape", () => {
    const parsed = decisionLedgerEntrySchema.safeParse({
      id: "missing_case_id"
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps decisionsLogSchema legacy-only for old API consumers", () => {
    const parsed = decisionsLogSchema.safeParse([LEGACY]);
    expect(parsed.success).toBe(true);
  });

  it("accepts mixed legacy and full records in decisionLedgerSchema", () => {
    const parsed = decisionLedgerSchema.safeParse([LEGACY, RECORD]);
    expect(parsed.success).toBe(true);
  });
});

describe("decisionRecordToLogEntry", () => {
  it("projects a record onto the legacy shape that the old API uses", () => {
    const entry = decisionRecordToLogEntry(RECORD);
    const parsed = decisionLogEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
    expect(entry.id).toBe(RECORD.decisionId);
    expect(entry.verdict).toBe(RECORD.verdict);
    expect(entry.confidence).toBe(RECORD.confidence);
    expect(entry.summary).toBe(RECORD.summary);
    expect(entry.kind).toBe(RECORD.kind);
    expect(entry.changedSignalIds).toEqual(RECORD.changedSignalIds);
    expect(entry.recordedAt).toBe(RECORD.recordedAt);
  });
});

describe("decisionRecordSchema", () => {
  it("rejects a record with an invalid fingerprint", () => {
    const bad = { ...RECORD, inputFingerprint: "not-a-hash" };
    const parsed = decisionRecordSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/03_screen_models/activeHolidays/documentsScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildDocumentsScreenModel } from "./documentsScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 0.6,
      readyCount: 3,
      requiredCount: 5,
      items: [
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        },
        {
          id: "insurance",
          label: "Страховка",
          status: "ready",
          detail: "Полис уже загружен.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.7,
      confidenceBreakdown: {
        value: 0.7,
        base: 0.7,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.1,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildDocumentsScreenModel", () => {
  it("builds readiness and next-step copy from result payload", () => {
    const model = buildDocumentsScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.readiness.badgeTone).toBe("warning");
    expect(model.requirements.items).toHaveLength(2);
    expect(model.nextStep.description).toBe("Закройте недостающий чеклист.");
  });

  it("switches to a review gate for human-review verdicts", () => {
    const model = buildDocumentsScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Документный трек откроет оператор");
    expect(model.gate?.actionLabel).toBe("Вернуться к ручной проверке");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/03_screen_models/activeHolidays/humanReviewScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewRequest,
  ResultPayload
} from "@shared/contracts";
import { buildHumanReviewScreenModel } from "./humanReviewScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s5-rf-italy-insurance",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "HUMAN_REVIEW",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "send_for_review",
      priority: "blocking",
      label: "Передать кейс менеджеру",
      detail: "Автомат не может честно подтвердить маршрут.",
      targetScreen: "human-review",
      triggeredBy: ["confidence"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [
      {
        ruleId: "HR-1",
        fired: true,
        category: "timeline",
        priority: 90,
        productType: "travel",
        output: { type: "human_review_trigger" },
        consumedSignals: [],
        explanation: "Нужна ручная проверка по истории отказов."
      },
      {
        ruleId: "WARN-1",
        fired: true,
        category: "document",
        priority: 80,
        productType: "travel",
        output: { type: "warning", severity: "high" },
        consumedSignals: [],
        explanation: "Не хватает страховки. Нужна допроверка пакета."
      }
    ],
    documents: {
      score: 0.4,
      readyCount: 2,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.42,
      confidenceBreakdown: {
        value: 0.42,
        base: 0.42,
        capsApplied: ["manual_review"],
        factors: []
      },
      volatilityScore: 0.2,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s5-rf-italy-insurance",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 10,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 10,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createRequest(overrides: Partial<HumanReviewRequest> = {}): HumanReviewRequest {
  return {
    id: "hr-1",
    caseId: "s5-rf-italy-insurance",
    status: "in_review",
    channel: "telegram",
    contact: "@traveler",
    message: "Есть прошлый отказ и спорная страховка, прошу проверить кейс вручную.",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:30:00.000Z",
    closedAt: null,
    durability: "persisted",
    snapshot: {
      decisionId: null,
      verdict: "HUMAN_REVIEW",
      confidence: 0.42,
      computedAt: "2026-04-21T00:00:00.000Z",
      lastCheckedAt: "2026-04-21T00:00:00.000Z",
      nextActionLabel: "Передать кейс менеджеру",
      summary: "Автомат не может честно подтвердить маршрут."
    },
    events: [
      {
        id: "event-1",
        at: "2026-04-21T00:00:00.000Z",
        type: "submitted",
        status: "submitted",
        changedBy: "traveler",
        note: null
      }
    ],
    ...overrides
  };
}

function createAudit(): { trail: AuditTrail; decisions: DecisionLogEntry[] } {
  return {
    trail: createResult().auditTrail,
    decisions: [
      {
        id: "decision-1",
        caseId: "s5-rf-italy-insurance",
        verdict: "HUMAN_REVIEW",
        confidence: 0.42,
        summary: "Ушли в ручную проверку.",
        kind: "recompute",
        changedSignalIds: [],
        recordedAt: "2026-04-21T00:40:00.000Z"
      }
    ]
  };
}

describe("buildHumanReviewScreenModel", () => {
  it("builds an honest pipeline view for active requests", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: createRequest(),
      audit: null,
      humanReviewStatus: "ready"
    });

    expect(model.header.heading).toBe("Запрос уже в работе");
    expect(model.openReview?.pipeline[2]).toEqual({
      id: "in_review",
      label: "У человека",
      state: "current"
    });
    expect(model.openReview?.verdictLabel).toBe("Нужна ручная проверка");
    expect(model.overview.rows[2]?.text).toContain("хранится на сервере");
    expect(model.submitForm).toBeNull();
  });

  it("keeps submit flow and warning or audit sections ready for future UI", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult({ verdict: "GO" }),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: createAudit(),
      humanReviewStatus: "ready"
    });

    expect(model.submitForm?.channels).toHaveLength(2);
    expect(model.warningsSection?.items[0]?.pulseAmplitude).toBe(0.75);
    expect(model.auditSection?.history[0]?.label).toContain("Ушли в ручную проверку");
  });

  it("exposes a loading mode before the current case review state is known", () => {
    const model = buildHumanReviewScreenModel({
      result: createResult(),
      caseUpdatedAt: "2026-04-21T00:45:00.000Z",
      request: null,
      audit: null,
      humanReviewStatus: "loading"
    });

    expect(model.mode).toBe("loading");
    expect(model.loadingState?.title).toContain("Проверяем");
    expect(model.submitForm).toBeNull();
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/03_screen_models/activeHolidays/landingScreenModel.test.ts

````
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

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/03_screen_models/activeHolidays/resultScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload, ScenarioLabPayload } from "@shared/contracts";
import { buildResultScreenModel } from "./resultScreenModel";

function createBaseResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "upload_missing_docs",
      priority: "blocking",
      label: "Собрать документы",
      detail: "Закройте недостающий чеклист.",
      targetScreen: "documents",
      triggeredBy: ["documents"]
    },
    decisionSignals: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    ruleResults: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 14.2,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 14.2,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

function createScenarioLab(): ScenarioLabPayload {
  const baseResult = createBaseResult();

  return {
    version: "scenario-lab.v1",
    caseId: "s1-rf-italy",
    generatedAt: "2026-04-21T00:00:00.000Z",
    baseResult,
    issues: [],
    scenarios: [
      {
        id: "documents-ready",
        type: "documents",
        title: "Добрать обязательные документы",
        summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
        recommended: true,
        nextAction: {
          type: "upload_missing_docs",
          priority: "blocking",
          label: "Перейти к документам",
          detail: "Закройте недостающий чеклист.",
          targetScreen: "documents",
          triggeredBy: ["documents_ready_count"]
        },
        comparison: {
          verdictBefore: "GO",
          verdictAfter: "GO",
          confidenceBefore: 0.74,
          confidenceAfter: 0.82,
          primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
          primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
          resolvedRisks: [],
          remainingRisks: [],
          documents: {
            readyCountBefore: 5,
            readyCountAfter: 7,
            requiredCount: 7,
            itemsToCollect: []
          },
          whyChanged: ["Чеклист становится полным."]
        },
        plan: {
          headline: "После этого сценария следующий шаг — перейти к документам.",
          firstSteps: ["Подготовить страховку."],
          criticalSteps: ["Не отправлять заявку с неполным пакетом."],
          canWait: [],
          humanReviewRequired: false,
          humanReviewReason: null
        }
      }
    ],
    recommendedScenarioId: "documents-ready",
    noHelpfulScenarios: false,
    humanReviewEscalation: {
      required: false,
      title: "Ручная проверка не нужна",
      detail: "По текущему кейсу есть автоматический сценарий.",
      triggeredBy: []
    }
  };
}

describe("buildResultScreenModel", () => {
  it("keeps missing-docs cases anchored on the documents node", () => {
    const model = buildResultScreenModel({
      result: createBaseResult(),
      scenarioLab: createScenarioLab()
    });

    expect(model.heading).toBe("Подача возможна");
    expect(model.bridge.activeNodeId).toBe("docs");
    expect(model.workSection.rows[0]?.title).toBe("Страховка");
    expect(model.compareCard?.title).toBe("Добрать обязательные документы");
  });

  it("switches to honest review mode for human review verdicts", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        verdict: "HUMAN_REVIEW",
        nextAction: {
          type: "send_for_review",
          priority: "blocking",
          label: "Передать кейс менеджеру",
          detail: "Автомат не может честно подтвердить маршрут.",
          targetScreen: "human-review",
          triggeredBy: ["confidence"]
        }
      }),
      scenarioLab: null
    });

    expect(model.eyebrow).toBe("ручная проверка");
    expect(model.bridge.activeNodeId).toBe("review");
    expect(model.ai.summary).toContain("менеджера");
    expect(model.cta.targetScreen).toBe("human-review");
  });

  it("uses the next action as the work row when documents are already ready", () => {
    const result = createBaseResult({
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить к следующему шагу.",
        targetScreen: "documents",
        triggeredBy: ["primary_path"]
      },
      documents: {
        score: 1,
        readyCount: 7,
        requiredCount: 7,
        items: [
          {
            id: "insurance",
            label: "Страховка",
            status: "ready",
            detail: "Документ готов.",
            pathId: "italy_c_tourism"
          }
        ]
      }
    });

    const model = buildResultScreenModel({
      result,
      scenarioLab: null
    });

    expect(model.bridge.activeNodeId).toBe("step");
    expect(model.workSection.rows).toEqual([
      {
        id: "next-action",
        title: "Начать заявку",
        meta: "Можно переходить к следующему шагу.",
        status: "дальше",
        tone: "result"
      }
    ]);
  });

  it("falls back to product label when the primary path is absent", () => {
    const model = buildResultScreenModel({
      result: createBaseResult({
        primaryPath: null,
        productType: "insurance_adult"
      }),
      scenarioLab: null
    });

    expect(model.meta).toBe("Страховой сценарий");
    expect(model.bridge.rightChip).toBe("Шенген 🇪🇺");
  });

  it("uses the canonical recommended scenario across compare, work section, and ai copy", () => {
    const scenarioLab = createScenarioLab();
    scenarioLab.scenarios = [
      {
        ...scenarioLab.scenarios[0],
        id: "fallback",
        title: "Первый, но не рекомендованный",
        summary: "Это просто запасной сценарий.",
        recommended: false
      },
      {
        ...scenarioLab.scenarios[0],
        id: "recommended-second",
        title: "Рекомендованный сценарий",
        summary: "Этот сценарий должен стать единым owner-ом на экране.",
        recommended: true
      }
    ];
    scenarioLab.recommendedScenarioId = "recommended-second";

    const model = buildResultScreenModel({
      result: createBaseResult({
        documents: {
          score: 1,
          readyCount: 7,
          requiredCount: 7,
          items: []
        }
      }),
      scenarioLab
    });

    expect(model.compareCard?.title).toBe("Рекомендованный сценарий");
    expect(model.workSection.rows[0]?.title).toBe("Рекомендованный сценарий");
    expect(model.ai.summary).toContain("Рекомендованный сценарий");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/03_screen_models/activeHolidays/trustScreenModel.test.ts

````
import { describe, expect, it } from "vitest";
import type { ResultPayload } from "@shared/contracts";
import { buildTrustScreenModel } from "./trustScreenModel";

function createResult(overrides: Partial<ResultPayload> = {}): ResultPayload {
  return {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-21T00:00:00.000Z",
    verdict: "GO",
    primaryPath: null,
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить дальше.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    decisionSignals: [],
    whyBullets: [],
    ruleResults: [],
    documents: {
      score: 1,
      readyCount: 5,
      requiredCount: 5,
      items: []
    },
    trust: {
      confidence: 0.83,
      confidenceBreakdown: {
        value: 0.83,
        base: 0.83,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.14,
      sources: [
        {
          id: "src_consulate",
          label: "Консульство",
          url: "https://example.com/consulate",
          tier: "official",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.1
        },
        {
          id: "src_operator",
          label: "Оператор",
          url: "https://example.com/operator",
          tier: "operator",
          lastCheckedAt: "2026-04-21T00:00:00.000Z",
          volatilityScore: 0.2
        }
      ],
      lastCheckedAt: "2026-04-21T00:00:00.000Z"
    },
    assumptions: [],
    auditTrail: {
      version: "rdc.v1",
      caseId: "s1-rf-italy",
      startedAt: "2026-04-21T00:00:00.000Z",
      finishedAt: "2026-04-21T00:00:00.000Z",
      totalMs: 12,
      steps: [
        {
          index: 0,
          name: "assemblePayload",
          tookMs: 12,
          inputsSummary: "result",
          outputSummary: "payload",
          firedRuleIds: [],
          notes: []
        }
      ],
      preview: false
    },
    preview: false,
    ...overrides
  };
}

describe("buildTrustScreenModel", () => {
  it("adds stable source summaries and volatility copy", () => {
    const model = buildTrustScreenModel({ result: createResult() });

    expect(model.gate).toBeNull();
    expect(model.hero.badgeTone).toBe("positive");
    expect(model.sourcesSection.items[0]?.summary).toContain("Официальный источник");
    expect(model.sourcesSection.volatilityLabel).toContain("14%");
  });

  it("blocks trust details for human-review verdicts", () => {
    const model = buildTrustScreenModel({
      result: createResult({ verdict: "HUMAN_REVIEW" })
    });

    expect(model.gate?.title).toBe("Доверие уточнит оператор");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/04_screens/src-screens/human-review/HumanReviewScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { HumanReviewScreen } from "./HumanReviewScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  Briefcase: iconStub,
  Phone: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    activeCase: {
      id: "case-a",
      title: "Case A",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    },
    activeCaseId: "case-a",
    activeResult: {
      version: "rdc.v1",
      productType: "travel",
      caseId: "case-a",
      computedAt: "2026-04-21T00:00:00.000Z",
      verdict: "GO",
      primaryPath: null,
      alternativePaths: [],
      criticalRisk: null,
      risks: [],
      nextAction: {
        type: "start_application",
        priority: "path",
        label: "Начать заявку",
        detail: "Можно переходить дальше.",
        targetScreen: "result",
        triggeredBy: ["primary_path"]
      },
      decisionSignals: [],
      whyBullets: [],
      ruleResults: [],
      documents: {
        score: 1,
        readyCount: 5,
        requiredCount: 5,
        items: []
      },
      trust: {
        confidence: 0.8,
        confidenceBreakdown: {
          value: 0.8,
          base: 0.8,
          capsApplied: [],
          factors: []
        },
        volatilityScore: 0.1,
        sources: [],
        lastCheckedAt: "2026-04-21T00:00:00.000Z"
      },
      assumptions: [],
      auditTrail: {
        version: "rdc.v1",
        caseId: "case-a",
        startedAt: "2026-04-21T00:00:00.000Z",
        finishedAt: "2026-04-21T00:00:00.000Z",
        totalMs: 10,
        steps: [
          {
            index: 0,
            name: "assemblePayload",
            tookMs: 10,
            inputsSummary: "result",
            outputSummary: "payload",
            firedRuleIds: [],
            notes: []
          }
        ],
        preview: false
      },
      preview: false
    },
    activeHumanReview: null,
    scenarios: [
      {
        caseId: "case-a",
        productType: "travel",
        title: "A",
        subtitle: "",
        expectedVerdict: "GO",
        expectedActionType: "start_application",
        expectedPrimaryPath: null,
        note: ""
      }
    ],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    loadHumanReview: vi.fn().mockResolvedValue(undefined),
    submitHumanReview: vi.fn().mockResolvedValue({ reused: false }),
    status: "ready",
    errorMessage: null,
    humanReviewStatus: "ready",
    humanReviewError: null,
    ...overrides
  } as any;
}

function renderScreen(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("HumanReviewScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading block while current-case review state is still loading", () => {
    useCaseStoreMock.mockReturnValue(
      createStore({
        humanReviewStatus: "loading"
      })
    );

    renderScreen(<HumanReviewScreen />);

    expect(screen.getByText("Проверяем, есть ли активный запрос")).toBeInTheDocument();
  });

  it("resets draft fields when the case id changes", async () => {
    useCaseStoreMock.mockReturnValue(createStore());
    const view = renderScreen(<HumanReviewScreen />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
      ),
      { target: { value: "Черновик для первого кейса" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Телеграм" }));
    fireEvent.change(screen.getByPlaceholderText("@username"), {
      target: { value: "@draft_case_a" }
    });

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCase: {
          id: "case-b",
          title: "Case B",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-21T01:00:00.000Z",
          updatedAt: "2026-04-21T01:00:00.000Z"
        },
        activeCaseId: "case-b",
        activeResult: {
          ...createStore().activeResult,
          caseId: "case-b",
          auditTrail: {
            ...createStore().activeResult.auditTrail,
            caseId: "case-b"
          }
        }
      })
    );
    view.rerender(
      <MemoryRouter>
        <HumanReviewScreen />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас."
        )
      ).toHaveValue("");
      expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("");
    });
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/04_screens/src-screens/result/AiRecommendationPanel.test.tsx

````
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

const { apiClientMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }
  return {
    apiClientMock: {
      recommendationShortlist: vi.fn(),
      recommendationDetail: vi.fn(),
      compareScenario: vi.fn()
    },
    ApiErrorMock
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiClient: apiClientMock,
  ApiError: ApiErrorMock
}));

function renderPanel(overrides: Partial<ComponentProps<typeof AiRecommendationPanel>> = {}) {
  const onOpenScenario = vi.fn();
  render(
    <AiRecommendationPanel
      caseId="s1-rf-italy"
      computedAt="2026-04-19T09:55:00.000Z"
      preferences={[]}
      onOpenScenario={onOpenScenario}
      {...overrides}
    />
  );
  return { onOpenScenario };
}

describe("AiRecommendationPanel", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads shortlist and the default detail view", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Самый прямой путь по текущему кейсу.",
          fitReason: "Сейчас это главный match по движку.",
          caution: "Нужно добрать документы."
        }
      ],
      disclaimer: "Fallback shortlist."
    });
    apiClientMock.recommendationDetail.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      offerId: "italy_c_tourism",
      generatedAt: "2026-04-19T10:00:05.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "fallback",
      fit: "best_match",
      title: "Шенген C",
      summary: "Подходит лучше других по текущим сигналам.",
      whyThisFits: ["Есть рабочий путь.", "Сроки понятны."],
      watchouts: ["Нужно добрать документы."],
      nextSteps: ["Перейти к документам."],
      trustSignals: ["Уверенность 74%."],
      disclaimer: "Fallback detail."
    });

    renderPanel();

    expect(screen.getByText("AI-разбор рекомендаций")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClientMock.recommendationShortlist).toHaveBeenCalledWith("s1-rf-italy");
    });

    expect((await screen.findAllByText("Шенген C")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Подходит лучше других по текущим сигналам.")).toBeInTheDocument();
    expect(screen.getByText("уже основной вариант")).toBeInTheDocument();
    expect(screen.getByText("Fallback detail.")).toBeInTheDocument();
  });

  it("loads follow-up detail when the user switches shortlist item", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    expect(await screen.findByText("Главный путь.")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);

    await waitFor(() => {
      expect(apiClientMock.recommendationDetail).toHaveBeenCalledWith(
        "s1-rf-italy",
        "italy_d_digital_nomad"
      );
    });

    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить движком" })).toBeInTheDocument();
    expect(screen.getByText("Detail 2.")).toBeInTheDocument();
  });

  it("shows non-primary pre-compare steps from detail payload", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Перейти к документам."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: [
          "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта.",
          "Сверьте вердикт, confidence и основной путь в compare с базовым результатом.",
          "Действуйте только по блоку «Что делать после compare», а не по baseline-шагам."
        ],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });

    renderPanel();

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByText("Нужен follow-up разбор альтернативы.")).toBeInTheDocument();

    expect(screen.getByText("Что проверить перед compare")).toBeInTheDocument();
    expect(screen.queryAllByText("Следующие шаги")).toHaveLength(0);
    expect(
      screen.queryAllByText("Заполнить baseline-форму по текущему next action.")
    ).toHaveLength(0);
    expect(
      screen.getByText(
        "Запустите «Проверить движком», чтобы получить отдельный fork-сценарий для этого варианта."
      )
    ).toBeInTheDocument();
  });

  it("runs deterministic compare for an alternative and opens the fork scenario", async () => {
    apiClientMock.recommendationShortlist.mockResolvedValue({
      version: "recommendation-ai.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-19T10:00:00.000Z",
      basedOnComputedAt: "2026-04-19T09:55:00.000Z",
      source: "openai",
      recommendedOfferId: "italy_c_tourism",
      items: [
        {
          offerId: "italy_c_tourism",
          rank: 1,
          fit: "best_match",
          title: "Шенген C",
          summary: "Главный вариант.",
          fitReason: "Лучший score.",
          caution: "Проверить пакет."
        },
        {
          offerId: "italy_d_digital_nomad",
          rank: 2,
          fit: "good_option",
          title: "Digital Nomad",
          summary: "Альтернативный путь.",
          fitReason: "Подходит при другом горизонте.",
          caution: "Доход на грани."
        }
      ],
      disclaimer: "OpenAI shortlist."
    });
    apiClientMock.recommendationDetail
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_c_tourism",
        generatedAt: "2026-04-19T10:00:05.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "best_match",
        title: "Шенген C",
        summary: "Главный путь.",
        whyThisFits: ["Путь согласован."],
        watchouts: ["Проверить документы."],
        nextSteps: ["Открыть следующий шаг."],
        trustSignals: ["Уверенность 74%."],
        disclaimer: "Detail 1."
      })
      .mockResolvedValueOnce({
        version: "recommendation-ai.v1",
        caseId: "s1-rf-italy",
        offerId: "italy_d_digital_nomad",
        generatedAt: "2026-04-19T10:00:06.000Z",
        basedOnComputedAt: "2026-04-19T09:55:00.000Z",
        source: "openai",
        fit: "good_option",
        title: "Digital Nomad",
        summary: "Нужен follow-up разбор альтернативы.",
        whyThisFits: ["Есть запасной путь."],
        watchouts: ["Нужен доход выше."],
        nextSteps: ["Сверить условия."],
        trustSignals: ["Уверенность ниже."],
        disclaimer: "Detail 2."
      });
    apiClientMock.compareScenario.mockResolvedValue({
      rootCaseId: "s1-rf-italy",
      baseline: {
        outcome: {
          verdict: "GO",
          confidence: 0.74,
          primaryPathLabel: "Шенген C"
        }
      },
      candidateCase: {
        id: "s1-rf-italy-fork-1"
      },
      comparison: {
        baseline: {
          outcome: {
            verdict: "GO",
            confidence: 0.74,
            primaryPathLabel: "Шенген C"
          }
        },
        candidate: {
          actionPlan: {
            headline: "Нужна ручная сверка по доходу.",
            detail: "Сначала проверьте, проходит ли нижний порог по доходу."
          },
          outcome: {
            verdict: "HUMAN_REVIEW",
            confidence: 0.61,
            primaryPathLabel: "Digital Nomad"
          }
        },
        delta: {
          confidenceDelta: -0.13
        }
      }
    });

    const { onOpenScenario } = renderPanel({
      preferences: [{ id: "italy_c_tourism", weight: 0.4 }]
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /Digital Nomad/i }))[0]);
    expect(await screen.findByRole("button", { name: "Проверить движком" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Проверить движком" }));

    await waitFor(() => {
      expect(apiClientMock.compareScenario).toHaveBeenCalledWith("s1-rf-italy", {
        title: "AI-проверка · Digital Nomad",
        signals: [],
        preferences: [
          { id: "italy_c_tourism", weight: 0.4 },
          { id: "italy_d_digital_nomad", weight: 1 }
        ]
      });
    });

    expect(await screen.findByText("Можно ехать → Нужна проверка менеджером")).toBeInTheDocument();
    expect(screen.getByText("Нужна ручная сверка по доходу.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть полный сценарий" }));
    expect(onOpenScenario).toHaveBeenCalledWith("s1-rf-italy-fork-1");
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/04_screens/src-screens/result/ResultScreen.test.tsx

````
import type { HTMLAttributes, ReactNode, SVGProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ResultScreen } from "./ResultScreen";
import { useCaseStore } from "@/state/caseStore";

function motionStub({
  children,
  initial: _initial,
  animate: _animate,
  exit: _exit,
  transition: _transition,
  variants: _variants,
  layoutId: _layoutId,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  variants?: unknown;
  layoutId?: string;
}) {
  return <div {...props}>{children}</div>;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: motionStub,
    section: motionStub
  }
}));

function iconStub(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}

vi.mock("lucide-react", () => ({
  ArrowLeft: iconStub,
  ArrowRight: iconStub,
  MoreHorizontal: iconStub,
  Sparkles: iconStub,
  X: iconStub
}));

vi.mock("@/state/caseStore", () => ({
  useCaseStore: vi.fn()
}));

vi.mock("@/instrumentation/screenView", () => ({
  useScreenView: vi.fn()
}));

vi.mock("@/instrumentation/events", () => ({
  track: vi.fn()
}));

vi.mock("@/ui/Toast", () => ({
  useToast: () => ({ push: vi.fn() })
}));

vi.mock("./AiRecommendationPanel", () => ({
  AiRecommendationPanel: () => <div data-testid="ai-recommendation-panel">AI panel</div>
}));

vi.mock("./ResultCompareSurface", () => ({
  ResultCompareSurface: () => <div data-testid="compare-surface">Compare surface</div>
}));

const useCaseStoreMock = vi.mocked(useCaseStore);

function createStore(overrides: Partial<Record<string, unknown>> = {}) {
  const activeResult = {
    version: "rdc.v1",
    productType: "travel",
    caseId: "s1-rf-italy",
    computedAt: "2026-04-17T10:00:00.000Z",
    verdict: "GO",
    nextAction: {
      type: "start_application",
      priority: "path",
      label: "Начать заявку",
      detail: "Можно переходить к следующему шагу.",
      targetScreen: "documents",
      triggeredBy: ["primary_path"]
    },
    trust: {
      confidence: 0.74,
      confidenceBreakdown: {
        value: 0.74,
        base: 0.74,
        capsApplied: [],
        factors: []
      },
      volatilityScore: 0.12,
      sources: [],
      lastCheckedAt: "2026-04-17T10:00:00.000Z"
    },
    primaryPath: {
      id: "italy_c_tourism",
      productType: "travel",
      title: "Шенген C",
      kind: "consular_visa",
      citizenship: "RU",
      destination: "IT",
      processingWeeks: 4,
      estCostRub: 15000,
      description: "Основной маршрут",
      requirements: [{ id: "passport", label: "Паспорт", mandatory: true }],
      score: 0.91,
      baseScore: 0.88,
      ruleBoosts: [],
      blockers: [],
      eligible: true
    },
    alternativePaths: [],
    criticalRisk: null,
    risks: [],
    whyBullets: [
      {
        id: "why-1",
        text: "Маршрут подтверждён по текущим сигналам.",
        ruleId: "R10",
        signalIds: ["destination"],
        tone: "positive"
      }
    ],
    decisionSignals: [],
    ruleResults: [],
    assumptions: [],
    documents: {
      score: 0.71,
      readyCount: 5,
      requiredCount: 7,
      items: [
        {
          id: "insurance",
          label: "Страховка",
          status: "attention_needed",
          detail: "Нужен полис с покрытием не ниже 30000€.",
          pathId: "italy_c_tourism"
        },
        {
          id: "statement",
          label: "Выписка",
          status: "attention_needed",
          detail: "Нужна выписка за 6 месяцев.",
          pathId: "italy_c_tourism"
        }
      ]
    },
    auditTrail: {
      totalMs: 14.2
    },
    preview: false
  };

  return {
    activeCase: {
      id: "s1-rf-italy",
      title: "S1 · Петербург → Италия",
      productType: "travel",
      preferences: [],
      signals: [],
      createdAt: "2026-04-17T10:00:00.000Z",
      updatedAt: "2026-04-17T10:00:00.000Z"
    },
    activeCaseId: "s1-rf-italy",
    activeResult,
    activeScenarioLab: {
      version: "scenario-lab.v1",
      caseId: "s1-rf-italy",
      generatedAt: "2026-04-17T10:00:00.000Z",
      baseResult: activeResult,
      issues: [],
      scenarios: [
        {
          id: "documents-ready",
          type: "documents",
          title: "Добрать обязательные документы",
          summary: "Сценарий усиливает текущий маршрут без смены основного пути.",
          recommended: true,
          nextAction: {
            type: "upload_missing_docs",
            priority: "blocking",
            label: "Перейти к документам",
            detail: "Закройте недостающий чеклист.",
            targetScreen: "documents",
            triggeredBy: ["documents_ready_count"]
          },
          comparison: {
            verdictBefore: "GO",
            verdictAfter: "GO",
            confidenceBefore: 0.74,
            confidenceAfter: 0.82,
            primaryPathBefore: { id: "italy_c_tourism", label: "Шенген C" },
            primaryPathAfter: { id: "italy_c_tourism", label: "Шенген C" },
            resolvedRisks: [],
            remainingRisks: [],
            documents: {
              readyCountBefore: 5,
              readyCountAfter: 7,
              requiredCount: 7,
              itemsToCollect: []
            },
            whyChanged: ["Чеклист становится полным."]
          },
          plan: {
            headline: "После этого сценария следующий шаг — перейти к документам.",
            firstSteps: ["Подготовить страховку."],
            criticalSteps: ["Не отправлять заявку с неполным пакетом."],
            canWait: [],
            humanReviewRequired: false,
            humanReviewReason: null
          }
        }
      ],
      recommendedScenarioId: "documents-ready",
      noHelpfulScenarios: false,
      humanReviewEscalation: {
        required: false,
        title: "Ручная проверка не нужна",
        detail: "По текущему кейсу есть автоматический сценарий.",
        triggeredBy: []
      }
    },
    scenarios: [],
    audit: null,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    loadCase: vi.fn().mockResolvedValue(undefined),
    loadAudit: vi.fn().mockResolvedValue(undefined),
    recompute: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(null),
    overrideSignal: vi.fn().mockResolvedValue(undefined),
    scenarioLabStatus: "ready",
    scenarioLabError: null,
    status: "ready",
    errorMessage: null,
    ...overrides
  } as any;
}

function renderScreen(screenNode: ReactNode, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{screenNode}</MemoryRouter>);
}

describe("ResultScreen", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the vertical default case when the active case belongs to another product", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("ignores a foreign case query param on product-specific routes", async () => {
    const loadCase = vi.fn().mockResolvedValue(undefined);
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeCaseId: "s1-rf-italy",
        activeCase: {
          id: "s1-rf-italy",
          title: "S1 · Петербург → Италия",
          productType: "travel",
          preferences: [],
          signals: [],
          createdAt: "2026-04-17T10:00:00.000Z",
          updatedAt: "2026-04-17T10:00:00.000Z"
        },
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          productType: "travel"
        },
        scenarios: [
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
        ],
        loadCase
      })
    );

    renderScreen(<ResultScreen productType="insurance_adult" />, [
      "/insurance-adult?case=s1-rf-italy"
    ]);

    await waitFor(() => {
      expect(loadCase).toHaveBeenCalledWith("s5-rf-italy-insurance");
    });
  });

  it("renders manual review state without a fake confirmed path", () => {
    const baseStore = createStore();

    useCaseStoreMock.mockReturnValue(
      createStore({
        activeResult: {
          ...(baseStore.activeResult ?? {}),
          verdict: "HUMAN_REVIEW",
          primaryPath: null,
          nextAction: {
            type: "send_for_review",
            priority: "human_review",
            label: "Передать менеджеру",
            detail: "Автомат не может честно подтвердить маршрут.",
            targetScreen: "human-review",
            triggeredBy: ["human_review_trigger"]
          }
        }
      })
    );

    renderScreen(<ResultScreen />);

    expect(screen.getByText("Нужна ручная проверка")).toBeInTheDocument();
    expect(screen.getAllByText("Передать менеджеру").length).toBeGreaterThan(0);
    expect(screen.getByText("Нужен оператор")).toBeInTheDocument();
    expect(screen.queryByText("Маршрут подтверждён")).not.toBeInTheDocument();
  });

  it("opens the basis sheet from the utility action", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Основание" }));

    await waitFor(() => {
      expect(screen.getByText("Основание решения")).toBeInTheDocument();
      expect(screen.getByText("Маршрут подтверждён по текущим сигналам.")).toBeInTheDocument();
    });
  });

  it("opens compare and AI sheets from secondary actions", async () => {
    useCaseStoreMock.mockReturnValue(createStore());

    renderScreen(<ResultScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Сравнить" }));

    await waitFor(() => {
      expect(screen.getByTestId("compare-surface")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /AI: сначала/i }));
    fireEvent.click(screen.getByRole("button", { name: "Полный разбор" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-recommendation-panel")).toBeInTheDocument();
    });
  });
});

````

### tmp/m1-input-pack-inspect/m1-input-pack/stage/04_screens/src-screens/screenRouting.test.tsx

````
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

````
