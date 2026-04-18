import { motion } from "framer-motion";
import { ArrowRight, Clock, CircleDollarSign, Shield, Sparkles } from "lucide-react";
import type { ResidencyOffer } from "@shared/contracts";
import { Badge, Card } from "./primitives";
import { FlagIcon } from "./FlagIcon";
import { formatPercent } from "@/lib/format";
import { cn } from "./utils";

type Props = {
  offer: ResidencyOffer;
  selected?: boolean;
  onSelect?: (offer: ResidencyOffer) => void;
  showBoosts?: boolean;
  compact?: boolean;
};

const statusBadge = {
  active: { tone: "positive" as const, label: "Активна" },
  limited: { tone: "warning" as const, label: "Ограничена" },
  closed: { tone: "negative" as const, label: "Закрыта" }
};

export function ProgramCard({ offer, selected, onSelect, showBoosts, compact }: Props) {
  const badge = statusBadge[offer.status];
  const costLabel = `${offer.costRangeEur[0]}-${offer.costRangeEur[1]}€`;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(onSelect ? "cursor-pointer" : "")}
      onClick={() => onSelect?.(offer)}
    >
      <Card
        padding={compact ? "sm" : "md"}
        className={cn(
          "relative overflow-hidden transition",
          selected && "ring-2 ring-accent/50",
          offer.status === "closed" && "opacity-80"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <FlagIcon code="ES" />
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <Badge tone="neutral">residency_es</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-textPrimary">{offer.nameRu}</h3>
            <p className="mt-1 text-sm text-textSecondary">{offer.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-textMuted">Оценка</p>
            <p className="mt-1 text-2xl font-semibold text-textPrimary">
              {formatPercent(offer.score, 0)}
            </p>
            <p className="text-xs text-textSecondary">база {formatPercent(offer.baseScore, 0)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Вероятность</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-textPrimary">
              <Sparkles className="h-3 w-3" />
              {formatPercent(offer.successProbability, 0)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Срок</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-textPrimary">
              <Clock className="h-3 w-3" />
              {offer.processingDays} дн.
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Стоимость</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-textPrimary">
              <CircleDollarSign className="h-3 w-3" />
              {costLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <p className="text-xs uppercase tracking-wide text-textMuted">Главные требования</p>
          <ul className="grid gap-1 text-xs text-textSecondary">
            {offer.eligibilityRequirements.slice(0, 4).map((req, index) => (
              <li key={index} className="flex items-start gap-2">
                <Shield className="mt-0.5 h-3 w-3 text-accent" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {offer.consulateOptions.length > 0 && (
          <p className="mt-3 text-xs text-textMuted">
            Подача: {offer.consulateOptions.join(" · ")}
          </p>
        )}

        {showBoosts && offer.ruleBoosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {offer.ruleBoosts.map((boost) => (
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

        {offer.status === "closed" && offer.statusReason && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {offer.statusReason}
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
