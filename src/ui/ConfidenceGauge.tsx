import { motion } from "framer-motion";
import type { ConfidenceBreakdown } from "@shared/contracts";
import { cn } from "./utils";
import { formatPercent } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  breakdown: ConfidenceBreakdown;
  accentColor?: string;
  onFactorClick?: (factorId: string) => void;
  selectedFactorId?: string | null;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConfidenceGauge({
  breakdown,
  accentColor = "#ffd60a",
  onFactorClick,
  selectedFactorId
}: Props) {
  const value = breakdown.value;
  const dash = Math.max(0, Math.min(1, value));
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="relative grid place-items-center">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70"
            cy="70"
            r={RADIUS}
            stroke={accentColor}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - dash)}
            transform="rotate(-90 70 70)"
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - dash) }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <AnimatedNumber
              value={value * 100}
              fractionDigits={0}
              suffix="%"
              className="block text-3xl font-semibold text-textPrimary"
            />
            <p className="mt-1 text-xs text-textSecondary">уверенность</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {breakdown.factors.map((factor) => {
          const positive = factor.value >= 0;
          const magnitude = Math.min(1, Math.abs(factor.value));
          const selected = selectedFactorId === factor.id;
          return (
            <button
              key={factor.id}
              type="button"
              onClick={onFactorClick ? () => onFactorClick(factor.id) : undefined}
              className={cn(
                "group rounded-xl border border-border bg-surface-2 p-3 text-left transition hover:border-borderStrong",
                selected && "border-accent/60 bg-accent/10"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-textPrimary">{factor.label}</p>
                <span className={positive ? "text-emerald-300" : "text-rose-300"}>
                  {positive ? "+" : "−"}
                  {formatPercent(magnitude)}
                </span>
              </div>
              <p className="mt-1 text-xs text-textSecondary">{factor.detail}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className={positive ? "h-full bg-emerald-400" : "h-full bg-rose-400"}
                  initial={{ width: 0 }}
                  animate={{ width: `${magnitude * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              {selected && factor.children.length > 0 && (
                <ul className="mt-3 grid gap-1.5 text-xs text-textSecondary">
                  {factor.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-2">
                      <span>{child.label}</span>
                      <span
                        className={cn(
                          "tabular-nums",
                          child.value >= 0 ? "text-emerald-300" : "text-rose-300"
                        )}
                      >
                        {child.value >= 0 ? "+" : ""}
                        {Math.round(child.value * 100) / 100}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
        {breakdown.capsApplied.length > 0 && (
          <p className="mt-1 text-xs text-textMuted">
            Применены пределы: {breakdown.capsApplied.join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}
