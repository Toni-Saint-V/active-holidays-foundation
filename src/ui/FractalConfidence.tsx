import { useState } from "react";
import type { ConfidenceBreakdown } from "@shared/contracts";
import { Card } from "./primitives";
import { formatPercent } from "@/lib/format";

type Level = 0 | 1 | 2;

type Props = {
  breakdown: ConfidenceBreakdown;
};

export function FractalConfidence({ breakdown }: Props) {
  const [level, setLevel] = useState<Level>(0);

  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-textMuted">Фрактал уверенности</p>
          <h3 className="text-lg font-semibold text-textPrimary">
            Пинч-зум на детали
          </h3>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((current) => (
            <button
              key={current}
              type="button"
              className={`rounded-lg px-3 py-1 text-xs transition ${
                current === level
                  ? "bg-accent text-black"
                  : "bg-surface-2 text-textSecondary hover:bg-surface-3"
              }`}
              onClick={() => setLevel(current as Level)}
            >
              Уровень {current + 1}
            </button>
          ))}
        </div>
      </div>

      {level === 0 && (
        <p className="text-sm text-textSecondary">
          Базовая уверенность: {formatPercent(breakdown.value)}. Сдвиньте уровень,
          чтобы раскрыть отдельные факторы и их дочерние сигналы.
        </p>
      )}

      {level >= 1 && (
        <ul className="grid gap-2">
          {breakdown.factors.map((factor) => (
            <li key={factor.id} className="rounded-xl bg-surface-2 px-3 py-2">
              <p className="text-sm text-textPrimary">{factor.label}</p>
              <p className="text-xs text-textSecondary">{factor.detail}</p>
              {level === 2 && factor.children.length > 0 && (
                <ul className="mt-2 grid gap-1 text-[11px] text-textSecondary">
                  {factor.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-2">
                      <span>{child.label}</span>
                      <span className={child.value >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {child.value >= 0 ? "+" : ""}
                        {(child.value * 100).toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
