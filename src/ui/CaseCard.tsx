import type { CaseSummary } from "@shared/contracts";
import { Card, Badge } from "./primitives";
import { formatDate, pluralizeSignals } from "@/lib/format";

type Props = {
  caseData: CaseSummary;
  onOpen?: (id: string) => void;
  active?: boolean;
};

export function CaseCard({ caseData, onOpen, active }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen ? () => onOpen(caseData.id) : undefined}
      className="w-full text-left"
    >
      <Card
        padding="sm"
        className={`grid gap-1 transition hover:border-borderStrong ${active ? "ring-2 ring-accent/40" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-textPrimary">{caseData.title}</p>
          {caseData.forkedFrom && <Badge tone="neutral">Форк</Badge>}
        </div>
        <p className="text-xs text-textSecondary">{caseData.id}</p>
        <p className="text-xs text-textMuted">
          {pluralizeSignals(caseData.signalCount)} · обновлён {formatDate(caseData.updatedAt)}
        </p>
      </Card>
    </button>
  );
}
