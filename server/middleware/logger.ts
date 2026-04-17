import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const line = `[active-holidays] ${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`;
    if (res.statusCode >= 500) console.error(line);
    else console.log(line);
  });
  next();
}
