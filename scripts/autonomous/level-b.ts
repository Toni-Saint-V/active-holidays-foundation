import { repoRoot, runLevelBCycle } from "./runtime";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function main() {
  const shouldWrite = hasFlag("--write");
  const asJson = hasFlag("--json");
  const result = runLevelBCycle({
    currentRepoRoot: repoRoot,
    write: shouldWrite,
    allowDirtyTracked: hasFlag("--allow-dirty-tracked"),
    allowNonBaseBranch: hasFlag("--allow-non-base-branch")
  });

  if (asJson || shouldWrite) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.executionPacket.executionBrief);
  }

  if (result.status === "blocked") {
    process.exitCode = 1;
  }
}

main();
