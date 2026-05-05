import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export type BoundaryViolation = {
  file: string;
  rule: string;
  detail: string;
};

const SOURCE_DIRS = ["src", "server", "shared"] as const;
const TS_FILE_RE = /\.(ts|tsx)$/;
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;

function isInside(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function collectFiles(root: string, dir: string): string[] {
  const absoluteDir = path.join(root, dir);
  const files: string[] = [];

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(root, path.relative(root, absolutePath)));
      continue;
    }
    if (entry.isFile() && TS_FILE_RE.test(entry.name) && !TEST_FILE_RE.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];

  const sourceFile = ts.createSourceFile(
    "boundary-check.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const pushStringLiteral = (node: ts.Node | undefined): void => {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.push(node.text);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      pushStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      pushStringLiteral(node.arguments[0]);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      pushStringLiteral(node.arguments[0]);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return specifiers;
}

function readsProcessEnv(source: string): boolean {
  const sourceFile = ts.createSourceFile(
    "boundary-check.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let found = false;

  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "env" &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "process"
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function resolvesInside(root: string, file: string, specifier: string, targetDir: string): boolean {
  if (!specifier.startsWith(".")) return false;
  const target = path.resolve(path.dirname(file), specifier);
  return isInside(target, path.join(root, targetDir));
}

export function verifyImportBoundaries(root = process.cwd()): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const existingDirs = SOURCE_DIRS.filter((dir) => {
    try {
      return statSync(path.join(root, dir)).isDirectory();
    } catch {
      return false;
    }
  });
  const files = existingDirs.flatMap((dir) => collectFiles(root, dir));

  for (const file of files) {
    const relativeFile = toPosix(path.relative(root, file));
    const source = readFileSync(file, "utf8");
    const inSrc = isInside(file, path.join(root, "src"));
    const inServerOrShared =
      isInside(file, path.join(root, "server")) || isInside(file, path.join(root, "shared"));

    if (inSrc && readsProcessEnv(source)) {
      violations.push({
        file: relativeFile,
        rule: "src-no-process-env",
        detail: "Browser-facing src code must not read process.env directly."
      });
    }

    for (const specifier of importSpecifiers(source)) {
      if (inSrc && specifier.startsWith("node:")) {
        violations.push({
          file: relativeFile,
          rule: "src-no-node-imports",
          detail: `Browser-facing src code imports Node module ${specifier}.`
        });
      }

      if (
        inSrc &&
        (specifier.startsWith("@shared/domain") ||
          resolvesInside(root, file, specifier, "shared/domain"))
      ) {
        violations.push({
          file: relativeFile,
          rule: "src-no-shared-domain",
          detail: `Browser-facing src code imports domain runtime ${specifier}.`
        });
      }

      if (
        inSrc &&
        (specifier === "server" ||
          specifier.startsWith("server/") ||
          resolvesInside(root, file, specifier, "server"))
      ) {
        violations.push({
          file: relativeFile,
          rule: "src-no-server-imports",
          detail: `Browser-facing src code imports server surface ${specifier}.`
        });
      }

      if (
        inServerOrShared &&
        (specifier === "src" ||
          specifier.startsWith("src/") ||
          specifier.startsWith("@/") ||
          resolvesInside(root, file, specifier, "src"))
      ) {
        violations.push({
          file: relativeFile,
          rule: "server-shared-no-src-imports",
          detail: `Server/shared code imports browser-facing src surface ${specifier}.`
        });
      }
    }
  }

  return violations;
}

function main(): void {
  const violations = verifyImportBoundaries();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `[boundary] ${violation.rule}: ${violation.file} - ${violation.detail}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("[OK] import boundaries verified");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
