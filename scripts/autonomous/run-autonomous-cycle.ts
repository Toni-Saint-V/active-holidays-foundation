import { repoRoot, runAutonomousCycle } from "./runtime";

function main() {
  const asJson = process.argv.includes("--json");
  const skipVerify = process.argv.includes("--skip-verify");
  const result = runAutonomousCycle({
    currentRepoRoot: repoRoot,
    verify: !skipVerify
  });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.executionPacket.executionBrief);
  }

  if (result.blocked) {
    process.exitCode = 1;
  }
}

main();
