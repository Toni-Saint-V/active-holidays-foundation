import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import { humanReviewRequestsSchema, type HumanReviewRequest } from "@shared/contracts";

const DEFAULT_HUMAN_REVIEW_FILE = path.resolve(
  process.cwd(),
  "output/server-state/human-reviews.json"
);

export function resolveHumanReviewPersistencePath(): string {
  const configured = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEWS_FILE?.trim();
  if (!configured) return DEFAULT_HUMAN_REVIEW_FILE;
  return path.resolve(configured);
}

export async function loadPersistedHumanReviews(
  filePath = resolveHumanReviewPersistencePath()
): Promise<HumanReviewRequest[]> {
  try {
    const raw = readFileSync(filePath, "utf8");
    return humanReviewRequestsSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }

    if (error instanceof SyntaxError || error instanceof ZodError) {
      const quarantinedPath = `${filePath}.corrupt-${Date.now()}`;
      try {
        renameSync(filePath, quarantinedPath);
        console.error(
          `[active-holidays] corrupted human review state was quarantined: ${quarantinedPath}`
        );
      } catch (quarantineError) {
        console.error(
          `[active-holidays] failed to quarantine corrupted human review state: ${
            quarantineError instanceof Error ? quarantineError.message : "unknown error"
          }`
        );
      }
      return [];
    }

    throw error;
  }
}

export function savePersistedHumanReviews(
  requests: HumanReviewRequest[],
  filePath = resolveHumanReviewPersistencePath()
): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.tmp`;
  try {
    writeFileSync(tempFilePath, `${JSON.stringify(requests, null, 2)}\n`, "utf8");
    renameSync(tempFilePath, filePath);
  } catch (error) {
    rmSync(tempFilePath, { force: true });
    throw error;
  }
}
