import { Sparkles } from "lucide-react";
import { cn } from "@/ui/utils";

export type SignalTone = "need" | "info" | "manual" | "result" | "muted";

export type EvidenceSignal = {
  id: string;
  label: string;
  tone?: SignalTone;
};

const toneClass: Record<SignalTone, string> = {
  need: "bg-accent",
  info: "bg-info",
  manual: "bg-manual",
  result: "bg-success",
  muted: "bg-textMuted"
};

export function EvidenceStrip({
  signals,
  className
}: {
  signals: EvidenceSignal[];
  className?: string;
}) {
  const visibleSignals = signals.slice(0, 3);

  return (
    <div
      className={cn(
        "flex min-h-[56px] min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-[24px] border border-border bg-surface2 px-4 py-3",
        className
      )}
    >
      {visibleSignals.map((signal, index) => (
        <div key={signal.id} className="flex min-w-0 max-w-full items-center gap-3 text-sm text-textSecondary">
          <span className={cn("h-2.5 w-2.5 rounded-full", toneClass[signal.tone ?? "muted"])} />
          <span className="min-w-0 break-words font-medium text-textPrimary">{signal.label}</span>
          {index < visibleSignals.length - 1 ? (
            <span className="shrink-0 text-textMuted">•</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AIInsightChip({
  summary,
  reasons,
  action,
  expanded,
  onToggle,
  onOpenFull,
  className
}: {
  summary: string;
  reasons: string[];
  action: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenFull?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="ah-ai-breathe inline-flex min-h-[44px] items-center gap-3 rounded-full border border-ai/25 bg-surface2 px-4 py-2 text-left transition hover:border-ai/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/40"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ai/18 text-ai">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-textPrimary">
          {summary}
        </span>
      </button>

      {expanded ? (
        <div className="ah-reveal-up rounded-[24px] border border-ai/20 bg-surface2 px-4 py-4">
          <div className="grid gap-2">
            {reasons.map((reason) => (
              <p key={reason} className="text-sm text-textSecondary">
                {reason}
              </p>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-textPrimary">{action}</p>
            {onOpenFull ? (
              <button
                type="button"
                onClick={onOpenFull}
                className="text-sm font-semibold text-ai transition hover:text-textPrimary"
              >
                Полный разбор
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentRow({
  title,
  meta,
  status,
  tone = "need"
}: {
  title: string;
  meta: string;
  status: string;
  tone?: SignalTone;
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-[20px] border border-border bg-surface2 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", toneClass[tone])} />
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold text-textPrimary">{title}</p>
          <p className="truncate text-sm text-textSecondary">{meta}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-surface3 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">
        {status}
      </span>
    </div>
  );
}
