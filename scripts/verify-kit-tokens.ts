import { readFileSync } from "node:fs";
import path from "node:path";
import { severityTone, sourceTierTone, verdictTone } from "../src/theme/tokens";
import { verdictSchema } from "../shared/contracts/verdict";
import { printViolations, type KitViolation } from "./verify-kit-utils";

const CSS_VARIABLE_RE = /--color-([a-z0-9-]+)\s*:/g;
const TAILWIND_COLOR_RE = /([A-Za-z0-9_]+)\s*:\s*"var\(--color-([a-z0-9-]+)\)"/g;
const EXPECTED_VERDICT_TONES = verdictSchema.options;
const EXPECTED_SEVERITY_TONES = ["critical", "high", "medium", "low"] as const;
const EXPECTED_SOURCE_TIER_TONES = ["official", "operator", "crowdsourced"] as const;

function read(root: string, file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

function extractCssVariables(css: string): Set<string> {
  const variables = new Set<string>();
  for (const match of css.matchAll(CSS_VARIABLE_RE)) {
    variables.add(match[1]);
  }
  return variables;
}

function extractTailwindColorVariables(config: string): Array<{
  token: string;
  cssVariable: string;
}> {
  return [...config.matchAll(TAILWIND_COLOR_RE)].map((match) => ({
    token: match[1],
    cssVariable: match[2]
  }));
}

export function verifyKitTokens(root = process.cwd()): KitViolation[] {
  const violations: KitViolation[] = [];
  const cssVariables = extractCssVariables(read(root, "src/styles/index.css"));
  const tailwindColors = extractTailwindColorVariables(read(root, "tailwind.config.ts"));

  for (const color of tailwindColors) {
    if (!cssVariables.has(color.cssVariable)) {
      violations.push({
        file: "tailwind.config.ts",
        rule: "tailwind-color-missing-css-variable",
        detail: `${color.token} points to missing --color-${color.cssVariable}.`
      });
    }
  }

  const verdictToneKeys = Object.keys(verdictTone).sort();
  const expectedVerdicts = [...EXPECTED_VERDICT_TONES].sort();
  if (verdictToneKeys.join(",") !== expectedVerdicts.join(",")) {
    violations.push({
      file: "src/theme/tokens.ts",
      rule: "verdict-tone-drift",
      detail: `Expected verdict tones ${expectedVerdicts.join(", ")} but found ${verdictToneKeys.join(", ")}.`
    });
  }

  for (const severity of EXPECTED_SEVERITY_TONES) {
    if (!(severity in severityTone)) {
      violations.push({
        file: "src/theme/tokens.ts",
        rule: "severity-tone-missing",
        detail: `Missing severity tone ${severity}.`
      });
    }
  }

  for (const tier of EXPECTED_SOURCE_TIER_TONES) {
    if (!(tier in sourceTierTone)) {
      violations.push({
        file: "src/theme/tokens.ts",
        rule: "source-tier-tone-missing",
        detail: `Missing source-tier tone ${tier}.`
      });
    }
  }

  return violations;
}

function main(): void {
  printViolations("kit:tokens", verifyKitTokens());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
