import {
  collectFiles,
  printViolations,
  readSource,
  relativeFile,
  type KitViolation
} from "./verify-kit-utils";

const PROTECTED_PRIMITIVES = ["Button", "Card", "Badge", "Chip", "Skeleton"] as const;
const ALLOWED_DEFINITION_FILE = "src/ui/primitives.tsx";

function definitionRegex(name: string): RegExp {
  return new RegExp(
    `(?:export\\s+)?(?:const|let|var|function|class)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b`,
    "g"
  );
}

export function verifyKitPrimitives(root = process.cwd()): KitViolation[] {
  const violations: KitViolation[] = [];
  const files = collectFiles(root, ["src", "packages"], [".ts", ".tsx"]);
  const definitions = new Map<string, string[]>(
    PROTECTED_PRIMITIVES.map((name) => [name, []])
  );

  for (const file of files) {
    const relative = relativeFile(root, file);
    if (relative.endsWith(".test.ts") || relative.endsWith(".test.tsx")) continue;
    const source = readSource(file);

    for (const primitive of PROTECTED_PRIMITIVES) {
      if (definitionRegex(primitive).test(source)) {
        definitions.get(primitive)?.push(relative);
      }
    }
  }

  for (const [primitive, filesWithDefinition] of definitions) {
    const unexpected = filesWithDefinition.filter((file) => file !== ALLOWED_DEFINITION_FILE);
    if (unexpected.length > 0) {
      violations.push({
        file: unexpected.join(", "),
        rule: "duplicate-protected-primitive",
        detail: `${primitive} must stay owned by ${ALLOWED_DEFINITION_FILE}.`
      });
    }
  }

  return violations;
}

function main(): void {
  printViolations("kit:primitives", verifyKitPrimitives());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
