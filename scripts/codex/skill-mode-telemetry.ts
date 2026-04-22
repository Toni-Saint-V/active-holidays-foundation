import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type SkillModeTelemetryConfig = {
  enabled: boolean;
  logPath: string;
  source: "detect" | "start" | "autopilot";
};

export type SkillModeTelemetryEvent = {
  eventId: string;
  timestamp: string;
  source: "detect" | "start" | "autopilot";
  promptHash: string;
  promptLength: number;
  files: string[];
  reviewOnly: boolean;
  mode: string | null;
  confidenceScore: number | null;
  confidenceLevel: string | null;
  executionLane: string | null;
  blockedState: string | null;
  candidateModes: string[];
  fileSurface: {
    fileCount: number;
    areas: string[];
    dominantArea: string | null;
    complexity: string;
  };
  agentTopology: string | null;
};

type TelemetryCliArgs = {
  report: boolean;
  file: string | null;
  limit: number | null;
};

type TelemetryReport = {
  totalRuns: number;
  bySource: Record<string, number>;
  byMode: Record<string, number>;
  byLane: Record<string, number>;
  blockedRuns: number;
  averageConfidence: number | null;
  skippedCorruptedLines: number;
};

type TelemetryReadResult = {
  events: SkillModeTelemetryEvent[];
  skippedCorruptedLines: number;
};

const DEFAULT_TELEMETRY_PATH = "reports/skills/skill-mode-telemetry.jsonl";

function parseTelemetryCliArgs(argv: string[]): TelemetryCliArgs {
  const result: TelemetryCliArgs = {
    report: false,
    file: null,
    limit: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--report") {
      result.report = true;
      continue;
    }

    if (token === "--file" && next) {
      result.file = next;
      index += 1;
      continue;
    }

    if (token.startsWith("--file=")) {
      result.file = token.slice("--file=".length);
      continue;
    }

    if (token === "--limit" && next) {
      result.limit = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (token.startsWith("--limit=")) {
      result.limit = Number.parseInt(token.slice("--limit=".length), 10);
    }
  }

  return result;
}

function hashPrompt(prompt: string): string {
  let hash = 5381;
  for (const character of prompt) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return `p${(hash >>> 0).toString(16)}`;
}

function normalizeLogPath(logPath: string): string {
  return resolve(process.cwd(), logPath);
}

export function resolveSkillModeTelemetryConfig(input: {
  telemetryEnabled?: boolean;
  telemetryFile?: string | null;
  source?: SkillModeTelemetryConfig["source"];
}): SkillModeTelemetryConfig {
  const envEnabled = process.env.SKILL_MODE_TELEMETRY === "1";
  const enabled = Boolean(input.telemetryEnabled || envEnabled || input.telemetryFile);
  const envPath = process.env.SKILL_MODE_TELEMETRY_FILE;
  const logPath = normalizeLogPath(
    input.telemetryFile || envPath || DEFAULT_TELEMETRY_PATH
  );
  const envSource = process.env.SKILL_MODE_TELEMETRY_SOURCE;
  const source =
    input.source ??
    (envSource === "detect" || envSource === "autopilot" ? envSource : "start");

  return {
    enabled,
    logPath,
    source
  };
}

export function createSkillModeTelemetryEvent(input: {
  source: "detect" | "start" | "autopilot";
  prompt: string;
  files: string[];
  reviewOnly: boolean;
  mode: string | null;
  confidenceScore: number | null;
  confidenceLevel: string | null;
  executionLane: string | null;
  blockedState: string | null;
  candidateModes: string[];
  fileSurface: SkillModeTelemetryEvent["fileSurface"];
  agentTopology: string | null;
}): SkillModeTelemetryEvent {
  return {
    eventId: `${input.source}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: input.source,
    promptHash: hashPrompt(input.prompt),
    promptLength: input.prompt.length,
    files: input.files,
    reviewOnly: input.reviewOnly,
    mode: input.mode,
    confidenceScore: input.confidenceScore,
    confidenceLevel: input.confidenceLevel,
    executionLane: input.executionLane,
    blockedState: input.blockedState,
    candidateModes: input.candidateModes,
    fileSurface: input.fileSurface,
    agentTopology: input.agentTopology
  };
}

export function writeSkillModeTelemetry(
  config: SkillModeTelemetryConfig,
  event: SkillModeTelemetryEvent
) {
  if (!config.enabled) return;

  mkdirSync(dirname(config.logPath), { recursive: true });
  appendFileSync(config.logPath, `${JSON.stringify(event)}\n`, "utf8");
}

export function readSkillModeTelemetry(logPath: string): TelemetryReadResult {
  const normalizedPath = normalizeLogPath(logPath);
  if (!existsSync(normalizedPath)) {
    return {
      events: [],
      skippedCorruptedLines: 0
    };
  }

  const content = readFileSync(normalizedPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const events: SkillModeTelemetryEvent[] = [];
  let skippedCorruptedLines = 0;

  for (const line of content) {
    try {
      events.push(JSON.parse(line) as SkillModeTelemetryEvent);
    } catch {
      skippedCorruptedLines += 1;
    }
  }

  return {
    events,
    skippedCorruptedLines
  };
}

export function createSkillModeTelemetryReport(
  input: TelemetryReadResult
): TelemetryReport {
  const { events, skippedCorruptedLines } = input;
  const bySource: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  const byLane: Record<string, number> = {};
  let blockedRuns = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const event of events) {
    bySource[event.source] = (bySource[event.source] ?? 0) + 1;
    byMode[event.mode ?? "manual"] = (byMode[event.mode ?? "manual"] ?? 0) + 1;
    byLane[event.executionLane ?? "unknown"] =
      (byLane[event.executionLane ?? "unknown"] ?? 0) + 1;

    if (event.blockedState === "blocked") blockedRuns += 1;
    if (typeof event.confidenceScore === "number") {
      confidenceSum += event.confidenceScore;
      confidenceCount += 1;
    }
  }

  return {
    totalRuns: events.length,
    bySource,
    byMode,
    byLane,
    blockedRuns,
    averageConfidence:
      confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) / 100 : null,
    skippedCorruptedLines
  };
}

function runTelemetryCli(argv: string[]) {
  const args = parseTelemetryCliArgs(argv);
  if (!args.report) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          message: "Use --report to summarize telemetry.",
          defaultLogPath: normalizeLogPath(args.file || DEFAULT_TELEMETRY_PATH)
        },
        null,
        2
      )
    );
    return;
  }

  const telemetry = readSkillModeTelemetry(args.file || DEFAULT_TELEMETRY_PATH);
  const limitedEvents =
    typeof args.limit === "number" && Number.isFinite(args.limit)
      ? {
          ...telemetry,
          events: telemetry.events.slice(-Math.max(args.limit, 0))
        }
      : telemetry;

  console.log(
    JSON.stringify(
      {
        logPath: normalizeLogPath(args.file || DEFAULT_TELEMETRY_PATH),
        report: createSkillModeTelemetryReport(limitedEvents)
      },
      null,
      2
    )
  );
}

if (process.argv[1]?.endsWith("skill-mode-telemetry.ts")) {
  runTelemetryCli(process.argv.slice(2));
}
