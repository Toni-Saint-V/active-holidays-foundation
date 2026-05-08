import type { RuleResult, SignalId } from "@shared/contracts";
import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
  ruleResults: RuleResult[];
  maxNodes?: number;
};

export function NodeGraph({ ruleResults, maxNodes = 6 }: Props) {
  const fired = ruleResults.filter((rule) => rule.fired).slice(0, maxNodes);
  const signalSet = new Set<SignalId>();
  for (const rule of fired) for (const signal of rule.consumedSignals) signalSet.add(signal);
  const signals = Array.from(signalSet);
  const outputs = Array.from(new Set(fired.map((rule) => rule.output.type)));

  const signalPositions = useMemo(() => {
    return signals.map((signal, index) => ({
      id: signal,
      x: 60,
      y: 48 + index * 52
    }));
  }, [signals]);

  const rulePositions = useMemo(() => {
    return fired.map((rule, index) => ({
      id: rule.ruleId,
      explanation: rule.explanation,
      x: 260,
      y: 48 + index * 52,
      outputType: rule.output.type
    }));
  }, [fired]);

  const outputPositions = useMemo(() => {
    return outputs.map((output, index) => ({
      id: output,
      x: 460,
      y: 60 + index * 72
    }));
  }, [outputs]);

  const height = Math.max(
    signalPositions.length * 52 + 80,
    rulePositions.length * 52 + 80,
    outputPositions.length * 72 + 80
  );

  if (fired.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-textSecondary">
        Сейчас нет сработавших правил — граф появится, когда добавите больше сигналов.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl border border-border bg-surface-2 p-3">
      <svg width="520" height={height} viewBox={`0 0 520 ${height}`}>
        {rulePositions.map((rule, ruleIndex) => {
          const ruleData = fired[ruleIndex];
          const output = outputPositions.find((item) => item.id === rule.outputType);
          return (
            <g key={rule.id}>
              {ruleData.consumedSignals.map((signal) => {
                const signalNode = signalPositions.find((node) => node.id === signal);
                if (!signalNode) return null;
                return (
                  <motion.path
                    key={`${rule.id}-${signal}`}
                    d={`M${signalNode.x + 60} ${signalNode.y} C160 ${signalNode.y}, 200 ${rule.y}, ${rule.x - 60} ${rule.y}`}
                    stroke="rgba(255,214,10,0.4)"
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 * ruleIndex }}
                  />
                );
              })}
              {output && (
                <motion.path
                  d={`M${rule.x + 60} ${rule.y} C360 ${rule.y}, 400 ${output.y}, ${output.x - 60} ${output.y}`}
                  stroke="rgba(56,189,248,0.4)"
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 * ruleIndex }}
                />
              )}
            </g>
          );
        })}

        {signalPositions.map((signal) => (
          <g key={`signal-${signal.id}`}>
            <rect x={signal.x} y={signal.y - 16} rx="10" width="120" height="32" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
            <text x={signal.x + 60} y={signal.y + 4} textAnchor="middle" fontSize="12" fill="#f5f5f7">
              {signal.id}
            </text>
          </g>
        ))}

        {rulePositions.map((rule) => (
          <g key={`rule-${rule.id}`}>
            <rect x={rule.x} y={rule.y - 16} rx="10" width="120" height="32" fill="rgba(255,214,10,0.12)" stroke="rgba(255,214,10,0.35)" />
            <text x={rule.x + 60} y={rule.y + 4} textAnchor="middle" fontSize="12" fill="#ffd60a">
              {rule.id}
            </text>
          </g>
        ))}

        {outputPositions.map((output) => (
          <g key={`output-${output.id}`}>
            <rect x={output.x} y={output.y - 20} rx="10" width="120" height="40" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.35)" />
            <text x={output.x + 60} y={output.y + 4} textAnchor="middle" fontSize="12" fill="#38bdf8">
              {output.id.replace("_", " ")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
