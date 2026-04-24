import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAutonomousBranchName,
  prepareExecutionPacket,
  selectNextTask
} from "./runtime";

let tempDir = "";

async function writeRepoFile(relativePath: string, content: string) {
  const targetPath = path.join(tempDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "autonomous-runtime-"));
});

afterEach(async () => {
  if (tempDir) {
    const { rm } = await import("node:fs/promises");
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("autonomous runtime", () => {
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
        "Working tree не чистый; local executor fail-closed.",
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

  it("blocks untracked working-tree entries in write mode", async () => {
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

    expect(packet.blocked).toBe(true);
    expect(packet.blockedReasons).toContain("Working tree не чистый; local executor fail-closed.");
  });

  it("builds a stable codex branch name", () => {
    expect(buildAutonomousBranchName("Conversion CTA instrumentation!")).toBe(
      "codex/autonomous-conversion-cta-instrumentation"
    );
  });
});
