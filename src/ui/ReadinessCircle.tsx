import { motion } from "framer-motion";
import type { DocumentsReadiness } from "@shared/contracts";
import { AnimatedNumber } from "./AnimatedNumber";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadinessCircle({ readiness }: { readiness: DocumentsReadiness }) {
  const dash = Math.max(0, Math.min(1, readiness.score));
  return (
    <div className="flex items-center gap-5">
      <div className="relative grid place-items-center">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70"
            cy="70"
            r={RADIUS}
            stroke={dash >= 0.8 ? "#34d399" : dash >= 0.4 ? "#fbbf24" : "#f97066"}
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
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <AnimatedNumber
              value={readiness.score * 100}
              suffix="%"
              className="block text-3xl font-semibold text-textPrimary"
            />
            <p className="mt-1 text-xs text-textSecondary">готовность</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm text-textPrimary">
          Готово {readiness.readyCount} из {readiness.requiredCount} документов.
        </p>
        <p className="mt-1 text-xs text-textSecondary">
          Доберите недостающие документы, чтобы закрыть трек без риска отказа.
        </p>
      </div>
    </div>
  );
}
