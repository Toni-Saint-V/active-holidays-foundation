import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type SourceTier = "official" | "operator" | "crowdsourced";

export type Source = {
  id: string;
  label: string;
  url: string;
  tier: SourceTier;
  lastCheckedAt: string;
  volatilityScore: number;
};

export type CheckWaiver = {
  appliesTo: string;
  affectedChecks: string[];
  affectedAutomationIds: string[];
  reason: string;
  expiresAt: string;
};

export type CheckWaiverState = {
  waivers: CheckWaiver[];
};

export type RecordWithSource = {
  sourceId?: string;
  sources?: Array<{ id: string }>;
};

export type SourceDataset = {
  path: string;
  records: RecordWithSource[];
};

export type SourceFreshnessIssueKind =
  | "invalid_last_checked_at"
  | "stale_referenced"
  | "stale_unused"
  | "duplicate_source_id"
  | "missing_source_reference"
  | "unused_source"
  | "crowdsourced_dependency";

export type SourceFreshnessSeverity = "blocker" | "warning";

export type SourceFreshnessIssue = {
  kind: SourceFreshnessIssueKind;
  severity: SourceFreshnessSeverity;
  sourceId: string;
  message: string;
  productImpact: string;
  evidence: string[];
  tier?: SourceTier;
  ageDays?: number;
  thresholdDays?: number;
  referenced?: boolean;
  waived?: boolean;
};

export type GeneratedFreshnessTask = {
  id: string;
  title: string;
  severity: SourceFreshnessSeverity;
  sourceId: string;
  productArea: "truth_trust";
  productReason: string;
  actionNeeded: string;
  evidence: string[];
  blockedByManualReview: boolean;
  acceptanceCriteria: string[];
  verification: string[];
  codexBrief: string;
  downstreamSyncDraft: {
    canonicalEnvelopeStatus: "draft_requires_adapter";
    writeMode: "report_only";
    targetSurface: "Automation Inbox";
    syncKey: string;
    draftStatus: "Ready";
    severity: SourceFreshnessSeverity;
    confidence: "high" | "medium";
    actionNeeded: string;
    evidence: string[];
    boundary: string;
  };
};

export type SourceFreshnessReport = {
  schemaVersion: 1;
  generatedAt: string;
  status: "pass" | "blocked";
  sourceCount: number;
  referencedSourceCount: number;
  failures: string[];
  warnings: string[];
  issues: SourceFreshnessIssue[];
  nextTasks: GeneratedFreshnessTask[];
};

export type BuildSourceFreshnessReportInput = {
  now?: Date;
  sources: Source[];
  waiverState: CheckWaiverState;
  datasets: SourceDataset[];
};

const automationId = "ah-truth-freshness-watch";
const freshnessCheckId = `freshness:${automationId}`;
const sourcesPath = "data/db/sources.json";
const verificationCommands = ["npm run automations:check:truth"];

const thresholdDaysByTier: Record<SourceTier, number> = {
  official: 7,
  operator: 5,
  crowdsourced: 14
};

async function loadJson<T>(relativePath: string): Promise<T> {
  const target = path.join(process.cwd(), relativePath);
  const raw = await readFile(target, "utf8");
  return JSON.parse(raw) as T;
}

async function loadOptionalJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    return await loadJson<T>(relativePath);
  } catch {
    return fallback;
  }
}

function dayAge(iso: string, now: Date): number | null {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return null;
  const deltaMs = now.getTime() - stamp;
  return Math.floor(deltaMs / (24 * 60 * 60 * 1000));
}

function collectSourceIds(records: RecordWithSource[]): string[] {
  const ids: string[] = [];
  for (const record of records) {
    if (record.sourceId) ids.push(record.sourceId);
    for (const source of record.sources ?? []) ids.push(source.id);
  }
  return ids;
}

function hasActiveFreshnessWaiver(sourceId: string, waivers: CheckWaiver[], now: Date): boolean {
  const nowMs = now.getTime();
  return waivers.some((waiver) => {
    const expiresAt = Date.parse(waiver.expiresAt);
    return (
      waiver.appliesTo === sourceId &&
      waiver.affectedChecks.includes(freshnessCheckId) &&
      waiver.affectedAutomationIds.includes(automationId) &&
      Number.isFinite(expiresAt) &&
      expiresAt > nowMs
    );
  });
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function sourceEvidence(datasetPaths: string[]): string[] {
  return unique([sourcesPath, ...datasetPaths]).sort();
}

function taskIdSuffix(sourceId: string): string {
  return sourceId.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
}

function buildTaskArtifacts(input: {
  id: string;
  title: string;
  severity: SourceFreshnessSeverity;
  sourceId: string;
  productReason: string;
  actionNeeded: string;
  evidence: string[];
  blockedByManualReview: boolean;
}): GeneratedFreshnessTask {
  const acceptanceCriteria = [
    "Freshness issue is represented as a concrete product task with source id, product reason, evidence, and owner boundary.",
    "Manual review boundary is explicit before any truth catalog timestamp or content update.",
    "Verification command is listed and can be run without external writes."
  ];
  const codexBrief = [
    `# Truth freshness task: ${input.title}`,
    "",
    "## Objective",
    input.actionNeeded,
    "",
    "## Product reason",
    input.productReason,
    "",
    "## Evidence",
    ...input.evidence.map((item) => `- ${item}`),
    "",
    "## Acceptance criteria",
    ...acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Verification",
    ...verificationCommands.map((item) => `- ${item}`),
    "",
    "## Boundary",
    input.blockedByManualReview
      ? "- Do not update source freshness timestamps or product truth until a human/manual source review confirms the source."
      : "- Safe metadata repair can proceed if the patch only restores source catalog integrity."
  ].join("\n");

  return {
    ...input,
    productArea: "truth_trust",
    acceptanceCriteria,
    verification: verificationCommands,
    codexBrief,
    downstreamSyncDraft: {
      canonicalEnvelopeStatus: "draft_requires_adapter",
      writeMode: "report_only",
      targetSurface: "Automation Inbox",
      syncKey: `automation:${automationId}:${input.id}`,
      draftStatus: "Ready",
      severity: input.severity,
      confidence: input.blockedByManualReview ? "medium" : "high",
      actionNeeded: input.actionNeeded,
      evidence: input.evidence,
      boundary:
        "This is not the repo-owned Notion packet envelope. A downstream adapter must add packetKey, recordTitle, notionSurface, sourceReportId, lastVerifiedAt, packetLifecycle, diffHash, dedupeKey, and supersession fields before any writeback."
    }
  };
}

function staleProductImpact(source: Source, waived: boolean): string {
  if (waived) {
    return `${source.tier} source is stale under a time-boxed waiver; recommendations remain usable only while the waiver is visible and manually owned.`;
  }
  return `${source.tier} source can make user-facing guidance stale for visa, restriction, insurance, or residency decisions.`;
}

function addIssue(
  issues: SourceFreshnessIssue[],
  issue: SourceFreshnessIssue,
  failures: string[],
  warnings: string[]
) {
  issues.push(issue);
  if (issue.severity === "blocker") {
    failures.push(issue.message);
  } else {
    warnings.push(issue.message);
  }
}

function buildNextTasks(issues: SourceFreshnessIssue[], sourceById: Map<string, Source>): GeneratedFreshnessTask[] {
  const tasks = new Map<string, GeneratedFreshnessTask>();

  for (const issue of issues) {
    if (issue.kind === "stale_referenced") {
      const source = sourceById.get(issue.sourceId);
      const sourceLabel = source?.label ?? issue.sourceId;
      const id = `truth-refresh-${taskIdSuffix(issue.sourceId)}`;
      tasks.set(id, buildTaskArtifacts({
        id,
        title: `Refresh stale ${issue.tier ?? "source"} source: ${sourceLabel}`,
        severity: issue.severity,
        sourceId: issue.sourceId,
        productReason: issue.waived
          ? `${sourceLabel} is stale under a time-boxed waiver; keep it actionable until manually re-verified.`
          : `${sourceLabel} is referenced by product rules and can make customer-facing guidance stale.`,
        actionNeeded: `Manually re-check ${sourceLabel}, then update the source catalog only if the live source still supports the current product rule.`,
        evidence: issue.evidence,
        blockedByManualReview: true
      }));
      continue;
    }

    if (issue.kind === "missing_source_reference") {
      const id = `truth-fix-missing-source-${taskIdSuffix(issue.sourceId)}`;
      tasks.set(id, buildTaskArtifacts({
        id,
        title: `Fix missing source mapping: ${issue.sourceId}`,
        severity: issue.severity,
        sourceId: issue.sourceId,
        productReason: `Product rules reference ${issue.sourceId}, but the source catalog is missing it, so the system cannot show reliable evidence.`,
        actionNeeded: `Add or correct the source catalog mapping for ${issue.sourceId} without changing product claims.`,
        evidence: issue.evidence,
        blockedByManualReview: false
      }));
      continue;
    }

    if (issue.kind === "invalid_last_checked_at") {
      const id = `truth-fix-source-timestamp-${taskIdSuffix(issue.sourceId)}`;
      tasks.set(id, buildTaskArtifacts({
        id,
        title: `Review invalid source freshness timestamp: ${issue.sourceId}`,
        severity: issue.severity,
        sourceId: issue.sourceId,
        productReason: issue.productImpact,
        actionNeeded: `Manually re-check ${issue.sourceId}, then repair lastCheckedAt only if the live source confirms the current product rule.`,
        evidence: issue.evidence,
        blockedByManualReview: true
      }));
      continue;
    }

    if (issue.kind === "duplicate_source_id") {
      const id = `truth-fix-source-catalog-${taskIdSuffix(issue.sourceId)}`;
      tasks.set(id, buildTaskArtifacts({
        id,
        title: `Repair source catalog integrity: ${issue.sourceId}`,
        severity: issue.severity,
        sourceId: issue.sourceId,
        productReason: issue.productImpact,
        actionNeeded: `Repair source catalog integrity for ${issue.sourceId} so freshness and evidence checks remain deterministic.`,
        evidence: issue.evidence,
        blockedByManualReview: false
      }));
    }
  }

  return Array.from(tasks.values()).sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "blocker" ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
}

export function buildSourceFreshnessReport(
  input: BuildSourceFreshnessReportInput
): SourceFreshnessReport {
  const now = input.now ?? new Date();
  const failures: string[] = [];
  const warnings: string[] = [];
  const issues: SourceFreshnessIssue[] = [];
  const duplicates = new Set<string>();
  const seen = new Set<string>();
  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const referencedBySource = new Map<string, string[]>();

  for (const dataset of input.datasets) {
    for (const sourceId of collectSourceIds(dataset.records)) {
      referencedBySource.set(sourceId, [...(referencedBySource.get(sourceId) ?? []), dataset.path]);
    }
  }

  const referenced = Array.from(referencedBySource.keys());
  const referencedSet = new Set(referenced);

  for (const source of input.sources) {
    if (seen.has(source.id)) duplicates.add(source.id);
    seen.add(source.id);

    const age = dayAge(source.lastCheckedAt, now);
    const datasetPaths = referencedBySource.get(source.id) ?? [];
    const isReferenced = referencedSet.has(source.id);

    if (age === null) {
      addIssue(
        issues,
        {
          kind: "invalid_last_checked_at",
          severity: "blocker",
          sourceId: source.id,
          message: `invalid lastCheckedAt: ${source.id}`,
          productImpact: "Source freshness cannot be audited, so evidence-backed recommendations cannot prove recency.",
          evidence: [sourcesPath],
          tier: source.tier,
          referenced: isReferenced
        },
        failures,
        warnings
      );
      continue;
    }

    const threshold = thresholdDaysByTier[source.tier];
    if (age > threshold && isReferenced) {
      const waived = hasActiveFreshnessWaiver(source.id, input.waiverState.waivers, now);
      const severity = source.tier === "crowdsourced" || waived ? "warning" : "blocker";
      addIssue(
        issues,
        {
          kind: "stale_referenced",
          severity,
          sourceId: source.id,
          message: `${source.id} stale ${age}d > ${threshold}d (${source.tier})`,
          productImpact: staleProductImpact(source, waived),
          evidence: sourceEvidence(datasetPaths),
          tier: source.tier,
          ageDays: age,
          thresholdDays: threshold,
          referenced: true,
          waived
        },
        failures,
        warnings
      );
      if (waived && source.tier !== "crowdsourced") warnings.push(`${source.id} freshness waiver active`);
    } else if (age > threshold && !isReferenced) {
      addIssue(
        issues,
        {
          kind: "stale_unused",
          severity: "warning",
          sourceId: source.id,
          message: `${source.id} stale but unused ${age}d > ${threshold}d (${source.tier})`,
          productImpact: "Unused stale source does not affect current product output, but should be cleaned up or re-verified before reuse.",
          evidence: [sourcesPath],
          tier: source.tier,
          ageDays: age,
          thresholdDays: threshold,
          referenced: false
        },
        failures,
        warnings
      );
    }
  }

  for (const duplicate of duplicates) {
    addIssue(
      issues,
      {
        kind: "duplicate_source_id",
        severity: "blocker",
        sourceId: duplicate,
        message: `duplicate source id: ${duplicate}`,
        productImpact: "Duplicate source ids make evidence attribution ambiguous and unsafe for customer-facing trust claims.",
        evidence: [sourcesPath]
      },
      failures,
      warnings
    );
  }

  const sourceIds = new Set(input.sources.map((item) => item.id));
  const missing = referenced.filter((id) => !sourceIds.has(id));
  for (const id of missing) {
    addIssue(
      issues,
      {
        kind: "missing_source_reference",
        severity: "blocker",
        sourceId: id,
        message: `missing source reference: ${id}`,
        productImpact: "A product rule references evidence that cannot be resolved in the source catalog.",
        evidence: sourceEvidence(referencedBySource.get(id) ?? [])
      },
      failures,
      warnings
    );
  }

  const unused = input.sources.map((item) => item.id).filter((id) => !referenced.includes(id));
  for (const id of unused) {
    addIssue(
      issues,
      {
        kind: "unused_source",
        severity: "warning",
        sourceId: id,
        message: `unused source: ${id}`,
        productImpact: "Unused source catalog entries increase maintenance noise but do not currently affect user guidance.",
        evidence: [sourcesPath],
        tier: sourceById.get(id)?.tier,
        referenced: false
      },
      failures,
      warnings
    );
  }

  const crowdsourcedReferenced = referenced.filter(
    (id) => sourceById.get(id)?.tier === "crowdsourced"
  );
  for (const id of crowdsourcedReferenced) {
    addIssue(
      issues,
      {
        kind: "crowdsourced_dependency",
        severity: "warning",
        sourceId: id,
        message: `crowdsourced dependency present: ${id}`,
        productImpact: "Crowdsourced evidence must remain secondary and should not carry deterministic recommendation claims alone.",
        evidence: sourceEvidence(referencedBySource.get(id) ?? []),
        tier: "crowdsourced",
        referenced: true
      },
      failures,
      warnings
    );
  }

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    status: failures.length > 0 ? "blocked" : "pass",
    sourceCount: input.sources.length,
    referencedSourceCount: referencedSet.size,
    failures,
    warnings,
    issues,
    nextTasks: buildNextTasks(issues, sourceById)
  };
}

export function renderMarkdownReport(report: SourceFreshnessReport): string {
  const warnings = report.warnings.length > 0
    ? report.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- none";
  const failures = report.failures.length > 0
    ? report.failures.map((failure) => `- ${failure}`).join("\n")
    : "- none";
  const productImpact = report.issues.length > 0
    ? report.issues
        .map((issue) => `- ${issue.severity.toUpperCase()} · ${issue.sourceId}: ${issue.productImpact}`)
        .join("\n")
    : "- No freshness or source integrity issues detected.";
  const nextTasks = report.nextTasks.length > 0
    ? report.nextTasks
        .map((task) => `- ${task.id}: ${task.title} — ${task.productReason}`)
        .join("\n")
    : "- none";

  return [
    "---",
    `lastVerifiedAt: ${report.generatedAt}`,
    "---",
    "",
    "# Truth + Freshness Watch",
    "",
    "## SOURCE HEALTH",
    "",
    `- Status: ${report.status}`,
    `- Sources: ${report.sourceCount}`,
    `- Referenced source ids: ${report.referencedSourceCount}`,
    "",
    "## WARNINGS",
    "",
    warnings,
    "",
    "## FAILURES",
    "",
    failures,
    "",
    "## RISKS TO TRUST",
    "",
    productImpact,
    "",
    "## REQUIRED ACTION",
    "",
    nextTasks,
    "",
    "## SAFE PATCH OR MANUAL REVIEW",
    "",
    report.nextTasks.some((task) => task.blockedByManualReview)
      ? "- Manual source review required before updating `lastCheckedAt` or product truth."
      : "- Safe catalog repair may proceed if it only restores missing/duplicate metadata.",
    "",
    "## VERIFY",
    "",
    "- npm run automations:check:truth"
  ].join("\n");
}

async function loadRuntimeInput(): Promise<BuildSourceFreshnessReportInput> {
  const sources = await loadJson<Source[]>(sourcesPath);
  const waiverState = await loadOptionalJson<CheckWaiverState>(
    ".codex/automations/check-waivers.json",
    { waivers: [] }
  );

  return {
    sources,
    waiverState,
    datasets: [
      {
        path: "data/db/visa_rules.json",
        records: await loadJson<RecordWithSource[]>("data/db/visa_rules.json")
      },
      {
        path: "data/db/country_restrictions.json",
        records: await loadJson<RecordWithSource[]>("data/db/country_restrictions.json")
      },
      {
        path: "data/db/residency_programs.json",
        records: await loadJson<RecordWithSource[]>("data/db/residency_programs.json")
      },
      {
        path: "data/db/insurance_products.json",
        records: await loadJson<RecordWithSource[]>("data/db/insurance_products.json")
      }
    ]
  };
}

async function writeReports(report: SourceFreshnessReport) {
  const outputDir = path.join("reports", "automations", "runs", automationId);
  const markdownReport = `${renderMarkdownReport(report)}\n`;
  const datedReportName = `${report.generatedAt.slice(0, 10)}.md`;
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputDir, "latest.md"), markdownReport);
  await writeFile(path.join(outputDir, datedReportName), markdownReport);
  const topTask = report.nextTasks[0] ?? null;
  await writeFile(path.join(outputDir, "task-packet-latest.json"), `${JSON.stringify(topTask, null, 2)}\n`);
  await writeFile(
    path.join(outputDir, "task-packet-latest.md"),
    topTask
      ? `${topTask.codexBrief}\n\n## Downstream sync draft\n\n\`\`\`json\n${JSON.stringify(topTask.downstreamSyncDraft, null, 2)}\n\`\`\`\n`
      : "No actionable freshness task.\n"
  );
}

async function main() {
  const asJson = process.argv.includes("--json");
  const shouldWrite = process.argv.includes("--write");
  const report = buildSourceFreshnessReport(await loadRuntimeInput());

  if (shouldWrite) {
    await writeReports(report);
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Sources: ${report.sourceCount}`);
    console.log(`Referenced source ids: ${report.referencedSourceCount}`);
    if (report.warnings.length > 0) {
      console.log("Warnings:");
      for (const warning of report.warnings) console.log(`- ${warning}`);
    }
    if (report.nextTasks.length > 0) {
      console.log("Generated next tasks:");
      for (const task of report.nextTasks) console.log(`- ${task.id}: ${task.title}`);
    }
    if (report.failures.length > 0) {
      console.error("Failures:");
      for (const failure of report.failures) console.error(`- ${failure}`);
    }
    if (report.status === "pass") {
      console.log("OK: freshness and source integrity baseline passed.");
    }
  }

  if (report.status === "blocked") process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Проверка truth/freshness завершилась ошибкой."
    );
    process.exit(1);
  });
}
