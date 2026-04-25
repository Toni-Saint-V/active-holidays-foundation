import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { computeGateEligibilitySnapshot } from "./automation-runtime-governance.ts";
import { REPO_RUNTIME_MANIFEST } from "./repo-runtime-manifest.ts";

async function hasRuntimeReportFiles(target: string): Promise<boolean> {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    for (const entry of entries) {
      const childPath = path.join(target, entry.name);
      if (entry.isFile()) return true;
      if (entry.isDirectory() && (await hasRuntimeReportFiles(childPath))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function main() {
  const repoRoot = process.cwd();
  const allowRuntimeReports = process.argv.includes("--allow-runtime-reports");
  const runtimeReportsRoot = path.join(repoRoot, REPO_RUNTIME_MANIFEST.runtimeReportsRoot);

  if (!allowRuntimeReports && (await hasRuntimeReportFiles(runtimeReportsRoot))) {
    throw new Error(
      `${REPO_RUNTIME_MANIFEST.runtimeReportsRoot} contains local runtime reports. ` +
        "Clean ignored report artifacts before writing the tracked gate snapshot, " +
        "or rerun with --allow-runtime-reports if this drift is intentional."
    );
  }

  const snapshot = await computeGateEligibilitySnapshot(repoRoot, {
    includeVolatileState: false
  });
  const snapshotPath = path.join(repoRoot, REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath);

  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`wrote ${REPO_RUNTIME_MANIFEST.gateEligibilitySnapshotPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
