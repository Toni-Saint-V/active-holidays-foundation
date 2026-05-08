import { motion } from "framer-motion";
import type { Risk } from "@shared/contracts";
import { pulseVariants } from "@/animations/variants";
import { severityTone } from "@/theme/tokens";

export function RiskPulse({ risk }: { risk: Risk }) {
  const tone = severityTone[risk.severity];
  return (
    <div className={`rounded-2xl border border-border ${tone.surface} p-4`}>
      <div className="flex items-start gap-3">
        <motion.span
          className={`mt-1 inline-flex h-3 w-3 shrink-0 rounded-full ${tone.dot}`}
          variants={pulseVariants(risk.pulseAmplitude)}
          initial="initial"
          animate="animate"
        />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${tone.text}`}>{risk.label}</p>
          <p className="mt-1 text-xs text-textSecondary">{risk.detail}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-textMuted">
            Сработало: {risk.triggeredBy.join(", ")} · {tone.label}
          </p>
        </div>
      </div>
    </div>
  );
}
