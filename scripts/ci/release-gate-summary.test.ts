import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildReleaseGateSummary,
  evaluateCheck,
  type ReleaseCheckResult,
  type ReleaseCheckDefinition
} from "./release-gate-summary";

async function readFixtureResults(): Promise<ReleaseCheckResult[]> {
  const fixturePath = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "release-gate",
    "mock-check-results.json"
  );
  const text = await readFile(fixturePath, "utf8");
  return JSON.parse(text) as ReleaseCheckResult[];
}

describe("release gate summary", () => {
  it("blocks only on blocking failures", async () => {
    const checks = await readFixtureResults();
    const summary = buildReleaseGateSummary(checks, {
      includeSideEffects: false,
      jsonOnly: true
    });

    expect(summary.verdict.status).toBe("block");
    expect(summary.verdict.blockingFailures).toEqual(["engine-drift"]);
    expect(summary.verdict.advisoryFailures).toEqual(["context-surface"]);
    expect(summary.counts.failed).toBe(2);
    expect(summary.counts.skipped).toBe(1);
  });

  it("skips side-effecting checks when disabled", () => {
    const sideEffectingCheck: ReleaseCheckDefinition = {
      id: "autonomous-os",
      title: "Autonomous OS",
      command: "node -e \"process.exit(1)\"",
      policy: "advisory",
      sideEffecting: true
    };

    const result = evaluateCheck(sideEffectingCheck, {
      includeSideEffects: false
    });

    expect(result.status).toBe("skipped");
    expect(result.skipReason).toBe("side_effecting_check_disabled");
    expect(result.exitCode).toBeNull();
  });

  it("marks warning-only pass as warn severity", () => {
    const check: ReleaseCheckDefinition = {
      id: "warning-pass",
      title: "Warning pass",
      command: "node -e \"console.log('[WARN] caution')\"",
      policy: "advisory",
      sideEffecting: false
    };

    const result = evaluateCheck(check, {
      includeSideEffects: true
    });

    expect(result.status).toBe("pass");
    expect(result.severity).toBe("warn");
    expect(result.hasWarnings).toBe(true);
  });
});
