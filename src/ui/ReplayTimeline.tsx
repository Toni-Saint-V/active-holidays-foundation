import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { AuditTrail } from "@shared/contracts";
import { Button, Card } from "./primitives";
import { TimelineStep } from "./TimelineStep";
import { track } from "@/instrumentation/events";

type Props = {
  trail: AuditTrail;
  onFinished?: () => void;
};

export function ReplayTimeline({ trail, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      setIndex((current) => {
        const next = current + 1;
        if (next >= trail.steps.length) {
          setPlaying(false);
          onFinished?.();
          track({ type: "replay_finished", caseId: trail.caseId, steps: trail.steps.length });
          return current;
        }
        return next;
      });
    }, 420);
    return () => window.clearTimeout(id);
  }, [playing, index, trail.steps.length, trail.caseId, onFinished]);

  const currentStep = trail.steps[index];

  return (
    <Card className="grid gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-textMuted">Воспроизведение</p>
          <h3 className="text-lg font-semibold text-textPrimary">Шаги движка</h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPlaying(false);
              setIndex(0);
            }}
          >
            К началу
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (index >= trail.steps.length - 1) setIndex(0);
              setPlaying((value) => !value);
              if (!playing) track({ type: "replay_opened", caseId: trail.caseId });
            }}
          >
            {playing ? "Пауза" : "Проиграть"}
          </Button>
        </div>
      </header>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${((index + 1) / trail.steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="grid gap-2">
        {trail.steps.map((step, stepIndex) => (
          <TimelineStep
            key={step.index}
            index={step.index}
            title={step.name}
            detail={step.outputSummary}
            tookMs={step.tookMs}
            active={stepIndex === index}
          >
            {stepIndex === index && step.firedRuleIds.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-200">
                Сработавшие правила: {step.firedRuleIds.join(", ")}
              </p>
            )}
          </TimelineStep>
        ))}
      </div>

      {currentStep && (
        <p className="text-xs text-textMuted">Текущий шаг: {currentStep.inputsSummary}</p>
      )}
    </Card>
  );
}
