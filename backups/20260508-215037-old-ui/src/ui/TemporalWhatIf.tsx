import { useState } from "react";
import { Button, Card } from "./primitives";
import { track } from "@/instrumentation/events";

type Props = {
  baseValue: number;
  label: string;
  unit: (value: number) => string;
  min?: number;
  max?: number;
  onApply: (value: number) => Promise<void>;
  loading?: boolean;
};

export function TemporalWhatIf({
  baseValue,
  label,
  unit,
  min = -12,
  max = 12,
  onApply,
  loading
}: Props) {
  const [delta, setDelta] = useState(0);
  const projected = Math.max(0, baseValue + delta);

  return (
    <Card className="grid gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-textMuted">Сценарий «а что, если…»</p>
        <h3 className="text-lg font-semibold text-textPrimary">{label}</h3>
        <p className="mt-1 text-sm text-textSecondary">
          Двигаем значение сигнала на ±{max - min} и пересчитываем решение реальным движком.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-textSecondary">
          База: <span className="text-textPrimary">{unit(baseValue)}</span>
        </div>
        <div className="text-sm text-textSecondary">
          Новое значение: <span className="text-textPrimary">{unit(projected)}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={delta}
        onChange={(event) => {
          const next = Number(event.target.value);
          setDelta(next);
          track({ type: "temporal_slider_dragged", delta: next });
        }}
        className="w-full accent-yellow-400"
      />
      <Button size="sm" loading={loading} onClick={() => onApply(projected)}>
        Пересчитать движком
      </Button>
    </Card>
  );
}
