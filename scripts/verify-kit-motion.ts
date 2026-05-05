import { readFileSync } from "node:fs";
import path from "node:path";
import { printViolations, type KitViolation } from "./verify-kit-utils";

const KEYFRAMES_RE = /@keyframes\s+([A-Za-z0-9_-]+)/g;
const ANIMATION_RE = /animation\s*:\s*([A-Za-z0-9_-]+)/g;
const REDUCED_MOTION_RE = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/m;

function readCss(root: string): string {
  return readFileSync(path.join(root, "src/styles/index.css"), "utf8");
}

function uniqueMatches(source: string, pattern: RegExp): Set<string> {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

export function verifyKitMotion(root = process.cwd()): KitViolation[] {
  const violations: KitViolation[] = [];
  const css = readCss(root);
  const keyframes = uniqueMatches(css, KEYFRAMES_RE);
  const animations = uniqueMatches(css, ANIMATION_RE);
  const reducedMotionBlock = css.match(REDUCED_MOTION_RE)?.[1] ?? "";

  for (const animation of animations) {
    if (animation === "none") continue;
    if (!keyframes.has(animation)) {
      violations.push({
        file: "src/styles/index.css",
        rule: "animation-without-keyframes",
        detail: `${animation} is used as animation but has no @keyframes definition.`
      });
    }
  }

  if (animations.size > 0 && !reducedMotionBlock.includes("animation: none")) {
    violations.push({
      file: "src/styles/index.css",
      rule: "missing-reduced-motion-animation-reset",
      detail: "CSS animations must be disabled under prefers-reduced-motion."
    });
  }

  for (const animation of animations) {
    if (animation === "none") continue;
    if (!reducedMotionBlock.includes(animation) && !reducedMotionBlock.includes("animation: none")) {
      violations.push({
        file: "src/styles/index.css",
        rule: "animation-not-covered-by-reduced-motion",
        detail: `${animation} must be covered by prefers-reduced-motion.`
      });
    }
  }

  return violations;
}

function main(): void {
  printViolations("kit:motion", verifyKitMotion());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
