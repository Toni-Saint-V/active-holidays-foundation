import fs from "node:fs";
import path from "node:path";

const TEMPLATE_PATH = path.resolve("docs/task-brief-template.md");
const OUTPUT_PATH = path.resolve("tmp/task-brief.md");

function usage(): never {
  console.error('Usage: npm run task:brief -- "short task description"');
  process.exit(1);
}

function hasAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input));
}

function buildLikelyDocs(task: string): string[] {
  const docs = new Set<string>([
    "- `AI_ROUTER.md`",
    "- `AGENTS.md`",
    "- `.codex/skills/index.md`",
  ]);

  if (hasAny(task, [/ui/i, /screen/i, /layout/i, /spacing/i, /cta/i, /copy/i, /landing/i])) {
    docs.add("- `.codex/skills/_shared/active-holidays/premium-ui-playbook.md`");
    docs.add("- `.codex/skills/situations.md`");
  }

  if (hasAny(task, [/result/i, /trust/i, /recommend/i, /scenario/i, /human\s*review/i, /documents?/i])) {
    docs.add("- `docs/product-canon-v1.md`");
    docs.add("- `.codex/skills/_shared/active-holidays/trust-and-ai-boundaries.md`");
  }

  if (hasAny(task, [/api/i, /contract/i, /schema/i, /dto/i, /backend/i, /server/i])) {
    docs.add("- `.codex/skills/_shared/active-holidays/architecture-map.md`");
    docs.add("- `shared/contracts/*` (touched contracts only)");
  }

  if (hasAny(task, [/router/i, /skill/i, /automation/i, /codex/i, /agent/i])) {
    docs.add("- `.codex/skills/modes.md`");
    docs.add("- `.codex/skills/bundles.md`");
  }

  return Array.from(docs);
}

function buildValidation(task: string): string[] {
  const checks = ["- Run the smallest relevant checks only."];

  if (hasAny(task, [/router/i, /skill/i, /automation/i, /codex/i, /agent/i])) {
    checks.push("- `npm run skills:verify`");
    checks.push("- `npm run automations:check:skills` (if touched surface is skills/router docs)");
    return checks;
  }

  checks.push("- `npm run typecheck`");

  if (hasAny(task, [/test/i, /api/i, /contract/i, /backend/i, /server/i, /result/i, /trust/i])) {
    checks.push("- `npm run test` (or targeted tests for touched surface)");
  }

  return checks;
}

function main(): void {
  const task = process.argv.slice(2).join(" ").trim();
  if (!task) usage();

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const now = new Date().toISOString();

  const likelyDocs = buildLikelyDocs(task).join("\n");
  const validation = buildValidation(task).join("\n");

  const executionRules = [
    "- Start from `AI_ROUTER.md` as the main routing entrypoint.",
    "- Keep changes minimal and task-scoped; no unrelated refactors.",
    "- Do not invent APIs, endpoints, metrics, or hidden requirements.",
    "- If UI code is involved: PNG approval before UI edits.",
  ].join("\n");

  const outputFormat = [
    "- 1) what was done",
    "- 2) how it affects the product",
    "- 3) what user will see/feel",
    "- 4) what to do next",
  ].join("\n");

  const brief = template
    .replaceAll("{{TASK}}", task)
    .replaceAll("{{GENERATED_AT}}", now)
    .replaceAll("{{OBJECTIVE}}", `Deliver a safe, minimal implementation for: \`${task}\`.`)
    .replaceAll("{{LIKELY_RELEVANT_DOCS}}", likelyDocs)
    .replaceAll("{{EXECUTION_RULES}}", executionRules)
    .replaceAll("{{VALIDATION}}", validation)
    .replaceAll("{{OUTPUT_FORMAT}}", outputFormat);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${brief}\n`, "utf8");

  console.log(brief);
  console.error(`\nSaved: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main();
