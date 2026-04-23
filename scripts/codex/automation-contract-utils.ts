import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";

export async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, entryValue]) => entryValue !== undefined
    );
    entries.sort(([left], [right]) => compareStrings(left, right));
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function hashValue(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

export function sortBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  return items.slice().sort((left, right) => compareStrings(key(left), key(right)));
}

export async function readJsonFile<T>(target: string): Promise<T> {
  const raw = await readFile(target, "utf8");
  return JSON.parse(raw) as T;
}

export async function readOptionalJsonFile<T>(target: string): Promise<T | null> {
  if (!(await exists(target))) return null;
  return readJsonFile<T>(target);
}

export async function fileMtimeIso(target: string): Promise<string | null> {
  if (!(await exists(target))) return null;
  const metadata = await stat(target);
  return metadata.mtime.toISOString();
}

export function isIsoDateLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return !Number.isNaN(Date.parse(value));
}

export function parseIsoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeIso(value: string | null | undefined): string | null {
  const parsed = parseIsoToMs(value);
  if (parsed === null) return null;
  return new Date(parsed).toISOString();
}

export function latestIso(values: Array<string | null | undefined>): string | null {
  let latestMs: number | null = null;
  for (const value of values) {
    const parsed = parseIsoToMs(value);
    if (parsed === null) continue;
    if (latestMs === null || parsed > latestMs) latestMs = parsed;
  }
  return latestMs === null ? null : new Date(latestMs).toISOString();
}
