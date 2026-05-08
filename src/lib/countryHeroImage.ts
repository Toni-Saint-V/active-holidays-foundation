import type { Case, ResultPayload } from "@shared/contracts";

const COUNTRY_HERO_IMAGES = {
  IT: "/photos/landmark-it.webp",
  ES: "/photos/landmark-es.webp",
  FR: "/photos/landmark-fr.webp",
  GR: "/photos/landmark-gr.webp"
} as const;

type SupportedCountryCode = keyof typeof COUNTRY_HERO_IMAGES;

function asIso2(value: unknown): string | null {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : null;
}

export function resolveResultDestinationCountry(
  result: ResultPayload,
  caseData: Case
): string | null {
  if (result.primaryPath?.productType === "travel") {
    const destination = asIso2(result.primaryPath.destination);
    if (destination) return destination;
  }

  const destinationSignal = caseData.signals.find((signal) => signal.id === "destination");
  return asIso2(destinationSignal?.value);
}

export function resolveCountryHeroImage(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_HERO_IMAGES[countryCode as SupportedCountryCode] ?? null;
}

