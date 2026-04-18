import { motion } from "framer-motion";
import type { IntakePreview } from "@shared/contracts";
import { verdictTone } from "@/theme/tokens";
import { Badge } from "./primitives";
import { formatPercent } from "@/lib/format";

export function MiniVerdictPreview({ preview }: { preview: IntakePreview }) {
  const tone = verdictTone[preview.tentativeVerdict];
  return (
    <motion.div
      key={preview.tentativeVerdict + preview.resolvedSignalCount}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border border-border ${tone.surface} p-4`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-textMuted">
            Живой предпросмотр
          </p>
          <p className={`mt-1 text-lg font-semibold ${tone.text}`}>{tone.label}</p>
        </div>
        <Badge tone={preview.tentativeVerdict === "GO" ? "positive" : preview.tentativeVerdict === "NOT_NOW" ? "negative" : preview.tentativeVerdict === "HUMAN_REVIEW" ? "review" : "warning"}>
          {formatPercent(preview.tentativeConfidence)}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-textSecondary">
        Обязательных сигналов: {Math.min(preview.resolvedSignalCount, preview.requiredMandatoryCount)} из {preview.requiredMandatoryCount}
        {preview.hasBlockingRule && " · есть блокер"}
        {preview.hasHumanReviewTrigger && " · есть триггер ручной проверки"}
      </p>
      {preview.capsApplied.length > 0 && (
        <p className="mt-1 text-[11px] text-textMuted">
          Применены пределы уверенности: {preview.capsApplied.join(", ")}.
        </p>
      )}
    </motion.div>
  );
}
