import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { verifyKitContracts } from "./verify-kit-contracts";
import { verifyKitCopy } from "./verify-kit-copy";
import { verifyKitMotion } from "./verify-kit-motion";
import { verifyKitPrimitives } from "./verify-kit-primitives";
import { verifyKitTokens } from "./verify-kit-tokens";

function fixtureRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "ah-kit-verify-"));
}

function write(root: string, file: string, source: string): void {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, source, "utf8");
}

function writeMinimumTokenSurface(root: string): void {
  write(
    root,
    "src/styles/index.css",
    `:root {
      --color-base: #000;
    }
    .pulse { animation: pulse 1s infinite; }
    @keyframes pulse { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .pulse { animation: none !important; } }
    `
  );
  write(
    root,
    "tailwind.config.ts",
    `export default { theme: { extend: { colors: { base: "var(--color-base)" } } } };`
  );
  write(
    root,
    "src/theme/tokens.ts",
    `export const verdictTone = {
      GO: {}, GO_WITH_CONDITIONS: {}, NOT_NOW: {}, HUMAN_REVIEW: {}
    };
    export const severityTone = { critical: {}, high: {}, medium: {}, low: {} };
    export const sourceTierTone = { official: {}, operator: {}, crowdsourced: {} };`
  );
}

describe("verify kit guardrails", () => {
  it("fails when Tailwind points to a missing CSS variable", () => {
    const root = fixtureRoot();
    writeMinimumTokenSurface(root);
    write(
      root,
      "tailwind.config.ts",
      `export default { theme: { extend: { colors: { base: "var(--color-missing)" } } } };`
    );

    expect(verifyKitTokens(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "tailwind-color-missing-css-variable" })
      ])
    );
  });

  it("fails when a protected primitive is redefined outside primitives.tsx", () => {
    const root = fixtureRoot();
    write(root, "src/ui/primitives.tsx", "export function Button() { return null; }");
    write(root, "src/components/NewButton.tsx", "const Button = () => null; export { Button };");

    expect(verifyKitPrimitives(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "duplicate-protected-primitive" })
      ])
    );
  });

  it("fails on forbidden decision models and unknown verdict literals", () => {
    const root = fixtureRoot();
    write(
      root,
      "src/presentation/bad.ts",
      `type DecisionResult = { verdict: "AUTO_APPROVED" };`
    );

    const violations = verifyKitContracts(root);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "forbidden-decision-result-model" }),
        expect.objectContaining({ rule: "unknown-verdict-state" })
      ])
    );
  });

  it("fails on unsafe visa certainty copy", () => {
    const root = fixtureRoot();
    write(root, "src/presentation/copy.ts", `export const text = "Гарантия получения визы";`);

    expect(verifyKitCopy(root)).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: "copy-visa-guarantee" })])
    );
  });

  it("fails when CSS animation lacks reduced-motion reset", () => {
    const root = fixtureRoot();
    write(
      root,
      "src/styles/index.css",
      `.pulse { animation: pulse 1s infinite; }
      @keyframes pulse { from { opacity: 0; } to { opacity: 1; } }`
    );

    expect(verifyKitMotion(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "missing-reduced-motion-animation-reset" })
      ])
    );
  });
});
