import { z } from "zod";
import { travelOfferSchema, type TravelOffer } from "./paths";
import { residencyOfferSchema, type ResidencyOffer } from "./residency";
import { insuranceOfferSchema, type InsuranceOffer } from "./insurance";

export const offerSchema = z.discriminatedUnion("productType", [
  travelOfferSchema,
  residencyOfferSchema,
  insuranceOfferSchema
]);
export type Offer = TravelOffer | ResidencyOffer | InsuranceOffer;

export const offersSchema = z.array(offerSchema);
export type Offers = Offer[];

export function isTravelOffer(offer: Offer): offer is TravelOffer {
  return offer.productType === "travel";
}

export function isResidencyOffer(offer: Offer): offer is ResidencyOffer {
  return offer.productType === "residency_es";
}

export function isInsuranceOffer(offer: Offer): offer is InsuranceOffer {
  return offer.productType === "insurance_adult";
}
