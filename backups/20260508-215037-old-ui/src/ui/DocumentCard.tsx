import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Card } from "./primitives";
import { cn } from "./utils";

type Item = {
  id: string;
  label: string;
  status: "ready" | "attention_needed" | "blocked";
  detail: string;
};

const toneByStatus = {
  ready: "text-emerald-300",
  attention_needed: "text-amber-200",
  blocked: "text-rose-200"
} as const;

const iconByStatus = {
  ready: CheckCircle2,
  attention_needed: AlertCircle,
  blocked: XCircle
} as const;

const labelByStatus = {
  ready: "Готово",
  attention_needed: "Нужно внимание",
  blocked: "Блокер"
} as const;

export function DocumentCard({ item }: { item: Item }) {
  const Icon = iconByStatus[item.status];
  return (
    <Card className="flex items-start gap-3" padding="sm">
      <Icon className={cn("mt-0.5 h-5 w-5", toneByStatus[item.status])} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-textPrimary">{item.label}</p>
          <span className={cn("text-xs", toneByStatus[item.status])}>
            {labelByStatus[item.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-textSecondary">{item.detail}</p>
      </div>
    </Card>
  );
}
