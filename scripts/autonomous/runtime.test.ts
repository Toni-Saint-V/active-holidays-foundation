import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addExecutionBlocker,
  buildAutonomousHealthSnapshot,
  buildAutonomousBranchName,
  collectSystemMetrics,
  computeLevelBReadiness,
  prepareExecutionPacket,
  readGateProjection,
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

async function writeSkillStubs() {
  for (const skillName of [
    "ah-ai-trust-layer",
    "ah-backend-contracts",
    "ah-control-protocol",
    "ah-product-strategy",
    "ah-repo-automation",
    "ah-result-flow",
    "ah-review-release",
    "ah-ui-direction",
    "ah-ui-implementation",
    "ah-visual-qa"
  ]) {
    await writeRepoFile(
      `.codex/skills/${skillName}/SKILL.md`,
      `---\nname: ${skillName}\ndescription: test stub\n---\n\n# ${skillName}\n`
    );
  }
}

async function writeGateEligibilitySnapshot(
  eligibility: Record<string, unknown> = {}
) {
  await writeRepoFile(
    "reports/automations/state/gate-eligibility-snapshot.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        evaluatedAt: "2026-04-27T03:19:45.000Z",
        eligibility,
        projectionHash: "projection-test-hash"
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
  await writeSkillStubs();
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
        evidence: [
          "https://github.com/Toni-Saint-V/active-holidays-foundation/pull/7",
          "749f0c6cd0c2ffcd829e7aca2241d6d02b4af1f7"
        ],
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
        evidence: [
          "https://github.com/Toni-Saint-V/active-holidays-foundation/pull/7",
          "749f0c6cd0c2ffcd829e7aca2241d6d02b4af1f7"
        ],
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

  it("rejects completed task statuses without immutable merge evidence", async () => {
    await writeTaskStatus([
      {
        id: "review-only-task",
        status: "completed",
        updatedAt: "2026-04-24T10:43:20.000Z",
        evidence: ["codex/review-only-branch", "scripts/autonomous/runtime.ts"],
        note: "Branch-local evidence must not complete lifecycle state."
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
              id: "review-only-task",
              title: "Review-only task",
              productReason: "Must remain non-terminal until merged",
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
    ).toThrow(/completed task review-only-task must include merged PR URL and full commit SHA evidence/i);
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
    expect(result.externalGateProjection.available).toBe(false);
    expect(result.externalGateProjection.executor.status).toBe("unknown");
    expect(result.eligibleCandidates.map((candidate) => candidate.id)).toEqual(["backend-hardening"]);
  });

  it("projects external gate eligibility into next-task and execution packets", async () => {
    await writeGateEligibilitySnapshot({
      directorDryRun: {
        status: "passed",
        reasons: []
      },
      directorLiveWrite: {
        status: "blocked",
        reasons: ["blocked_by_writeback_promotion"]
      },
      executor: {
        status: "blocked",
        reasons: ["blocked_by_no_ready_packet"]
      },
      synthesis: {
        status: "passed",
        reasons: []
      }
    });
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

    const projection = readGateProjection(tempDir);
    const packet = prepareExecutionPacket({
      currentRepoRoot: tempDir,
      currentBranch: "main",
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(projection.available).toBe(true);
    expect(projection.projectionHash).toBe("projection-test-hash");
    expect(packet.controlTowerReadiness.localExecutor.status).toBe("passed");
    expect(packet.controlTowerReadiness.directorDryRun.status).toBe("passed");
    expect(packet.controlTowerReadiness.notionWriteback).toEqual({
      status: "blocked",
      reasons: ["blocked_by_writeback_promotion"]
    });
    expect(packet.controlTowerReadiness.externalExecutor).toEqual({
      status: "blocked",
      reasons: ["blocked_by_no_ready_packet"]
    });
    expect(packet.executionBrief).toContain("## Control Tower Readiness");
  });

  it("treats malformed gate eligibility snapshots as unknown instead of permission", async () => {
    await writeRepoFile("reports/automations/state/gate-eligibility-snapshot.json", "{not-json");

    const projection = readGateProjection(tempDir);

    expect(projection.available).toBe(false);
    expect(projection.executor).toEqual({
      status: "unknown",
      reasons: ["gate eligibility snapshot is malformed"]
    });
  });

  it("marks parsed snapshots without usable eligibility as unavailable", async () => {
    await writeRepoFile(
      "reports/automations/state/gate-eligibility-snapshot.json",
      JSON.stringify(
        {
          schemaVersion: 1,
          evaluatedAt: "2026-04-27T03:19:45.000Z",
          projectionHash: "projection-test-hash"
        },
        null,
        2
      )
    );

    const projection = readGateProjection(tempDir);

    expect(projection.available).toBe(false);
    expect(projection.executor).toEqual({
      status: "unknown",
      reasons: ["gate eligibility snapshot eligibility is missing or malformed"]
    });
  });

  it("marks snapshots with missing required gate entries as unavailable", async () => {
    await writeGateEligibilitySnapshot({
      directorDryRun: {
        status: "passed",
        reasons: []
      },
      directorLiveWrite: {
        status: "blocked",
        reasons: ["blocked_by_writeback_promotion"]
      },
      executor: {
        status: "waiting",
        reasons: ["not a supported gate status"]
      }
    });

    const projection = readGateProjection(tempDir);

    expect(projection.available).toBe(false);
    expect(projection.synthesis).toEqual({
      status: "unknown",
      reasons: ["synthesis gate is not available in gate snapshot"]
    });
    expect(projection.executor).toEqual({
      status: "unknown",
      reasons: ["not a supported gate status"]
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

  it("keeps local readiness blocked after write-mode baseline verification fails", async () => {
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
      gitStatus: [],
      trackedGitStatus: []
    });
    const verificationBlocker = "Baseline verification failed: npm run build";

    expect(packet.blocked).toBe(false);
    expect(packet.controlTowerReadiness.localExecutor.status).toBe("passed");

    packet.verificationResults = [
      {
        command: "npm run build",
        ok: false,
        exitCode: 1,
        stdoutTail: "",
        stderrTail: "build failed"
      }
    ];
    addExecutionBlocker(packet, verificationBlocker);

    expect(packet.blocked).toBe(true);
    expect(packet.blockedReasons).toContain(verificationBlocker);
    expect(packet.controlTowerReadiness.localExecutor.status).toBe("blocked");
    expect(packet.controlTowerReadiness.localExecutor.reasons).toContain(verificationBlocker);
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
    const healthJson = await readFile(path.join(tempDir, "reports/autonomous/health-latest.json"), "utf8");

    expect(result.selectedTaskId).toBe("backend-hardening");
    expect(result.blocked).toBe(false);
    expect(result.executionPacket.externalWriteState.writePerformed).toBe(false);
    expect(result.executionPacket.levelB.agentSync.status).toBe("passed");
    expect(JSON.parse(cycleJson).selectedTaskId).toBe("backend-hardening");
    expect(JSON.parse(nextTaskJson).eligibleCandidates).toHaveLength(1);
    expect(JSON.parse(healthJson).agentSync.status).toBe("passed");
    expect(cycleReport).toContain("Autonomous Cycle Report");
  });

  it("returns degraded health when Notion is unauthorized but local executor passes", async () => {
    await writeGateEligibilitySnapshot({
      directorDryRun: { status: "passed", reasons: [] },
      directorLiveWrite: { status: "blocked", reasons: ["blocked_by_writeback_promotion"] },
      executor: { status: "blocked", reasons: ["blocked_by_no_ready_packet"] },
      synthesis: { status: "passed", reasons: [] }
    });
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

    const health = buildAutonomousHealthSnapshot({
      currentRepoRoot: tempDir,
      notionAuthStatus: "unauthorized",
      githubRuns: [],
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(health.status).toBe("degraded");
    expect(health.notionAuth.status).toBe("unauthorized");
    expect(health.subsystems.find((subsystem) => subsystem.id === "governance")?.status).toBe("passed");
    expect(health.subsystems.find((subsystem) => subsystem.id === "communication")?.status).toBe("degraded");
    expect(health.selfHealingRecommendations.map((recommendation) => recommendation.id)).toContain(
      "restore-notion-auth"
    );
  });

  it("blocks Level B when a required multi-agent role is missing", async () => {
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
      currentBranch: "main",
      gitStatus: [],
      trackedGitStatus: []
    });
    const readiness = computeLevelBReadiness({
      packet,
      agentStates: [
        {
          mode: "skill-system-governance",
          packId: "broken-pack",
          agentRole: "runtime-owner",
          objective: "Missing verifier and reviewer equivalents",
          skills: ["ah-repo-automation"],
          owns: ["scripts/codex/*"],
          heartbeatAt: "2026-04-27T00:00:00.000Z",
          syncStatus: "blocked",
          blockers: ["skill-system-governance: missing verifier-equivalent agent"],
          handoff: []
        }
      ]
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.criteria.multiAgentCoverage).toBe("blocked");
    expect(readiness.agentSync.blockedAgents).toBe(1);
  });

  it("creates a self-healing recommendation for stale feeder gates", async () => {
    await writeGateEligibilitySnapshot({
      directorDryRun: {
        status: "blocked",
        reasons: ["blocked_by_freshness:ah-product-os-radar,ah-execution-brief-sync"]
      },
      directorLiveWrite: {
        status: "blocked",
        reasons: ["blocked_by_writeback_promotion"]
      },
      executor: {
        status: "blocked",
        reasons: ["blocked_by_no_ready_packet"]
      },
      synthesis: {
        status: "blocked",
        reasons: ["blocked_by_freshness:ah-next-best-action-distiller"]
      }
    });
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
      currentBranch: "main",
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(packet.levelB.selfHealingRecommendations.map((recommendation) => recommendation.id)).toContain(
      "refresh-stale-feeders"
    );
    expect(packet.levelB.selfHealingRecommendations.find((recommendation) => recommendation.id === "refresh-stale-feeders")?.blockedBy).toEqual(
      expect.arrayContaining(["ah-product-os-radar", "ah-execution-brief-sync", "ah-next-best-action-distiller"])
    );
  });

  it("classifies GitHub startup_failure as external CI degradation, not local executor failure", async () => {
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

    const health = buildAutonomousHealthSnapshot({
      currentRepoRoot: tempDir,
      githubRuns: [
        {
          status: "completed",
          conclusion: "startup_failure",
          workflowName: "",
          headBranch: "main",
          url: "https://github.com/example/repo/actions/runs/1"
        }
      ],
      gitStatus: [],
      trackedGitStatus: []
    });

    expect(health.githubActions.status).toBe("degraded");
    expect(health.subsystems.find((subsystem) => subsystem.id === "governance")?.status).toBe("passed");
    expect(health.selfHealingRecommendations.map((recommendation) => recommendation.id)).toContain(
      "repair-github-actions-startup"
    );
  });

  it("tolerates missing network metrics commands", () => {
    const metrics = collectSystemMetrics({ networkCommand: "__missing_network_metrics_command__" });

    expect(metrics.status).toBe("degraded");
    expect(metrics.network.status).toBe("unknown");
    expect(metrics.network.error).toBeTruthy();
  });

  it("builds a stable codex branch name", () => {
    expect(buildAutonomousBranchName("Conversion CTA instrumentation!")).toBe(
      "codex/autonomous-conversion-cta-instrumentation"
    );
  });
});
