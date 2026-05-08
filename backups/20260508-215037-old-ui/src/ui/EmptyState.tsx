import { type ReactNode } from "react";
import { Card } from "./primitives";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      {icon && <div className="rounded-xl bg-surface-2 p-3 text-accent">{icon}</div>}
      <h3 className="text-lg font-semibold text-textPrimary">{title}</h3>
      <p className="max-w-md text-sm text-textSecondary">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
