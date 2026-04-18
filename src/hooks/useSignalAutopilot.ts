import { useCallback } from "react";
import type { CaseSignals } from "@shared/contracts";

function resolveLocaleCountry(): string | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages ?? [navigator.language];
  for (const entry of candidates) {
    const parts = entry.split("-");
    if (parts[1]) return parts[1].toUpperCase();
  }
  return null;
}

function resolveTimeZone(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

const supportedCitizenship = new Set(["RU", "TR", "US", "RS", "AE", "GE", "AM", "BY"]);

export function useSignalAutopilot() {
  return useCallback((): CaseSignals => {
    const nowIso = new Date().toISOString();
    const citizenship = resolveLocaleCountry();
    const timezone = resolveTimeZone();
    const autopilot: CaseSignals = [];
    if (citizenship && supportedCitizenship.has(citizenship)) {
      autopilot.push({
        id: "citizenship",
        value: citizenship,
        source: "autopilot",
        capturedAt: nowIso
      });
    }
    if (timezone?.startsWith("Europe/")) {
      autopilot.push({
        id: "destination",
        value: timezone === "Europe/Moscow" ? "RU" : "IT",
        source: "autopilot",
        capturedAt: nowIso
      });
    }
    return autopilot;
  }, []);
}
