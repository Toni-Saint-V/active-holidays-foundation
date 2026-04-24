import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { outputDir, repoRoot, selectNextTask } from "./runtime";

function main() {
  const shouldWrite = process.argv.includes("--write");
  const asJson = process.argv.includes("--json");
  const mode = process.argv.includes("--mode=planning") ? "planning" : "executor";
  const result = selectNextTask({ currentRepoRoot: repoRoot, mode });

  if (shouldWrite) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      path.join(outputDir, "next-best-task-latest.json"),
      `${JSON.stringify(result, null, 2)}\n`
    );
    writeFileSync(path.join(outputDir, "founder-report-latest.md"), `${result.founderReport}\n`);
  }

  if (asJson || shouldWrite) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.founderReport);
  }
}

main();
