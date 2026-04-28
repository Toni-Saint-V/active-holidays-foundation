import path from "node:path";
import { exists, readJsonFile } from "./automation-contract-utils.ts";

export type ProductSystemLayerStatus =
  | "required_not_configured"
  | "configured_with_binding"
  | "runtime_binding_expected"
  | "dependency_present"
  | "dependency_missing";

export type ProductSystemLayerKind = "core" | "enhancement";

export type ProductSystemLayer = {
  id: "memory-mcp" | "github-control" | "langgraph-flows";
  label: string;
  kind: ProductSystemLayerKind;
  role:
    | "decision-memory"
    | "tasks-pr-review-ci-control"
    | "agent-flow-orchestration";
  status: ProductSystemLayerStatus;
  binding: string;
  owns: string[];
  reads: string[];
  writes: string[];
  mustNotOwn: string[];
  verify: string[];
};

export type ProductSystemIntelligenceContract = {
  schemaVersion: 1;
  generatedAt: string;
  mode: "report-first";
  purpose: "product-system-intelligence";
  layers: {
    memoryMcp: ProductSystemLayer & {
      id: "memory-mcp";
      role: "decision-memory";
      bindingEvidence:
        | {
            status: "absent";
            mcpServerName: null;
            configSurface: null;
            storageSurface: null;
            verifiedAt: null;
          }
        | {
            status: "verified";
            mcpServerName: string;
            configSurface: string;
            storageSurface: string;
            verifiedAt: string;
          };
      stores: string[];
      mustNotStore: string[];
      promotionRequired: true;
    };
    githubControl: ProductSystemLayer & {
      id: "github-control";
      role: "tasks-pr-review-ci-control";
      surfaces: string[];
    };
    langGraphFlows: ProductSystemLayer & {
      id: "langgraph-flows";
      role: "agent-flow-orchestration";
      flows: string[];
    };
  };
  boundaries: {
    noLandgrafApi: true;
    noInventedExternalMemoryEndpoint: true;
    memoryMcpRequiresRealBinding: true;
    noLiveWritebackByDefault: true;
    context7: "docs-only";
    gateSnapshotOwnsExecutionEligibility: true;
    langGraphCheckpointMemory: "runtime-state-not-decision-memory";
  };
  nextActions: Array<{
    id: string;
    title: string;
    blockedBy: string[];
    verify: string[];
  }>;
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

async function hasDependency(repoRoot: string, dependencyName: string): Promise<boolean> {
  const packagePath = path.join(repoRoot, "package.json");
  if (!(await exists(packagePath))) return false;
  const packageJson = await readJsonFile<PackageJson>(packagePath);
  return Boolean(
    packageJson.dependencies?.[dependencyName] ?? packageJson.devDependencies?.[dependencyName]
  );
}

export async function buildProductSystemIntelligenceContract(options?: {
  repoRoot?: string;
  generatedAt?: string;
}): Promise<ProductSystemIntelligenceContract> {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const langGraphPresent = await hasDependency(repoRoot, "@langchain/langgraph");

  return {
    schemaVersion: 1,
    generatedAt,
    mode: "report-first",
    purpose: "product-system-intelligence",
    layers: {
      memoryMcp: {
        id: "memory-mcp",
        label: "Memory MCP",
        kind: "core",
        role: "decision-memory",
        status: "required_not_configured",
        binding:
          "Expected as a real MCP binding after endpoint/storage is chosen; no repo-local Landgraf/API substitute is allowed.",
        bindingEvidence: {
          status: "absent",
          mcpServerName: null,
          configSurface: null,
          storageSurface: null,
          verifiedAt: null
        },
        owns: [
          "decision history",
          "accepted and rejected architecture choices",
          "review findings and fix patterns",
          "operator preferences that affect future planning"
        ],
        reads: [
          "automationContextPacket",
          "bank-grade review outcomes",
          "repo-local decision docs",
          "approved Notion decisions after live access is verified"
        ],
        writes: [
          "decision-memory records only after an explicit Memory MCP binding exists"
        ],
        stores: [
          "why a task was chosen or rejected",
          "stable product/system constraints",
          "post-review lessons that should affect future execution"
        ],
        mustNotStore: [
          "secrets",
          "raw volatile runtime logs",
          "unverified external facts",
          "gate eligibility as durable truth"
        ],
        mustNotOwn: [
          "executor eligibility",
          "gate snapshot truth",
          "live Notion writeback approval",
          "GitHub merge authority"
        ],
        promotionRequired: true,
        verify: [
          "npm run automations:check:context",
          "npm run skills:verify"
        ]
      },
      githubControl: {
        id: "github-control",
        label: "GitHub control",
        kind: "core",
        role: "tasks-pr-review-ci-control",
        status: "runtime_binding_expected",
        binding:
          "Use the active GitHub runtime plugin/MCP or gh CLI fallback; do not create repo-local MCP config without a concrete repeated need.",
        owns: [
          "issues",
          "pull requests",
          "review comments",
          "CI/check status inspection"
        ],
        reads: [
          "current branch",
          "PR state",
          "review comments",
          "check runs"
        ],
        writes: [
          "GitHub tasks or PR changes only after explicit task scope and permission"
        ],
        surfaces: [
          "runtime GitHub plugin",
          "gh CLI fallback"
        ],
        mustNotOwn: [
          "product recommendation ranking",
          "automation gate eligibility",
          "Memory MCP decision history"
        ],
        verify: [
          "gh auth status",
          "npm run automations:check:context"
        ]
      },
      langGraphFlows: {
        id: "langgraph-flows",
        label: "LangGraph flows",
        kind: "enhancement",
        role: "agent-flow-orchestration",
        status: langGraphPresent ? "dependency_present" : "dependency_missing",
        binding:
          "Use @langchain/langgraph for multi-step agent flows; checkpoint memory remains runtime state unless promoted by an explicit persistence contract.",
        owns: [
          "complex agent flow orchestration",
          "step checkpoints",
          "runtime retry state"
        ],
        reads: [
          "flow input state",
          "tool results",
          "runtime checkpoint state"
        ],
        writes: [
          "runtime checkpoints",
          "flow-local state transitions"
        ],
        flows: [
          "multi-step research and verification",
          "agent routing with deterministic gates",
          "retryable runtime workflows"
        ],
        mustNotOwn: [
          "durable decision memory",
          "executor eligibility",
          "live writeback approval"
        ],
        verify: [
          "npm run verify:agent-stack",
          "npm run typecheck"
        ]
      }
    },
    boundaries: {
      noLandgrafApi: true,
      noInventedExternalMemoryEndpoint: true,
      memoryMcpRequiresRealBinding: true,
      noLiveWritebackByDefault: true,
      context7: "docs-only",
      gateSnapshotOwnsExecutionEligibility: true,
      langGraphCheckpointMemory: "runtime-state-not-decision-memory"
    },
    nextActions: [
      {
        id: "choose-real-memory-mcp-binding",
        title: "Choose and configure a real Memory MCP before storing decision memory",
        blockedBy: ["memory_mcp_binding_absent"],
        verify: [
          "codex mcp list",
          "npm run automations:check:context"
        ]
      }
    ]
  };
}

async function main() {
  const contract = await buildProductSystemIntelligenceContract();
  if (process.argv.includes("--compact")) {
    console.log(JSON.stringify(contract));
    return;
  }
  console.log(JSON.stringify(contract, null, 2));
}

if (process.argv[1]) {
  const invokedPath = path.resolve(process.argv[1]);
  const currentPath = path.resolve(new URL(import.meta.url).pathname);
  if (invokedPath === currentPath) {
    main().catch((error) => {
      console.error(
        error instanceof Error ? error.message : "product system intelligence contract failed"
      );
      process.exit(1);
    });
  }
}
