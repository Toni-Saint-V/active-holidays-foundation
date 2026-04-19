import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type Options = {
  dryRun: boolean;
  only: Set<string>;
};

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]): Options {
  const onlyArg = argv.find((arg) => arg.startsWith("--only="));
  const only = new Set(
    (onlyArg?.slice("--only=".length) ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
  return {
    dryRun: argv.includes("--dry-run"),
    only
  };
}

async function listAutomationIds(sourceRoot: string): Promise<string[]> {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const automationFile = path.join(sourceRoot, entry.name, "automation.toml");
    if (await exists(automationFile)) ids.push(entry.name);
  }
  return ids.sort();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const sourceRoot = path.join(repoRoot, ".codex", "automations");
  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  const targetRoot = path.join(codexHome, "automations");

  const allIds = await listAutomationIds(sourceRoot);
  const ids =
    options.only.size > 0
      ? allIds.filter((id) => options.only.has(id))
      : allIds;

  if (ids.length === 0) {
    throw new Error("Не найдено ни одной repo-local automation definition.");
  }

  console.log(
    `[automations:sync] source=${sourceRoot} target=${targetRoot} count=${ids.length} dryRun=${options.dryRun}`
  );

  if (options.dryRun) {
    for (const id of ids) {
      console.log(`[dry-run] ${id} -> ${path.join(targetRoot, id)}`);
    }
    return;
  }

  await mkdir(targetRoot, { recursive: true });

  for (const id of ids) {
    const sourceDir = path.join(sourceRoot, id);
    const targetDir = path.join(targetRoot, id);
    await rm(targetDir, { recursive: true, force: true });
    await cp(sourceDir, targetDir, { recursive: true });
    console.log(`[synced] ${id}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Синхронизация automations завершилась ошибкой."
  );
  process.exit(1);
});
