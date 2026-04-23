export type ConfidenceLevel = "low" | "medium" | "high";

export type ExecutionLaneId =
  | "manual"
  | "blocked"
  | "fast"
  | "standard"
  | "deep";

export type FileSurfaceArea =
  | "governance"
  | "plugin"
  | "ui"
  | "backend"
  | "contracts"
  | "state"
  | "tests"
  | "automation"
  | "docs";

export type FileSurface = {
  fileCount: number;
  areas: FileSurfaceArea[];
  dominantArea: FileSurfaceArea | null;
  complexity: "empty" | "narrow" | "mixed" | "wide";
  areaCounts: Partial<Record<FileSurfaceArea, number>>;
};

export type RoutingConfidence = {
  score: number;
  level: ConfidenceLevel;
  reason: string[];
  primaryScore: number;
  secondaryScore: number;
  scoreGap: number;
  matchedSignals: number;
  keywordSignals: number;
  fileSignals: number;
  pinned: boolean;
  singleCandidate: boolean;
};

export type ExecutionLane = {
  id: ExecutionLaneId;
  reason: string[];
};

export type RecommendedAgent = {
  id: string;
  role: "gatekeeper" | "coordinator" | "implementer" | "verifier" | "reviewer";
  label: string;
  focus: string[];
  ownership: string[];
  skills: string[];
};

export type RecommendedAgentPack = {
  topology: "trio" | "quartet";
  reason: string[];
  agents: RecommendedAgent[];
};

export type RoutingConfidenceInput = {
  primaryScore: number;
  secondaryScore: number;
  keywordSignals: number;
  fileSignals: number;
  pinned: boolean;
  candidateCount: number;
};

export type ExecutionLaneInput = {
  mode: string | null;
  confidence: RoutingConfidence;
  reviewOnly: boolean;
  blockedByPngApproval: boolean;
  fileSurface: FileSurface;
};

export type RecommendedAgentPackInput = {
  mode: string | null;
  defaultSkills: string[];
  files: string[];
  fileSurface: FileSurface;
  confidence: RoutingConfidence;
  executionLane: ExecutionLane;
  reviewOnly: boolean;
  blockedByPngApproval: boolean;
};

const AREA_PATTERNS: Array<{ area: FileSurfaceArea; pattern: RegExp }> = [
  { area: "governance", pattern: /^\.codex\/skills\// },
  {
    area: "governance",
    pattern: /^\.codex\/automations\/(check-waivers\.json|notion-surface-lock\.json)$/
  },
  { area: "governance", pattern: /^reports\/automations\/state\// },
  { area: "governance", pattern: /^scripts\/codex\// },
  { area: "plugin", pattern: /^plugins\// },
  { area: "plugin", pattern: /^\.agents\/plugins\// },
  { area: "plugin", pattern: /^\.cursor\/mcp\.json$/ },
  { area: "ui", pattern: /^src\/screens\// },
  { area: "ui", pattern: /^src\/ui\// },
  { area: "ui", pattern: /^src\/styles\// },
  { area: "ui", pattern: /^src\/theme\// },
  { area: "backend", pattern: /^server\// },
  { area: "contracts", pattern: /^shared\/contracts\// },
  { area: "contracts", pattern: /^src\/lib\/apiClient\.ts$/ },
  { area: "state", pattern: /^src\/state\// },
  { area: "tests", pattern: /\.test\.tsx?$/ },
  { area: "tests", pattern: /\.integration\.test\.tsx?$/ },
  { area: "tests", pattern: /^data\/scenarios\// },
  { area: "automation", pattern: /^\.codex\/automations\// },
  { area: "automation", pattern: /^scripts\/automations\// },
  { area: "docs", pattern: /^AGENTS\.md$/ },
  { area: "docs", pattern: /^README\.md$/ },
  { area: "docs", pattern: /^RUNBOOK\.md$/ },
  { area: "docs", pattern: /^AUTOMATIONS_[A-Z_]+\.md$/ },
  { area: "docs", pattern: /^reports\/automations\/README\.md$/ }
];

const DEEP_MODES = new Set([
  "ai-recommendation-boundary",
  "contract-boundary",
  "reliability-hardening",
  "review-gate"
]);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function summarizeOwnership(files: string[], fileSurface: FileSurface): string[] {
  if (files.length > 0) {
    return files.slice(0, 6);
  }

  const ownership: string[] = [];
  for (const area of fileSurface.areas) {
    if (area === "governance") ownership.push(".codex/*", "scripts/codex/*");
    if (area === "plugin") ownership.push("plugins/*", ".agents/plugins/*", ".cursor/mcp.json");
    if (area === "ui") ownership.push("src/screens/*", "src/ui/*", "src/styles/*");
    if (area === "backend") ownership.push("server/*");
    if (area === "contracts") ownership.push("shared/contracts/*", "src/lib/apiClient.ts");
    if (area === "state") ownership.push("src/state/*");
    if (area === "tests") ownership.push("*.test.*", "data/scenarios/*");
    if (area === "automation") ownership.push(".codex/automations/*", "scripts/automations/*");
    if (area === "docs") ownership.push("README.md", "AGENTS.md");
  }

  return unique(ownership);
}

function findAreasForFile(file: string): FileSurfaceArea[] {
  return AREA_PATTERNS.filter((entry) => entry.pattern.test(file)).map(
    (entry) => entry.area
  );
}

function buildAreaCounts(files: string[]): Partial<Record<FileSurfaceArea, number>> {
  const counts: Partial<Record<FileSurfaceArea, number>> = {};
  for (const file of files) {
    const areas = findAreasForFile(file);
    for (const area of areas) {
      counts[area] = (counts[area] ?? 0) + 1;
    }
  }
  return counts;
}

function resolveDominantArea(
  counts: Partial<Record<FileSurfaceArea, number>>
): FileSurfaceArea | null {
  const entries = Object.entries(counts) as Array<[FileSurfaceArea, number]>;
  if (entries.length === 0) return null;

  entries.sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] ?? null;
}

function resolveComplexity(areaCount: number, fileCount: number): FileSurface["complexity"] {
  if (fileCount === 0) return "empty";
  if (areaCount <= 1 && fileCount <= 3) return "narrow";
  if (areaCount >= 4 || fileCount >= 7) return "wide";
  return "mixed";
}

export function analyzeFileSurface(files: string[]): FileSurface {
  const normalizedFiles = files.filter(Boolean);
  const areaCounts = buildAreaCounts(normalizedFiles);
  const areas = unique(
    normalizedFiles.flatMap((file) => findAreasForFile(file))
  ) as FileSurfaceArea[];

  return {
    fileCount: normalizedFiles.length,
    areas,
    dominantArea: resolveDominantArea(areaCounts),
    complexity: resolveComplexity(areas.length, normalizedFiles.length),
    areaCounts
  };
}

export function createRoutingConfidence(
  input: RoutingConfidenceInput
): RoutingConfidence {
  const scoreGap = Math.max(0, input.primaryScore - input.secondaryScore);
  const matchedSignals = input.keywordSignals + input.fileSignals;
  let score = 0.38;

  score += Math.min(input.primaryScore, 5) * 0.08;
  score += Math.min(scoreGap, 3) * 0.08;
  score += Math.min(input.fileSignals, 3) * 0.05;
  score += Math.min(input.keywordSignals, 3) * 0.04;
  if (input.pinned) score += 0.12;
  if (input.candidateCount === 1) score += 0.06;
  if (matchedSignals <= 1) score -= 0.08;
  if (input.fileSignals === 0 && input.keywordSignals === 1) score -= 0.04;

  const roundedScore = roundScore(clamp(score, 0.22, 0.98));
  const level: ConfidenceLevel =
    roundedScore >= 0.82 ? "high" : roundedScore >= 0.62 ? "medium" : "low";

  const reason = [
    `primary score ${input.primaryScore}`,
    `score gap ${scoreGap}`,
    input.pinned ? "pinned by file match" : "not file-pinned",
    input.fileSignals > 0
      ? `file signals ${input.fileSignals}`
      : "no direct file signals",
    input.candidateCount === 1
      ? "single candidate"
      : `${input.candidateCount} candidates`
  ];

  return {
    score: roundedScore,
    level,
    reason,
    primaryScore: input.primaryScore,
    secondaryScore: input.secondaryScore,
    scoreGap,
    matchedSignals,
    keywordSignals: input.keywordSignals,
    fileSignals: input.fileSignals,
    pinned: input.pinned,
    singleCandidate: input.candidateCount === 1
  };
}

export function createExecutionLane(input: ExecutionLaneInput): ExecutionLane {
  if (!input.mode) {
    return {
      id: "manual",
      reason: [
        "no primary mode resolved",
        "manual routing is safer than forcing a weak classification"
      ]
    };
  }

  if (input.blockedByPngApproval) {
    return {
      id: "blocked",
      reason: [
        "selected mode is UI-sensitive",
        "PNG approval is mandatory before code execution"
      ]
    };
  }

  if (input.reviewOnly) {
    return {
      id: "deep",
      reason: [
        "review-only task benefits from full evidence gathering",
        "shortcuts are disabled for gate decisions"
      ]
    };
  }

  if (
    input.confidence.level === "high" &&
    input.fileSurface.complexity === "narrow" &&
    !DEEP_MODES.has(input.mode)
  ) {
    return {
      id: "fast",
      reason: [
        "high confidence primary mode",
        "narrow file surface allows a shorter execution packet"
      ]
    };
  }

  if (
    input.confidence.level === "low" ||
    DEEP_MODES.has(input.mode) ||
    input.fileSurface.complexity === "wide"
  ) {
    return {
      id: "deep",
      reason: [
        input.confidence.level === "low"
          ? "routing confidence is low"
          : "mode or surface requires deeper verification",
        `surface complexity ${input.fileSurface.complexity}`
      ]
    };
  }

  return {
    id: "standard",
    reason: [
      "mode resolved without a blocking gate",
      "task needs normal verification depth"
    ]
  };
}

function takeSkills(defaultSkills: string[], pattern: RegExp, fallbackCount: number): string[] {
  const matches = defaultSkills.filter((skill) => pattern.test(skill));
  if (matches.length > 0) return unique(matches);
  return unique(defaultSkills.slice(0, fallbackCount));
}

function createReviewGatePack(
  input: RecommendedAgentPackInput,
  ownership: string[]
): RecommendedAgentPack {
  const evidenceSkills = unique([
    ...takeSkills(input.defaultSkills, /(qa|release|golden|regression)/, 2),
    ...takeSkills(input.defaultSkills, /(review|bank-grade)/, 2)
  ]);

  const agents: RecommendedAgent[] = [
    {
      id: "correctness-reviewer",
      role: "reviewer",
      label: "Correctness reviewer",
      focus: ["проверить реальные behavioral риски", "поймать P0/P1 регрессии"],
      ownership,
      skills: takeSkills(input.defaultSkills, /(qa|golden|release)/, 2)
    },
    {
      id: "maintainability-reviewer",
      role: "reviewer",
      label: "Maintainability reviewer",
      focus: ["оценить forward risk", "поймать слабые контракты и lifecycle gaps"],
      ownership,
      skills: takeSkills(input.defaultSkills, /(review|bank-grade)/, 2)
    },
    {
      id: "merge-gate",
      role: "coordinator",
      label: "Merge gate",
      focus: ["свести findings", "дать ship/block verdict только по доказательствам"],
      ownership,
      skills: evidenceSkills
    }
  ];

  return {
    topology: "trio",
    reason: [
      "review-gate mode always runs as a multi-lens review",
      `execution lane ${input.executionLane.id}`
    ],
    agents
  };
}

function createPremiumUiPack(
  input: RecommendedAgentPackInput,
  ownership: string[]
): RecommendedAgentPack {
  const agents: RecommendedAgent[] = [
    {
      id: "png-gatekeeper",
      role: "gatekeeper",
      label: "PNG gatekeeper",
      focus: ["проверить наличие PNG preview", "не пускать UI код без явного approval"],
      ownership,
      skills: takeSkills(input.defaultSkills, /(png|protocol|design-system)/, 2)
    },
    {
      id: "ui-implementer",
      role: "implementer",
      label: "UI implementer",
      focus: ["усилить иерархию и CTA", "держать mobile-first и русскую copy"],
      ownership,
      skills: takeSkills(input.defaultSkills, /(frontend|design-system|ux|copy|a11y)/, 3)
    },
    {
      id: "trust-qa",
      role: "verifier",
      label: "Trust and usability verifier",
      focus: ["проверить empty/loading/error/success", "сохранить trust-safe UX"],
      ownership,
      skills: takeSkills(input.defaultSkills, /(a11y|trust|ux|copy)/, 3)
    }
  ];

  return {
    topology: "trio",
    reason: [
      input.blockedByPngApproval
        ? "UI mode is blocked until PNG approval"
        : "UI mode still benefits from explicit design gate",
      `confidence ${input.confidence.level}`
    ],
    agents
  };
}

function createModeLabel(mode: string | null): string {
  switch (mode) {
    case "skill-system-governance":
      return "Skill system governance";
    case "plugin-surface":
      return "Plugin and MCP governance";
    case "ai-recommendation-boundary":
      return "AI boundary fix";
    case "contract-boundary":
      return "Contract integrity";
    case "result-flow":
      return "Result flow";
    case "reliability-hardening":
      return "Reliability hardening";
    case "regression-proof":
      return "Regression expansion";
    default:
      return "Manual routing";
  }
}

function createGenericPack(
  input: RecommendedAgentPackInput,
  ownership: string[]
): RecommendedAgentPack {
  const surfaceFocus = input.fileSurface.areas.length
    ? `surface: ${input.fileSurface.areas.join(", ")}`
    : "surface not yet resolved from files";
  const modeLabel = createModeLabel(input.mode);
  const verifierSkills = takeSkills(
    input.defaultSkills,
    /(qa|release|golden|regression|a11y|trust|hardening)/,
    2
  );
  const reviewerSkills = takeSkills(
    input.defaultSkills,
    /(review|release|bank-grade|trust|golden)/,
    2
  );
  const implementerSkills = unique(
    input.defaultSkills.filter(
      (skill) => !verifierSkills.includes(skill) && !reviewerSkills.includes(skill)
    )
  );

  const agents: RecommendedAgent[] = [
    {
      id: "mode-coordinator",
      role: "coordinator",
      label: `${modeLabel} coordinator`,
      focus: [
        "зафиксировать primary mode и границы задачи",
        input.executionLane.id === "fast"
          ? "держать fast-lane и не расползаться по лишним шагам"
          : "держать execution packet и ownership map"
      ],
      ownership,
      skills: unique(input.defaultSkills.slice(0, 2))
    },
    {
      id: "surface-implementer",
      role: "implementer",
      label: "Surface implementer",
      focus: [surfaceFocus, "внести минимальные рабочие изменения без лишних слоев"],
      ownership,
      skills: implementerSkills.length > 0 ? implementerSkills.slice(0, 3) : input.defaultSkills.slice(0, 2)
    },
    {
      id: "evidence-verifier",
      role: "verifier",
      label: "Evidence verifier",
      focus: ["прогнать релевантные проверки", "подтвердить что изменения не ломают trust boundary"],
      ownership,
      skills: verifierSkills
    }
  ];

  const needsReviewer =
    input.executionLane.id === "deep" ||
    input.fileSurface.complexity === "wide" ||
    input.fileSurface.areas.length >= 3;

  if (needsReviewer) {
    agents.push({
      id: "risk-reviewer",
      role: "reviewer",
      label: "Risk reviewer",
      focus: ["сделать финальный sanity-check", "поймать edge cases перед закрытием задачи"],
      ownership,
      skills: reviewerSkills
    });
  }

  return {
    topology: agents.length >= 4 ? "quartet" : "trio",
    reason: [
      `mode ${input.mode ?? "manual"}`,
      `lane ${input.executionLane.id}`,
      `confidence ${input.confidence.level}`
    ],
    agents
  };
}

function createManualRoutingPack(
  input: RecommendedAgentPackInput,
  ownership: string[]
): RecommendedAgentPack {
  return {
    topology: "trio",
    reason: [
      "no strong mode match",
      "manual routing is required before execution"
    ],
    agents: [
      {
        id: "surface-mapper",
        role: "coordinator",
        label: "Surface mapper",
        focus: ["определить доминирующую surface", "собрать недостающие сигналы для mode choice"],
        ownership,
        skills: []
      },
      {
        id: "implementer-reserve",
        role: "implementer",
        label: "Implementer reserve",
        focus: ["не начинать изменения до ручного выбора mode", "подготовить минимальный scope"],
        ownership,
        skills: input.defaultSkills
      },
      {
        id: "verification-gate",
        role: "verifier",
        label: "Verification gate",
        focus: ["не пускать execution без mode resolution", "сохранить proof-driven workflow"],
        ownership,
        skills: []
      }
    ]
  };
}

export function createRecommendedAgentPack(
  input: RecommendedAgentPackInput
): RecommendedAgentPack {
  const ownership = summarizeOwnership(input.files, input.fileSurface);

  if (input.mode === "review-gate") {
    return createReviewGatePack(input, ownership);
  }

  if (input.mode === "premium-ui") {
    return createPremiumUiPack(input, ownership);
  }

  if (!input.mode) {
    return createManualRoutingPack(input, ownership);
  }

  return createGenericPack(input, ownership);
}
