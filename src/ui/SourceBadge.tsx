import type { Source } from "@shared/contracts";
import { ExternalLink } from "lucide-react";
import { sourceTierTone } from "@/theme/tokens";
import { Badge } from "./primitives";
import { formatDate, formatPercent } from "@/lib/format";

export function SourceBadge({ source }: { source: Source }) {
  const tone = sourceTierTone[source.tier];
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-borderStrong"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="neutral" className={`${tone.surface} ${tone.text} border-transparent`}>
            {tone.label}
          </Badge>
          <span className="text-[11px] uppercase tracking-wide text-textMuted">
            Волатильность {formatPercent(source.volatilityScore, 0)}
          </span>
        </div>
        <ExternalLink className="h-4 w-4 text-textSecondary" />
      </div>
      <p className="text-sm font-medium text-textPrimary">{source.label}</p>
      <p className="text-xs text-textSecondary">{source.summary}</p>
      <p className="text-[11px] text-textMuted">
        Проверено: {formatDate(source.lastCheckedAt)}
      </p>
    </a>
  );
}
