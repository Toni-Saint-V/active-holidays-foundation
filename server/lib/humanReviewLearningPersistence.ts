import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import {
  humanReviewLearningEventsSchema,
  type HumanReviewLearningEvent
} from "@shared/contracts";

const DEFAULT_HUMAN_REVIEW_LEARNING_FILE = path.resolve(
  process.cwd(),
  "output/server-state/human-review-learning.json"
);

export function resolveHumanReviewLearningPersistencePath(): string {
  const configured = process.env.ACTIVE_HOLIDAYS_HUMAN_REVIEW_LEARNING_FILE?.trim();
  if (!configured) return DEFAULT_HUMAN_REVIEW_LEARNING_FILE;
  return path.resolve(configured);
}

export async function loadPersistedHumanReviewLearningEvents(
  filePath = resolveHumanReviewLearningPersistencePath()
): Promise<HumanReviewLearningEvent[]> {
  try {
    const raw = readFileSync(filePath, "utf8");
    return humanReviewLearningEventsSchema.parse(JSON.parse(raw));
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
          `[active-holidays] corrupted human review learning state was quarantined: ${quarantinedPath}`
        );
      } catch (quarantineError) {
        console.error(
          `[active-holidays] failed to quarantine corrupted human review learning state: ${
            quarantineError instanceof Error ? quarantineError.message : "unknown error"
          }`
        );
      }
      return [];
    }

    throw error;
  }
}

export function savePersistedHumanReviewLearningEvents(
  events: HumanReviewLearningEvent[],
  filePath = resolveHumanReviewLearningPersistencePath()
): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.tmp`;
  try {
    writeFileSync(tempFilePath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
    renameSync(tempFilePath, filePath);
  } catch (error) {
    rmSync(tempFilePath, { force: true });
    throw error;
  }
}
