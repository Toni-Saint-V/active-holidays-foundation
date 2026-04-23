import type { OperationalSurface } from "./notion-operational-contract.ts";
import { hashValue } from "./automation-contract-utils.ts";

export type AutomationId =
  | "ah-agent-memory-guard"
  | "ah-copy-trust-upgrade"
  | "ah-design-drift-vs-contract"
  | "ah-draft-pr-executor"
  | "ah-execution-brief-sync"
  | "ah-next-best-action-distiller"
  | "ah-notion-sync-director"
  | "ah-open-decisions-curator"
  | "ah-plugin-mcp-surface-watch"
  | "ah-product-os-radar"
  | "ah-release-gate-sync"
  | "ah-review-learning-distiller"
  | "ah-skill-dedupe-gap-harvester"
  | "ah-truth-freshness-watch"
  | "ah-ui-premium-polish-pass";

export type AutomationRole = "feeder" | "synthesis" | "director" | "executor";
export type ArtifactKey =
  | "latest-md"
  | "dated-report-md"
  | "gate-eligibility-snapshot-json"
  | "dry-run-diff-json"
  | "execution-run-json";
export type GatingClass =
  | "report-only"
  | "freshness-gated-report-only"
  | "dry-run-director"
  | "live-write-gated"
  | "executor-lane";
export type MutationPolicy = "report-only" | "prepared-writeback-only" | "gated-live-write-only";

export type FreshnessRequirement = {
  automationId: AutomationId;
  maxAgeHours: number;
  requiredArtifacts: ArtifactKey[];
};

export type AutomationContract = {
  id: AutomationId;
  role: AutomationRole;
  requiredUpstreams: FreshnessRequirement[];
  requiredArtifacts: ArtifactKey[];
  freshnessPolicy: {
    requiresFreshUpstreams: boolean;
    blockOnMixedSnapshots: boolean;
  };
  mutationPolicy: MutationPolicy;
  statePolicy: {
    readsTrackedState: string[];
    readsVolatileState: string[];
    writesState: string[];
  };
  gatingClass: GatingClass;
  notionSurfaceUsage: {
    canonicalAnchors: string[];
    operationalSurfaces: OperationalSurface[];
  };
};

const REQUIRED_FEEDER_INPUTS: FreshnessRequirement[] = [
  {
    automationId: "ah-truth-freshness-watch",
    maxAgeHours: 80,
    requiredArtifacts: ["latest-md", "dated-report-md"]
  },
  {
    automationId: "ah-product-os-radar",
    maxAgeHours: 192,
    requiredArtifacts: ["latest-md", "dated-report-md"]
  },
  {
    automationId: "ah-execution-brief-sync",
    maxAgeHours: 120,
    requiredArtifacts: ["latest-md", "dated-report-md"]
  },
  {
    automationId: "ah-design-drift-vs-contract",
    maxAgeHours: 192,
    requiredArtifacts: ["latest-md", "dated-report-md"]
  }
];

export const AUTOMATION_REGISTRY: readonly AutomationContract[] = [
  {
    id: "ah-agent-memory-guard",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-agent-memory-guard"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: { canonicalAnchors: ["P0_MASTER_DOC"], operationalSurfaces: [] }
  },
  {
    id: "ah-copy-trust-upgrade",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-copy-trust-upgrade"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: {
      canonicalAnchors: ["P1_UX_ARCHITECTURE", "P2_SCREEN_CONTRACTS"],
      operationalSurfaces: []
    }
  },
  {
    id: "ah-design-drift-vs-contract",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-design-drift-vs-contract"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: {
      canonicalAnchors: ["P1_UX_ARCHITECTURE", "P2_SCREEN_CONTRACTS"],
      operationalSurfaces: []
    }
  },
  {
    id: "ah-draft-pr-executor",
    role: "executor",
    requiredUpstreams: [
      {
        automationId: "ah-notion-sync-director",
        maxAgeHours: 48,
        requiredArtifacts: ["latest-md", "dated-report-md", "gate-eligibility-snapshot-json"]
      }
    ],
    requiredArtifacts: ["latest-md", "execution-run-json"],
    freshnessPolicy: { requiresFreshUpstreams: true, blockOnMixedSnapshots: true },
    mutationPolicy: "gated-live-write-only",
    statePolicy: {
      readsTrackedState: [
        ".codex/automations/notion-surface-lock.json",
        ".codex/automations/check-waivers.json",
        "reports/automations/state/manual-approvals.json",
        "reports/automations/state/notion-writeback-promotion.json",
        "reports/automations/state/gate-eligibility-snapshot.json"
      ],
      readsVolatileState: [],
      writesState: [
        "reports/automations/state/execution-runs/*.json",
        "reports/automations/runs/ah-draft-pr-executor"
      ]
    },
    gatingClass: "executor-lane",
    notionSurfaceUsage: { canonicalAnchors: [], operationalSurfaces: [] }
  },
  {
    id: "ah-execution-brief-sync",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-execution-brief-sync"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: {
      canonicalAnchors: ["ROADMAP_INDEX"],
      operationalSurfaces: ["Execution", "Build Briefs"]
    }
  },
  {
    id: "ah-next-best-action-distiller",
    role: "synthesis",
    requiredUpstreams: [
      ...REQUIRED_FEEDER_INPUTS,
      {
        automationId: "ah-open-decisions-curator",
        maxAgeHours: 96,
        requiredArtifacts: ["latest-md", "dated-report-md"]
      },
      {
        automationId: "ah-release-gate-sync",
        maxAgeHours: 96,
        requiredArtifacts: ["latest-md", "dated-report-md"]
      },
      {
        automationId: "ah-review-learning-distiller",
        maxAgeHours: 96,
        requiredArtifacts: ["latest-md", "dated-report-md"]
      }
    ],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: true, blockOnMixedSnapshots: true },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: ["reports/automations/state/gate-eligibility-snapshot.json"],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-next-best-action-distiller"]
    },
    gatingClass: "freshness-gated-report-only",
    notionSurfaceUsage: { canonicalAnchors: ["ROADMAP_INDEX"], operationalSurfaces: [] }
  },
  {
    id: "ah-notion-sync-director",
    role: "director",
    requiredUpstreams: [
      ...REQUIRED_FEEDER_INPUTS,
      {
        automationId: "ah-open-decisions-curator",
        maxAgeHours: 96,
        requiredArtifacts: ["latest-md", "dated-report-md"]
      },
      {
        automationId: "ah-release-gate-sync",
        maxAgeHours: 96,
        requiredArtifacts: ["latest-md", "dated-report-md"]
      },
      {
        automationId: "ah-review-learning-distiller",
        maxAgeHours: 96,
        requiredArtifacts: ["latest-md", "dated-report-md"]
      }
    ],
    requiredArtifacts: ["latest-md", "dated-report-md", "dry-run-diff-json"],
    freshnessPolicy: { requiresFreshUpstreams: true, blockOnMixedSnapshots: true },
    mutationPolicy: "prepared-writeback-only",
    statePolicy: {
      readsTrackedState: [
        ".codex/automations/notion-surface-lock.json",
        ".codex/automations/check-waivers.json",
        "reports/automations/state/runtime-maturity.json",
        "reports/automations/state/manual-approvals.json",
        "reports/automations/state/notion-writeback-promotion.json",
        "reports/automations/state/gate-eligibility-snapshot.json",
        "reports/automations/state/open-decisions-legacy-bridge.json"
      ],
      readsVolatileState: [],
      writesState: [
        "reports/automations/state/runtime-observed/*.json",
        "reports/automations/runs/ah-notion-sync-director"
      ]
    },
    gatingClass: "dry-run-director",
    notionSurfaceUsage: {
      canonicalAnchors: [
        "P0_MASTER_DOC",
        "P0_DEFINITION_OF_FINAL",
        "P1_UX_ARCHITECTURE",
        "P2_SCREEN_CONTRACTS",
        "ROADMAP_INDEX"
      ],
      operationalSurfaces: [
        "Execution",
        "Open Decisions",
        "Build Briefs",
        "Release Gate",
        "Automation Inbox",
        "Opportunities",
        "Review Findings & Learnings"
      ]
    }
  },
  {
    id: "ah-open-decisions-curator",
    role: "synthesis",
    requiredUpstreams: REQUIRED_FEEDER_INPUTS,
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: true, blockOnMixedSnapshots: true },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: ["reports/automations/state/gate-eligibility-snapshot.json"],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-open-decisions-curator"]
    },
    gatingClass: "freshness-gated-report-only",
    notionSurfaceUsage: {
      canonicalAnchors: ["P0_MASTER_DOC", "P0_DEFINITION_OF_FINAL"],
      operationalSurfaces: ["Open Decisions"]
    }
  },
  {
    id: "ah-plugin-mcp-surface-watch",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-plugin-mcp-surface-watch"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: { canonicalAnchors: [], operationalSurfaces: [] }
  },
  {
    id: "ah-product-os-radar",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-product-os-radar"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: {
      canonicalAnchors: ["P0_MASTER_DOC", "P1_UX_ARCHITECTURE", "P2_SCREEN_CONTRACTS"],
      operationalSurfaces: ["Execution", "Open Decisions"]
    }
  },
  {
    id: "ah-release-gate-sync",
    role: "synthesis",
    requiredUpstreams: REQUIRED_FEEDER_INPUTS,
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: true, blockOnMixedSnapshots: true },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: ["reports/automations/state/gate-eligibility-snapshot.json"],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-release-gate-sync"]
    },
    gatingClass: "freshness-gated-report-only",
    notionSurfaceUsage: { canonicalAnchors: [], operationalSurfaces: ["Release Gate"] }
  },
  {
    id: "ah-review-learning-distiller",
    role: "synthesis",
    requiredUpstreams: REQUIRED_FEEDER_INPUTS,
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: true, blockOnMixedSnapshots: true },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: ["reports/automations/state/gate-eligibility-snapshot.json"],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-review-learning-distiller"]
    },
    gatingClass: "freshness-gated-report-only",
    notionSurfaceUsage: {
      canonicalAnchors: [],
      operationalSurfaces: ["Review Findings & Learnings", "Open Decisions"]
    }
  },
  {
    id: "ah-skill-dedupe-gap-harvester",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-skill-dedupe-gap-harvester"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: { canonicalAnchors: [], operationalSurfaces: [] }
  },
  {
    id: "ah-truth-freshness-watch",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-truth-freshness-watch"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: { canonicalAnchors: [], operationalSurfaces: ["Release Gate"] }
  },
  {
    id: "ah-ui-premium-polish-pass",
    role: "feeder",
    requiredUpstreams: [],
    requiredArtifacts: ["latest-md", "dated-report-md"],
    freshnessPolicy: { requiresFreshUpstreams: false, blockOnMixedSnapshots: false },
    mutationPolicy: "report-only",
    statePolicy: {
      readsTrackedState: [],
      readsVolatileState: [],
      writesState: ["reports/automations/runs/ah-ui-premium-polish-pass"]
    },
    gatingClass: "report-only",
    notionSurfaceUsage: { canonicalAnchors: ["P2_SCREEN_CONTRACTS"], operationalSurfaces: [] }
  }
] as const;

export const AUTOMATION_REGISTRY_HASH = hashValue(AUTOMATION_REGISTRY);

export const AUTOMATION_REGISTRY_MAP = new Map(
  AUTOMATION_REGISTRY.map((automation) => [automation.id, automation] as const)
);

export function getAutomationContract(id: AutomationId): AutomationContract {
  const contract = AUTOMATION_REGISTRY_MAP.get(id);
  if (!contract) {
    throw new Error(`unknown automation contract: ${id}`);
  }
  return contract;
}
