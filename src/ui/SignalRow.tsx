import { Check, Minus } from "lucide-react";
import type { DecisionSignal } from "@shared/contracts";
import { cn } from "./utils";

type Props = {
  signal: DecisionSignal;
  onClick?: (signal: DecisionSignal) => void;
  selected?: boolean;
};

export function SignalRow({ signal, onClick, selected }: Props) {
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(signal) : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-3 text-left transition",
        onClick && "hover:border-borderStrong",
        selected && "border-accent/60 bg-accent/10"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            signal.present ? "bg-emerald-500/15 text-emerald-300" : "bg-surface-3 text-textSecondary"
          )}
        >
          {signal.present ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-sm text-textPrimary">{signal.label}</p>
          <p className="text-xs text-textSecondary">{signal.displayValue}</p>
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-1 text-[11px] uppercase tracking-wide",
          signal.importance >= 0.8
            ? "bg-amber-500/20 text-amber-100"
            : "bg-surface-3 text-textMuted"
        )}
      >
        {signal.importance >= 0.8 ? "ключевой" : signal.present ? "учтён" : "пусто"}
      </span>
    </button>
  );
}
