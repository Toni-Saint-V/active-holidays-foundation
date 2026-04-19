import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const repoRoot = process.cwd();
  const repoSkillsRoot = path.join(repoRoot, ".codex", "skills");
  const globalSkillsRoot = path.join("/Users/user/.codex/skills");

  const entries = await readdir(repoSkillsRoot, { withFileTypes: true });
  const failures: string[] = [];
  const infos: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const repoSkill = path.join(repoSkillsRoot, entry.name, "SKILL.md");
    if (!(await exists(repoSkill))) continue;
    const globalSkill = path.join(globalSkillsRoot, entry.name, "SKILL.md");
    if (!(await exists(globalSkill))) {
      infos.push(`${entry.name}: repo-local only`);
      continue;
    }
    const [repoText, globalText] = await Promise.all([
      readFile(repoSkill, "utf8"),
      readFile(globalSkill, "utf8")
    ]);
    if (repoText === globalText) {
      failures.push(`${entry.name}: byte-identical duplicate of global skill`);
    } else {
      infos.push(`${entry.name}: repo-local override differs from global`);
    }
  }

  for (const info of infos) console.log(`[INFO] ${info}`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`[FAIL] ${failure}`);
    process.exit(1);
  }
  console.log("OK: repo-local skills are deduplicated.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка skill dedupe завершилась ошибкой."
  );
  process.exit(1);
});
