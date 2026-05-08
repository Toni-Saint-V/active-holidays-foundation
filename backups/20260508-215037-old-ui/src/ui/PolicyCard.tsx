import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, ShieldCheck, Zap, Syringe, Dumbbell, Stethoscope } from "lucide-react";
import type { InsuranceOffer } from "@shared/contracts";
import { Badge, Card } from "./primitives";
import { formatPercent } from "@/lib/format";
import { cn } from "./utils";

type Props = {
  offer: InsuranceOffer;
  selected?: boolean;
  onSelect?: (offer: InsuranceOffer) => void;
  compact?: boolean;
  showBoosts?: boolean;
};

const featureIcon = {
  covid: { Icon: Syringe, label: "COVID" },
  chronic: { Icon: HeartPulse, label: "Хроники" },
  extreme_sports: { Icon: Dumbbell, label: "Экстрим" },
  pregnancy: { Icon: ShieldCheck, label: "Беременность" },
  evacuation: { Icon: Zap, label: "Эвакуация" },
  dental_emergency: { Icon: Stethoscope, label: "Стоматология" }
} as const;

const trustLabels = { a_plus: "A+", a: "A", b: "B" } as const;

export function PolicyCard({ offer, selected, onSelect, compact, showBoosts }: Props) {
  const activeIncludes = (Object.keys(offer.includes) as Array<keyof typeof offer.includes>)
    .filter((key) => offer.includes[key])
    .slice(0, 4);
  const totalPrice = Math.round(offer.pricePerDayEur * 10);

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
          !offer.eligible && "opacity-75"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={offer.schengenCompliant ? "positive" : "warning"}>
                {offer.schengenCompliant ? "Шенген ок" : "Не шенген"}
              </Badge>
              <Badge tone="neutral">Доверие {trustLabels[offer.trustLevel]}</Badge>
              <Badge tone="neutral">insurance_adult</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-textPrimary">
              {offer.providerNameRu} · {offer.productNameRu}
            </h3>
            <p className="mt-1 text-sm text-textSecondary">{offer.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-textMuted">Оценка</p>
            <p className="mt-1 text-2xl font-semibold text-textPrimary">
              {formatPercent(offer.score, 0)}
            </p>
            <p className="text-xs text-textSecondary">
              база {formatPercent(offer.baseScore, 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Покрытие</p>
            <p className="mt-0.5 text-textPrimary">
              €{offer.coverageAmountEur.toLocaleString("ru-RU")}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Цена/день</p>
            <p className="mt-0.5 text-textPrimary">€{offer.pricePerDayEur.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">10 дней</p>
            <p className="mt-0.5 text-textPrimary">€{totalPrice}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeIncludes.map((key) => {
            const item = featureIcon[key];
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-textSecondary"
              >
                <item.Icon className="h-3 w-3 text-accent" />
                {item.label}
              </span>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-textMuted">
          Принимают: {offer.acceptedByConsulates.length > 0 ? offer.acceptedByConsulates.join(", ") : "—"} ·
          выплата ≈ {offer.payoutSpeedDays} дн · возраст {offer.ageMin}-{offer.ageMax}
        </p>

        {showBoosts && offer.ruleBoosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {offer.ruleBoosts.map((boost) => (
              <Badge
                key={`${boost.ruleId}-${boost.delta}`}
                tone={boost.delta >= 0 ? "positive" : "warning"}
              >
                {boost.ruleId} · {boost.delta >= 0 ? "+" : ""}
                {formatPercent(Math.abs(boost.delta), 0)}
              </Badge>
            ))}
          </div>
        )}

        {!offer.eligible && offer.blockers[0] && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {offer.blockers[0].text}
          </p>
        )}

        {onSelect && (
          <div className="mt-4 flex items-center gap-2 text-xs text-accent">
            <span>Выбрать полис</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
