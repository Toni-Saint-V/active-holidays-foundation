import type { Offer, TravelOffer } from "@shared/contracts";
import { rankTravelOffers } from "../offers/travelRanker";
import { splitOffers } from "../offers";

export function rankPaths(...args: Parameters<typeof rankTravelOffers>): TravelOffer[] {
  return rankTravelOffers(...args);
}

export function splitRankedPaths(ranked: TravelOffer[]) {
  return splitOffers(ranked as unknown as Offer[]) as {
    primary: TravelOffer | null;
    alternatives: TravelOffer[];
  };
}

export { rankTravelOffers };
