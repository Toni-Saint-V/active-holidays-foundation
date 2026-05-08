import type { ModeId } from "../skill-mode-registry.ts";

export const QUALITY_AXES = [
  "governance",
  "plugin-governance",
  "architecture",
  "verification",
  "review",
  "premium-ui",
  "png-gate",
  "russian-copy",
  "trust-boundary",
  "result-flow",
  "fallback",
  "regression",
  "manual-routing"
] as const;

export type QualityAxis = (typeof QUALITY_AXES)[number];

export const ROUTING_CONFIDENCE_LEVELS = ["none", "low", "medium", "high"] as const;

export type RoutingConfidence = (typeof ROUTING_CONFIDENCE_LEVELS)[number];

export const EXECUTION_LANES = [
  "manual-routing",
  "blocked-png",
  "review-lane",
  "fast-lane",
  "standard-lane"
] as const;

export type ExecutionLane = (typeof EXECUTION_LANES)[number];

export const AGENT_PACK_ROLES = ["lead", "verifier", "reviewer"] as const;

export type AgentPackRole = (typeof AGENT_PACK_ROLES)[number];

export const REQUIRED_TELEMETRY_FIELDS = [
  "mode",
  "candidateCount",
  "topScore",
  "topScoreGap",
  "routingConfidence",
  "executionLane",
  "blockedState",
  "verifyCommandCount",
  "firstStepCount",
  "defaultSkillCount",
  "recommendedAgentPack"
] as const;

export type TelemetryField = (typeof REQUIRED_TELEMETRY_FIELDS)[number];

export const CRITICAL_EXECUTION_LANES: ExecutionLane[] = [
  "manual-routing",
  "blocked-png",
  "review-lane",
  "fast-lane",
  "standard-lane"
];

export const CRITICAL_ROUTING_CONFIDENCE: RoutingConfidence[] = [
  "none",
  "low",
  "medium",
  "high"
];

export const CRITICAL_QUALITY_AXES: QualityAxis[] = [
  "governance",
  "plugin-governance",
  "architecture",
  "verification",
  "review",
  "premium-ui",
  "png-gate",
  "russian-copy",
  "trust-boundary",
  "result-flow",
  "fallback",
  "regression",
  "manual-routing"
];

export type AgentSystemFixture = {
  id: string;
  title: string;
  prompt: string;
  files: string[];
  syntheticFilesAllowed?: boolean;
  reviewOnly?: boolean;
  expectedPrimaryMode: ModeId | null;
  expectedBlockedState: "blocked" | "unblocked" | "unknown";
  expectedRoutingConfidence: RoutingConfidence;
  expectedExecutionLane: ExecutionLane;
  expectedCandidateModes?: ModeId[];
  requiredAxes: QualityAxis[];
  preferredEntrySkills?: string[];
  requiredAgentRoles?: AgentPackRole[];
  expectedAgentPackSkills?: string[];
};

export const AGENT_SYSTEM_FIXTURES: AgentSystemFixture[] = [
  {
    id: "skill-system-governance-control-tower-runtime",
    title: "Control tower runtime governance",
    prompt:
      "Нужно усилить control tower runtime contracts, manual approvals, notion lock, gate projection и validator без UI implementation.",
    files: [
      "scripts/codex/automation-registry.ts",
      "scripts/codex/notion-operational-contract.ts",
      "scripts/codex/shared-skill-compat.ts",
      ".codex/automations/notion-surface-lock.json",
      ".codex/automations/check-waivers.json",
      "reports/automations/state/runtime-maturity.json",
      "reports/automations/state/notion-writeback-promotion.json",
      "reports/automations/state/manual-approvals.json",
      "reports/automations/state/gate-eligibility-snapshot.json"
    ],
    expectedPrimaryMode: "skill-system-governance",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    requiredAxes: ["governance", "verification", "architecture"],
    preferredEntrySkills: [
      "ah-control-protocol",
      "ah-review-release"
    ],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "skill-system-governance-mixed-ui-language",
    title: "Governance wins over mixed UI language",
    prompt:
      "Нужно не трогать UI, но укрепить governance/runtime contracts для Lovable integration, Notion lock и automation packets.",
    files: [
      "scripts/codex/automation-registry.ts",
      "scripts/codex/notion-operational-contract.ts",
      "scripts/codex/verify-automations.ts",
      ".codex/automations/notion-surface-lock.json"
    ],
    expectedPrimaryMode: "skill-system-governance",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    requiredAxes: ["governance", "verification"],
    preferredEntrySkills: ["ah-control-protocol"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "skill-system-governance-runtime",
    title: "Skill system runtime governance",
    prompt:
      "Нужно усилить skill router, mode detection, openai.yaml metadata и automation context surface без дублирования правил.",
    files: [
      "scripts/codex/verify-skills.ts",
      "scripts/codex/start-skill-mode.ts",
      "scripts/automations/check-context-surface.ts"
    ],
    expectedPrimaryMode: "skill-system-governance",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    requiredAxes: ["governance", "verification"],
    preferredEntrySkills: [
      "ah-control-protocol",
      "ah-review-release",
      "ah-review-release"
    ],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "skill-system-governance-deep-orchestration-switch",
    title: "Deep orchestration switch for skills and subagents",
    prompt:
      "Нужно прописать вкл/выкл режим, чтобы skill router сам анализировал нужные скиллы, сабагентов, роли агентов и best practices для промптов.",
    files: [],
    expectedPrimaryMode: "skill-system-governance",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    requiredAxes: ["governance", "verification", "review"],
    preferredEntrySkills: ["ah-control-protocol", "ah-repo-automation"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-repo-automation",
      "ah-review-release"
    ]
  },
  {
    id: "ah-repo-automation",
    title: "Plugin and MCP surface governance",
    prompt:
      "Проверь plugin marketplace, local plugin manifest и Cursor MCP surface перед добавлением нового plugin.",
    files: [
      "plugins/ah-runtime/.codex-plugin/plugin.json",
      ".agents/plugins/marketplace.json",
      ".cursor/mcp.json"
    ],
    syntheticFilesAllowed: true,
    expectedPrimaryMode: "plugin-surface",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    requiredAxes: ["plugin-governance", "architecture", "verification"],
    preferredEntrySkills: ["ah-repo-automation"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-repo-automation",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "review-gate-merge-readiness",
    title: "Review gate before merge",
    prompt:
      "Проведи review diff перед merge, перечисли findings, proof, gaps и дай ship или block verdict.",
    files: ["src/screens/result/ResultScreen.tsx"],
    reviewOnly: true,
    expectedPrimaryMode: "review-gate",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "review-lane",
    requiredAxes: ["review", "verification", "regression"],
    preferredEntrySkills: ["ah-review-release", "ah-review-release"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-review-release",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "review-gate-governance-override",
    title: "Review gate must override governance implementation routing",
    prompt:
      "Нужно сделать review merge diff и findings по skill router и docs surface.",
    files: [".codex/skills/README.md", "scripts/codex/skill-mode-registry.ts"],
    reviewOnly: true,
    expectedPrimaryMode: "review-gate",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "review-lane",
    expectedCandidateModes: ["skill-system-governance"],
    requiredAxes: ["review", "verification", "governance"],
    preferredEntrySkills: ["ah-review-release", "ah-review-release"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-review-release",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "premium-ui-png-gate",
    title: "Premium UI with PNG gate",
    prompt:
      "Нужно усилить premium UI, hierarchy, spacing и CTA для нового screen и не трогать код до PNG approval.",
    files: ["src/screens/landing/LandingScreen.tsx", "src/ui/OfferCard.tsx"],
    expectedPrimaryMode: "premium-ui",
    expectedBlockedState: "blocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "blocked-png",
    requiredAxes: ["premium-ui", "png-gate", "russian-copy"],
    preferredEntrySkills: [
      "ah-control-protocol",
      "ah-ui-implementation"
    ],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-ui-implementation",
      "ah-ui-implementation",
      "ah-ui-implementation"
    ]
  },
  {
    id: "ai-recommendation-boundary",
    title: "AI recommendation boundary fix",
    prompt:
      "Нужно исправить AI recommendation copy и ownership boundary для recommended offer и next steps без подмены детерминированного решения.",
    files: [
      "server/lib/recommendations.ts",
      "shared/contracts/recommendations.ts",
      "server/routes/recommendations.integration.test.ts"
    ],
    syntheticFilesAllowed: true,
    expectedPrimaryMode: "ai-recommendation-boundary",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    expectedCandidateModes: ["contract-boundary"],
    requiredAxes: ["trust-boundary", "verification"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-ai-trust-layer",
      "ah-ai-trust-layer",
      "ah-review-release",
      "ah-visual-qa"
    ]
  },
  {
    id: "ai-boundary-medium-confidence",
    title: "AI boundary medium-confidence routing",
    prompt: "",
    files: [
      "shared/contracts/recommendations.ts",
      "server/routes/recommendations.integration.test.ts"
    ],
    syntheticFilesAllowed: true,
    expectedPrimaryMode: "ai-recommendation-boundary",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "medium",
    expectedExecutionLane: "standard-lane",
    expectedCandidateModes: ["contract-boundary"],
    requiredAxes: ["trust-boundary", "verification"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-ai-trust-layer",
      "ah-ai-trust-layer",
      "ah-visual-qa"
    ]
  },
  {
    id: "ai-boundary-low-confidence",
    title: "AI boundary low-confidence routing",
    prompt: "Нужно понять куда это вообще отнести.",
    files: ["shared/contracts/recommendations.ts"],
    expectedPrimaryMode: "ai-recommendation-boundary",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "low",
    expectedExecutionLane: "standard-lane",
    expectedCandidateModes: ["contract-boundary"],
    requiredAxes: ["trust-boundary", "verification"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-ai-trust-layer",
      "ah-ai-trust-layer",
      "ah-visual-qa"
    ]
  },
  {
    id: "contract-boundary-dto",
    title: "Contract boundary DTO change",
    prompt:
      "Изменился DTO payload и route validation, нужно обновить shared contract и реальных callers без скрытого compat drift.",
    files: [
      "shared/contracts/recommendations.ts",
      "server/routes/recommendations.integration.test.ts",
      "src/lib/apiClient.ts"
    ],
    syntheticFilesAllowed: true,
    expectedPrimaryMode: "contract-boundary",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    expectedCandidateModes: ["ai-recommendation-boundary"],
    requiredAxes: ["architecture", "verification"],
    preferredEntrySkills: ["ah-backend-contracts"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-visual-qa",
      "ah-backend-contracts"
    ]
  },
  {
    id: "ah-result-flow",
    title: "Result flow integration",
    prompt:
      "Нужно усилить result flow: compare и human review states прямо внутри текущего result loop.",
    files: [
      "src/screens/result/ResultScreen.tsx",
      "src/screens/human-review/HumanReviewScreen.tsx"
    ],
    expectedPrimaryMode: "result-flow",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "fast-lane",
    requiredAxes: ["result-flow", "trust-boundary", "russian-copy"],
    preferredEntrySkills: ["ah-result-flow", "ah-ui-direction"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-result-flow",
      "ah-ui-direction",
      "ah-review-release"
    ]
  },
  {
    id: "reliability-hardening-fallback",
    title: "Reliability and fallback hardening",
    prompt:
      "Нужно укрепить fallback, retry, stale-safe state и degraded messaging без потери truthful last-good state.",
    files: [
      "server/lib/recommendations.ts",
      "src/state/caseStore.ts",
      "src/screens/result/AiRecommendationPanel.tsx"
    ],
    expectedPrimaryMode: "reliability-hardening",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "standard-lane",
    expectedCandidateModes: ["result-flow"],
    requiredAxes: ["fallback", "trust-boundary", "verification"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-backend-contracts",
      "ah-backend-contracts",
      "ah-review-release"
    ]
  },
  {
    id: "regression-proof-golden",
    title: "Regression proof with golden scenarios",
    prompt:
      "Нужно расширить regression coverage, golden scenario checks и verify drift на конфликтном кейсе.",
    files: [
      "server/routes/recommendations.integration.test.ts",
      "scripts/verify-engine-drift.ts",
      "data/scenarios/baseline/s5-rf-italy-insurance.json"
    ],
    expectedPrimaryMode: "regression-proof",
    expectedBlockedState: "unblocked",
    expectedRoutingConfidence: "high",
    expectedExecutionLane: "fast-lane",
    requiredAxes: ["regression", "verification"],
    preferredEntrySkills: ["ah-review-release", "ah-review-release"],
    requiredAgentRoles: ["lead", "verifier", "reviewer"],
    expectedAgentPackSkills: [
      "ah-control-protocol",
      "ah-visual-qa",
      "ah-review-release",
      "ah-review-release"
    ]
  },
  {
    id: "manual-routing-no-signal",
    title: "No signal should stay manual",
    prompt: "",
    files: [],
    expectedPrimaryMode: null,
    expectedBlockedState: "unknown",
    expectedRoutingConfidence: "none",
    expectedExecutionLane: "manual-routing",
    requiredAxes: ["manual-routing"]
  }
];
