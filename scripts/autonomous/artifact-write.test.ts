import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeAutonomousArtifacts, writeFileAtomic } from "./artifact-write.ts";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "autonomous-artifacts-"));
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("autonomous artifact writes", () => {
  it("writes artifact files under reports/autonomous with exact content", async () => {
    writeAutonomousArtifacts(tempDir, [
      { fileName: "next-best-task-latest.json", content: "{\"ok\":true}\n" },
      { fileName: "founder-report-latest.md", content: "# Founder\n" }
    ]);

    const json = await readFile(path.join(tempDir, "reports/autonomous/next-best-task-latest.json"), "utf8");
    const report = await readFile(path.join(tempDir, "reports/autonomous/founder-report-latest.md"), "utf8");
    const reportDirEntries = await readdir(path.join(tempDir, "reports/autonomous"));

    expect(json).toBe("{\"ok\":true}\n");
    expect(report).toBe("# Founder\n");
    expect(reportDirEntries).not.toContain(".artifact-write.lock");
  });

  it("blocks writes when a single-writer lock already exists", async () => {
    const outputDir = path.join(tempDir, "reports/autonomous");
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(outputDir, ".artifact-write.lock"),
      '{"pid":1234,"acquiredAt":"2026-05-12T00:00:00.000Z"}\n',
      "utf8"
    );

    expect(() =>
      writeAutonomousArtifacts(tempDir, [
        { fileName: "health-latest.json", content: "{}\n" }
      ])
    ).toThrow(/locked by another writer/);
  });

  it("performs atomic single-file writes without leaving temp files", async () => {
    const targetPath = path.join(tempDir, "reports/autonomous/cycle-latest.json");
    writeFileAtomic(targetPath, "{\"cycle\":1}\n");

    const data = await readFile(targetPath, "utf8");
    const entries = await readdir(path.dirname(targetPath));

    expect(data).toBe("{\"cycle\":1}\n");
    expect(entries.some((entry) => entry.endsWith(".tmp"))).toBe(false);
  });
});
