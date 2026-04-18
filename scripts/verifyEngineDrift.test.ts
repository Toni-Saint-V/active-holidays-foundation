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
