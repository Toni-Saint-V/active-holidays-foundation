import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_PACK_ROLES,
  AGENT_SYSTEM_FIXTURES,
  CRITICAL_EXECUTION_LANES,
  CRITICAL_QUALITY_AXES,
  CRITICAL_ROUTING_CONFIDENCE,
  REQUIRED_TELEMETRY_FIELDS,
  type AgentPackRole,
  type AgentSystemFixture,
  type ExecutionLane,
  type QualityAxis,
  type RoutingConfidence,
  type TelemetryField
} from "./fixtures/agent-system-fixtures.ts";
import {
  MODE_DEFINITIONS,
  collectModeMatches,
  startMode,
  type ModeId,
  type ModeMatch
} from "./skill-mode-registry.ts";

type AgentMetadata = {
  skillName: string;
  displayName: string | null;
  shortDescription: string | null;
  defaultPrompt: string | null;
  relativePath: string;
};

export type RecommendedAgent = {
  role: AgentPackRole;
  skillName: string | null;
  source: "mode-default" | "global-fallback" | "unresolved";
};

export type FixtureTelemetry = {
  mode: ModeId | null;
  candidateCount: number;
  topScore: number | null;
  topScoreGap: number | null;
  routingConfidence: RoutingConfidence;
  executionLane: ExecutionLane;
  blockedState: "blocked" | "unblocked" | "unknown";
  verifyCommandCount: number;
  firstStepCount: number;
  defaultSkillCount: number;
  recommendedAgentPack: string[];
};

export type FixtureEvaluationResult = {
  fixtureId: string;
  primaryMode: ModeId | null;
  status: "pass" | "fail";
  notes: string[];
  warnings: string[];
  routingConfidence: RoutingConfidence;
  executionLane: ExecutionLane;
  candidateModes: ModeId[];
  recommendedAgentPack: RecommendedAgent[];
  telemetry: FixtureTelemetry;
};

export type AgentSystemEvaluationReport = {
  failures: string[];
  warnings: string[];
  fixtureResults: FixtureEvaluationResult[];
  directCoverageByMode: Record<ModeId, string[]>;
  recommendedAgentPackByMode: Record<ModeId, RecommendedAgent[]>;
  runtimeAxes: QualityAxis[];
  directEntryAxes: QualityAxis[];
  laneCoverage: ExecutionLane[];
  confidenceCoverage: RoutingConfidence[];
  telemetrySurface: {
    requiredFields: TelemetryField[];
    coveredFields: TelemetryField[];
    fixtureCount: number;
  };
  metadataSkills: string[];
};

const SKILL_QUALITY_AXES: Record<string, QualityAxis[]> = {
  "ah-control-protocol": ["governance", "png-gate", "manual-routing"],
  "ah-product-strategy": ["governance", "result-flow"],
  "ah-repo-automation": ["governance", "plugin-governance", "verification"],
  "ah-super-operator": ["governance", "verification", "review"],
  "ah-result-flow": ["result-flow", "trust-boundary", "russian-copy"],
  "ah-ai-trust-layer": ["trust-boundary", "fallback", "verification"],
  "ah-backend-contracts": ["architecture", "fallback", "verification"],
  "ah-ui-direction": ["premium-ui", "png-gate", "russian-copy"],
  "ah-ui-implementation": ["premium-ui", "russian-copy", "trust-boundary"],
  "ah-visual-qa": ["verification", "regression", "premium-ui"],
  "ah-review-release": ["review", "verification", "regression"]
};

const QUALITY_AXIS_KEYWORDS: Record<QualityAxis, string[]> = {
  governance: ["json", "protocol", "router", "mode", "gate", "surface"],
  "plugin-governance": ["plugin", "mcp", "manifest", "marketplace", "surface"],
  architecture: ["boundary", "contract", "client", "server", "shared", "ownership", "integrity"],
  verification: [
    "check",
    "proof",
    "gaps",
    "qa",
    "verify",
    "regression",
    "ready",
    "correctness",
    "validation",
    "integrity",
    "корректность"
  ],
  review: ["review", "audit", "findings", "risk", "verdict", "ship", "block"],
  "premium-ui": ["ui", "screen", "hierarchy", "cta", "premium", "ux"],
  "png-gate": ["png", "preview"],
  "russian-copy": ["russian", "wording", "copy", "рус", "certainty"],
  "trust-boundary": ["trust", "boundary", "safe", "certainty", "deterministic"],
  "result-flow": ["result", "documents", "compare", "human-review", "trust"],
  fallback: ["fallback", "retry", "stale", "degraded", "hardening"],
  regression: ["regression", "ship", "ready", "qa", "gaps", "proof"],
  "manual-routing": ["manual", "choose", "fallback"]
};

const GLOBAL_AGENT_ROLE_PREFERENCES: Record<AgentPackRole, string[]> = {
  lead: [
    "ah-control-protocol",
    "ah-backend-contracts",
    "ah-ui-direction",
    "ah-ai-trust-layer",
    "ah-result-flow",
    "ah-repo-automation",
    "ah-review-release",
    "ah-backend-contracts",
    "ah-control-protocol",
    "ah-ui-implementation",
    "ah-repo-automation",
    "ah-ai-trust-layer",
    "ah-result-flow",
    "ah-backend-contracts",
    "ah-backend-contracts",
    "ah-review-release",
    "ah-review-release"
  ],
  verifier: [
    "ah-visual-qa",
    "ah-review-release",
    "ah-control-protocol",
    "ah-backend-contracts",
    "ah-review-release",
    "ah-review-release",
    "ah-backend-contracts",
    "ah-backend-contracts",
    "ah-control-protocol",
    "ah-ai-trust-layer",
    "ah-result-flow",
    "ah-backend-contracts"
  ],
  reviewer: ["ah-review-release", "ah-review-release", "ah-review-release", "ah-review-release"]
};

const MODE_AGENT_ROLE_PREFERENCES: Record<ModeId, Record<AgentPackRole, string[]>> = {
  "skill-system-governance": {
    lead: ["ah-control-protocol", "ah-repo-automation"],
    verifier: ["ah-review-release", "ah-repo-automation"],
    reviewer: ["ah-review-release"]
  },
  "plugin-surface": {
    lead: ["ah-repo-automation", "ah-control-protocol"],
    verifier: ["ah-review-release", "ah-repo-automation"],
    reviewer: ["ah-review-release"]
  },
  "review-gate": {
    lead: ["ah-review-release"],
    verifier: ["ah-review-release"],
    reviewer: ["ah-review-release"]
  },
  "premium-ui": {
    lead: ["ah-ui-direction", "ah-control-protocol"],
    verifier: ["ah-visual-qa", "ah-review-release"],
    reviewer: ["ah-review-release"]
  },
  "ai-recommendation-boundary": {
    lead: ["ah-ai-trust-layer"],
    verifier: ["ah-review-release", "ah-visual-qa"],
    reviewer: ["ah-review-release"]
  },
  "contract-boundary": {
    lead: ["ah-backend-contracts"],
    verifier: ["ah-review-release", "ah-visual-qa"],
    reviewer: ["ah-review-release"]
  },
  "result-flow": {
    lead: ["ah-result-flow", "ah-ui-direction"],
    verifier: ["ah-visual-qa", "ah-review-release"],
    reviewer: ["ah-review-release"]
  },
  "reliability-hardening": {
    lead: ["ah-backend-contracts", "ah-ai-trust-layer"],
    verifier: ["ah-review-release", "ah-visual-qa"],
    reviewer: ["ah-review-release"]
  },
  "regression-proof": {
    lead: ["ah-visual-qa"],
    verifier: ["ah-review-release", "ah-visual-qa"],
    reviewer: ["ah-review-release"]
  }
};

const NON_ROLE_BASELINE_SKILLS = new Set(["ah-control-protocol"]);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function lowerText(value: string | null): string {
  return value?.toLowerCase() ?? "";
}

function filterRoleAddressableSkills(
  skillNames: string[],
  metadata: Map<string, AgentMetadata>
): string[] {
  return skillNames.filter(
    (skillName) => metadata.has(skillName) && !NON_ROLE_BASELINE_SKILLS.has(skillName)
  );
}

function collectAxes(skills: string[]): QualityAxis[] {
  return unique(skills.flatMap((skill) => SKILL_QUALITY_AXES[skill] ?? []));
}

function flattenRuntimeAgentSkills(
  pack: ReturnType<typeof startMode>["recommendedAgentPack"]
): string[] {
  return unique(pack.agents.flatMap((agent) => agent.skills));
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function readYamlValue(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*"([^"]+)"\\s*$`, "m"));
  return match?.[1] ?? null;
}

async function collectMissingFixtureFiles(
  repoRoot: string,
  fixture: AgentSystemFixture
): Promise<string[]> {
  const missing: string[] = [];
  for (const relativePath of fixture.files) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      missing.push(relativePath);
    }
  }
  return missing;
}

export async function loadAgentMetadata(repoRoot: string): Promise<Map<string, AgentMetadata>> {
  const skillsRoot = path.join(repoRoot, ".codex", "skills");
  const metadata = new Map<string, AgentMetadata>();
  if (!(await exists(skillsRoot))) return metadata;

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillName = entry.name;
    if (!(await exists(path.join(skillsRoot, skillName, "SKILL.md")))) continue;
    const metadataPath = path.join(skillsRoot, skillName, "agents", "openai.yaml");
    if (!(await exists(metadataPath))) continue;

    const text = await readFile(metadataPath, "utf8");
    metadata.set(skillName, {
      skillName,
      displayName: readYamlValue(text, "display_name"),
      shortDescription: readYamlValue(text, "short_description"),
      defaultPrompt: readYamlValue(text, "default_prompt"),
      relativePath: path.relative(repoRoot, metadataPath)
    });
  }

  return metadata;
}

function missingAxes(requiredAxes: QualityAxis[], actualAxes: QualityAxis[]): QualityAxis[] {
  return requiredAxes.filter((axis) => !actualAxes.includes(axis));
}

function hasFileMatch(match: ModeMatch): boolean {
  return match.reasons.some((reason) => reason.startsWith("files: "));
}

function getTopScoreGap(matches: ModeMatch[]): number | null {
  const primary = matches[0];
  if (!primary) return null;
  const secondaryScore = matches[1]?.score ?? 0;
  return primary.score - secondaryScore;
}

function pickAgentSkill(
  role: AgentPackRole,
  mode: ModeMatch["mode"],
  directEntrySkills: string[],
  metadata: Map<string, AgentMetadata>,
  used: Set<string>
): RecommendedAgent {
  const preferences = [
    ...(MODE_AGENT_ROLE_PREFERENCES[mode.id]?.[role] ?? []),
    ...GLOBAL_AGENT_ROLE_PREFERENCES[role]
  ];

  for (const skillName of preferences) {
    if (!directEntrySkills.includes(skillName)) continue;
    used.add(skillName);
    return { role, skillName, source: "mode-default" };
  }

  for (const skillName of preferences) {
    if (!metadata.has(skillName)) continue;
    used.add(skillName);
    return { role, skillName, source: "global-fallback" };
  }

  return { role, skillName: null, source: "unresolved" };
}

function buildRecommendedAgentPack(
  primaryMode: ModeMatch["mode"] | null,
  directEntrySkills: string[],
  metadata: Map<string, AgentMetadata>
): RecommendedAgent[] {
  if (!primaryMode) return [];

  const used = new Set<string>();
  return AGENT_PACK_ROLES.map((role) =>
    pickAgentSkill(role, primaryMode, directEntrySkills, metadata, used)
  );
}

function buildTelemetry(
  primaryMode: ModeMatch["mode"] | null,
  matches: ModeMatch[],
  blockedState: "blocked" | "unblocked" | "unknown",
  routingConfidence: RoutingConfidence,
  executionLane: ExecutionLane,
  runtimeAgentSkills: string[]
): FixtureTelemetry {
  return {
    mode: primaryMode?.id ?? null,
    candidateCount: matches.length,
    topScore: matches[0]?.score ?? null,
    topScoreGap: getTopScoreGap(matches),
    routingConfidence,
    executionLane,
    blockedState,
    verifyCommandCount: primaryMode?.verifyCommands.length ?? 0,
    firstStepCount: primaryMode?.firstSteps.length ?? 0,
    defaultSkillCount: primaryMode?.defaultSkills.length ?? 0,
    recommendedAgentPack: runtimeAgentSkills
  };
}

function evaluateMetadataPrompt(
  skillName: string,
  metadata: AgentMetadata,
  warnings: string[]
): void {
  const axes = SKILL_QUALITY_AXES[skillName] ?? [];
  if (axes.length === 0) {
    warnings.push(
      `agent entrypoint ${skillName} has no quality-axis mapping in evaluator and may drift silently`
    );
    return;
  }

  const text = `${lowerText(metadata.shortDescription)} ${lowerText(metadata.defaultPrompt)}`;
  const missingSignals = axes.filter((axis) => {
    const keywords = QUALITY_AXIS_KEYWORDS[axis] ?? [];
    return !keywords.some((keyword) => text.includes(keyword));
  });

  if (missingSignals.length > 0) {
    warnings.push(
      `agent entrypoint ${skillName} metadata weakly signals axes: ${missingSignals.join(", ")}`
    );
  }
}

function resolveStartPacket(
  fixture: AgentSystemFixture
): {
  matches: ModeMatch[];
  primaryMode: ModeMatch["mode"] | null;
  blockedState: "blocked" | "unblocked" | "unknown";
  candidateModes: ModeId[];
  routingConfidence: RoutingConfidence;
  executionLane: ExecutionLane;
  startPacket: ReturnType<typeof startMode>;
} {
  const matches = collectModeMatches(fixture.prompt, fixture.files, Boolean(fixture.reviewOnly));
  const startPacket = startMode({
    prompt: fixture.prompt,
    files: fixture.files,
    reviewOnly: Boolean(fixture.reviewOnly),
    deepOrchestration: false,
    deepOrchestrationSource: "default",
    telemetryEnabled: false,
    telemetryFile: null
  });
  const primaryMode = matches[0]?.mode ?? null;
  const blockedState = startPacket.blockedState.status;

  return {
    matches,
    primaryMode,
    blockedState,
    candidateModes: matches.map((match) => match.mode.id),
    routingConfidence:
      (startPacket.routingConfidence?.level as RoutingConfidence | undefined) ?? "none",
    executionLane:
      (startPacket.executionLane?.lane as ExecutionLane | undefined) ?? "manual-routing",
    startPacket
  };
}

export async function runAgentSystemEvaluation(
  repoRoot = process.cwd()
): Promise<AgentSystemEvaluationReport> {
  const failures: string[] = [];
  const warnings: string[] = [];
  const fixtureResults: FixtureEvaluationResult[] = [];
  const metadata = await loadAgentMetadata(repoRoot);
  const metadataSkills = [...metadata.keys()].sort();
  const directCoverageByMode = Object.fromEntries(
    MODE_DEFINITIONS.map((mode) => [
      mode.id,
      mode.defaultSkills.filter((skillName) => metadata.has(skillName))
    ])
  ) as Record<ModeId, string[]>;
  const recommendedAgentPackByMode = Object.fromEntries(
    MODE_DEFINITIONS.map((mode) => [
      mode.id,
      buildRecommendedAgentPack(
        mode,
        filterRoleAddressableSkills(mode.defaultSkills, metadata),
        metadata
      )
    ])
  ) as Record<ModeId, RecommendedAgent[]>;

  for (const fixture of AGENT_SYSTEM_FIXTURES) {
    const missingFixtureFiles = await collectMissingFixtureFiles(repoRoot, fixture);
    if (missingFixtureFiles.length > 0 && !fixture.syntheticFilesAllowed) {
      const message = `fixture ${fixture.id}: missing repo files ${missingFixtureFiles.join(", ")}`;
      failures.push(message);
    }

    const packet = resolveStartPacket(fixture);
    const notes: string[] = [];
    const fixtureWarnings: string[] = [];
    const runtimeAgentSkills = flattenRuntimeAgentSkills(packet.startPacket.recommendedAgentPack);
    const metadataBackedEntrySkills = packet.primaryMode
      ? packet.startPacket.defaultSkills.filter((skillName) => metadata.has(skillName))
      : [];
    const directEntrySkills = packet.primaryMode
      ? filterRoleAddressableSkills(packet.startPacket.defaultSkills, metadata)
      : [];
    const recommendedAgentPack = buildRecommendedAgentPack(
      packet.primaryMode,
      directEntrySkills,
      metadata
    );
    const executionLane = packet.executionLane;
    const telemetry = buildTelemetry(
      packet.primaryMode,
      packet.matches,
      packet.blockedState,
      packet.routingConfidence,
      executionLane,
      runtimeAgentSkills
    );

    if ((packet.primaryMode?.id ?? null) !== fixture.expectedPrimaryMode) {
      failures.push(
        `fixture ${fixture.id}: expected primary mode ${fixture.expectedPrimaryMode ?? "null"}, got ${packet.primaryMode?.id ?? "null"}`
      );
      notes.push("primary mode mismatch");
    }

    if (packet.blockedState !== fixture.expectedBlockedState) {
      failures.push(
        `fixture ${fixture.id}: expected blocked state ${fixture.expectedBlockedState}, got ${packet.blockedState}`
      );
      notes.push("blocked state mismatch");
    }

    if (packet.routingConfidence !== fixture.expectedRoutingConfidence) {
      failures.push(
        `fixture ${fixture.id}: expected routing confidence ${fixture.expectedRoutingConfidence}, got ${packet.routingConfidence}`
      );
      notes.push("routing confidence mismatch");
    }

    if (executionLane !== fixture.expectedExecutionLane) {
      failures.push(
        `fixture ${fixture.id}: expected execution lane ${fixture.expectedExecutionLane}, got ${executionLane}`
      );
      notes.push("execution lane mismatch");
    }

    for (const expectedCandidate of fixture.expectedCandidateModes ?? []) {
      if (!packet.candidateModes.includes(expectedCandidate)) {
        failures.push(`fixture ${fixture.id}: missing candidate mode ${expectedCandidate}`);
        notes.push(`candidate ${expectedCandidate} missing`);
      }
    }

    for (const role of fixture.requiredAgentRoles ?? []) {
      const agent = recommendedAgentPack.find((candidate) => candidate.role === role);
      if (!agent?.skillName) {
        failures.push(`fixture ${fixture.id}: missing recommended agent role ${role}`);
        notes.push(`agent role ${role} missing`);
      }
    }

    for (const expectedSkill of fixture.expectedAgentPackSkills ?? []) {
      if (!telemetry.recommendedAgentPack.includes(expectedSkill)) {
        failures.push(`fixture ${fixture.id}: recommended agent pack misses ${expectedSkill}`);
        notes.push(`agent pack missing ${expectedSkill}`);
      }
    }

    if (packet.primaryMode) {
      if (packet.primaryMode.verifyCommands.length === 0) {
        failures.push(`fixture ${fixture.id}: primary mode ${packet.primaryMode.id} has no verifyCommands`);
        notes.push("verify commands missing");
      }
      if (packet.primaryMode.firstSteps.length < 2) {
        failures.push(`fixture ${fixture.id}: primary mode ${packet.primaryMode.id} has weak firstSteps`);
        notes.push("first steps too thin");
      }

      const runtimeAxes = collectAxes(packet.primaryMode.defaultSkills);
      const directAxes = collectAxes(metadataBackedEntrySkills);
      const missingRuntimeAxes = missingAxes(fixture.requiredAxes, runtimeAxes);
      const missingDirectAxes = missingAxes(fixture.requiredAxes, directAxes);

      if (missingRuntimeAxes.length > 0) {
        failures.push(
          `fixture ${fixture.id}: mode ${packet.primaryMode.id} misses quality axes ${missingRuntimeAxes.join(", ")}`
        );
        notes.push(`missing runtime axes: ${missingRuntimeAxes.join(", ")}`);
      }

      if ((fixture.preferredEntrySkills?.length ?? 0) > 0) {
        const matchedPreferred = fixture.preferredEntrySkills?.filter((skillName) =>
          metadataBackedEntrySkills.includes(skillName)
        );
        if ((matchedPreferred?.length ?? 0) === 0) {
          failures.push(
            `fixture ${fixture.id}: no preferred direct entry skill present among ${fixture.preferredEntrySkills?.join(", ")}`
          );
          notes.push("preferred direct entry skill missing");
        }
      }

      if (missingDirectAxes.length > 0) {
        fixtureWarnings.push(`direct entrypoint coverage missing axes ${missingDirectAxes.join(", ")}`);
      }
    } else if (fixture.requiredAxes.some((axis) => axis !== "manual-routing")) {
      failures.push(`fixture ${fixture.id}: no primary mode resolved for a non-manual scenario`);
      notes.push("unexpected null mode");
    }

    if (Object.keys(telemetry).length !== REQUIRED_TELEMETRY_FIELDS.length) {
      failures.push(`fixture ${fixture.id}: telemetry surface is incomplete`);
      notes.push("telemetry surface incomplete");
    }

    fixtureResults.push({
      fixtureId: fixture.id,
      primaryMode: packet.primaryMode?.id ?? null,
      status: notes.length > 0 ? "fail" : "pass",
      notes,
      warnings: fixtureWarnings,
      routingConfidence: packet.routingConfidence,
      executionLane,
      candidateModes: packet.candidateModes,
      recommendedAgentPack,
      telemetry
    });

    for (const fixtureWarning of fixtureWarnings) {
      warnings.push(`fixture ${fixture.id}: ${fixtureWarning}`);
    }
  }

  for (const mode of MODE_DEFINITIONS) {
    if (directCoverageByMode[mode.id].length === 0) {
      warnings.push(
        `mode ${mode.id} has no direct agent entrypoint metadata and relies on mode runtime only`
      );
    }

    for (const agent of recommendedAgentPackByMode[mode.id]) {
      if (!agent.skillName) {
        failures.push(`mode ${mode.id}: recommended agent pack misses role ${agent.role}`);
      }
    }

    for (const skillName of mode.defaultSkills) {
      if (!SKILL_QUALITY_AXES[skillName]) {
        warnings.push(
          `mode ${mode.id} uses ${skillName} without evaluator axis mapping; coverage may be understated`
        );
      }
    }
  }

  for (const skillName of metadataSkills) {
    const skillMetadata = metadata.get(skillName);
    if (!skillMetadata) continue;

    evaluateMetadataPrompt(skillName, skillMetadata, warnings);

    const referencedModes = MODE_DEFINITIONS.filter((mode) =>
      mode.defaultSkills.includes(skillName)
    ).map((mode) => mode.id);
    if (referencedModes.length === 0) {
      warnings.push(`agent entrypoint ${skillName} is not referenced by any mode defaultSkills`);
    }
  }

  const runtimeAxes = unique(
    MODE_DEFINITIONS.flatMap((mode) => collectAxes(mode.defaultSkills))
  ).sort();
  const directEntryAxes = unique(
    metadataSkills.flatMap((skillName) => SKILL_QUALITY_AXES[skillName] ?? [])
  ).sort();
  const laneCoverage = unique(
    fixtureResults.map((result) => result.executionLane)
  ).sort() as ExecutionLane[];
  const confidenceCoverage = unique(
    fixtureResults.map((result) => result.routingConfidence)
  ).sort() as RoutingConfidence[];
  const coveredFields = unique(
    fixtureResults.flatMap((result) =>
      Object.keys(result.telemetry).filter((field): field is TelemetryField =>
        REQUIRED_TELEMETRY_FIELDS.includes(field as TelemetryField)
      )
    )
  ).sort() as TelemetryField[];

  for (const axis of CRITICAL_QUALITY_AXES) {
    if (axis === "manual-routing") continue;
    if (!runtimeAxes.includes(axis)) {
      failures.push(`runtime surface does not cover critical quality axis ${axis}`);
    }
    if (!directEntryAxes.includes(axis)) {
      failures.push(`direct entrypoint surface does not cover critical quality axis ${axis}`);
    }
  }

  for (const lane of CRITICAL_EXECUTION_LANES) {
    if (!laneCoverage.includes(lane)) {
      failures.push(`fixture surface does not cover critical execution lane ${lane}`);
    }
  }

  for (const confidence of CRITICAL_ROUTING_CONFIDENCE) {
    if (!confidenceCoverage.includes(confidence)) {
      failures.push(`fixture surface does not cover routing confidence ${confidence}`);
    }
  }

  for (const field of REQUIRED_TELEMETRY_FIELDS) {
    if (!coveredFields.includes(field)) {
      failures.push(`telemetry surface does not cover required field ${field}`);
    }
  }

  return {
    failures,
    warnings: unique(warnings),
    fixtureResults,
    directCoverageByMode,
    recommendedAgentPackByMode,
    runtimeAxes,
    directEntryAxes,
    laneCoverage,
    confidenceCoverage,
    telemetrySurface: {
      requiredFields: [...REQUIRED_TELEMETRY_FIELDS],
      coveredFields,
      fixtureCount: fixtureResults.length
    },
    metadataSkills
  };
}

function parseArgs(argv: string[]) {
  return {
    json: argv.includes("--json")
  };
}

async function main() {
  const { json } = parseArgs(process.argv.slice(2));
  const report = await runAgentSystemEvaluation(process.cwd());

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const passedFixtures = report.fixtureResults.filter((result) => result.status === "pass").length;
    console.log(`Agent system fixtures: ${passedFixtures}/${report.fixtureResults.length} passed`);
    console.log(
      `Modes with direct entrypoints: ${MODE_DEFINITIONS.filter((mode) => report.directCoverageByMode[mode.id].length > 0).length}/${MODE_DEFINITIONS.length}`
    );
    console.log(`Runtime axes: ${report.runtimeAxes.join(", ")}`);
    console.log(`Direct entrypoint axes: ${report.directEntryAxes.join(", ")}`);
    console.log(`Execution lanes: ${report.laneCoverage.join(", ")}`);
    console.log(`Routing confidence: ${report.confidenceCoverage.join(", ")}`);
    console.log(`Telemetry fields: ${report.telemetrySurface.coveredFields.join(", ")}`);

    for (const result of report.fixtureResults) {
      console.log(
        `[${result.status.toUpperCase()}] ${result.fixtureId}: ${result.primaryMode ?? "manual"} | ${result.routingConfidence} | ${result.executionLane}`
      );
      for (const warning of result.warnings) {
        console.log(`[WARN] ${result.fixtureId}: ${warning}`);
      }
    }

    for (const warning of report.warnings) console.log(`[WARN] ${warning}`);
  }

  if (report.failures.length > 0) {
    for (const failure of report.failures) console.error(`[FAIL] ${failure}`);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Agent system evaluation failed unexpectedly."
    );
    process.exit(1);
  });
}
