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
import { defaultCaseIdForProduct } from "@/lib/caseDefaults";
import { useScreenView } from "@/instrumentation/screenView";
import { buildTrustScreenModel } from "@/presentation/activeHolidays";

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
    const target =
      caseIdFromUrl ??
      activeCaseId ??
      defaultCaseIdForProduct(activeCase?.productType ?? activeResult?.productType ?? "travel");
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, activeCase?.productType, activeResult?.productType, loadCase]);

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

  const screenModel = buildTrustScreenModel({ result: activeResult });

  if (activeResult.verdict === "HUMAN_REVIEW") {
    return (
      <EmptyState
        title={screenModel.gate?.title ?? "Доверие уточнит оператор"}
        description={
          screenModel.gate?.description ??
          "Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки."
        }
      />
    );
  }

  const { confidenceBreakdown } = activeResult.trust;

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
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                {screenModel.hero.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold text-textPrimary">{screenModel.hero.heading}</h2>
            </div>
            <Badge tone={screenModel.hero.badgeTone}>{screenModel.hero.badgeLabel}</Badge>
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
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              {screenModel.explanation.eyebrow}
            </p>
            <p className="text-sm text-textPrimary">{screenModel.explanation.heading}</p>
          </div>
          <NodeGraph ruleResults={activeResult.ruleResults} />
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <VolatilityRadar sources={screenModel.sourcesSection.items} />
      </motion.section>

      <motion.section variants={staggerChild}>
        <FractalConfidence breakdown={confidenceBreakdown} />
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-textPrimary">{screenModel.sourcesSection.heading}</p>
            <span className="text-xs text-textSecondary">{screenModel.sourcesSection.volatilityLabel}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {screenModel.sourcesSection.items.map((source) => (
              <SourceBadge
                key={source.id}
                source={source}
              />
            ))}
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}
