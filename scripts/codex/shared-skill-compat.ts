import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { hashValue, sortBy, exists } from "./automation-contract-utils.ts";

export type SkillFallbackMode =
  | "manual-review"
  | "fail-closed"
  | "repo-local-override-required";

export type SharedSkillCompatSnapshot = {
  skillName: string;
  resolvedPath: string;
  contentHash: string;
  versionMarker: string;
  allowedMutationScope: string[];
  fallbackMode: SkillFallbackMode;
  checkedAt: string;
};

type SharedSkillCompatRule = {
  skillName: string;
  allowedMutationScope: string[];
  fallbackMode: SkillFallbackMode;
};

const COMPAT_RULES: SharedSkillCompatRule[] = [
  {
    skillName: "protocol-structured-json-and-png-gate",
    allowedMutationScope: [
      ".codex/automations/**",
      ".codex/skills/**",
      "scripts/codex/**",
      "reports/automations/**",
      "AGENTS.md",
      "README.md",
      "RUNBOOK.md"
    ],
    fallbackMode: "fail-closed"
  },
  {
    skillName: "architecture-guardrails",
    allowedMutationScope: ["shared/**", "server/**", "src/**", "scripts/codex/**"],
    fallbackMode: "manual-review"
  },
  {
    skillName: "qa-self-review",
    allowedMutationScope: ["review-only"],
    fallbackMode: "manual-review"
  },
  {
    skillName: "multi-lens-review",
    allowedMutationScope: ["review-only"],
    fallbackMode: "manual-review"
  },
  {
    skillName: "release-readiness",
    allowedMutationScope: ["review-only", "release-gating"],
    fallbackMode: "manual-review"
  },
  {
    skillName: "bank-grade-review",
    allowedMutationScope: ["review-only"],
    fallbackMode: "repo-local-override-required"
  },
  {
    skillName: "plugin-surface-governance",
    allowedMutationScope: ["plugins/**", ".agents/plugins/**", ".cursor/mcp.json", "scripts/codex/**"],
    fallbackMode: "manual-review"
  },
  {
    skillName: "repo-hygiene-and-structure",
    allowedMutationScope: [".codex/**", "scripts/codex/**", "README.md", "AGENTS.md", "RUNBOOK.md"],
    fallbackMode: "manual-review"
  }
] as const;

async function resolveSkillPath(repoRoot: string, skillName: string): Promise<string | null> {
  const repoLocal = path.join(repoRoot, ".codex", "skills", skillName, "SKILL.md");
  if (await exists(repoLocal)) return repoLocal;

  const globalSkill = path.join("/Users/user/.codex/skills", skillName, "SKILL.md");
  if (await exists(globalSkill)) return globalSkill;

  const systemSkill = path.join("/Users/user/.codex/skills/.system", skillName, "SKILL.md");
  if (await exists(systemSkill)) return systemSkill;

  return null;
}

export async function resolveSharedSkillCompatSnapshot(
  repoRoot: string
): Promise<SharedSkillCompatSnapshot[]> {
  const snapshots: SharedSkillCompatSnapshot[] = [];

  for (const rule of COMPAT_RULES) {
    const resolvedPath = await resolveSkillPath(repoRoot, rule.skillName);
    if (!resolvedPath) {
      throw new Error(`shared skill compat unresolved: ${rule.skillName}`);
    }

    const [content, metadata] = await Promise.all([
      readFile(resolvedPath, "utf8"),
      stat(resolvedPath)
    ]);
    const contentHash = hashValue(content);

    snapshots.push({
      skillName: rule.skillName,
      resolvedPath,
      contentHash,
      versionMarker: hashValue({
        skillName: rule.skillName,
        contentHash,
        allowedMutationScope: rule.allowedMutationScope,
        fallbackMode: rule.fallbackMode
      }),
      allowedMutationScope: rule.allowedMutationScope,
      fallbackMode: rule.fallbackMode,
      checkedAt: metadata.mtime.toISOString()
    });
  }

  return sortBy(snapshots, (snapshot) => snapshot.skillName);
}
