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

function extractQuoted(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*"([^"\\n]+)"`, "m"));
  return match?.[1] ?? null;
}

function requiresReportFirstSafety(id: string, text: string): boolean {
  if (requiresNotionPacketEnvelope(id)) return true;
  return /write-back|write back|live write/i.test(text);
}

function requiresNotionPacketEnvelope(id: string): boolean {
  return [
    "ah-open-decisions-curator",
    "ah-release-gate-sync",
    "ah-review-learning-distiller",
    "ah-notion-sync-director"
  ].includes(id);
}

function missingPacketMarkers(text: string): string[] {
  const markers = [
    "recordTitle",
    "syncKey",
    "notionSurface",
    "writeMode",
    "sourceReportId",
    "source",
    "confidence",
    "lastVerifiedAt",
    "actionNeeded"
  ];

  return markers.filter((marker) => !text.includes(marker));
}

function hasWriteModeIntent(text: string): boolean {
  return /UPSERT_[A-Z_]+|UPDATE_NOTE_BLOCK_BY_SYNC_KEY/.test(text);
}

async function listAutomationDirs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const tomlPath = path.join(root, entry.name, "automation.toml");
    if (await exists(tomlPath)) matches.push(entry.name);
  }
  return matches.sort();
}

async function main() {
  const repoRoot = process.cwd();
  const automationRoot = path.join(repoRoot, ".codex", "automations");
  const requiredDocs = [
    "AUTOMATIONS_AUDIT.md",
    "AUTOMATIONS_ROADMAP.md",
    "AUTOMATIONS_OPERATING_MODEL.md",
    "RUNBOOK.md",
    ".codex/automations/README.md",
    "reports/automations/README.md"
  ];
  const requiredHelpers = [
    "scripts/codex/sync-automations.ts",
    "scripts/automations/check-source-freshness.ts",
    "scripts/automations/check-flow-instrumentation.ts",
    "scripts/automations/check-skill-duplication.ts",
    "scripts/automations/check-context-surface.ts"
  ];

  const failures: string[] = [];

  for (const relativePath of [...requiredDocs, ...requiredHelpers]) {
    if (!(await exists(path.join(repoRoot, relativePath)))) {
      failures.push(`missing ${relativePath}`);
    }
  }

  const automationDirs = await listAutomationDirs(automationRoot);
  if (automationDirs.length === 0) {
    failures.push("no automation.toml files found in .codex/automations");
  }

  const seenIds = new Set<string>();

  for (const dir of automationDirs) {
    const base = path.join(automationRoot, dir);
    const tomlPath = path.join(base, "automation.toml");
    const samplePath = path.join(base, "sample-output.md");
    const text = await readFile(tomlPath, "utf8");
    const id = extractQuoted(text, "id");
    const name = extractQuoted(text, "name");
    const status = extractQuoted(text, "status");
    const rrule = extractQuoted(text, "rrule");

    if (!(await exists(samplePath))) failures.push(`${dir}: missing sample-output.md`);
    if (!id) failures.push(`${dir}: missing id`);
    if (!name) failures.push(`${dir}: missing name`);
    if (!status) failures.push(`${dir}: missing status`);
    if (!rrule) failures.push(`${dir}: missing rrule`);
    if (!/^prompt\s*=\s*"""/m.test(text)) failures.push(`${dir}: prompt must use multiline TOML string`);
    if (!/^cwds\s*=\s*\[[\s\S]*\]/m.test(text)) failures.push(`${dir}: missing cwds array`);
    if (id && id !== dir) failures.push(`${dir}: id must match directory name`);
    if (id && seenIds.has(id)) failures.push(`${dir}: duplicate id ${id}`);
    if (id) seenIds.add(id);
    if (!text.includes("/Users/user/Projects/active-holidays-foundation")) {
      failures.push(`${dir}: cwd does not point to active-holidays-foundation`);
    }
    if (status && status !== "PAUSED") {
      failures.push(`${dir}: repo-local automations must stay PAUSED by default`);
    }
    if (id && requiresReportFirstSafety(id, text) && !/report-first/i.test(text)) {
      failures.push(`${dir}: direct write-capable automation must declare report-first safety`);
    }
    if (id && requiresNotionPacketEnvelope(id)) {
      const missingMarkers = missingPacketMarkers(text);
      if (missingMarkers.length > 0) {
        failures.push(
          `${dir}: Notion-facing automation is missing packet markers ${missingMarkers.join(", ")}`
        );
      }
    }
    if (
      id &&
      hasWriteModeIntent(text) &&
      /notion/i.test(text) &&
      !requiresNotionPacketEnvelope(id) &&
      !/report-first/i.test(text)
    ) {
      failures.push(
        `${dir}: automation declares Notion write intent without explicit report-first safety`
      );
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[FAIL] ${failure}`);
    process.exit(1);
  }

  console.log(`[OK] verified ${automationDirs.length} automation definitions.`);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Проверка automations завершилась ошибкой."
  );
  process.exit(1);
});
