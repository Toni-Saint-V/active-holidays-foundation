import {
  buildAutonomousHealthSnapshot,
  repoRoot,
  writeHealthArtifacts
} from "./runtime";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function main() {
  const shouldWrite = hasFlag("--write");
  const asJson = hasFlag("--json");
  const snapshot = buildAutonomousHealthSnapshot({
    currentRepoRoot: repoRoot,
    allowDirtyTracked: hasFlag("--allow-dirty-tracked"),
    allowNonBaseBranch: hasFlag("--allow-non-base-branch")
  });

  if (shouldWrite) {
    writeHealthArtifacts(snapshot, repoRoot);
  }

  if (asJson || shouldWrite) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(
      [
        "# Autonomous Health",
        "",
        `- Status: ${snapshot.status}`,
        `- Notion auth: ${snapshot.notionAuth.status}`,
        `- GitHub Actions: ${snapshot.githubActions.status}`,
        `- Agent sync: ${snapshot.agentSync.status}`,
        `- Recommendations: ${snapshot.selfHealingRecommendations.length}`
      ].join("\n")
    );
  }

  if (snapshot.status === "blocked") {
    process.exitCode = 1;
  }
}

main();
