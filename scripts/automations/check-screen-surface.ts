import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function collectFiles(root: string, suffix: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(target, suffix)));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      files.push(target);
    }
  }
  return files.sort();
}

function basenameWithoutExt(file: string): string {
  return path.basename(file).replace(/\.[^.]+$/, "");
}

async function main() {
  const repoRoot = process.cwd();
  const screenFiles = await collectFiles(path.join(repoRoot, "src", "screens"), "Screen.tsx");
  const routerText = await readFile(path.join(repoRoot, "src", "app", "router.tsx"), "utf8");

  const routedComponents = Array.from(
    new Set(
      Array.from(routerText.matchAll(/element={<([A-Za-z0-9_]+)\s*\/>}/g)).map(
        (match) => match[1] ?? ""
      )
    )
  ).filter((name) => Boolean(name) && name.endsWith("Screen"));

  const missingScreenView: string[] = [];
  const weakStateCoverage: string[] = [];
  const sparseInteractivity: string[] = [];

  for (const file of screenFiles) {
    const text = await readFile(file, "utf8");
    const name = basenameWithoutExt(file);
    const delegatesScreenView =
      text.includes("<ResultScreen") && text.includes("screenName=");
    const hasScreenView = text.includes("useScreenView(") || delegatesScreenView;
    const hasErrorState =
      text.includes('status === "error"') ||
      text.includes("EmptyState") ||
      text.includes("errorMessage");
    const hasLoadingState =
      text.includes("animate-pulse") ||
      text.includes("Загру") ||
      text.includes("Счита") ||
      text.includes("loading");
    const trackCount = (text.match(/\btrack\(/g) ?? []).length;

    if (!hasScreenView) missingScreenView.push(name);
    if (!(hasErrorState && hasLoadingState)) weakStateCoverage.push(name);
    if (trackCount === 0) sparseInteractivity.push(name);
  }

  console.log(`Screen files: ${screenFiles.length}`);
  console.log(`Routed screen components: ${routedComponents.length}`);
  console.log(`Missing useScreenView: ${missingScreenView.length}`);
  console.log(`Weak state coverage: ${weakStateCoverage.length}`);
  console.log(`No direct track() calls: ${sparseInteractivity.length}`);

  if (missingScreenView.length > 0) {
    for (const item of missingScreenView) console.error(`[FAIL] missing useScreenView: ${item}`);
    process.exit(1);
  }

  for (const item of weakStateCoverage) {
    console.log(`[WARN] state coverage heuristic weak: ${item}`);
  }
  for (const item of sparseInteractivity) {
    console.log(`[WARN] no direct track() call: ${item}`);
  }

  console.log("OK: routed screens expose the baseline screen-view instrumentation.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка screen surface завершилась ошибкой."
  );
  process.exit(1);
});
