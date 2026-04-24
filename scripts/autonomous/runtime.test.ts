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

  it("builds a stable codex branch name", () => {
    expect(buildAutonomousBranchName("Conversion CTA instrumentation!")).toBe(
      "codex/autonomous-conversion-cta-instrumentation"
    );
  });
});
