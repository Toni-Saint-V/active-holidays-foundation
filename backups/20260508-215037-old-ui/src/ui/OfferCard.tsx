import type { Offer } from "@shared/contracts";
import { isTravelOffer, isResidencyOffer, isInsuranceOffer } from "@shared/contracts";
import { PathCard } from "./PathCard";
import { ProgramCard } from "./ProgramCard";
import { PolicyCard } from "./PolicyCard";

type Props = {
  offer: Offer;
  selected?: boolean;
  onSelect?: (offer: Offer) => void;
  compact?: boolean;
  showBoosts?: boolean;
};

export function OfferCard({ offer, selected, onSelect, compact, showBoosts }: Props) {
  if (isTravelOffer(offer)) {
    return (
      <PathCard
        path={offer}
        selected={selected}
        onSelect={onSelect ? () => onSelect(offer) : undefined}
        compact={compact}
        showBoosts={showBoosts}
      />
    );
  }
  if (isResidencyOffer(offer)) {
    return (
      <ProgramCard
        offer={offer}
        selected={selected}
        onSelect={onSelect ? () => onSelect(offer) : undefined}
        compact={compact}
        showBoosts={showBoosts}
      />
    );
  }
  if (isInsuranceOffer(offer)) {
    return (
      <PolicyCard
        offer={offer}
        selected={selected}
        onSelect={onSelect ? () => onSelect(offer) : undefined}
        compact={compact}
        showBoosts={showBoosts}
      />
    );
  }
  return null;
}
