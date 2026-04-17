import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { ConfidenceGauge } from "@/ui/ConfidenceGauge";
import { NodeGraph } from "@/ui/NodeGraph";
import { SourceBadge } from "@/ui/SourceBadge";
import { VolatilityRadar } from "@/ui/VolatilityRadar";
import { FractalConfidence } from "@/ui/FractalConfidence";
import { EmptyState } from "@/ui/EmptyState";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { formatPercent } from "@/lib/format";

export function TrustScreen() {
  useScreenView("trust");
  const [searchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    scenarios,
    bootstrap,
    loadCase,
    status,
    errorMessage
  } = useCaseStore();
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target = caseIdFromUrl ?? activeCaseId ?? scenarios[0]?.caseId ?? "s1-rf-italy";
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

  if (status === "error") {
    return (
      <EmptyState
        title="Не удалось построить доверие"
        description={errorMessage ?? "Попробуйте обновить страницу."}
        action={
          <Button variant="secondary" onClick={() => loadCase("s1-rf-italy")}>
            Загрузить S1
          </Button>
        }
      />
    );
  }

  if (!activeResult || !activeCase) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Считаем доверие…</p>
      </Card>
    );
  }

  if (activeResult.verdict === "HUMAN_REVIEW") {
    return (
      <EmptyState
        title="Доверие уточнит оператор"
        description="Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки."
      />
    );
  }

  const { confidenceBreakdown, sources, volatilityScore, confidence } = activeResult.trust;

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Доверие</p>
              <h2 className="text-2xl font-semibold text-textPrimary">
                Почему движку можно верить
              </h2>
            </div>
            <Badge tone={confidence >= 0.8 ? "positive" : confidence >= 0.5 ? "warning" : "negative"}>
              {formatPercent(confidence)}
            </Badge>
          </div>
          <ConfidenceGauge
            breakdown={confidenceBreakdown}
            selectedFactorId={selectedFactor}
            onFactorClick={(factorId) =>
              setSelectedFactor((current) => (current === factorId ? null : factorId))
            }
          />
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Цепочка объяснения</p>
            <p className="text-sm text-textPrimary">Сигналы → правила → выводы</p>
          </div>
          <NodeGraph ruleResults={activeResult.ruleResults} />
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <VolatilityRadar sources={sources.map((source) => ({
          ...source,
          summary: "",
          url: source.url
        }))} />
      </motion.section>

      <motion.section variants={staggerChild}>
        <FractalConfidence breakdown={confidenceBreakdown} />
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-textPrimary">Источники</p>
            <span className="text-xs text-textSecondary">
              Средняя волатильность {formatPercent(volatilityScore, 0)}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {sources.map((source) => (
              <SourceBadge
                key={source.id}
                source={{
                  ...source,
                  summary:
                    source.tier === "official"
                      ? "Официальный источник — учитываем с минимальной волатильностью."
                      : source.tier === "operator"
                        ? "Оператор: актуальные слоты и цены."
                        : "Краудсорс: учитываем как вторичный сигнал."
                }}
              />
            ))}
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}
