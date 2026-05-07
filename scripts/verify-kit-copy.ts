import {
  collectFiles,
  printViolations,
  readSource,
  relativeFile,
  type KitViolation
} from "./verify-kit-utils";

const COPY_SCAN_DIRS = ["src/presentation", "src/screens", "src/components", "src/ui"] as const;
const UNSAFE_COPY_PATTERNS: Array<{ rule: string; pattern: RegExp; detail: string }> = [
  {
    rule: "copy-visa-guarantee",
    pattern: /(?:гарантированн(?:о|ая|ый)|гарантия)\s+(?:получения\s+)?(?:визы|одобрения|результата)/i,
    detail: "UI copy must not imply guaranteed visa, approval, or travel outcome."
  },
  {
    rule: "copy-certain-approval",
    pattern: /(?:100%|точно)\s+(?:получите|одобрят|пройд[её]те)/i,
    detail: "UI copy must not promise certain approval or success."
  },
  {
    rule: "copy-ai-decides",
    pattern: /(?:AI|ИИ|искусственный интеллект)\s+(?:решит|гарантирует|одобрит)/i,
    detail: "AI copy must not claim the AI decides, guarantees, or approves outcomes."
  },
  {
    rule: "copy-visa-approved",
    pattern: /виза\s+(?:одобрена|гарантирована)/i,
    detail: "UI copy must not present visa approval as certain."
  }
];

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

export function verifyKitCopy(root = process.cwd()): KitViolation[] {
  const violations: KitViolation[] = [];
  const files = collectFiles(root, COPY_SCAN_DIRS, [".ts", ".tsx"]);

  for (const file of files) {
    const relative = relativeFile(root, file);
    const source = readSource(file);

    for (const check of UNSAFE_COPY_PATTERNS) {
      const match = check.pattern.exec(source);
      if (!match) continue;

      violations.push({
        file: `${relative}:${lineNumber(source, match.index)}`,
        rule: check.rule,
        detail: check.detail
      });
    }
  }

  return violations;
}

function main(): void {
  printViolations("kit:copy", verifyKitCopy());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
