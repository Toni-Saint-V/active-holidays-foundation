import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  name: string;
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function envKey(name: string, suffix: "MAX" | "WINDOW_MS"): string {
  return `ACTIVE_HOLIDAYS_RATE_LIMIT_${name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${suffix}`;
}

function readPositiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function clientKey(req: Request): string {
  const forwardedFor = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.ip || req.socket.remoteAddress || "unknown";
}

export function resetRateLimitBucketsForTests(): void {
  buckets.clear();
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.ACTIVE_HOLIDAYS_RATE_LIMIT_DISABLED === "true") {
      next();
      return;
    }

    const max = readPositiveInteger(process.env[envKey(options.name, "MAX")]) ?? options.max;
    const windowMs =
      readPositiveInteger(process.env[envKey(options.name, "WINDOW_MS")]) ?? options.windowMs;
    const now = Date.now();
    const key = `${options.name}:${clientKey(req)}`;
    const current = buckets.get(key);
    const bucket: Bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "rate_limited",
        message: "Слишком много запросов. Повторите позже."
      });
      return;
    }

    next();
  };
}

export const recommendationRateLimit = rateLimit({
  name: "recommendations",
  max: 30,
  windowMs: 60_000
});

export const expensiveApiRateLimit = rateLimit({
  name: "expensive",
  max: 60,
  windowMs: 60_000
});

export const internalExpensiveRateLimit = rateLimit({
  name: "internal_expensive",
  max: 30,
  windowMs: 60_000
});
