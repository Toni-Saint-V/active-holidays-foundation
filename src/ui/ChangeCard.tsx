import type { DecisionLogEntry } from "@shared/contracts";
import { verdictTone } from "@/theme/tokens";
import { Card, Badge } from "./primitives";
import { formatDate, formatPercent } from "@/lib/format";

const kindLabels: Record<DecisionLogEntry["kind"], string> = {
  recompute: "Пересчёт",
  override: "Override",
  fork: "Форк",
  source_update: "Обновление источника"
};

export function ChangeCard({ entry }: { entry: DecisionLogEntry }) {
  const tone = verdictTone[entry.verdict];
  return (
    <Card padding="sm" className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={entry.verdict === "GO" ? "positive" : entry.verdict === "NOT_NOW" ? "negative" : entry.verdict === "HUMAN_REVIEW" ? "review" : "warning"}>
          {tone.label}
        </Badge>
        <span className="text-xs text-textMuted">{formatDate(entry.recordedAt)}</span>
      </div>
      <p className="text-sm text-textPrimary">{entry.summary}</p>
      <p className="text-xs text-textSecondary">
        {kindLabels[entry.kind]} · уверенность {formatPercent(entry.confidence)}
        {entry.changedSignalIds.length > 0 && ` · сигналы: ${entry.changedSignalIds.join(", ")}`}
      </p>
    </Card>
  );
}
