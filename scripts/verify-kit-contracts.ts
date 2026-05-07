import { verdictSchema } from "../shared/contracts/verdict";
import {
  collectFiles,
  printViolations,
  readSource,
  relativeFile,
  type KitViolation
} from "./verify-kit-utils";

const FORBIDDEN_MODEL_RE = /\b(?:type|interface|class|const)\s+DecisionResult\b/;
const VERDICT_LITERAL_RE = /["']([A-Z][A-Z_]+)["']/g;
const CONTRACT_SCAN_DIRS = ["src", "server", "shared", "packages"] as const;
const ALLOWED_VERDICTS = new Set<string>(verdictSchema.options);

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

export function verifyKitContracts(root = process.cwd()): KitViolation[] {
  const violations: KitViolation[] = [];
  const files = collectFiles(root, CONTRACT_SCAN_DIRS, [".ts", ".tsx"]);

  for (const file of files) {
    const relative = relativeFile(root, file);
    const source = readSource(file);

    if (FORBIDDEN_MODEL_RE.test(source)) {
      violations.push({
        file: relative,
        rule: "forbidden-decision-result-model",
        detail: "DecisionResult must not be introduced as a UI-owned or package-local model."
      });
    }

    for (const match of source.matchAll(VERDICT_LITERAL_RE)) {
      const literal = match[1];
      if (!literal.includes("_") && literal !== "GO") continue;
      if (ALLOWED_VERDICTS.has(literal)) continue;

      const line = source.split("\n")[lineNumber(source, match.index ?? 0) - 1] ?? "";
      if (!line.toLowerCase().includes("verdict")) continue;

      violations.push({
        file: `${relative}:${lineNumber(source, match.index ?? 0)}`,
        rule: "unknown-verdict-state",
        detail: `${literal} is not part of shared verdictSchema.`
      });
    }

    if (
      (relative.startsWith("src/") || relative.startsWith("packages/")) &&
      /from\s+["'](?:\.\.\/)*server(?:\/|["'])/.test(source)
    ) {
      violations.push({
        file: relative,
        rule: "kit-or-ui-imports-server",
        detail: "Browser-facing or future kit code must not import server-only modules."
      });
    }
  }

  return violations;
}

function main(): void {
  printViolations("kit:contracts", verifyKitContracts());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
