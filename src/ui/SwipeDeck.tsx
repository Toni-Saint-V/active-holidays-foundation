import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Offer } from "@shared/contracts";
import { OfferCard } from "./OfferCard";
import { Button, Chip } from "./primitives";
import { track } from "@/instrumentation/events";

type Decision = {
  pathId: string;
  weight: number;
  reason?: string;
};

type DismissReason = { id: string; label: string; weight: number };

type Props = {
  offers: Offer[];
  onShortlist: (offerId: string) => void;
  onDismiss: (offerId: string, reason?: string) => void;
  onPreferencesChange: (decisions: Decision[]) => void;
  dismissReasons?: DismissReason[];
};

const defaultReasons: DismissReason[] = [
  { id: "too_expensive", label: "Дорого", weight: -0.4 },
  { id: "doesnt_fit", label: "Не подходит", weight: -0.5 }
];

export function SwipeDeck({
  offers,
  onShortlist,
  onDismiss,
  onPreferencesChange,
  dismissReasons = defaultReasons
}: Props) {
  const [stack, setStack] = useState<Offer[]>(offers);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pendingReasonFor, setPendingReasonFor] = useState<string | null>(null);

  if (stack.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 p-4 text-sm text-textSecondary">
        Все альтернативы рассмотрены. Вернитесь к основному варианту, если решили его закрепить.
      </div>
    );
  }

  const handleShortlist = () => {
    const top = stack[0];
    if (!top) return;
    const nextDecisions: Decision[] = [...decisions.filter((d) => d.pathId !== top.id), { pathId: top.id, weight: 0.6 }];
    setDecisions(nextDecisions);
    setStack((current) => current.slice(1));
    onPreferencesChange(nextDecisions);
    onShortlist(top.id);
    track({ type: "path_switch", pathId: top.id });
  };

  const handleDismiss = (reason?: DismissReason) => {
    const top = stack[0];
    if (!top) return;
    if (dismissReasons.length > 0 && !reason) {
      setPendingReasonFor(top.id);
      return;
    }
    const weight = reason?.weight ?? -0.4;
    const nextDecisions: Decision[] = [
      ...decisions.filter((d) => d.pathId !== top.id),
      { pathId: top.id, weight, reason: reason?.id }
    ];
    setDecisions(nextDecisions);
    setStack((current) => current.slice(1));
    setPendingReasonFor(null);
    onPreferencesChange(nextDecisions);
    onDismiss(top.id, reason?.label);
    track({ type: "path_switch", pathId: top.id });
  };

  return (
    <div className="grid gap-3">
      <div className="relative h-[360px] w-full">
        <AnimatePresence>
          {stack.slice(0, 3).map((offer, index) => (
            <motion.div
              key={offer.id}
              className="absolute inset-0"
              style={{ zIndex: 10 - index }}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: index * 14, scale: 1 - index * 0.04 }}
              exit={{ opacity: 0, x: 240, rotate: 12, transition: { duration: 0.3 } }}
              drag={index === 0 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 120) handleShortlist();
                else if (info.offset.x < -120) handleDismiss();
              }}
            >
              <OfferCard offer={offer} showBoosts compact />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {pendingReasonFor ? (
        <div className="grid gap-2 rounded-2xl border border-border bg-surface-2 p-3">
          <p className="text-sm text-textSecondary">Почему отклоняете?</p>
          <div className="flex flex-wrap gap-2">
            {dismissReasons.map((reason) => (
              <Chip key={reason.id} onClick={() => handleDismiss(reason)}>
                {reason.label}
              </Chip>
            ))}
            <Chip onClick={() => setPendingReasonFor(null)}>Отмена</Chip>
          </div>
        </div>
      ) : (
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => handleDismiss()}>Отклонить</Button>
          <Button variant="primary" onClick={handleShortlist}>В шорт-лист</Button>
        </div>
      )}

      {decisions.length > 0 && (
        <p className="text-xs text-textMuted">
          Предпочтения: {decisions.map((d) => `${d.pathId} (${d.weight >= 0 ? "+" : ""}${d.weight.toFixed(1)})`).join(", ")}
        </p>
      )}
    </div>
  );
}

export const insuranceDismissReasons: DismissReason[] = [
  { id: "too_expensive", label: "Дорого", weight: -0.5 },
  { id: "low_coverage", label: "Мало покрытия", weight: -0.5 },
  { id: "age_mismatch", label: "Не по возрасту", weight: -0.6 },
  { id: "not_accepted", label: "Не принимает консульство", weight: -0.7 }
];

export const residencyDismissReasons: DismissReason[] = [
  { id: "income_gap", label: "Не прохожу по доходу", weight: -0.6 },
  { id: "too_slow", label: "Слишком долго", weight: -0.4 },
  { id: "too_expensive", label: "Дорого", weight: -0.4 },
  { id: "closed", label: "Программа недоступна", weight: -0.7 }
];
