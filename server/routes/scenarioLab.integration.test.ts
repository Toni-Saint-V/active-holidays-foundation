import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import { createApp } from "../index";
import { loadCatalogs, replaceCatalogsForTest } from "../lib/catalogs";

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
  it("returns evidence-aware concierge scenarios for a recoverable case", async () => {
    const response = await getJson("/api/cases/s1-rf-italy/scenario-lab");

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
});
