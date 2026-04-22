import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler";

const INTERNAL_API_TOKEN_HEADER = "x-active-holidays-internal-token";

function readConfiguredInternalApiToken(): string | null {
  const token = process.env.ACTIVE_HOLIDAYS_INTERNAL_API_TOKEN?.trim();
  return token ? token : null;
}

function safeTokenMatches(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireInternalApiToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const configuredToken = readConfiguredInternalApiToken();
  if (!configuredToken) {
    next(
      new HttpError(
        503,
        "Внутренний контур переходов ручной проверки не настроен.",
        "internal_api_unconfigured"
      )
    );
    return;
  }

  const rawHeader = req.header(INTERNAL_API_TOKEN_HEADER);
  const providedToken = rawHeader?.trim();
  if (!providedToken || !safeTokenMatches(providedToken, configuredToken)) {
    next(
      new HttpError(
        403,
        "Недостаточно прав для внутреннего перехода ручной проверки.",
        "internal_api_forbidden"
      )
    );
    return;
  }

  next();
}
