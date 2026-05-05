import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  classifyM1Route,
  m1AllowedPublicRoutes,
  type M1RouteClassification
} from "@shared/contracts/m1Scope";

export type M1ScopeAuditReport = {
  registeredRoutes: string[];
  visibleNavRoutes: string[];
  missingAllowedRoutes: string[];
  registeredNonM1Routes: string[];
  visibleNonM1Routes: string[];
  unknownRoutes: string[];
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function readSource(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function parseTsx(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function jsxAttributeValue(node: ts.JsxAttribute): string | null {
  if (!node.initializer) return null;
  if (ts.isStringLiteral(node.initializer)) return node.initializer.text;
  return null;
}

function openingElementName(node: ts.JsxOpeningLikeElement): string {
  const tagName = node.tagName;
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  return "";
}

function jsxAttributeName(node: ts.JsxAttribute): string {
  return ts.isIdentifier(node.name) ? node.name.text : "";
}

export function collectRoutePaths(source: string): string[] {
  const sourceFile = parseTsx(source, "router.tsx");
  const routes: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      openingElementName(node) === "Route"
    ) {
      let hasIndex = false;
      let routePath: string | null = null;

      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue;
        const name = jsxAttributeName(attribute);
        if (name === "index") hasIndex = true;
        if (name === "path") routePath = jsxAttributeValue(attribute);
      }

      if (hasIndex) routes.push("/");
      if (routePath && routePath !== "*") routes.push(routePath);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return uniqueSorted(routes);
}

export function collectNavItemPaths(source: string): string[] {
  const sourceFile = parseTsx(source, "AppShell.tsx");
  const paths: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "navItems" &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const item of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(item)) continue;
        for (const property of item.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name = property.name;
          if (!ts.isIdentifier(name) || name.text !== "to") continue;
          const initializer = property.initializer;
          if (ts.isStringLiteralLike(initializer)) {
            paths.push(initializer.text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return uniqueSorted(paths);
}

function nonM1Paths(paths: readonly string[]): string[] {
  return uniqueSorted(
    paths.filter((routePath) => classifyM1Route(routePath).kind !== "allowed_m1")
  );
}

function unknownPaths(paths: readonly string[]): string[] {
  return uniqueSorted(
    paths.filter((routePath) => classifyM1Route(routePath).kind === "unknown")
  );
}

export function auditM1Scope(options: {
  routerSource: string;
  appShellSource: string;
}): M1ScopeAuditReport {
  const registeredRoutes = collectRoutePaths(options.routerSource);
  const visibleNavRoutes = collectNavItemPaths(options.appShellSource);

  return {
    registeredRoutes,
    visibleNavRoutes,
    missingAllowedRoutes: m1AllowedPublicRoutes.filter(
      (routePath) => !registeredRoutes.includes(routePath)
    ),
    registeredNonM1Routes: nonM1Paths(registeredRoutes),
    visibleNonM1Routes: nonM1Paths(visibleNavRoutes),
    unknownRoutes: uniqueSorted([...unknownPaths(registeredRoutes), ...unknownPaths(visibleNavRoutes)])
  };
}

function describeClassification(routePath: string): string {
  const classification: M1RouteClassification = classifyM1Route(routePath);
  if (classification.kind === "allowed_m1") return "allowed M1 route";
  if (classification.kind === "known_non_m1") {
    return `${classification.route.reason}: ${classification.route.label}`;
  }
  return "unknown route, needs explicit M1 classification";
}

function printList(title: string, values: readonly string[]): void {
  console.log(`${title}:`);
  if (values.length === 0) {
    console.log("  - none");
    return;
  }
  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

function main(): void {
  const root = process.cwd();
  const report = auditM1Scope({
    routerSource: readSource(path.join(root, "src/app/router.tsx")),
    appShellSource: readSource(path.join(root, "src/app/AppShell.tsx"))
  });

  console.log("M1 scope audit (non-blocking)");
  printList("Allowed public M1 routes", m1AllowedPublicRoutes);
  printList("Registered routes", report.registeredRoutes);
  printList("Visible nav routes", report.visibleNavRoutes);
  printList("Missing allowed routes", report.missingAllowedRoutes);

  console.log("Registered non-M1 route exposure:");
  if (report.registeredNonM1Routes.length === 0) {
    console.log("  - none");
  } else {
    for (const routePath of report.registeredNonM1Routes) {
      console.log(`  - ${routePath} (${describeClassification(routePath)})`);
    }
  }

  console.log("Visible non-M1 nav exposure:");
  if (report.visibleNonM1Routes.length === 0) {
    console.log("  - none");
  } else {
    for (const routePath of report.visibleNonM1Routes) {
      console.log(`  - ${routePath} (${describeClassification(routePath)})`);
    }
  }

  printList("Unknown route classifications", report.unknownRoutes);
  console.log("Result: audit only; this command intentionally exits 0 until visible UI gating is approved.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
