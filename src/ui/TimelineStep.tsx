import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  index: number;
  title: string;
  detail?: string;
  tookMs?: number;
  active?: boolean;
  children?: ReactNode;
};

export function TimelineStep({ index, title, detail, tookMs, active, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex gap-3"
    >
      <div className="relative flex flex-col items-center">
        <span
          className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
            active ? "border-accent bg-accent text-black" : "border-border bg-surface-2 text-textSecondary"
          }`}
        >
          {index + 1}
        </span>
        <span className="mt-1 h-full w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm font-medium text-textPrimary">{title}</p>
        {detail && <p className="mt-1 text-xs text-textSecondary">{detail}</p>}
        {typeof tookMs === "number" && (
          <p className="mt-1 text-[11px] uppercase tracking-wide text-textMuted">
            {tookMs.toFixed(1)} мс
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}
