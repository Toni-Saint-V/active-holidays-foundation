import { motion } from "framer-motion";
import { formatPercent } from "@/lib/format";

export function ProgressMeter({
  value,
  label,
  detail
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-textSecondary">
        <span>{label}</span>
        <span className="tabular-nums">{formatPercent(value)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {detail && <p className="mt-1 text-xs text-textMuted">{detail}</p>}
    </div>
  );
}
