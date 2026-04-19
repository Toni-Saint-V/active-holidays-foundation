import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function listScreenFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const next = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listScreenFiles(next)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith("Screen.tsx")) {
      files.push(next);
    }
  }

  return files.sort();
}

function extractEventTypes(source: string): string[] {
  const matches = source.matchAll(/type:\s*z\.literal\("([^"]+)"\)/g);
  return Array.from(matches, (match) => match[1] ?? "");
}

async function main() {
  const repoRoot = process.cwd();
  const screensRoot = path.join(repoRoot, "src", "screens");
  const instrumentationFile = path.join(repoRoot, "src", "instrumentation", "events.ts");

  const screenFiles = await listScreenFiles(screensRoot);
  const screenCoverageMissing: string[] = [];
  const directInteractionTrackingMissing: string[] = [];

  for (const filePath of screenFiles) {
    const source = await readFile(filePath, "utf8");
    const relative = path.relative(repoRoot, filePath);
    const hasScreenViewImport = source.includes('from "@/instrumentation/screenView"');
    const hasScreenViewCall = source.includes("useScreenView(");
    if (!hasScreenViewImport || !hasScreenViewCall) {
      screenCoverageMissing.push(relative);
    }

    const hasDirectTrack =
      source.includes("track({") ||
      source.includes("type: \"cta_") ||
      source.includes("type: \"preview_seen\"") ||
      source.includes("type: \"path_") ||
      source.includes("type: \"signal_");
    if (!hasDirectTrack) {
      directInteractionTrackingMissing.push(relative);
    }
  }

  const eventsSource = await readFile(instrumentationFile, "utf8");
  const declaredEventTypes = extractEventTypes(eventsSource);
  const usedEventTypes = new Set<string>();

  const sourceFiles = await readdir(path.join(repoRoot, "src"), { recursive: true });
  for (const entry of sourceFiles) {
    if (typeof entry !== "string") continue;
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
    if (entry === path.join("instrumentation", "events.ts")) continue;
    const absolute = path.join(repoRoot, "src", entry);
    const source = await readFile(absolute, "utf8");
    for (const eventType of declaredEventTypes) {
      if (source.includes(`"${eventType}"`)) {
        usedEventTypes.add(eventType);
      }
    }
  }

  const unusedEvents = declaredEventTypes.filter((eventType) => !usedEventTypes.has(eventType));

  console.log("# Funnel Signal Coverage");
  console.log(`screens: ${screenFiles.length}`);
  console.log("## Missing useScreenView");
  console.log(screenCoverageMissing.length > 0 ? screenCoverageMissing.map((item) => `- ${item}`).join("\n") : "- none");
  console.log("## No direct interaction tracking in screen file");
  console.log(
    directInteractionTrackingMissing.length > 0
      ? directInteractionTrackingMissing.map((item) => `- ${item}`).join("\n")
      : "- none"
  );
  console.log("## Declared but unused event types");
  console.log(unusedEvents.length > 0 ? unusedEvents.map((item) => `- ${item}`).join("\n") : "- none");

  if (screenCoverageMissing.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}`);
  process.exit(1);
});
