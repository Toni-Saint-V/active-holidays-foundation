import {
  closeSync,
  fdatasyncSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

const autonomousOutputDirSegments = ["reports", "autonomous"] as const;
const autonomousWriteLockFileName = ".artifact-write.lock";

type ErrnoWithCode = NodeJS.ErrnoException & { code?: string };

export type AutonomousArtifactWrite = {
  fileName: string;
  content: string;
};

function getAutonomousOutputDir(currentRepoRoot: string): string {
  return path.join(currentRepoRoot, ...autonomousOutputDirSegments);
}

function isErrno(error: unknown, code: string): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as ErrnoWithCode).code === code
  );
}

function shouldSkipSyncError(error: unknown): boolean {
  return (
    isErrno(error, "EINVAL") ||
    isErrno(error, "ENOTSUP") ||
    isErrno(error, "ENOSYS") ||
    isErrno(error, "EISDIR")
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function syncFileDescriptor(fd: number): void {
  try {
    fdatasyncSync(fd);
  } catch (error) {
    if (!shouldSkipSyncError(error)) throw error;
  }
}

function syncDirectory(dirPath: string): void {
  let dirFd: number | null = null;
  try {
    dirFd = openSync(dirPath, "r");
    fsyncSync(dirFd);
  } catch (error) {
    if (!shouldSkipSyncError(error)) throw error;
  } finally {
    if (dirFd !== null) closeSync(dirFd);
  }
}

export function writeFileAtomic(targetPath: string, content: string): void {
  const targetDir = path.dirname(targetPath);
  mkdirSync(targetDir, { recursive: true });
  const tempPath = path.join(
    targetDir,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );

  let fd: number | null = null;
  try {
    fd = openSync(tempPath, "w", 0o600);
    writeFileSync(fd, content, "utf8");
    syncFileDescriptor(fd);
    closeSync(fd);
    fd = null;

    renameSync(tempPath, targetPath);
    syncDirectory(targetDir);
  } catch (error) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // best effort close before cleanup
      }
    }
    try {
      rmSync(tempPath, { force: true });
    } catch {
      // best effort cleanup
    }
    throw new Error(`Atomic write failed for ${targetPath}: ${formatError(error)}`);
  }
}

function acquireWriteLock(outputDir: string): () => void {
  mkdirSync(outputDir, { recursive: true });
  const lockPath = path.join(outputDir, autonomousWriteLockFileName);
  let fd: number | null = null;

  try {
    fd = openSync(lockPath, "wx", 0o600);
    writeFileSync(
      fd,
      `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`,
      "utf8"
    );
    syncFileDescriptor(fd);
    closeSync(fd);
    fd = null;
  } catch (error) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // best effort close
      }
    }

    if (isErrno(error, "EEXIST")) {
      const owner = (() => {
        try {
          return readFileSync(lockPath, "utf8").trim();
        } catch {
          return "";
        }
      })();
      const ownerSuffix = owner.length > 0 ? ` owner=${owner}` : "";
      throw new Error(
        `Autonomous artifact writes are locked by another writer: ${lockPath}${ownerSuffix}`
      );
    }

    throw new Error(`Failed to acquire autonomous artifact write lock at ${lockPath}: ${formatError(error)}`);
  }

  return () => {
    try {
      rmSync(lockPath, { force: true });
    } catch {
      // best effort release
    }
  };
}

export function writeAutonomousArtifacts(
  currentRepoRoot: string,
  writes: readonly AutonomousArtifactWrite[]
): void {
  const outputDir = getAutonomousOutputDir(currentRepoRoot);
  const releaseLock = acquireWriteLock(outputDir);

  try {
    for (const write of writes) {
      writeFileAtomic(path.join(outputDir, write.fileName), write.content);
    }
  } finally {
    releaseLock();
  }
}
