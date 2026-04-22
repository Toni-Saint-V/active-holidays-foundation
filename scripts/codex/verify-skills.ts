import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { runAgentSystemEvaluation } from "./evaluate-agent-system.ts";
import { REQUIRED_SKILL_SHARED_SURFACES } from "./required-context-surfaces.ts";
import {
  CRITICAL_EXECUTION_LANES,
  CRITICAL_ROUTING_CONFIDENCE,
  REQUIRED_TELEMETRY_FIELDS
} from "./fixtures/agent-system-fixtures.ts";
import { MODE_DEFINITIONS } from "./skill-mode-registry.ts";

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const matches: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await listMarkdownFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      matches.push(absolutePath);
    }
  }

  return matches.sort();
}

async function listRepoLocalSkillNames(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const skillNames: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(path.join(root, entry.name, "SKILL.md"))) {
      skillNames.push(entry.name);
    }
  }

  return skillNames.sort();
}

async function listMetadataSkillNames(
  root: string,
  skillNames: string[]
): Promise<string[]> {
  const metadataNames: string[] = [];

  for (const skillName of skillNames) {
    if (await exists(path.join(root, skillName, "agents", "openai.yaml"))) {
      metadataNames.push(skillName);
    }
  }

  return metadataNames.sort();
}

function extractFrontmatter(text: string): string | null {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

function extractFrontmatterValue(frontmatter: string, key: string): string | null {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim()?.replace(/^"(.*)"$/, "$1") ?? null;
}

function isPathToken(token: string): boolean {
  if (token.includes("*") && token !== "plugins/*/.codex-plugin/plugin.json") return false;
  if (token.includes("<") || token.includes(">")) return false;
  if (token === "plugins/*/.codex-plugin/plugin.json") return true;
  return /^(?:\.{1,2}\/|src\/|server\/|shared\/|data\/|scripts\/|\.codex\/|\.agents\/plugins\/marketplace\.json$|\.cursor\/mcp\.json$|README\.md$|RUNBOOK\.md$|AGENTS\.md$|AUTOMATIONS_[A-Z_]+\.md$)/.test(
    token
  );
}

function resolveDocPath(repoRoot: string, docPath: string, token: string): string {
  if (token.startsWith("./") || token.startsWith("../")) {
    return path.resolve(path.dirname(docPath), token);
  }
  return path.join(repoRoot, token);
}

async function main() {
  const repoRoot = process.cwd();
  const skillsRoot = path.join(repoRoot, ".codex", "skills");
  const failures: string[] = [];
  const warnings: string[] = [];
  const requiredSkills = await listRepoLocalSkillNames(skillsRoot);
  const metadataSkills = await listMetadataSkillNames(skillsRoot, requiredSkills);

  const modeSkillNames = [...new Set(MODE_DEFINITIONS.flatMap((mode) => mode.defaultSkills))].sort();
  const seenModeIds = new Set<string>();
  const seenModePriorities = new Set<number>();

  for (const relativePath of REQUIRED_SKILL_SHARED_SURFACES) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      failures.push(`missing shared skill surface: ${relativePath}`);
    }
  }

  for (const mode of MODE_DEFINITIONS) {
    if (seenModeIds.has(mode.id)) failures.push(`duplicate mode id: ${mode.id}`);
    seenModeIds.add(mode.id);

    if (seenModePriorities.has(mode.priority)) {
      failures.push(`duplicate mode priority: ${mode.priority}`);
    }
    seenModePriorities.add(mode.priority);

    if (mode.defaultSkills.length === 0) failures.push(`${mode.id}: missing defaultSkills`);
    if (mode.verifyCommands.length === 0) failures.push(`${mode.id}: missing verifyCommands`);
    if (mode.firstSteps.length < 2) failures.push(`${mode.id}: firstSteps should stay actionable`);
    if (!mode.reviewOnly && mode.promptKeywords.length === 0 && mode.filePatterns.length === 0) {
      failures.push(`${mode.id}: mode must match prompt keywords or file patterns`);
    }
  }

  const indexPath = path.join(skillsRoot, "index.md");
  const indexText = (await exists(indexPath)) ? await readFile(indexPath, "utf8") : "";
  const bundlesPath = path.join(skillsRoot, "bundles.md");
  const templatesPath = path.join(skillsRoot, "task-templates.md");
  const packageJsonPath = path.join(repoRoot, "package.json");
  const premiumPlaybookPath = path.join(
    skillsRoot,
    "_shared",
    "active-holidays",
    "premium-ui-playbook.md"
  );

  const docRequirements = [
    {
      filePath: path.join(skillsRoot, "modes.md"),
      markers: [
        "## Machine-Readable Source",
        "## Routing Confidence",
        "## Execution Lanes",
        "## Automatic Multi-Agent Packs",
        "## Mode Set",
        "## Auto-Detection Priority",
        "## Auto-Detection Script",
        "## Autopilot Entrypoint",
        "## Telemetry Report",
        "## Hard Rules"
      ]
    },
    {
      filePath: premiumPlaybookPath,
      markers: [
        "## First Viewport Contract",
        "## Surface Recipes",
        "## Mobile-First Restraint",
        "## Russian Trust-Safe Wording"
      ]
    },
    {
      filePath: path.join(skillsRoot, "_shared", "active-holidays", "plugin-surface.md"),
      markers: [
        "## Default Decision Order",
        "## Runtime Plugin Usage",
        "## Local Plugin Threshold",
        "## Verify"
      ]
    }
  ];

  for (const skillName of requiredSkills) {
    const skillPath = path.join(skillsRoot, skillName, "SKILL.md");
    if (!(await exists(skillPath))) {
      failures.push(`missing repo-local skill: ${skillName}`);
      continue;
    }

    const text = await readFile(skillPath, "utf8");
    const frontmatter = extractFrontmatter(text);
    if (!frontmatter) {
      failures.push(`${skillName}: missing YAML frontmatter`);
      continue;
    }

    const name = extractFrontmatterValue(frontmatter, "name");
    const description = extractFrontmatterValue(frontmatter, "description");

    if (name !== skillName) failures.push(`${skillName}: frontmatter name must match directory`);
    if (!description) failures.push(`${skillName}: missing description`);

    const hasGoal = text.includes("## Goal");
    const hasWhen =
      text.includes("## When To Use") || text.includes("## Quick start");
    const hasWorkflow =
      text.includes("## Workflow") || text.includes("## Structured Loop");
    const hasRules = text.includes("## Hard Rules") || text.includes("## Rules");

    if (!hasGoal) failures.push(`${skillName}: missing ## Goal`);
    if (!hasWhen) failures.push(`${skillName}: missing use/start guidance`);
    if (!hasWorkflow) failures.push(`${skillName}: missing workflow section`);
    if (!hasRules) failures.push(`${skillName}: missing hard-rules section`);

    if (indexText && !indexText.includes(skillName)) {
      failures.push(`${skillName}: missing from .codex/skills/index.md`);
    }
  }

  for (const skillName of modeSkillNames) {
    if (!(await exists(path.join(skillsRoot, skillName, "SKILL.md")))) {
      failures.push(`mode runtime references missing skill: ${skillName}`);
    }
  }

  for (const skillName of metadataSkills) {
    const metadataPath = path.join(skillsRoot, skillName, "agents", "openai.yaml");
    if (!(await exists(metadataPath))) {
      failures.push(`${skillName}: missing agents/openai.yaml`);
      continue;
    }

    const text = await readFile(metadataPath, "utf8");
    for (const marker of ["display_name:", "short_description:", "default_prompt:"]) {
      if (!text.includes(marker)) {
        failures.push(`${skillName}: agents/openai.yaml missing ${marker}`);
      }
    }
    if (!text.includes(`$${skillName}`)) {
      failures.push(`${skillName}: agents/openai.yaml default_prompt must mention $${skillName}`);
    }
  }

  const modesPath = path.join(skillsRoot, "modes.md");
  const modesText = (await exists(modesPath)) ? await readFile(modesPath, "utf8") : "";
  const bundlesText = (await exists(bundlesPath)) ? await readFile(bundlesPath, "utf8") : "";
  const templatesText = (await exists(templatesPath)) ? await readFile(templatesPath, "utf8") : "";

  for (const mode of MODE_DEFINITIONS) {
    if (modesText && !modesText.includes(`### \`${mode.id}\``)) {
      failures.push(`.codex/skills/modes.md: missing mode section for ${mode.id}`);
    }
    if (bundlesText && !bundlesText.includes(`### ${mode.bundle}`)) {
      failures.push(`.codex/skills/bundles.md: missing bundle section ${mode.bundle}`);
    }
    if (templatesText && !templatesText.includes(`### ${mode.template}`)) {
      failures.push(`.codex/skills/task-templates.md: missing template section ${mode.template}`);
    }
  }

  for (const requirement of docRequirements) {
    if (!(await exists(requirement.filePath))) continue;
    const text = await readFile(requirement.filePath, "utf8");
    for (const marker of requirement.markers) {
      if (!text.includes(marker)) {
        failures.push(
          `${path.relative(repoRoot, requirement.filePath)}: missing required section ${marker}`
        );
      }
    }
  }

  if (indexText) {
    for (const marker of [
      "bundles.md",
      "task-templates.md",
      "modes.md",
      "premium-ui-playbook.md",
      "plugin-surface.md"
    ]) {
      if (!indexText.includes(marker)) {
        failures.push(`.codex/skills/index.md: missing reference to ${marker}`);
      }
    }
  }

  if (await exists(packageJsonPath)) {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};
    for (const scriptName of [
      "skills:detect-mode",
      "skills:start",
      "skills:autopilot",
      "skills:evaluate-agents",
      "skills:telemetry:report"
    ]) {
      if (!scripts[scriptName]) {
        failures.push(`package.json: missing script ${scriptName}`);
      }
    }
  }

  for (const skillName of metadataSkills) {
    const referencedByMode = MODE_DEFINITIONS.some((mode) => mode.defaultSkills.includes(skillName));
    if (!referencedByMode) {
      warnings.push(`${skillName}: metadata entrypoint is not used by any mode defaultSkills`);
    }
  }

  const markdownFiles = await listMarkdownFiles(skillsRoot);
  for (const markdownPath of markdownFiles) {
    const text = await readFile(markdownPath, "utf8");
    const matches = text.matchAll(/`([^`\n]+)`/g);
    for (const match of matches) {
      const token = match[1]?.trim();
      if (!token || !isPathToken(token)) continue;
      if (token === "plugins/*/.codex-plugin/plugin.json") continue;
      const resolved = resolveDocPath(repoRoot, markdownPath, token);
      if (
        (token === ".agents/plugins/marketplace.json" || token === ".cursor/mcp.json") &&
        !(await exists(resolved))
      ) {
        continue;
      }
      if (!(await exists(resolved))) {
        failures.push(
          `${path.relative(repoRoot, markdownPath)}: broken path reference ${token}`
        );
      }
    }
  }

  try {
    const evaluation = await runAgentSystemEvaluation(repoRoot);
    for (const warning of evaluation.warnings) {
      failures.push(`agent-system evaluation warning: ${warning}`);
    }
    for (const failure of evaluation.failures) {
      failures.push(`agent-system evaluation: ${failure}`);
    }

    const passedFixtures = evaluation.fixtureResults.filter(
      (result) => result.status === "pass"
    ).length;
    console.log(
      `[INFO] agent-system evaluator: ${passedFixtures}/${evaluation.fixtureResults.length} fixtures passed`
    );
    console.log(
      `[INFO] direct entrypoint mode coverage: ${
        MODE_DEFINITIONS.filter((mode) => evaluation.directCoverageByMode[mode.id].length > 0).length
      }/${MODE_DEFINITIONS.length}`
    );
    console.log(`[INFO] execution lanes: ${evaluation.laneCoverage.join(", ")}`);
    console.log(`[INFO] routing confidence: ${evaluation.confidenceCoverage.join(", ")}`);
    console.log(
      `[INFO] telemetry fields: ${evaluation.telemetrySurface.coveredFields.join(", ")}`
    );

    for (const lane of CRITICAL_EXECUTION_LANES) {
      if (!evaluation.laneCoverage.includes(lane)) {
        failures.push(`agent-system evaluation: missing execution lane coverage ${lane}`);
      }
    }

    for (const confidence of CRITICAL_ROUTING_CONFIDENCE) {
      if (!evaluation.confidenceCoverage.includes(confidence)) {
        failures.push(
          `agent-system evaluation: missing routing confidence coverage ${confidence}`
        );
      }
    }

    for (const field of REQUIRED_TELEMETRY_FIELDS) {
      if (!evaluation.telemetrySurface.coveredFields.includes(field)) {
        failures.push(`agent-system evaluation: missing telemetry field ${field}`);
      }
    }

    for (const result of evaluation.fixtureResults) {
      const unresolvedAgents = result.recommendedAgentPack.filter((agent) => !agent.skillName);
      if (result.primaryMode && unresolvedAgents.length > 0) {
        failures.push(
          `agent-system evaluation: fixture ${result.fixtureId} has unresolved agent roles ${unresolvedAgents.map((agent) => agent.role).join(", ")}`
        );
      }
    }
  } catch (error) {
    failures.push(
      `agent-system evaluation failed to run: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  for (const warning of warnings) console.log(`[WARN] ${warning}`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[FAIL] ${failure}`);
    process.exit(1);
  }

  console.log(
    `[OK] verified ${requiredSkills.length} repo-local skills and ${REQUIRED_SKILL_SHARED_SURFACES.length} shared context files.`
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка repo-local skills завершилась ошибкой."
  );
  process.exit(1);
});
