import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

function compactIssues(error: ZodError) {
  return error.issues.slice(0, 5).map((issue) => ({
    path: issue.path.join("."),
    code: issue.code
  }));
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "Ресурс не найден." });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "validation_failed",
      message: "Запрос не прошёл проверку схемы.",
      issues: compactIssues(error)
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.code ?? "http_error",
      message: error.message
    });
    return;
  }
  const message = error instanceof Error ? error.message : "unknown";
  console.error(`[active-holidays] server_error: ${message}`);
  res.status(500).json({
    error: "server_error",
    message: "Неожиданная ошибка на сервере."
  });
}
