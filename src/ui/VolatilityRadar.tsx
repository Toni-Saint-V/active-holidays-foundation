import type { Source } from "@shared/contracts";
import { motion } from "framer-motion";
import { Card } from "./primitives";
import { formatPercent } from "@/lib/format";

type Props = {
  sources: Source[];
  radius?: number;
};

export function VolatilityRadar({ sources, radius = 90 }: Props) {
  const sorted = sources
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const count = Math.max(sorted.length, 3);
  const center = radius + 20;
  const size = (radius + 20) * 2;
  const points = sorted.map((source, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const distance = (1 - source.volatilityScore) * radius;
    return {
      source,
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
      anchorX: center + Math.cos(angle) * radius,
      anchorY: center + Math.sin(angle) * radius
    };
  });

  return (
    <Card className="grid gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-textMuted">Радар волатильности</p>
        <h3 className="text-lg font-semibold text-textPrimary">Свежесть источников</h3>
      </div>
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" />
          <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="rgba(255,255,255,0.06)" />
          <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="rgba(255,255,255,0.06)" />
          {points.map((point) => (
            <line
              key={`line-${point.source.id}`}
              x1={center}
              y1={center}
              x2={point.anchorX}
              y2={point.anchorY}
              stroke="rgba(255,255,255,0.08)"
            />
          ))}
          <motion.polygon
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ duration: 0.5 }}
            fill="rgba(255,214,10,0.2)"
            stroke="#ffd60a"
            strokeWidth="1.5"
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          />
          {points.map((point) => (
            <g key={`point-${point.source.id}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="#ffd60a" />
              <text x={point.anchorX} y={point.anchorY} textAnchor="middle" fontSize="10" fill="#f5f5f7" dy={point.anchorY < center ? -6 : 14}>
                {point.source.id.replace("src_", "")}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <ul className="grid gap-1 text-xs text-textSecondary">
        {sorted.map((source) => (
          <li key={source.id} className="flex items-center justify-between gap-2">
            <span>{source.label}</span>
            <span className="tabular-nums text-textMuted">
              Волатильность {formatPercent(source.volatilityScore, 0)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
