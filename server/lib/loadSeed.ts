import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

const SEED_ROOT = path.resolve(process.cwd(), "data");

export async function loadSeed<Schema extends ZodTypeAny>(
  relativePath: string,
  schema: Schema
): Promise<ZodInfer<Schema>> {
  const filePath = path.resolve(SEED_ROOT, relativePath);
  const raw = await readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Некорректный JSON в ${filePath}: ${(error as Error).message}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Данные ${filePath} не прошли проверку схемы: ${result.error.message}`
    );
  }
  return result.data;
}
