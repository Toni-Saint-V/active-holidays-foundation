import { useMemo } from "react";
import type { ProductType } from "@shared/contracts";

type Suggestion = {
  suggestion: ProductType;
  reason: string | null;
};

function detectTimeZoneRegion(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function detectLocaleCountry(): string | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages ?? [navigator.language];
  for (const entry of candidates) {
    const parts = entry.split("-");
    if (parts[1]) return parts[1].toUpperCase();
  }
  return null;
}

export function useProductAutopilot(): Suggestion {
  return useMemo(() => {
    const tz = detectTimeZoneRegion();
    if (tz && tz.startsWith("Europe/Madrid")) {
      return { suggestion: "residency_es", reason: "часовой пояс Europe/Madrid" };
    }
    if (tz && tz.startsWith("Europe/Rome")) {
      return { suggestion: "insurance_adult", reason: "часовой пояс Europe/Rome" };
    }
    const country = detectLocaleCountry();
    if (country === "ES") {
      return { suggestion: "residency_es", reason: "локаль ES" };
    }
    if (country === "IT" || country === "DE" || country === "FR") {
      return { suggestion: "insurance_adult", reason: `локаль ${country}` };
    }
    return { suggestion: "travel", reason: null };
  }, []);
}
