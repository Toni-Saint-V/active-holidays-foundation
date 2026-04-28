import { access, readdir } from "node:fs/promises";
import path from "node:path";
import {
  AGENT_SYSTEM_FIXTURES,
  CRITICAL_EXECUTION_LANES,
  CRITICAL_QUALITY_AXES,
  CRITICAL_ROUTING_CONFIDENCE,
  REQUIRED_TELEMETRY_FIELDS
} from "../codex/fixtures/agent-system-fixtures.ts";
import { REQUIRED_CONTEXT_SURFACES } from "../codex/required-context-surfaces.ts";
import { runAgentSystemEvaluation } from "../codex/evaluate-agent-system.ts";
import { MODE_DEFINITIONS } from "../codex/skill-mode-registry.ts";
import { buildAutomationContextPacket } from "../codex/automation-context-packet.ts";

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function countDirsWithFile(root: string, fileName: string): Promise<number> {
  const entries = await readdir(root, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(path.join(root, entry.name, fileName))) count += 1;
  }
  return count;
}

async function dirsMissingFile(root: string, fileName: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const missing: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!(await exists(path.join(root, entry.name, fileName)))) {
      missing.push(entry.name);
    }
  }
  return missing.sort();
}

async function countLocalPluginManifests(pluginsRoot: string): Promise<number> {
  if (!(await exists(pluginsRoot))) return 0;
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(pluginsRoot, entry.name, ".codex-plugin", "plugin.json");
    if (await exists(manifestPath)) count += 1;
  }

  return count;
}

async function pluginDirsMissingManifest(pluginsRoot: string): Promise<string[]> {
  if (!(await exists(pluginsRoot))) return [];
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const missing: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(pluginsRoot, entry.name, ".codex-plugin", "plugin.json");
    if (!(await exists(manifestPath))) {
      missing.push(entry.name);
    }
  }

  return missing.sort();
}

function reportHasArtifact(
  report: {
    latestReportExists: boolean;
    datedReportExists: boolean;
  } | undefined,
  artifact: string
): boolean {
  if (!report) return false;
  if (artifact === "latest-md") return report.latestReportExists;
  if (artifact === "dated-report-md") return report.datedReportExists;
  return false;
}

async function main() {
  const repoRoot = process.cwd();
  const failures: string[] = [];
  const warnings: string[] = [];
  const coveredModes = new Set(
    AGENT_SYSTEM_FIXTURES.map((fixture) => fixture.expectedPrimaryMode).filter(Boolean)
  );
  const coveredAxes = new Set(
    AGENT_SYSTEM_FIXTURES.flatMap((fixture) => fixture.requiredAxes)
  );
  const coveredExecutionLanes = new Set(
    AGENT_SYSTEM_FIXTURES.map((fixture) => fixture.expectedExecutionLane)
  );
  const coveredRoutingConfidence = new Set(
    AGENT_SYSTEM_FIXTURES.map((fixture) => fixture.expectedRoutingConfidence)
  );

  for (const relativePath of REQUIRED_CONTEXT_SURFACES) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      failures.push(`missing required context surface: ${relativePath}`);
    }
  }

  const automationCount = await countDirsWithFile(
    path.join(repoRoot, ".codex", "automations"),
    "automation.toml"
  );
  const orphanAutomations = await dirsMissingFile(
    path.join(repoRoot, ".codex", "automations"),
    "automation.toml"
  );
  const pluginsRoot = path.join(repoRoot, "plugins");
  const pluginManifestCount = await countLocalPluginManifests(pluginsRoot);
  const orphanPlugins = await pluginDirsMissingManifest(pluginsRoot);
  const marketplacePath = path.join(repoRoot, ".agents", "plugins", "marketplace.json");
  const hasMarketplace = await exists(marketplacePath);
  const skillCount = await countDirsWithFile(
    path.join(repoRoot, ".codex", "skills"),
    "SKILL.md"
  );
  const missingFixtureModes = MODE_DEFINITIONS.map((mode) => mode.id).filter(
    (modeId) => !coveredModes.has(modeId)
  );
  const missingCriticalAxes = CRITICAL_QUALITY_AXES.filter((axis) => !coveredAxes.has(axis));
  const blockedFixtures = AGENT_SYSTEM_FIXTURES.filter(
    (fixture) => fixture.expectedBlockedState === "blocked"
  );
  const reviewFixtures = AGENT_SYSTEM_FIXTURES.filter((fixture) => fixture.reviewOnly);
  const manualRoutingFixtures = AGENT_SYSTEM_FIXTURES.filter(
    (fixture) => fixture.expectedPrimaryMode === null
  );
  const directEntryFixtures = AGENT_SYSTEM_FIXTURES.filter(
    (fixture) => (fixture.preferredEntrySkills?.length ?? 0) > 0
  );
  const agentPackFixtures = AGENT_SYSTEM_FIXTURES.filter(
    (fixture) => (fixture.requiredAgentRoles?.length ?? 0) > 0
  );
  const telemetryAnchoredFixtures = AGENT_SYSTEM_FIXTURES.filter(
    (fixture) => (fixture.expectedAgentPackSkills?.length ?? 0) > 0
  );

  if (automationCount === 0) failures.push("no repo-local automations found");
  if (skillCount === 0) warnings.push("no repo-local skill overrides found");
  if (orphanAutomations.length > 0) {
    failures.push(
      `orphan automation directories without automation.toml: ${orphanAutomations.join(", ")}`
    );
  }
  if (orphanPlugins.length > 0) {
    failures.push(
      `orphan plugin directories without .codex-plugin/plugin.json: ${orphanPlugins.join(", ")}`
    );
  }
  if (pluginManifestCount > 0 && !hasMarketplace) {
    warnings.push("repo-local plugin manifests exist without .agents/plugins/marketplace.json");
  }
  if (hasMarketplace && pluginManifestCount === 0) {
    warnings.push("plugin marketplace exists but no repo-local plugin manifests were found");
  }
  if (missingFixtureModes.length > 0) {
    failures.push(`agent-system fixtures miss modes: ${missingFixtureModes.join(", ")}`);
  }
  if (missingCriticalAxes.length > 0) {
    failures.push(`agent-system fixtures miss critical axes: ${missingCriticalAxes.join(", ")}`);
  }
  for (const lane of CRITICAL_EXECUTION_LANES) {
    if (!coveredExecutionLanes.has(lane)) {
      failures.push(`agent-system fixtures miss execution lane ${lane}`);
    }
  }
  for (const confidence of CRITICAL_ROUTING_CONFIDENCE) {
    if (!coveredRoutingConfidence.has(confidence)) {
      failures.push(`agent-system fixtures miss routing confidence ${confidence}`);
    }
  }
  if (blockedFixtures.length === 0) {
    failures.push("agent-system fixtures do not assert any blocked PNG-gate scenario");
  }
  if (reviewFixtures.length === 0) {
    failures.push("agent-system fixtures do not assert review-only routing");
  }
  if (manualRoutingFixtures.length === 0) {
    failures.push("agent-system fixtures do not assert manual-routing fallback");
  }
  if (directEntryFixtures.length === 0) {
    warnings.push("agent-system fixtures do not assert direct entrypoint discoverability");
  }
  if (agentPackFixtures.length === 0) {
    failures.push("agent-system fixtures do not assert recommended multi-agent packs");
  }
  if (telemetryAnchoredFixtures.length === 0) {
    failures.push("agent-system fixtures do not assert agent-pack telemetry anchors");
  }
  if (!(await exists(path.join(repoRoot, ".cursor", "mcp.json")))) {
    warnings.push("optional .cursor/mcp.json is absent");
  }

  for (const fixture of AGENT_SYSTEM_FIXTURES) {
    if (fixture.expectedPrimaryMode && (fixture.requiredAgentRoles?.length ?? 0) === 0) {
      failures.push(`fixture ${fixture.id} lacks requiredAgentRoles`);
    }
    if (fixture.expectedPrimaryMode && (fixture.expectedAgentPackSkills?.length ?? 0) === 0) {
      failures.push(`fixture ${fixture.id} lacks expectedAgentPackSkills`);
    }
  }

  try {
    const evaluation = await runAgentSystemEvaluation(repoRoot);
    for (const lane of CRITICAL_EXECUTION_LANES) {
      if (!evaluation.laneCoverage.includes(lane)) {
        failures.push(`agent-system evaluation misses execution lane ${lane}`);
      }
    }
    for (const confidence of CRITICAL_ROUTING_CONFIDENCE) {
      if (!evaluation.confidenceCoverage.includes(confidence)) {
        failures.push(`agent-system evaluation misses routing confidence ${confidence}`);
      }
    }
    for (const field of REQUIRED_TELEMETRY_FIELDS) {
      if (!evaluation.telemetrySurface.coveredFields.includes(field)) {
        failures.push(`agent-system evaluation misses telemetry field ${field}`);
      }
    }
  } catch (error) {
    failures.push(
      `agent-system evaluation unavailable for context surface check: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  try {
    const packet = await buildAutomationContextPacket({
      repoRoot,
      generatedAt: "1970-01-01T00:00:00.000Z"
    });
    if (packet.schemaVersion !== 1) {
      failures.push("automation context packet schemaVersion must be 1");
    }
    if (packet.mode !== "report-first") {
      failures.push("automation context packet must remain report-first");
    }
    if (!["ready", "distillation_incomplete"].includes(packet.status)) {
      failures.push(`automation context packet has invalid status: ${packet.status}`);
    }
    if (packet.status !== "ready" && packet.statusReasons.length === 0) {
      failures.push("automation context packet incomplete status must include statusReasons");
    }
    if (packet.status === "ready" && packet.statusReasons.length > 0) {
      failures.push("automation context packet ready status must not include statusReasons");
    }
    if (
      packet.status !== "ready" &&
      packet.deterministicRecommendation.kind === "use_selected_executor_safe_task"
    ) {
      failures.push("automation context packet must not recommend executor tasks while incomplete");
    }
    if (
      packet.deterministicRecommendation.kind === "use_selected_executor_safe_task" &&
      packet.autonomousTasks.selectedExecutorSafeTask === null
    ) {
      failures.push("automation context packet must not recommend a missing executor task");
    }
    if (packet.status === "ready" && packet.missingRequiredReports.length > 0) {
      failures.push("automation context packet ready status must not include missing reports");
    }
    if (packet.constraints.externalMemoryApi !== "disabled") {
      failures.push("automation context packet must not enable external memory APIs");
    }
    if (packet.constraints.context7 !== "docs-only") {
      failures.push("automation context packet must keep Context7 docs-only");
    }
    if (packet.latestReports.length !== automationCount) {
      failures.push(
        `automation context packet report inventory mismatch: ${packet.latestReports.length}/${automationCount}`
      );
    }
    const latestReportById = new Map<string, (typeof packet.latestReports)[number]>(
      packet.latestReports.map((report) => [report.automationId, report])
    );
    for (const automationId of packet.missingRequiredReports) {
      const artifacts = packet.missingRequiredReportArtifacts[automationId] ?? [];
      if (artifacts.length === 0) {
        failures.push(`automation context packet missing report has no artifact detail: ${automationId}`);
      }
      for (const artifact of artifacts) {
        if (reportHasArtifact(latestReportById.get(automationId), artifact)) {
          failures.push(
            `automation context packet marks existing artifact missing: ${automationId}/${artifact}`
          );
        }
      }
    }
    for (const automationId of packet.staleGateSnapshotReports) {
      const artifacts = packet.staleGateSnapshotArtifacts[automationId] ?? [];
      if (artifacts.length === 0) {
        failures.push(`automation context packet stale snapshot has no artifact detail: ${automationId}`);
      }
      for (const artifact of artifacts) {
        if (!reportHasArtifact(latestReportById.get(automationId), artifact)) {
          failures.push(
            `automation context packet marks absent artifact as stale snapshot: ${automationId}/${artifact}`
          );
        }
      }
    }
    if (
      packet.staleGateSnapshotReports.length > 0 &&
      !packet.statusReasonDetails.some((reason) => reason.code === "stale_gate_snapshot")
    ) {
      failures.push("automation context packet stale snapshot must have structured status reason");
    }
  } catch (error) {
    failures.push(
      `automation context packet unavailable: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  console.log(`Repo-local automations: ${automationCount}`);
  console.log(`Repo-local skill overrides: ${skillCount}`);
  console.log(`Repo-local plugin manifests: ${pluginManifestCount}`);
  console.log(`Repo-local plugin marketplace: ${hasMarketplace ? "present" : "absent"}`);
  console.log(`Agent-system fixtures: ${AGENT_SYSTEM_FIXTURES.length}`);
  console.log(`Agent-system mode coverage: ${coveredModes.size}/${MODE_DEFINITIONS.length}`);
  console.log(
    `Agent-system execution lanes: ${[...coveredExecutionLanes].sort().join(", ")}`
  );
  console.log(
    `Agent-system routing confidence: ${[...coveredRoutingConfidence].sort().join(", ")}`
  );
  for (const warning of warnings) console.log(`[WARN] ${warning}`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[FAIL] ${failure}`);
    process.exit(1);
  }

  console.log("OK: context surface baseline is present.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка context surface завершилась ошибкой."
  );
  process.exit(1);
});
