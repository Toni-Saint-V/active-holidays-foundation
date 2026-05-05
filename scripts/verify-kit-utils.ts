import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type KitViolation = {
  file: string;
  rule: string;
  detail: string;
};

const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  ".playwright-cli",
  "dist",
  "node_modules",
  "output",
  "tmp"
]);

export function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function existsAsDirectory(root: string, dir: string): boolean {
  try {
    return statSync(path.join(root, dir)).isDirectory();
  } catch {
    return false;
  }
}

function collectFromDirectory(
  root: string,
  relativeDir: string,
  extensions: Set<string>,
  ignoredDirs = DEFAULT_IGNORED_DIRS
): string[] {
  const absoluteDir = path.join(root, relativeDir);
  const files: string[] = [];

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      files.push(
        ...collectFromDirectory(
          root,
          path.relative(root, path.join(absoluteDir, entry.name)),
          extensions,
          ignoredDirs
        )
      );
      continue;
    }

    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name);
    if (extensions.has(extension)) {
      files.push(path.join(absoluteDir, entry.name));
    }
  }

  return files;
}

export function collectFiles(
  root: string,
  dirs: readonly string[],
  extensions: readonly string[]
): string[] {
  const extensionSet = new Set(extensions);
  return dirs
    .filter((dir) => existsAsDirectory(root, dir))
    .flatMap((dir) => collectFromDirectory(root, dir, extensionSet));
}

export function readSource(file: string): string {
  return readFileSync(file, "utf8");
}

export function relativeFile(root: string, file: string): string {
  return toPosix(path.relative(root, file));
}

export function printViolations(scope: string, violations: KitViolation[]): void {
  if (violations.length === 0) {
    console.log(`[OK] ${scope} verified`);
    return;
  }

  for (const violation of violations) {
    console.error(
      `[${scope}] ${violation.rule}: ${violation.file} - ${violation.detail}`
    );
  }
  process.exitCode = 1;
}
