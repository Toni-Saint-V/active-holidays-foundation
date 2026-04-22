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
