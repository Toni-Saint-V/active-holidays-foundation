import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { REPO_RUNTIME_MANIFEST } from "./repo-runtime-manifest.ts";

const execFileAsync = promisify(execFile);

type Options = {
  dryRun: boolean;
  forceResetInstalledState: boolean;
  allowBranchMismatch: boolean;
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
    forceResetInstalledState: argv.includes("--force-reset-installed-state"),
    allowBranchMismatch: argv.includes("--allow-branch-mismatch"),
    only
  };
}

function extractQuoted(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*"([^"\\n]+)"`, "m"));
  return match?.[1] ?? null;
}

function replaceQuoted(text: string, key: string, value: string): string {
  return text.replace(new RegExp(`^${key}\\s*=\\s*"([^"\\n]+)"`, "m"), `${key} = "${value}"`);
}

async function readInstalledStatus(targetDir: string): Promise<string | null> {
  const installedToml = path.join(targetDir, "automation.toml");
  if (!(await exists(installedToml))) return null;
  const text = await readFile(installedToml, "utf8");
  return extractQuoted(text, "status");
}

async function restoreInstalledStatus(targetDir: string, status: string | null): Promise<void> {
  if (!status) return;
  const installedToml = path.join(targetDir, "automation.toml");
  if (!(await exists(installedToml))) return;
  const text = await readFile(installedToml, "utf8");
  await writeFile(installedToml, replaceQuoted(text, "status", status), "utf8");
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

async function resolveGitCommonDir(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, "rev-parse", "--git-common-dir"], {
      encoding: "utf8"
    });
    const commonDir = stdout.trim();
    if (!commonDir) return null;
    return path.resolve(cwd, commonDir);
  } catch {
    return null;
  }
}

async function resolveCurrentBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8"
    });
    const branch = stdout.trim();
    return branch.length > 0 ? branch : null;
  } catch {
    return null;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const sourceRoot = path.join(repoRoot, ".codex", "automations");
  const canonicalRepoRoot = REPO_RUNTIME_MANIFEST.canonicalRepoRoot;
  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  const targetRoot = path.join(codexHome, "automations");

  if (repoRoot !== canonicalRepoRoot) {
    const [repoCommonDir, canonicalCommonDir] = await Promise.all([
      resolveGitCommonDir(repoRoot),
      resolveGitCommonDir(canonicalRepoRoot)
    ]);
    if (!repoCommonDir || !canonicalCommonDir || repoCommonDir !== canonicalCommonDir) {
      throw new Error(
        `Запусти automations:sync из canonical repo root ${canonicalRepoRoot} или из связанного git worktree этого репо (текущий cwd: ${repoRoot}).`
      );
    }
  }
  if (!options.dryRun && !options.allowBranchMismatch) {
    const currentBranch = await resolveCurrentBranch(repoRoot);
    if (currentBranch !== REPO_RUNTIME_MANIFEST.branchScope) {
      throw new Error(
        `Non-dry-run sync разрешён только из branch ${REPO_RUNTIME_MANIFEST.branchScope}. Текущая branch: ${currentBranch ?? "unknown"}. Используй --allow-branch-mismatch только осознанно.`
      );
    }
  }

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
    if (!options.forceResetInstalledState) {
      console.log("[dry-run] installed automation status will be preserved by default");
    }
    return;
  }

  await mkdir(targetRoot, { recursive: true });

  for (const id of ids) {
    const sourceDir = path.join(sourceRoot, id);
    const targetDir = path.join(targetRoot, id);
    const installedStatus = options.forceResetInstalledState
      ? null
      : await readInstalledStatus(targetDir);
    await rm(targetDir, { recursive: true, force: true });
    await cp(sourceDir, targetDir, { recursive: true });
    await restoreInstalledStatus(targetDir, installedStatus);
    console.log(`[synced] ${id}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Синхронизация automations завершилась ошибкой."
  );
  process.exit(1);
});
