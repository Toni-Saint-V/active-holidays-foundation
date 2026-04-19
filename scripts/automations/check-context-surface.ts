import { access, readdir } from "node:fs/promises";
import path from "node:path";

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

async function main() {
  const repoRoot = process.cwd();
  const required = [
    "AGENTS.md",
    "README.md",
    "AUTOMATIONS_AUDIT.md",
    "AUTOMATIONS_ROADMAP.md",
    "AUTOMATIONS_OPERATING_MODEL.md",
    "RUNBOOK.md",
    ".codex/automations/README.md",
    ".codex/skills/README.md"
  ];
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const relativePath of required) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      failures.push(`missing required context surface: ${relativePath}`);
    }
  }

  const automationCount = await countDirsWithFile(
    path.join(repoRoot, ".codex", "automations"),
    "automation.toml"
  );
  const skillCount = await countDirsWithFile(
    path.join(repoRoot, ".codex", "skills"),
    "SKILL.md"
  );

  if (automationCount === 0) failures.push("no repo-local automations found");
  if (skillCount === 0) warnings.push("no repo-local skill overrides found");
  if (!(await exists(path.join(repoRoot, ".cursor", "mcp.json")))) {
    warnings.push("optional .cursor/mcp.json is absent");
  }

  console.log(`Repo-local automations: ${automationCount}`);
  console.log(`Repo-local skill overrides: ${skillCount}`);
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
