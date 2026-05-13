import type { Express } from "express";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { Duplex } from "node:stream";
import { CASE_ACCESS_HEADER } from "@shared/contracts";
import { createApp } from "../index";
import { getCatalogsOrThrow, loadCatalogs, replaceCatalogsForTest } from "../lib/catalogs";
import { freshCatalogsForRouteTest } from "./testFreshCatalogs";
import { installStableRouteTestClock } from "./routeTestClock";

let app: Express;
let humanReviewTempDir: string;
let restoreFreshCatalogs: (() => void) | null = null;
const previousHumanReviewsFile = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
const previousInternalApiToken = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN;
const INTERNAL_API_TOKEN = "test-internal-scenario-lab-token";

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
  humanReviewTempDir = await mkdtemp(path.join(tmpdir(), "ah-scenario-lab-hr-"));
  process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = path.join(
    humanReviewTempDir,
    "human-reviews.json"
  );
  process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN = INTERNAL_API_TOKEN;
  app = await createApp();
});

installStableRouteTestClock();

beforeEach(() => {
  restoreFreshCatalogs = replaceCatalogsForTest(
    freshCatalogsForRouteTest(getCatalogsOrThrow())
  );
});

afterEach(() => {
  restoreFreshCatalogs?.();
  restoreFreshCatalogs = null;
});

afterAll(async () => {
  if (previousHumanReviewsFile) {
    process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE = previousHumanReviewsFile;
  } else {
    delete process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE;
  }
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
    "x-active-holidays-internal-token": INTERNAL_API_TOKEN,
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

async function getJson(path: string, headers?: Record<string, string>) {
  return requestJson("GET", path, undefined, headers);
}

async function postJson(path: string, body?: unknown, headers?: Record<string, string>) {
  return requestJson("POST", path, body, headers);
}

async function withFreshEvidence<T>(run: () => Promise<T>): Promise<T> {
  const catalogs = structuredClone(await loadCatalogs());
  for (const record of catalogs.ruleEvidence) {
    if (record.evidenceStatus === "valid") {
      record.lastVerifiedAt = "2026-04-30T00:00:00.000Z";
    }
  }
  for (const source of catalogs.sources) {
    source.lastCheckedAt = "2026-04-30T00:00:00.000Z";
  }
  const restore = replaceCatalogsForTest(catalogs);
  try {
    return await run();
  } finally {
    restore();
  }
}

describe("scenario lab HTTP surface", () => {
  it("returns evidence-aware concierge scenarios for a recoverable case", async () => {
    const response = await withFreshEvidence(() =>
      getJson("/api/cases/s1-rf-italy/scenario-lab")
    );

    expect(response.status).toBe(200);
    expect(response.json.scenarios.length).toBeGreaterThanOrEqual(2);
    expect(response.json.scenarios.length).toBeLessThanOrEqual(4);

    const recommended = response.json.scenarios.find(
      (scenario: { id: string }) => scenario.id === response.json.recommendedScenarioId
    );
    expect(recommended).toBeTruthy();
    expect(recommended.safetyStatus).toBe("safe_automatic");
    expect(recommended.evidenceStatus).toBe("valid");
    expect(recommended.freshnessStatus).toBe("fresh");
    expect(recommended.blockingReason).toBeNull();
    expect(recommended.humanReviewReason).toBeNull();
    expect(recommended.delta.nextAction.changed).toEqual(expect.any(Boolean));
    expect(recommended.delta.evidenceStatus.after).toBe("valid");
    expect(recommended.delta.freshnessStatus.after).toBe("fresh");
    expect(recommended.plan.firstSteps.join(" ")).toMatch(/[А-Яа-яЁё]/);
  });

  it("blocks unsafe scenario concierge output when evidence is stale", async () => {
    const catalogs = structuredClone(await loadCatalogs());
    const staleRecord = catalogs.ruleEvidence.find(
      (record) => record.ruleId === "R02" && record.countryOrScope === "RU->IT"
    );
    expect(staleRecord).toBeDefined();
    if (!staleRecord) return;
    staleRecord.lastVerifiedAt = "2025-01-01T00:00:00.000Z";

    const restore = replaceCatalogsForTest(catalogs);
    try {
      const response = await getJson("/api/cases/s1-rf-italy/scenario-lab");

      expect(response.status).toBe(200);
      expect(response.json.humanReviewEscalation.required).toBe(true);
      expect(response.json.scenarios).toHaveLength(1);
      expect(response.json.scenarios[0].safetyStatus).toBe("evidence_blocked");
      expect(response.json.scenarios[0].evidenceStatus).toBe("stale");
      expect(response.json.scenarios[0].freshnessStatus).toBe("stale");
      expect(response.json.scenarios[0].blockingReason).toContain("R02");
      expect(response.json.scenarios[0].humanReviewReason).toContain("EVIDENCE_GATE");
      expect(response.json.scenarios[0].delta.blockingReason.after).toContain("R02");
    } finally {
      restore();
    }
  });

  it("keeps conflicting evidence as a human-review-only concierge path", async () => {
    const response = await getJson("/api/cases/s2-tr-spb/scenario-lab");

    expect(response.status).toBe(200);
    expect(response.json.noHelpfulScenarios).toBe(true);
    expect(response.json.scenarios).toHaveLength(1);
    expect(response.json.scenarios[0].type).toBe("human_review");
    expect(response.json.scenarios[0].safetyStatus).toBe("evidence_blocked");
    expect(response.json.scenarios[0].evidenceStatus).toBe("conflicting");
    expect(response.json.scenarios[0].humanReviewReason).toContain("Evidence gate");
    expect(response.json.scenarios[0].delta.evidenceStatus.after).toBe("conflicting");
  });

  it("rejects empty compare requests instead of creating noop forks", async () => {
    const compare = await postJson("/api/cases/s1-rf-italy/scenarios/compare", {});

    expect(compare.status).toBe(400);
    expect(compare.json.error).toBe("validation_failed");
    expect(
      compare.json.issues.some((issue: { code: string; path: string }) =>
        issue.code === "custom" && issue.path === "signals"
      )
    ).toBe(true);
  });

  it("creates a scenario fork, compares it with the baseline, and records the decision", async () => {
    const compare = await withFreshEvidence(() =>
      postJson("/api/cases/s1-rf-italy/scenarios/compare", {
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
      })
    );

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

  it("compares two existing forked scenarios only with candidate credential", async () => {
    const baselineFork = await postJson("/api/cases/s1-rf-italy/fork", {
      title: "S1 — baseline fork для dual-token compare"
    });
    expect(baselineFork.status).toBe(200);
    const baselineId = baselineFork.json.case.id as string;
    const baselineToken = baselineFork.json.access.accessToken as string;

    const candidateFork = await postJson("/api/cases/s1-rf-italy/fork", {
      title: "S1 — candidate fork для dual-token compare"
    });
    expect(candidateFork.status).toBe(200);
    const candidateId = candidateFork.json.case.id as string;
    const candidateToken = candidateFork.json.access.accessToken as string;

    const success = await postJson(
      `/api/cases/${baselineId}/scenarios/compare`,
      {
        compareToCaseId: candidateId,
        signals: [],
        candidateAccessToken: candidateToken
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(success.status).toBe(200);
    expect(success.json.rootCaseId).toBe("s1-rf-italy");
    expect(success.json.candidateCase.id).toBe(candidateId);

    const missing = await postJson(
      `/api/cases/${baselineId}/scenarios/compare`,
      { compareToCaseId: candidateId, signals: [] },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(missing.status).toBe(403);
    expect(missing.json.error).toBe("case_access_forbidden");

    const queryInjected = await postJson(
      `/api/cases/${baselineId}/scenarios/compare?candidateAccessToken=${candidateToken}`,
      { compareToCaseId: candidateId, signals: [] },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(queryInjected.status).toBe(403);
    expect(queryInjected.json.error).toBe("case_access_forbidden");

    const invalid = await postJson(
      `/api/cases/${baselineId}/scenarios/compare`,
      {
        compareToCaseId: candidateId,
        signals: [],
        candidateAccessToken: `${candidateToken}-tampered`
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(invalid.status).toBe(403);
    expect(invalid.json.error).toBe("case_access_forbidden");

    const malformed = await postJson(
      `/api/cases/${baselineId}/scenarios/compare`,
      {
        compareToCaseId: candidateId,
        signals: [],
        candidateAccessToken: "short"
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(malformed.status).toBe(403);
    expect(malformed.json.error).toBe("case_access_forbidden");

    const thirdFork = await postJson("/api/cases/s1-rf-italy/fork", {
      title: "S1 — third fork token isolation"
    });
    expect(thirdFork.status).toBe(200);
    const thirdToken = thirdFork.json.access.accessToken as string;

    const wrongCaseToken = await postJson(
      `/api/cases/${baselineId}/scenarios/compare`,
      {
        compareToCaseId: candidateId,
        signals: [],
        candidateAccessToken: thirdToken
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );
    expect(wrongCaseToken.status).toBe(403);
    expect(wrongCaseToken.json.error).toBe("case_access_forbidden");
  });

  it("allows same-case compare without candidate credential when baseline token is valid", async () => {
    const baselineFork = await postJson("/api/cases/s1-rf-italy/fork", {
      title: "S1 — baseline fork для same-case compare"
    });
    expect(baselineFork.status).toBe(200);
    const baselineId = baselineFork.json.case.id as string;
    const baselineToken = baselineFork.json.access.accessToken as string;

    const sameCase = await postJson(
      `/api/cases/${baselineId}/scenarios/compare`,
      {
        compareToCaseId: baselineId,
        signals: []
      },
      { [CASE_ACCESS_HEADER]: baselineToken }
    );

    expect(sameCase.status).toBe(200);
    expect(sameCase.json.rootCaseId).toBe("s1-rf-italy");
    expect(sameCase.json.baseline.caseId).toBe(baselineId);
    expect(sameCase.json.candidateCase.id).toBe(baselineId);
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
    const accessToken = compare.json.access.accessToken as string;

    const family = await getJson(`/api/cases/${candidateId}/scenarios`, {
      [CASE_ACCESS_HEADER]: accessToken
    });
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

  it("uses an honest human-review-only fallback when no automatic scenario can help", async () => {
    const response = await getJson("/api/cases/s3-us-spb-business/scenario-lab");

    expect(response.status).toBe(200);
    expect(response.json.noHelpfulScenarios).toBe(true);
    expect(response.json.recommendedScenarioId).toBe("human-review");
    expect(response.json.scenarios).toHaveLength(1);
    expect(response.json.scenarios[0].safetyStatus).toBe("human_review_only");
    expect(response.json.scenarios[0].plan.humanReviewRequired).toBe(true);
    expect(response.json.scenarios[0].nextAction.targetScreen).toBe("human-review");
  });

  it("creates a deterministic human-review handoff from a human-review-only scenario", async () => {
    const lab = await getJson("/api/cases/s3-us-spb-business/scenario-lab");
    const scenarioId = lab.json.scenarios[0].id;

    const created = await postJson("/api/cases/s3-us-spb-business/human-review", {
      channel: "email",
      contact: "scenario-user@example.com",
      message: "Передайте этот сценарий менеджеру без автоматических обещаний.",
      scenarioId
    });

    expect(created.status).toBe(200);
    expect(created.json.reused).toBe(false);
    expect(created.json.request.handoff).toMatchObject({
      source: "scenario_lab",
      scenarioId,
      scenarioTitle: lab.json.scenarios[0].title,
      safetyStatus: "human_review_only",
      evidenceStatus: lab.json.scenarios[0].evidenceStatus,
      freshnessStatus: lab.json.scenarios[0].freshnessStatus
    });
    expect(created.json.request.handoff.createdFromDecisionId).toEqual(expect.any(String));
    expect(created.json.request.handoff.humanReviewReason).toEqual(
      lab.json.scenarios[0].humanReviewReason
    );
    expect(created.json.request.handoff.operatorNextAction).toContain("ручн");
    expect(
      created.json.request.events.some(
        (event: { type: string }) => event.type === "handoff_created"
      )
    ).toBe(true);

    const duplicate = await postJson("/api/cases/s3-us-spb-business/human-review", {
      channel: "telegram",
      contact: "@scenario_user",
      message: "Повторная отправка того же сценария должна переиспользовать кейс.",
      scenarioId
    });

    expect(duplicate.status).toBe(200);
    expect(duplicate.json.reused).toBe(true);
    expect(duplicate.json.request.id).toBe(created.json.request.id);
    expect(duplicate.json.request.handoff.scenarioId).toBe(scenarioId);
  });

  it("rejects human-review handoff for a safe automatic scenario", async () => {
    const response = await withFreshEvidence(async () => {
      const lab = await getJson("/api/cases/s1-rf-italy/scenario-lab");
      const safe = lab.json.scenarios.find(
        (scenario: { safetyStatus: string }) => scenario.safetyStatus === "safe_automatic"
      );
      expect(safe).toBeTruthy();
      if (!safe) return { status: 500, json: { error: "missing_safe_scenario" } };

      return postJson("/api/cases/s1-rf-italy/human-review", {
        channel: "email",
        contact: "safe-scenario@example.com",
        message: "Этот безопасный сценарий не должен создавать handoff.",
        scenarioId: safe.id
      });
    });

    expect(response.status).toBe(409);
    expect(response.json.error).toBe("scenario_handoff_not_required");
  });

  it("preserves stale evidence reason in scenario handoff", async () => {
    const catalogs = structuredClone(await loadCatalogs());
    const staleRecord = catalogs.ruleEvidence.find(
      (record) => record.ruleId === "R02" && record.countryOrScope === "RU->IT"
    );
    expect(staleRecord).toBeDefined();
    if (!staleRecord) return;
    staleRecord.lastVerifiedAt = "2025-01-01T00:00:00.000Z";

    const restore = replaceCatalogsForTest(catalogs);
    try {
      const lab = await getJson("/api/cases/s1-rf-italy/scenario-lab");
      const scenarioId = lab.json.scenarios[0].id;
      const response = await postJson("/api/cases/s1-rf-italy/human-review", {
        channel: "email",
        contact: "stale-evidence@example.com",
        message: "Проверьте сценарий с устаревшими источниками вручную.",
        scenarioId
      });

      expect(response.status).toBe(200);
      expect(response.json.request.handoff.scenarioId).toBe(scenarioId);
      expect(response.json.request.handoff.safetyStatus).toBe("evidence_blocked");
      expect(response.json.request.handoff.evidenceStatus).toBe("stale");
      expect(response.json.request.handoff.freshnessStatus).toBe("stale");
      expect(response.json.request.handoff.blockingReason).toContain("R02");
      expect(response.json.request.handoff.humanReviewReason).toContain("EVIDENCE_GATE");
    } finally {
      restore();
    }
  });
});
