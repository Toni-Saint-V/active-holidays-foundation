import {
  analyzeFileSurface,
  createRecommendedAgentPack,
  createRoutingConfidence as createAdaptiveRoutingConfidence,
  type FileSurface,
  type RecommendedAgentPack
} from "./skills-autopilot.ts";
import {
  createSkillModeTelemetryEvent,
  resolveSkillModeTelemetryConfig,
  writeSkillModeTelemetry
} from "./skill-mode-telemetry.ts";

export type ModeId =
  | "skill-system-governance"
  | "ai-recommendation-boundary"
  | "contract-boundary"
  | "result-flow"
  | "premium-ui"
  | "reliability-hardening"
  | "regression-proof"
  | "plugin-surface"
  | "review-gate";

export type RoutingConfidenceLevel = "low" | "medium" | "high";
export type ExecutionLane =
  | "manual-routing"
  | "blocked-png"
  | "review-lane"
  | "fast-lane"
  | "standard-lane";
export type VerifyCost = "light" | "moderate" | "heavy";
export type AgentPackStrategy = "parallel-triad" | "review-triad";

export type MultiAgentRole = {
  role: string;
  objective: string;
  skills: string[];
  owns: string[];
};

export type MultiAgentPack = {
  id: string;
  strategy: AgentPackStrategy;
  agents: MultiAgentRole[];
  handoff: string[];
};

export type ModeDefinition = {
  id: ModeId;
  priority: number;
  bundle: string;
  template: string;
  defaultSkills: string[];
  promptKeywords: string[];
  filePatterns: string[];
  verifyCommands: string[];
  firstSteps: string[];
  executionLane: ExecutionLane;
  multiAgentPack: MultiAgentPack;
  reviewOnly?: boolean;
  blockedByPngApproval?: boolean;
  pinWhenFilesMatch?: boolean;
};

type CompiledModeDefinition = Omit<ModeDefinition, "filePatterns"> & {
  filePatterns: RegExp[];
};

export type ModeMatch = {
  mode: CompiledModeDefinition;
  reasons: string[];
  score: number;
  keywordHits: string[];
  fileHits: string[];
  reviewHit: boolean;
};

export type ModeCliArgs = {
  prompt: string;
  files: string[];
  reviewOnly: boolean;
  deepOrchestration: boolean;
  deepOrchestrationSource: "default" | "env" | "flag";
  telemetryEnabled: boolean;
  telemetryFile: string | null;
};

export type ModeCandidateSummary = {
  mode: ModeId;
  priority: number;
  score: number;
  reason: string[];
  keywordHits: number;
  fileHits: number;
  reviewOnly: boolean;
};

export type RoutingConfidence = {
  level: RoutingConfidenceLevel;
  score: number;
  gapToNext: number | null;
  keywordHits: number;
  fileHits: number;
  reviewOnly: boolean;
  dominantSignal: "prompt" | "files" | "review-only";
  manualReviewRecommended: boolean;
};

export type ExecutionLaneSummary = {
  lane: ExecutionLane;
  reason: string;
};

export type TelemetrySummary = {
  enabled: boolean;
  logPath: string | null;
};

export type DetectModeResult = {
  mode: ModeId | null;
  reason: string[] | string;
  bundle: string | null;
  template: string | null;
  defaultSkills: string[];
  candidates: ModeCandidateSummary[];
  routingConfidence: RoutingConfidence | null;
  executionLane: ExecutionLaneSummary | null;
  fileSurface: FileSurface;
  recommendedAgentPack: RecommendedAgentPack;
  orchestrationMode: DeepOrchestrationSummary;
  telemetry: TelemetrySummary;
};

export type DeepOrchestrationSummary = {
  status: "enabled" | "disabled";
  source: ModeCliArgs["deepOrchestrationSource"];
  activation: string[];
  selectedSkills: string[];
  candidateSkillSources: Array<{
    mode: ModeId;
    skills: string[];
  }>;
  skillPolicy: string[];
  agentPolicy: string[];
  promptPolicy: string[];
  hardStops: string[];
};

export type ExecutionPlan = {
  lane: "manual" | "blocked" | ExecutionLane;
  immediateSteps: string[];
  immediateVerifyCommands: string[];
  deferredVerifyCommands: string[];
};

export type StartModeResult = DetectModeResult & {
  blockedState: {
    status: "blocked" | "unblocked" | "unknown";
    reason: string;
  };
  verifyCommands: string[];
  firstSteps: string[];
  executionPlan: ExecutionPlan;
};

export type TelemetryReport = {
  primaryMode: ModeId | null;
  candidateCount: number;
  blocked: boolean;
  routingConfidenceLevel: RoutingConfidenceLevel | "manual";
  executionLane: ExecutionLane | null;
  dominantSignal: RoutingConfidence["dominantSignal"] | "manual";
  verifyCost: VerifyCost;
  recommendedAgentCount: number;
  autopilotReady: boolean;
  nextAction:
    | "manual-routing"
    | "request-png-approval"
    | "run-fast-lane"
    | "run-standard-lane"
    | "run-review-lane";
  signals: {
    keywordHits: number;
    fileHits: number;
    reviewOnly: boolean;
  };
  reasons: string[];
};

export type AutopilotModeResult = StartModeResult & {
  multiAgentPack: MultiAgentPack | null;
  telemetryReport: TelemetryReport;
};

const NO_MATCH_REASON =
  "No strong mode match. Fall back to .codex/skills/index.md and choose manually.";
const NO_PRIMARY_REASON = "No primary mode resolved.";
const PNG_BLOCK_REASON = "UI mode requires PNG approval before code changes.";
const UNBLOCKED_REASON =
  "No mandatory pre-implementation gate from the selected mode.";
const MANDATORY_PROTOCOL_SKILL = "ah-control-protocol";

function triad(
  id: string,
  strategy: AgentPackStrategy,
  agents: MultiAgentRole[],
  handoff: string[]
): MultiAgentPack {
  return {
    id,
    strategy,
    agents,
    handoff
  };
}

function withMandatoryProtocolSkill(skills: string[]): string[] {
  if (skills.includes(MANDATORY_PROTOCOL_SKILL)) return skills;
  return [MANDATORY_PROTOCOL_SKILL, ...skills];
}

export const MODE_REGISTRY: ModeDefinition[] = [
  {
    id: "skill-system-governance",
    priority: 1,
    bundle: "Skill-system governance",
    template: "Skill-system governance",
    defaultSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-repo-automation",
      "ah-product-strategy",
      "ah-super-operator",
      "ah-review-release"
    ],
    promptKeywords: [
      "skill",
      "skills",
      "skill mix",
      "super skill",
      "super skills",
      "скилл",
      "скиллы",
      "скиллов",
      "микс скиллов",
      "супер скилл",
      "супер скиллы",
      "навык",
      "навыки",
      "router",
      "роутинг",
      "роутер",
      "роутера",
      "команды",
      "упрости",
      "упростить",
      "bundle",
      "template",
      "mode",
      "modes",
      "subagent",
      "subagents",
      "сабагент",
      "сабагенты",
      "сабагентов",
      "agent pack",
      "agent role",
      "deep orchestration",
      "orchestration",
      "orchestrate",
      "best practices",
      "metadata",
      "openai.yaml",
      "automation",
      "codex surface",
      "control tower",
      "runtime hardening",
      "runtime contract",
      "manual approval",
      "manual approvals",
      "writeback",
      "write-back",
      "notion lock",
      "surface lock",
      "gate eligibility",
      "gate projection"
    ],
    filePatterns: [
      "^\\.codex/skills/",
      "^\\.codex/automations/",
      "^reports/automations/state/",
      "^reports/automations/README\\.md$",
      "^scripts/codex/",
      "^scripts/automations/",
      "^AGENTS\\.md$",
      "^README\\.md$",
      "^RUNBOOK\\.md$",
      "^AUTOMATIONS_[A-Z_]+\\.md$"
    ],
    verifyCommands: [
      "npm run skills:verify",
      "npm run automations:verify",
      "npm run automations:check:skills",
      "npm run automations:check:context",
      "npm run typecheck"
    ],
    firstSteps: [
      "Resolve the exact `.codex` or validator surface that changed.",
      "Tighten the existing router, bundle, template, or script before adding new layers.",
      "Keep one canonical source for the new rule or mode.",
      "Run repo-local Codex checks after the change."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "skill-system-governance-pack",
      "parallel-triad",
      [
        {
          role: "runtime-owner",
          objective: "Own the canonical mode runtime and any script-level contract changes.",
          skills: ["ah-repo-automation", "ah-backend-contracts"],
          owns: ["scripts/codex/*", "scripts/automations/*", "package.json", "tsconfig.json"]
        },
        {
          role: "docs-owner",
          objective: "Keep operator docs aligned with the runtime contract and naming.",
          skills: ["ah-control-protocol", "ah-product-strategy"],
          owns: [".codex/skills/*.md", "README.md", "AGENTS.md", "RUNBOOK.md"]
        },
        {
          role: "verification-owner",
          objective: "Pressure-test the new runtime through checks, evaluator coverage, and finish gates.",
          skills: ["ah-review-release"],
          owns: ["verification surface", "fixture coverage", "final gate summary"]
        }
      ],
      [
        "runtime-owner lands the canonical contract first",
        "docs-owner mirrors the exact runtime vocabulary second",
        "verification-owner blocks drift before completion"
      ]
    ),
    pinWhenFilesMatch: true
  },
  {
    id: "plugin-surface",
    priority: 2,
    bundle: "Plugin / MCP surface governance",
    template: "Plugin / MCP surface governance",
    defaultSkills: [
      "ah-control-protocol",
      "ah-repo-automation",
      "ah-backend-contracts",
      "ah-review-release"
    ],
    promptKeywords: [
      "plugin",
      "plugins",
      "mcp",
      "marketplace",
      "cursor mcp",
      "connector"
    ],
    filePatterns: [
      "^plugins/",
      "^\\.agents/plugins/",
      "^\\.cursor/mcp\\.json$",
      "^\\.codex/automations/ah-plugin-mcp-surface-watch/"
    ],
    verifyCommands: [
      "npm run skills:verify",
      "npm run automations:check:context",
      "npm run automations:verify"
    ],
    firstSteps: [
      "Inventory the live plugin and MCP surface before proposing a new layer.",
      "Prefer docs, routing, or validation changes before any repo-local plugin scaffold.",
      "If a local plugin is justified, keep manifest and marketplace state coherent in one pass."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "plugin-surface-pack",
      "parallel-triad",
      [
        {
          role: "surface-auditor",
          objective: "Map the live plugin, marketplace, and MCP surface before changing it.",
          skills: ["ah-repo-automation", "ah-backend-contracts"],
          owns: ["plugins/*", ".agents/plugins/marketplace.json", ".cursor/mcp.json"]
        },
        {
          role: "contract-owner",
          objective: "Keep docs, manifests, and repo thresholds aligned in one pass.",
          skills: ["ah-repo-automation", "ah-product-strategy"],
          owns: [".codex/skills/_shared/active-holidays/plugin-surface.md", "README.md"]
        },
        {
          role: "verification-owner",
          objective: "Run context and automation gates before the surface is treated as stable.",
          skills: ["ah-review-release"],
          owns: ["automations:check:context", "automations:verify", "skills:verify"]
        }
      ],
      [
        "surface-auditor confirms the real surface first",
        "contract-owner updates docs and manifests second",
        "verification-owner closes with plugin and context gates"
      ]
    )
  },
  {
    id: "review-gate",
    priority: 3,
    bundle: "Final multi-lens review of a moderate change",
    template: "Final multi-lens review of a moderate change",
    defaultSkills: ["ah-review-release", "ah-visual-qa"],
    promptKeywords: [
      "code review",
      "diff review",
      "review diff",
      "review pr",
      "ревью",
      "revue",
      "revyu",
      "merge",
      "ship",
      "block",
      "findings",
      "pr",
      "pull request",
      "merge-ready",
      "release",
      "release readiness",
      "readiness",
      "релиз",
      "готовность"
    ],
    filePatterns: [],
    verifyCommands: [
      "npm run typecheck",
      "npm run test",
      "npm run build"
    ],
    firstSteps: [
      "Bound the review surface and read the actual changed files before concluding.",
      "List findings before any summary.",
      "Name exact proof and exact remaining gaps."
    ],
    executionLane: "review-lane",
    multiAgentPack: triad(
      "review-gate-pack",
      "review-triad",
      [
        {
          role: "correctness-reviewer",
          objective: "Look for correctness, lifecycle, and regression failures first.",
          skills: ["ah-review-release"],
          owns: ["bug risk", "behavioral regressions", "proof gaps"]
        },
        {
          role: "maintainability-reviewer",
          objective: "Challenge weak abstractions, ownership leaks, and forward-risk debt.",
          skills: ["ah-backend-contracts", "ah-review-release"],
          owns: ["maintainability", "ownership", "future drift"]
        },
        {
          role: "release-gate",
          objective: "Decide ship or block only after real verification evidence is present.",
          skills: ["ah-review-release", "ah-product-strategy"],
          owns: ["command evidence", "ship or block verdict", "rollback awareness"]
        }
      ],
      [
        "correctness-reviewer reports findings first",
        "maintainability-reviewer validates that no hidden debt was missed",
        "release-gate issues the final ship or block verdict"
      ]
    ),
    reviewOnly: true
  },
  {
    id: "premium-ui",
    priority: 4,
    bundle: "Premium UI or UX refinement",
    template: "Premium UI or UX refinement",
    defaultSkills: [
      "ah-control-protocol",
      "ah-ui-direction",
      "ah-ui-implementation",
      "ah-visual-qa"
    ],
    promptKeywords: [
      "ui",
      "ux",
      "layout",
      "spacing",
      "cta",
      "screen",
      "visual",
      "hierarchy",
      "premium"
    ],
    filePatterns: [
      "^src/screens/",
      "^src/ui/",
      "^src/styles/",
      "^src/theme/"
    ],
    verifyCommands: ["npm run typecheck"],
    firstSteps: [
      "Produce a PNG preview before changing UI code.",
      "Strengthen the first viewport and dominant CTA before lower sections.",
      "Keep visible copy Russian and trust-safe."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "premium-ui-pack",
      "parallel-triad",
      [
        {
          role: "design-gatekeeper",
          objective: "Own PNG approval and prevent premature code changes.",
          skills: ["ah-control-protocol", "ah-ui-implementation"],
          owns: ["PNG preview", "approved visual direction", "first viewport contract"]
        },
        {
          role: "ui-implementer",
          objective: "Translate the approved direction into clean premium UI code.",
          skills: ["ah-ui-implementation", "ah-ui-direction"],
          owns: ["screen code", "layout hierarchy", "Russian UI copy"]
        },
        {
          role: "ux-qa",
          objective: "Check CTA clarity, accessibility, and flow friction before closure.",
          skills: ["ah-ui-direction", "ah-ui-implementation", "ah-review-release"],
          owns: ["state coverage", "tap targets", "CTA clarity"]
        }
      ],
      [
        "design-gatekeeper blocks code until PNG approval exists",
        "ui-implementer builds the approved direction",
        "ux-qa validates clarity and usability before completion"
      ]
    ),
    blockedByPngApproval: true
  },
  {
    id: "ai-recommendation-boundary",
    priority: 5,
    bundle: "AI recommendation boundary fix",
    template: "AI recommendation boundary fix",
    defaultSkills: [
      "ah-control-protocol",
      "ah-ai-trust-layer",
      "ah-visual-qa",
      "ah-review-release"
    ],
    promptKeywords: [
      "recommendation",
      "ai recommendation",
      "ai copy",
      "disclaimer",
      "offer",
      "recommended",
      "next steps"
    ],
    filePatterns: [
      "^server/lib/recommendations",
      "^shared/contracts/recommendations",
      "^src/screens/result/AiRecommendationPanel",
      "^server/routes/recommendations"
    ],
    verifyCommands: [
      "npm run test -- server/lib/recommendations.test.ts server/routes/recommendations.integration.test.ts src/screens/result/AiRecommendationPanel.test.tsx",
      "npm run typecheck"
    ],
    firstSteps: [
      "Separate server-owned and model-owned fields.",
      "Keep non-primary options compare-only.",
      "Add or tighten the narrowest regression that proves the ownership boundary."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "ai-boundary-pack",
      "parallel-triad",
      [
        {
          role: "boundary-owner",
          objective: "Protect deterministic ownership and remove model overreach.",
          skills: ["ah-ai-trust-layer"],
          owns: ["recommendedOfferId", "fit", "shortlist order", "next steps boundary"]
        },
        {
          role: "state-owner",
          objective: "Keep cache, retry, and stale paths truthful around the AI layer.",
          skills: ["ah-ai-trust-layer"],
          owns: ["request state", "cache invalidation", "tooling boundaries"]
        },
        {
          role: "regression-owner",
          objective: "Prove the trust boundary with targeted tests and warnings.",
          skills: ["ah-review-release", "ah-visual-qa"],
          owns: ["narrow regression coverage", "compare-only proof", "degraded behavior"]
        }
      ],
      [
        "boundary-owner establishes ownership first",
        "state-owner hardens runtime truthfulness second",
        "regression-owner proves the boundary with tests and fixtures"
      ]
    )
  },
  {
    id: "contract-boundary",
    priority: 6,
    bundle: "Structured contract or schema change",
    template: "Structured contract or schema change",
    defaultSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-visual-qa",
      "ah-review-release"
    ],
    promptKeywords: [
      "backend",
      "server",
      "api",
      "route",
      "contract",
      "schema",
      "payload",
      "dto",
      "route validation",
      "compat"
    ],
    filePatterns: [
      "^shared/contracts/",
      "^server/routes/",
      "^src/lib/apiClient\\.ts$"
    ],
    verifyCommands: ["npm run typecheck", "npm run test"],
    firstSteps: [
      "Update the contract and all real callers in one pass.",
      "Keep versioning or rollout coordination explicit if payload meaning changes.",
      "Add the thinnest real contract test instead of broad snapshots."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "contract-boundary-pack",
      "parallel-triad",
      [
        {
          role: "contract-owner",
          objective: "Set the contract shape and preserve client-server ownership.",
          skills: ["ah-backend-contracts"],
          owns: ["shared/contracts/*", "route validation", "rollout constraints"]
        },
        {
          role: "caller-owner",
          objective: "Update every real caller and parser that depends on the contract.",
          skills: ["ah-visual-qa", "ah-backend-contracts"],
          owns: ["server callers", "client callers", "compat touchpoints"]
        },
        {
          role: "compat-reviewer",
          objective: "Catch hidden drift before the new contract is treated as final.",
          skills: ["ah-review-release"],
          owns: ["type gates", "targeted tests", "known incompatibilities"]
        }
      ],
      [
        "contract-owner sets the canonical payload first",
        "caller-owner updates every real consumer second",
        "compat-reviewer blocks hidden drift before completion"
      ]
    )
  },
  {
    id: "result-flow",
    priority: 7,
    bundle: "Result flow integration change",
    template: "Result flow integration change",
    defaultSkills: [
      "ah-control-protocol",
      "ah-result-flow",
      "ah-ui-direction",
      "ah-ui-implementation",
      "ah-visual-qa",
      "ah-review-release"
    ],
    promptKeywords: [
      "result flow",
      "result",
      "trust",
      "documents",
      "human review",
      "compare",
      "scenario"
    ],
    filePatterns: [
      "^src/screens/result/",
      "^src/screens/trust/",
      "^src/screens/documents/",
      "^src/screens/human-review/",
      "^src/state/caseStore"
    ],
    verifyCommands: ["npm run typecheck"],
    firstSteps: [
      "Strengthen the active screen before adding a new route.",
      "Keep deterministic truth above AI or compare helpers.",
      "Cover loading, empty, error, and escalation states."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "result-flow-pack",
      "parallel-triad",
      [
        {
          role: "flow-owner",
          objective: "Keep the work inside the current result loop instead of side screens.",
          skills: ["ah-result-flow", "ah-ui-direction"],
          owns: ["result flow", "documents", "trust", "human review"]
        },
        {
          role: "copy-owner",
          objective: "Tighten Russian trust-safe wording and interaction clarity.",
          skills: ["ah-ui-direction", "ah-ui-implementation"],
          owns: ["visible copy", "state labels", "accessibility clarity"]
        },
        {
          role: "trust-verifier",
          objective: "Protect deterministic ownership and escalation honesty inside the loop.",
          skills: ["ah-review-release"],
          owns: ["compare-only rules", "human review path", "truthful states"]
        }
      ],
      [
        "flow-owner lands the structural change first",
        "copy-owner tightens visible clarity second",
        "trust-verifier validates that the loop stayed honest"
      ]
    )
  },
  {
    id: "reliability-hardening",
    priority: 8,
    bundle: "Reliability or fallback hardening",
    template: "Reliability or fallback hardening",
    defaultSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-ai-trust-layer",
      "ah-review-release"
    ],
    promptKeywords: [
      "fallback",
      "retry",
      "stale",
      "degraded",
      "resilience",
      "hardening"
    ],
    filePatterns: [
      "^server/lib/decisionScenarioLab",
      "^server/lib/recommendations",
      "^src/state/caseStore",
      "^src/screens/result/AiRecommendationPanel"
    ],
    verifyCommands: ["npm run typecheck", "npm run test"],
    firstSteps: [
      "Keep useful deterministic UI alive through enhancement failures.",
      "Preserve last-good state only when it stays truthful.",
      "Make retry and degraded messaging explicit."
    ],
    executionLane: "standard-lane",
    multiAgentPack: triad(
      "reliability-pack",
      "parallel-triad",
      [
        {
          role: "failure-owner",
          objective: "Model the failure path and keep the UX truthful under degradation.",
          skills: ["ah-backend-contracts"],
          owns: ["fallback path", "retry behavior", "truthful degraded state"]
        },
        {
          role: "state-owner",
          objective: "Preserve last-good state and cache rules without cross-case bleed.",
          skills: ["ah-ai-trust-layer", "ah-backend-contracts"],
          owns: ["state ownership", "cache invalidation", "runtime hardening"]
        },
        {
          role: "regression-owner",
          objective: "Prove that reliability fixes did not weaken trust boundaries.",
          skills: ["ah-review-release"],
          owns: ["negative paths", "trust-safe messaging", "regression gate"]
        }
      ],
      [
        "failure-owner describes the degraded path first",
        "state-owner updates state truthfulness second",
        "regression-owner proves the fix did not create silent drift"
      ]
    )
  },
  {
    id: "regression-proof",
    priority: 9,
    bundle: "Regression-test expansion",
    template: "Regression-test expansion",
    defaultSkills: ["ah-control-protocol", "ah-visual-qa", "ah-review-release"],
    promptKeywords: [
      "test",
      "tests",
      "regression",
      "coverage",
      "golden",
      "scenario",
      "verify"
    ],
    filePatterns: [
      "\\.test\\.tsx?$",
      "\\.integration\\.test\\.tsx?$",
      "^scripts/verify-engine-drift\\.ts$",
      "^data/scenarios/"
    ],
    verifyCommands: ["npm run test", "npm run verify:engine"],
    firstSteps: [
      "Find the narrowest layer that can truly catch the regression.",
      "Assert behavior, not incidental structure.",
      "Add at least one negative or conflict path when the risk warrants it."
    ],
    executionLane: "fast-lane",
    multiAgentPack: triad(
      "regression-proof-pack",
      "parallel-triad",
      [
        {
          role: "fixture-owner",
          objective: "Add the narrowest real scenarios that can catch the breakage.",
          skills: ["ah-visual-qa"],
          owns: ["scenario fixtures", "targeted test cases", "negative paths"]
        },
        {
          role: "coverage-reviewer",
          objective: "Check that the new tests prove behavior instead of structure noise.",
          skills: ["ah-review-release"],
          owns: ["assertion quality", "regression focus", "test noise pressure"]
        },
        {
          role: "release-gate",
          objective: "Close the regression pass with runnable proof and clear residual risk.",
          skills: ["ah-review-release"],
          owns: ["test evidence", "engine verify", "residual risk summary"]
        }
      ],
      [
        "fixture-owner adds the proving scenario first",
        "coverage-reviewer strips weak assertions second",
        "release-gate closes with runnable evidence"
      ]
    )
  }
];

export const MODE_DEFINITIONS: CompiledModeDefinition[] = MODE_REGISTRY.map(
  compileModeDefinition
);

function compileModeDefinition(mode: ModeDefinition): CompiledModeDefinition {
  return {
    ...mode,
    defaultSkills: withMandatoryProtocolSkill(mode.defaultSkills),
    filePatterns: mode.filePatterns.map((pattern) => new RegExp(pattern))
  };
}

function normalizePrompt(prompt: string): string {
  return prompt.trim();
}

function normalizeFilePath(file: string): string {
  const trimmed = file.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return "";

  const normalized = trimmed.replaceAll("\\", "/");
  const normalizedCwd = process.cwd().replaceAll("\\", "/");
  const withoutRepoPrefix = normalized.startsWith(`${normalizedCwd}/`)
    ? normalized.slice(normalizedCwd.length + 1)
    : normalized;

  return withoutRepoPrefix.replace(/^\.\//, "");
}

function addCsvFiles(target: string[], value: string) {
  for (const token of value.split(",")) {
    const file = normalizeFilePath(token);
    if (file) target.push(file);
  }
}

function parseBooleanSwitch(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "deep", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }
  return null;
}

export function parseModeArgs(argv: string[]): ModeCliArgs {
  const envDeepOrchestration = parseBooleanSwitch(process.env.AH_DEEP_ORCHESTRATION);
  const result: ModeCliArgs = {
    prompt: "",
    files: [],
    reviewOnly: false,
    deepOrchestration: envDeepOrchestration ?? false,
    deepOrchestrationSource: envDeepOrchestration === null ? "default" : "env",
    telemetryEnabled: false,
    telemetryFile: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--review-only") {
      result.reviewOnly = true;
      continue;
    }

    if (token === "--deep-orchestration" || token === "--orchestrate") {
      result.deepOrchestration = true;
      result.deepOrchestrationSource = "flag";
      continue;
    }

    if (token === "--no-deep-orchestration" || token === "--no-orchestrate") {
      result.deepOrchestration = false;
      result.deepOrchestrationSource = "flag";
      continue;
    }

    if (token.startsWith("--deep-orchestration=")) {
      const parsed = parseBooleanSwitch(token.slice("--deep-orchestration=".length));
      if (parsed !== null) {
        result.deepOrchestration = parsed;
        result.deepOrchestrationSource = "flag";
      }
      continue;
    }

    if (token.startsWith("--orchestration=")) {
      const parsed = parseBooleanSwitch(token.slice("--orchestration=".length));
      if (parsed !== null) {
        result.deepOrchestration = parsed;
        result.deepOrchestrationSource = "flag";
      }
      continue;
    }

    if (token === "--telemetry") {
      result.telemetryEnabled = true;
      continue;
    }

    if (token === "--telemetry-file" && next) {
      result.telemetryFile = next;
      index += 1;
      continue;
    }

    if (token.startsWith("--telemetry-file=")) {
      result.telemetryFile = token.slice("--telemetry-file=".length);
      continue;
    }

    if (token === "--prompt" && next) {
      result.prompt = next;
      index += 1;
      continue;
    }

    if (token.startsWith("--prompt=")) {
      result.prompt = token.slice("--prompt=".length);
      continue;
    }

    if (token === "--files" && next) {
      addCsvFiles(result.files, next);
      index += 1;
      continue;
    }

    if (token.startsWith("--files=")) {
      addCsvFiles(result.files, token.slice("--files=".length));
      continue;
    }

    if (token === "--file" && next) {
      const file = normalizeFilePath(next);
      if (file) result.files.push(file);
      index += 1;
      continue;
    }

    if (token.startsWith("--file=")) {
      const file = normalizeFilePath(token.slice("--file=".length));
      if (file) result.files.push(file);
    }
  }

  return {
    prompt: normalizePrompt(result.prompt),
    files: result.files,
    reviewOnly: result.reviewOnly,
    deepOrchestration: result.deepOrchestration,
    deepOrchestrationSource: result.deepOrchestrationSource,
    telemetryEnabled: result.telemetryEnabled,
    telemetryFile: result.telemetryFile
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countKeywordHits(text: string, keywords: string[]): string[] {
  const lowerText = normalizePrompt(text).toLowerCase();
  return keywords.filter((keyword) => {
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeRegExp(keyword.toLowerCase())}([^\\p{L}\\p{N}]|$)`,
      "u"
    );
    return pattern.test(lowerText);
  });
}

function hasNegatedUiIntent(text: string): boolean {
  const lowerText = normalizePrompt(text).toLowerCase();
  return /(^|[^\p{L}\p{N}])(?:non[-\s]?ui|no[-\s]?ui|not\s+ui|without\s+ui|без\s+ui|не\s+ui|без\s+интерфейса|не\s+интерфейс)([^\p{L}\p{N}]|$)/u.test(
    lowerText
  );
}

function countModeKeywordHits(text: string, mode: CompiledModeDefinition): string[] {
  const hits = countKeywordHits(text, mode.promptKeywords);
  if (mode.id !== "premium-ui" || !hasNegatedUiIntent(text)) return hits;
  return hits.filter((hit) => hit.toLowerCase() !== "ui");
}

export function countFileHits(files: string[], patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const file of files.map(normalizeFilePath).filter(Boolean)) {
    if (patterns.some((pattern) => pattern.test(file))) {
      hits.push(file);
    }
  }
  return hits;
}

function reasonIncludesFileMatch(reasons: string[]): boolean {
  return reasons.some((reason) => reason.startsWith("files: "));
}

function sortModeMatches(left: ModeMatch, right: ModeMatch): number {
  if (left.reviewHit !== right.reviewHit) {
    return left.reviewHit ? -1 : 1;
  }

  const leftPinned = Boolean(left.mode.pinWhenFilesMatch && reasonIncludesFileMatch(left.reasons));
  const rightPinned = Boolean(
    right.mode.pinWhenFilesMatch && reasonIncludesFileMatch(right.reasons)
  );

  if (leftPinned !== rightPinned) {
    return leftPinned ? -1 : 1;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return left.mode.priority - right.mode.priority;
}

export function collectModeMatches(
  prompt: string,
  files: string[],
  reviewOnly: boolean
): ModeMatch[] {
  const normalizedPrompt = normalizePrompt(prompt);
  const normalizedFiles = files.map(normalizeFilePath).filter(Boolean);
  const matches: ModeMatch[] = [];

  for (const mode of MODE_DEFINITIONS) {
    const keywordHits = countModeKeywordHits(normalizedPrompt, mode);
    const fileHits = countFileHits(normalizedFiles, mode.filePatterns);
    const reviewHit = Boolean(reviewOnly && mode.reviewOnly);
    const score = keywordHits.length + fileHits.length + (reviewHit ? 3 : 0);

    if (score === 0) continue;

    const reasons: string[] = [];
    if (reviewHit) reasons.push("review-only flag");
    if (keywordHits.length > 0) reasons.push(`keywords: ${keywordHits.join(", ")}`);
    if (fileHits.length > 0) reasons.push(`files: ${fileHits.join(", ")}`);

    matches.push({
      mode,
      reasons,
      score,
      keywordHits,
      fileHits,
      reviewHit
    });
  }

  matches.sort(sortModeMatches);
  return matches;
}

function summarizeCandidates(matches: ModeMatch[]): ModeCandidateSummary[] {
  return matches.map((candidate) => ({
    mode: candidate.mode.id,
    priority: candidate.mode.priority,
    score: candidate.score,
    reason: candidate.reasons,
    keywordHits: candidate.keywordHits.length,
    fileHits: candidate.fileHits.length,
    reviewOnly: candidate.reviewHit
  }));
}

function createRoutingConfidence(matches: ModeMatch[]): RoutingConfidence | null {
  const primary = matches[0];
  if (!primary) return null;

  const adaptiveConfidence = createAdaptiveRoutingConfidence({
    primaryScore: primary.score,
    secondaryScore: matches[1]?.score ?? 0,
    keywordSignals: primary.keywordHits.length + (primary.reviewHit ? 1 : 0),
    fileSignals: primary.fileHits.length,
    pinned: Boolean(primary.mode.pinWhenFilesMatch && primary.fileHits.length > 0),
    candidateCount: matches.length
  });
  const nextScore = matches[1]?.score ?? null;
  const gapToNext =
    nextScore === null ? adaptiveConfidence.scoreGap : primary.score - nextScore;
  const dominantSignal = primary.reviewHit
    ? "review-only"
    : primary.fileHits.length > primary.keywordHits.length
      ? "files"
      : "prompt";

  return {
    level: adaptiveConfidence.level,
    score: adaptiveConfidence.score,
    gapToNext,
    keywordHits: primary.keywordHits.length,
    fileHits: primary.fileHits.length,
    reviewOnly: primary.reviewHit,
    dominantSignal,
    manualReviewRecommended: adaptiveConfidence.level === "low"
  };
}

function createExecutionLane(
  primary: ModeMatch | undefined,
  confidence: RoutingConfidence | null
): ExecutionLaneSummary | null {
  if (!primary || !confidence) return null;

  if (primary.reviewHit || primary.mode.reviewOnly) {
    return {
      lane: "review-lane",
      reason: "Review-only work routes into a dedicated review lane."
    };
  }

  if (primary.mode.blockedByPngApproval) {
    return {
      lane: "blocked-png",
      reason: "UI work stays blocked until a PNG preview is approved."
    };
  }

  if (primary.mode.executionLane === "fast-lane") {
    return {
      lane: "fast-lane",
      reason: "This mode is designed as a hot path with targeted proof and low orchestration overhead."
    };
  }

  if (
    primary.mode.executionLane === "standard-lane" &&
    confidence.level === "high" &&
    primary.mode.verifyCommands.length <= 1
  ) {
    return {
      lane: "fast-lane",
      reason: "High-confidence routing and a light verify stack qualify this task for the fast lane."
    };
  }

  return {
    lane: "standard-lane",
    reason: confidence.level === "low"
      ? "Low-confidence routing stays in the standard lane with explicit human checks."
      : "This task needs the normal implementation lane with the full mode packet."
  };
}

function resolveVerifyCost(verifyCommands: string[]): VerifyCost {
  if (verifyCommands.length <= 1) return "light";
  if (verifyCommands.length <= 2) return "moderate";
  return "heavy";
}

function createTelemetrySummary(input: ModeCliArgs): TelemetrySummary {
  const telemetry = resolveSkillModeTelemetryConfig({
    telemetryEnabled: input.telemetryEnabled,
    telemetryFile: input.telemetryFile,
    source: "detect"
  });

  return {
    enabled: telemetry.enabled,
    logPath: telemetry.enabled ? telemetry.logPath : null
  };
}

function createFileSurface(files: string[]): FileSurface {
  return analyzeFileSurface(files.map(normalizeFilePath).filter(Boolean));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function createDeepOrchestrationSummary(
  input: ModeCliArgs,
  matches: ModeMatch[]
): DeepOrchestrationSummary {
  const candidateSkillSources = matches.slice(0, 4).map((match) => ({
    mode: match.mode.id,
    skills: match.mode.defaultSkills
  }));
  const selectedSkills = input.deepOrchestration
    ? uniqueStrings(candidateSkillSources.flatMap((entry) => entry.skills))
    : [];

  return {
    status: input.deepOrchestration ? "enabled" : "disabled",
    source: input.deepOrchestrationSource,
    activation: [
      "npm run do -- \"...\"",
      "npm run super -- \"...\"",
      "npm run skills:orchestrate -- --prompt \"...\"",
      "npm run ah:orchestrate -- \"...\"",
      "npm run skills:autopilot -- --deep-orchestration --prompt \"...\""
    ],
    selectedSkills,
    candidateSkillSources,
    skillPolicy: input.deepOrchestration
      ? [
          "scan modes.md, bundles.md, packs.md and situations.md before planning",
          "load every skill and internal reference that owns a real risk surface",
          "do not stop at two skills when the task spans product, contracts, UI, AI, QA or release",
          "do not load irrelevant skills just to increase count"
        ]
      : [
          "use the primary mode default skills and add secondary skills only when the surface requires them",
          "turn on deep orchestration for broad, ambiguous, high-risk or multi-surface work"
        ],
    agentPolicy: [
      "create agents only for independent ownership slices that can run in parallel",
      "keep the main agent on the immediate critical path",
      "assign disjoint file or responsibility ownership to each worker",
      "use reviewer/verifier roles for risk discovery and proof, not duplicate implementation"
    ],
    promptPolicy: [
      "state user goal, business goal, primary flow, constraints and forbidden scope",
      "include source-of-truth artifacts, acceptance criteria, edge cases and proof commands",
      "separate implementation tasks, review gates and paste-ready handoff blocks",
      "ask for exactly one missing artifact when safe execution is blocked"
    ],
    hardStops: [
      "no UI implementation before PNG approval",
      "no invented APIs, metrics, endpoints or user behavior",
      "no completeness claim without verification",
      "no subagent use when runtime policy or task coupling makes it unsafe"
    ]
  };
}

function createRecommendedAgentPackForMode(
  primary: ModeMatch | undefined,
  input: ModeCliArgs,
  routingConfidence: RoutingConfidence | null,
  executionLane: ExecutionLaneSummary | null
): RecommendedAgentPack {
  const blockedByPngApproval = Boolean(primary?.mode.blockedByPngApproval);
  const lane =
    executionLane?.lane === "fast-lane"
      ? { id: "fast" as const, reason: [executionLane.reason] }
      : executionLane?.lane === "standard-lane"
        ? { id: "standard" as const, reason: [executionLane.reason] }
        : primary
          ? { id: "deep" as const, reason: [executionLane?.reason ?? "Deep lane required."] }
          : { id: "manual" as const, reason: [NO_MATCH_REASON] };

  return createRecommendedAgentPack({
    mode: primary?.mode.id ?? null,
    defaultSkills: primary?.mode.defaultSkills ?? [],
    files: input.files.map(normalizeFilePath).filter(Boolean),
    fileSurface: createFileSurface(input.files),
    confidence: {
      score: routingConfidence?.score ?? 0.22,
      level: routingConfidence?.level ?? "low",
      reason: executionLane ? [executionLane.reason] : [NO_MATCH_REASON],
      primaryScore: primary?.score ?? 0,
      secondaryScore: 0,
      scoreGap: routingConfidence?.gapToNext ?? 0,
      matchedSignals:
        (primary?.keywordHits.length ?? 0) + (primary?.fileHits.length ?? 0),
      keywordSignals: primary?.keywordHits.length ?? 0,
      fileSignals: primary?.fileHits.length ?? 0,
      pinned: Boolean(primary?.mode.pinWhenFilesMatch && (primary?.fileHits.length ?? 0) > 0),
      singleCandidate: false
    },
    executionLane: blockedByPngApproval
      ? {
          id: "blocked",
          reason: [PNG_BLOCK_REASON]
        }
      : lane,
    reviewOnly: input.reviewOnly,
    blockedByPngApproval
  });
}

function createExecutionPlan(
  input: ModeCliArgs,
  primary: ModeMatch | undefined,
  blockedState: StartModeResult["blockedState"],
  executionLane: ExecutionLaneSummary | null
): ExecutionPlan {
  const verifyCommands = primary?.mode.verifyCommands ?? [];
  const firstSteps = primary?.mode.firstSteps ?? [];
  const deepSteps = input.deepOrchestration
    ? [
        "Run deep orchestration first: scan all relevant skill maps, candidate modes, agent ownership, prompt hardening, and verification gates.",
        "Create a task-specific agent plan only where work can be split by independent ownership."
      ]
    : [];

  if (!primary) {
    return {
      lane: "manual",
      immediateSteps: [
        ...deepSteps,
        "Choose the primary mode manually before editing code.",
        "Then rerun skills:start with the clarified prompt or files."
      ],
      immediateVerifyCommands: [],
      deferredVerifyCommands: []
    };
  }

  if (blockedState.status === "blocked") {
    return {
      lane: "blocked",
      immediateSteps: [
        ...deepSteps,
        "Get PNG approval before any UI code changes."
      ],
      immediateVerifyCommands: [],
      deferredVerifyCommands: verifyCommands
    };
  }

  if (executionLane?.lane === "fast-lane") {
    const immediateVerifyCommands: string[] = [];
    if (verifyCommands[0]) immediateVerifyCommands.push(verifyCommands[0]);
    if (
      verifyCommands.includes("npm run typecheck") &&
      !immediateVerifyCommands.includes("npm run typecheck")
    ) {
      immediateVerifyCommands.push("npm run typecheck");
    }

    return {
      lane: executionLane.lane,
      immediateSteps: [...deepSteps, ...firstSteps.slice(0, 2)],
      immediateVerifyCommands,
      deferredVerifyCommands: verifyCommands.filter(
        (command) => !immediateVerifyCommands.includes(command)
      )
    };
  }

  return {
    lane: executionLane?.lane ?? "standard-lane",
    immediateSteps: [...deepSteps, ...firstSteps],
    immediateVerifyCommands: verifyCommands,
    deferredVerifyCommands: []
  };
}

function createDetectFallbackResult(input: ModeCliArgs): DetectModeResult {
  const fileSurface = createFileSurface(input.files);
  return {
    mode: null,
    reason: NO_MATCH_REASON,
    bundle: null,
    template: null,
    defaultSkills: [],
    candidates: [],
    routingConfidence: null,
    executionLane: null,
    fileSurface,
    recommendedAgentPack: createRecommendedAgentPack({
      mode: null,
      defaultSkills: [],
      files: input.files.map(normalizeFilePath).filter(Boolean),
      fileSurface,
      confidence: {
        score: 0.22,
        level: "low",
        reason: [NO_MATCH_REASON],
        primaryScore: 0,
        secondaryScore: 0,
        scoreGap: 0,
        matchedSignals: 0,
        keywordSignals: 0,
        fileSignals: 0,
        pinned: false,
        singleCandidate: false
      },
      executionLane: {
        id: "manual",
        reason: [NO_MATCH_REASON]
      },
      reviewOnly: input.reviewOnly,
      blockedByPngApproval: false
    }),
    orchestrationMode: createDeepOrchestrationSummary(input, []),
    telemetry: createTelemetrySummary(input)
  };
}

function createDetectResult(input: ModeCliArgs, matches: ModeMatch[]): DetectModeResult {
  const primary = matches[0];
  if (!primary) return createDetectFallbackResult(input);

  const routingConfidence = createRoutingConfidence(matches);
  const executionLane = createExecutionLane(primary, routingConfidence);
  const fileSurface = createFileSurface(input.files);

  return {
    mode: primary.mode.id,
    reason: primary.reasons,
    bundle: primary.mode.bundle,
    template: primary.mode.template,
    defaultSkills: primary.mode.defaultSkills,
    candidates: summarizeCandidates(matches),
    routingConfidence,
    executionLane,
    fileSurface,
    recommendedAgentPack: createRecommendedAgentPackForMode(
      primary,
      input,
      routingConfidence,
      executionLane
    ),
    orchestrationMode: createDeepOrchestrationSummary(input, matches),
    telemetry: createTelemetrySummary(input)
  };
}

function createBlockedState(primary: ModeMatch | undefined): StartModeResult["blockedState"] {
  if (!primary) {
    return {
      status: "unknown",
      reason: NO_PRIMARY_REASON
    };
  }

  if (primary.reviewHit || primary.mode.reviewOnly) {
    return {
      status: "unblocked",
      reason: "Review-only work is never blocked by the PNG implementation gate."
    };
  }

  return primary.mode.blockedByPngApproval
    ? {
        status: "blocked",
        reason: PNG_BLOCK_REASON
      }
    : {
        status: "unblocked",
        reason: UNBLOCKED_REASON
      };
}

function createTelemetryReport(
  matches: ModeMatch[],
  startResult: StartModeResult
): TelemetryReport {
  const primary = matches[0];
  const routingConfidence = startResult.routingConfidence;
  const executionLane = startResult.executionLane;
  const verifyCost = resolveVerifyCost(startResult.verifyCommands);
  const blocked = startResult.blockedState.status === "blocked";
  const recommendedAgentCount = startResult.recommendedAgentPack.agents.length;

  let nextAction: TelemetryReport["nextAction"] = "manual-routing";
  if (blocked) {
    nextAction = "request-png-approval";
  } else if (executionLane?.lane === "fast-lane") {
    nextAction = "run-fast-lane";
  } else if (executionLane?.lane === "standard-lane") {
    nextAction = "run-standard-lane";
  } else if (executionLane?.lane === "review-lane") {
    nextAction = "run-review-lane";
  }

  return {
    primaryMode: primary?.mode.id ?? null,
    candidateCount: matches.length,
    blocked,
    routingConfidenceLevel: routingConfidence?.level ?? "manual",
    executionLane: executionLane?.lane ?? null,
    dominantSignal: routingConfidence?.dominantSignal ?? "manual",
    verifyCost,
    recommendedAgentCount,
    autopilotReady:
      Boolean(primary) &&
      !blocked &&
      Boolean(executionLane) &&
      routingConfidence?.manualReviewRecommended !== true,
    nextAction,
    signals: {
      keywordHits: primary?.keywordHits.length ?? 0,
      fileHits: primary?.fileHits.length ?? 0,
      reviewOnly: primary?.reviewHit ?? false
    },
    reasons: Array.isArray(startResult.reason) ? startResult.reason : [startResult.reason]
  };
}

function writeModeTelemetry(
  source: "detect" | "start" | "autopilot",
  input: ModeCliArgs,
  result: DetectModeResult | StartModeResult
) {
  const telemetry = resolveSkillModeTelemetryConfig({
    telemetryEnabled: input.telemetryEnabled,
    telemetryFile: input.telemetryFile,
    source
  });
  if (!telemetry.enabled) return;

  const blockedState = "blockedState" in result ? result.blockedState.status : null;
  writeSkillModeTelemetry(
    telemetry,
    createSkillModeTelemetryEvent({
      source,
      prompt: input.prompt,
      files: input.files.map(normalizeFilePath).filter(Boolean),
      reviewOnly: input.reviewOnly,
      mode: result.mode,
      confidenceScore: result.routingConfidence?.score ?? null,
      confidenceLevel: result.routingConfidence?.level ?? null,
      executionLane: result.executionLane?.lane ?? null,
      blockedState,
      candidateModes: result.candidates.map((candidate) => candidate.mode),
      fileSurface: {
        fileCount: result.fileSurface.fileCount,
        areas: result.fileSurface.areas,
        dominantArea: result.fileSurface.dominantArea,
        complexity: result.fileSurface.complexity
      },
      agentTopology: result.recommendedAgentPack.topology
    })
  );
}

function buildStartModeResult(
  input: ModeCliArgs,
  matches: ModeMatch[]
): StartModeResult {
  const primary = matches[0];
  const detectResult = createDetectResult(input, matches);
  const blockedState = createBlockedState(primary);

  if (!primary) {
    return {
      ...detectResult,
      blockedState,
      verifyCommands: [],
      firstSteps: [],
      executionPlan: createExecutionPlan(input, primary, blockedState, detectResult.executionLane)
    };
  }

  return {
    ...detectResult,
    blockedState,
    verifyCommands: primary.mode.verifyCommands,
    firstSteps: primary.mode.firstSteps,
    executionPlan: createExecutionPlan(input, primary, blockedState, detectResult.executionLane)
  };
}

export function detectMode(input: ModeCliArgs): DetectModeResult {
  const result = createDetectResult(
    input,
    collectModeMatches(input.prompt, input.files, input.reviewOnly)
  );
  writeModeTelemetry("detect", input, result);
  return result;
}

export function startMode(input: ModeCliArgs): StartModeResult {
  const matches = collectModeMatches(input.prompt, input.files, input.reviewOnly);
  const result = buildStartModeResult(input, matches);
  writeModeTelemetry("start", input, result);
  return result;
}

export function autopilotMode(input: ModeCliArgs): AutopilotModeResult {
  const matches = collectModeMatches(input.prompt, input.files, input.reviewOnly);
  const primary = matches[0];
  const startResult = buildStartModeResult(input, matches);
  writeModeTelemetry("autopilot", input, startResult);

  return {
    ...startResult,
    multiAgentPack: primary?.mode.multiAgentPack ?? null,
    telemetryReport: createTelemetryReport(matches, startResult)
  };
}
