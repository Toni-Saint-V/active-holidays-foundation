import { execFileSync } from "node:child_process";
import {
  addExecutionBlocker,
  buildExecutionBrief,
  prepareExecutionPacket,
  repoRoot,
  runVerificationStack,
  writeExecutionArtifacts
} from "./runtime";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function main() {
  const shouldWrite = hasFlag("--write");
  const asJson = hasFlag("--json");
  const allowDirtyTracked = hasFlag("--allow-dirty-tracked");
  const allowNonBaseBranch = hasFlag("--allow-non-base-branch");
  const packet = prepareExecutionPacket({
    currentRepoRoot: repoRoot,
    write: shouldWrite,
    allowDirtyTracked,
    allowNonBaseBranch
  });

  if (packet.blocked) {
    writeExecutionArtifacts(packet, repoRoot);
    if (asJson) {
      console.log(JSON.stringify(packet, null, 2));
    } else {
      console.log(packet.executionBrief);
    }
    process.exitCode = 1;
    return;
  }

  if (shouldWrite && packet.branchName) {
    execFileSync("git", ["switch", "-c", packet.branchName], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    packet.verificationResults = runVerificationStack(packet.verificationCommands, repoRoot);
    const failedCheck = packet.verificationResults.find((result) => !result.ok);
    if (failedCheck) {
      addExecutionBlocker(packet, `Baseline verification failed: ${failedCheck.command}`);
    }
  }

  packet.executionBrief = buildExecutionBrief(packet);

  writeExecutionArtifacts(packet, repoRoot);

  if (asJson || shouldWrite) {
    console.log(JSON.stringify(packet, null, 2));
  } else {
    console.log(packet.executionBrief);
  }

  if (packet.blocked) {
    process.exitCode = 1;
  }
}

main();
