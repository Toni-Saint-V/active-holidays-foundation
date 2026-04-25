import { repoRoot, selectNextTask, writeNextTaskArtifacts } from "./runtime";

function main() {
  const shouldWrite = process.argv.includes("--write");
  const asJson = process.argv.includes("--json");
  const mode = process.argv.includes("--mode=planning") ? "planning" : "executor";
  const result = selectNextTask({ currentRepoRoot: repoRoot, mode });

  if (shouldWrite) {
    writeNextTaskArtifacts(result, repoRoot);
  }

  if (asJson || shouldWrite) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.founderReport);
  }
}

main();
