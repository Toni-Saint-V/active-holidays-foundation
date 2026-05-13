import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export type GatePolicy = "blocking" | "advisory";
export type GateStatus = "pass" | "fail" | "skipped";
export type GateSeverity = "info" | "warn" | "error";
export type ReleaseVerdictStatus = "ship" | "block";

export type ReleaseCheckDefinition = {
  id: string;
  title: string;
  command: string;
  policy: GatePolicy;
  sideEffecting: boolean;
  notes?: string;
};

export type ReleaseCheckResult = ReleaseCheckDefinition & {
  status: GateStatus;
  severity: GateSeverity;
  exitCode: number | null;
  durationMs: number;
  hasWarnings: boolean;
  skipReason: string | null;
  outputTail: string[];
};

export type ReleaseGateSummary = {
  schemaVersion: 1;
  generatedAt: string;
  options: {
    includeSideEffects: boolean;
    jsonOnly: boolean;
  };
  verdict: {
    status: ReleaseVerdictStatus;
    severity: GateSeverity;
    blockingFailures: string[];
    advisoryFailures: string[];
  };
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    blocking: number;
    advisory: number;
    warnings: number;
  };
  checks: ReleaseCheckResult[];
};

export const RELEASE_CHECK_MATRIX: readonly ReleaseCheckDefinition[] = [
  {
    id: "core-verify",
    title: "Core verify (forbidden copy + typecheck + build)",
    command: "npm run verify",
    policy: "blocking",
    sideEffecting: false
  },
  {
    id: "boundary-contracts",
    title: "Import boundary contracts",
    command: "npm run verify:boundaries",
    policy: "blocking",
    sideEffecting: false
  },
  {
    id: "engine-drift",
    title: "Engine drift baseline",
    command: "npm run verify:engine",
    policy: "blocking",
    sideEffecting: false
  },
  {
    id: "automations-governance",
    title: "Automation runtime governance",
    command: "npm run automations:verify",
    policy: "blocking",
    sideEffecting: false
  },
  {
    id: "automations-negative-fixtures",
    title: "Automation negative fixtures",
    command: "npm run automations:verify:negative",
    policy: "blocking",
    sideEffecting: false
  },
  {
    id: "truth-freshness",
    title: "Truth freshness baseline",
    command: "npm run automations:check:truth",
    policy: "blocking",
    sideEffecting: false
  },
  {
    id: "context-surface",
    title: "Context surface consistency",
    command: "npm run automations:check:context",
    policy: "advisory",
    sideEffecting: false
  },
  {
    id: "autonomous-os-verify",
    title: "Autonomous OS verification",
    command: "npm run autonomous:verify",
    policy: "advisory",
    sideEffecting: true,
    notes:
      "Side-effecting: verify-autonomous-os invokes execute-autonomous-task --json and may write reports/autonomous/*."
  }
];

function parseOptions(argv: string[]) {
  return {
    includeSideEffects: argv.includes("--include-side-effects"),
    jsonOnly: argv.includes("--json")
  };
}

function normalizeOutput(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function hasWarningSignal(output: string): boolean {
  return /(?:^|\n)\s*(?:\[WARN(?:ING)?\]|WARN(?:ING)?[:\s])/i.test(output);
}

function toSeverity(input: {
  status: GateStatus;
  policy: GatePolicy;
  hasWarnings: boolean;
}): GateSeverity {
  if (input.status === "skipped") return "info";
  if (input.status === "fail") {
    return input.policy === "blocking" ? "error" : "warn";
  }
  if (input.hasWarnings) return "warn";
  return "info";
}

export function evaluateCheck(
  definition: ReleaseCheckDefinition,
  options: { includeSideEffects: boolean }
): ReleaseCheckResult {
  if (definition.sideEffecting && !options.includeSideEffects) {
    return {
      ...definition,
      status: "skipped",
      severity: "info",
      exitCode: null,
      durationMs: 0,
      hasWarnings: false,
      skipReason: "side_effecting_check_disabled",
      outputTail: []
    };
  }

  const startedAt = Date.now();
  const result = spawnSync(definition.command, {
    shell: true,
    encoding: "utf8",
    stdio: "pipe",
    env: process.env
  });
  const durationMs = Date.now() - startedAt;
  const outputRaw = `${result.stdout ?? ""}\n${result.stderr ?? ""}${
    result.error ? `\n${result.error.message}` : ""
  }`;
  const outputLines = normalizeOutput(outputRaw);
  const status: GateStatus = result.status === 0 ? "pass" : "fail";
  const hasWarnings = hasWarningSignal(outputRaw);

  return {
    ...definition,
    status,
    severity: toSeverity({ status, policy: definition.policy, hasWarnings }),
    exitCode: typeof result.status === "number" ? result.status : 1,
    durationMs,
    hasWarnings,
    skipReason: null,
    outputTail: outputLines.slice(-12)
  };
}

function deriveSummarySeverity(checks: ReleaseCheckResult[], verdictStatus: ReleaseVerdictStatus): GateSeverity {
  if (verdictStatus === "block") return "error";
  if (checks.some((check) => check.severity === "warn")) return "warn";
  return "info";
}

export function buildReleaseGateSummary(
  checks: ReleaseCheckResult[],
  options: { includeSideEffects: boolean; jsonOnly: boolean }
): ReleaseGateSummary {
  const blockingFailures = checks
    .filter((check) => check.policy === "blocking" && check.status === "fail")
    .map((check) => check.id);
  const advisoryFailures = checks
    .filter((check) => check.policy === "advisory" && check.status === "fail")
    .map((check) => check.id);
  const verdictStatus: ReleaseVerdictStatus = blockingFailures.length > 0 ? "block" : "ship";

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    options,
    verdict: {
      status: verdictStatus,
      severity: deriveSummarySeverity(checks, verdictStatus),
      blockingFailures,
      advisoryFailures
    },
    counts: {
      total: checks.length,
      passed: checks.filter((check) => check.status === "pass").length,
      failed: checks.filter((check) => check.status === "fail").length,
      skipped: checks.filter((check) => check.status === "skipped").length,
      blocking: checks.filter((check) => check.policy === "blocking").length,
      advisory: checks.filter((check) => check.policy === "advisory").length,
      warnings: checks.filter((check) => check.severity === "warn").length
    },
    checks
  };
}

function formatReadableSummary(summary: ReleaseGateSummary): string {
  const lines: string[] = [];
  const verdictLabel = summary.verdict.status === "ship" ? "SHIP" : "BLOCK";

  lines.push("# Release Gate Summary");
  lines.push(`Verdict: ${verdictLabel}`);
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(
    `Blocking failures: ${summary.verdict.blockingFailures.length} | Advisory failures: ${summary.verdict.advisoryFailures.length}`
  );
  lines.push(
    `Checks: total ${summary.counts.total}, pass ${summary.counts.passed}, fail ${summary.counts.failed}, skipped ${summary.counts.skipped}`
  );
  lines.push("");
  lines.push("## Checks");

  for (const check of summary.checks) {
    const sideEffecting = check.sideEffecting ? " side-effecting" : "";
    const runMeta =
      check.status === "skipped"
        ? `skip=${check.skipReason}`
        : `exit=${check.exitCode} duration=${check.durationMs}ms`;
    lines.push(
      `- [${check.status.toUpperCase()}][${check.severity.toUpperCase()}][${check.policy.toUpperCase()}${sideEffecting ? " + SIDE_EFFECTING" : ""}] ${check.id}: ${check.command} (${runMeta})`
    );
    if (check.notes) {
      lines.push(`  note: ${check.notes}`);
    }
    if (check.outputTail.length > 0) {
      lines.push(`  output: ${check.outputTail.at(-1)}`);
    }
  }

  lines.push("");
  lines.push("## JSON");
  lines.push(JSON.stringify(summary, null, 2));
  return lines.join("\n");
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const checks = RELEASE_CHECK_MATRIX.map((check) => evaluateCheck(check, options));
  const summary = buildReleaseGateSummary(checks, options);

  if (options.jsonOnly) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatReadableSummary(summary));
  }

  if (summary.verdict.status === "block") {
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "release gate summary failed");
    process.exit(1);
  });
}
