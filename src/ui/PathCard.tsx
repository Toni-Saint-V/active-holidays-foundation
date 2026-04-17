import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { RankedPath } from "@shared/contracts";
import { Badge, Card } from "./primitives";
import { cn } from "./utils";
import { formatPercent, formatRub, formatWeeks } from "@/lib/format";

type Props = {
  path: RankedPath;
  selected?: boolean;
  onSelect?: (path: RankedPath) => void;
  compact?: boolean;
  showBoosts?: boolean;
};

export function PathCard({ path, selected, onSelect, compact, showBoosts }: Props) {
  const ineligibleReason = !path.eligible ? path.blockers[0]?.text ?? "Заблокирован правилом" : null;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group cursor-pointer",
        onSelect ? "" : "cursor-default"
      )}
      onClick={() => onSelect?.(path)}
    >
      <Card
        padding={compact ? "sm" : "md"}
        className={cn(
          "relative overflow-hidden transition",
          selected && "ring-2 ring-accent/50",
          !path.eligible && "opacity-80"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={path.eligible ? "positive" : "negative"}>
                {path.eligible ? "Доступен" : "Заблокирован"}
              </Badge>
              <Badge tone="neutral">{path.kind.replace("_", " ")}</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-textPrimary">{path.title}</h3>
            <p className="mt-1 text-sm text-textSecondary">{path.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-textMuted">Оценка</p>
            <p className="mt-1 text-2xl font-semibold text-textPrimary">
              {formatPercent(path.score, 0)}
            </p>
            <p className="text-xs text-textSecondary">
              база {formatPercent(path.baseScore, 0)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Срок</p>
            <p className="text-textPrimary">{formatWeeks(path.processingWeeks)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Стоимость</p>
            <p className="text-textPrimary">{formatRub(path.estCostRub)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              Документы
            </p>
            <p className="text-textPrimary">{path.requirements.length}</p>
          </div>
        </div>
        {showBoosts && path.ruleBoosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {path.ruleBoosts.map((boost) => (
              <Badge
                key={`${boost.ruleId}-${boost.delta}`}
                tone={boost.delta >= 0 ? "positive" : "warning"}
              >
                <Sparkles className="h-3 w-3" />
                {boost.ruleId} · {boost.delta >= 0 ? "+" : ""}
                {formatPercent(Math.abs(boost.delta), 0)}
              </Badge>
            ))}
          </div>
        )}
        {ineligibleReason && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {ineligibleReason}
          </p>
        )}
        {onSelect && (
          <div className="mt-4 flex items-center gap-2 text-xs text-accent">
            <span>Сделать основным</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
