import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Phone } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { RiskPulse } from "@/ui/RiskPulse";
import { TimelineStep } from "@/ui/TimelineStep";
import { EmptyState } from "@/ui/EmptyState";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { staggerChild, staggerParent } from "@/animations/variants";
import { formatDate } from "@/lib/format";

export function HumanReviewScreen() {
  useScreenView("human-review");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    scenarios,
    audit,
    bootstrap,
    loadCase,
    loadAudit,
    status,
    errorMessage
  } = useCaseStore();

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target = caseIdFromUrl ?? activeCaseId ?? scenarios[0]?.caseId ?? "s3-us-spb-business";
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

  useEffect(() => {
    if (activeCase && activeResult?.verdict !== "HUMAN_REVIEW") {
      void loadAudit(activeCase.id);
    }
  }, [activeCase, activeResult?.verdict, loadAudit]);

  if (status === "error") {
    return (
      <EmptyState
        title="Не удалось открыть ручную проверку"
        description={errorMessage ?? "Попробуйте снова или выберите другой кейс."}
      />
    );
  }

  if (!activeResult || !activeCase) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Готовим пакет для менеджера…</p>
      </Card>
    );
  }

  const humanTriggers = activeResult.ruleResults.filter(
    (rule) => rule.fired && rule.output.type === "human_review_trigger"
  );
  const warnings = activeResult.ruleResults.filter(
    (rule) => rule.fired && rule.output.type === "warning"
  );

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Ручная проверка</p>
              <h2 className="text-2xl font-semibold text-textPrimary">
                Передаём кейс менеджеру
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                {activeResult.verdict === "HUMAN_REVIEW"
                  ? "Автомат ушёл в ручную проверку: есть неоднозначности, которые должен закрыть человек."
                  : "Для этого кейса ручная проверка не обязательна, но можно передать его менеджеру вручную."}
              </p>
            </div>
            <Badge tone="review">вердикт {activeResult.verdict}</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary">
              Кейс: {activeCase.id} · обновлён {formatDate(activeCase.updatedAt)}
            </div>
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary">
              Следующее действие: {activeResult.nextAction.label}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button leadingIcon={<Phone className="h-4 w-4" />} onClick={() => toast.push("Отправили менеджеру заявку и аудит решения.", "success")}>
              Передать менеджеру
            </Button>
            <Button
              variant="secondary"
              leadingIcon={<Briefcase className="h-4 w-4" />}
              onClick={() => navigate(`/result?case=${encodeURIComponent(activeCase.id)}`)}
            >
              Открыть кейс
            </Button>
          </div>
        </Card>
      </motion.section>

      {humanTriggers.length > 0 && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">
              Что именно требует ручной проверки
            </p>
            <div className="grid gap-2">
              {humanTriggers.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3"
                >
                  <p className="text-sm font-medium text-sky-100">
                    {rule.ruleId} · {rule.category}
                  </p>
                  <p className="mt-1 text-xs text-sky-100/80">{rule.explanation}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {warnings.length > 0 && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">Активные предупреждения</p>
            <div className="grid gap-2">
              {warnings.map((rule) => (
                <RiskPulse
                  key={rule.ruleId}
                  risk={{
                    id: rule.ruleId,
                    severity: rule.output.severity ?? "medium",
                    label: rule.explanation.split(".")[0],
                    detail: rule.explanation,
                    triggeredBy: [rule.ruleId],
                    pulseAmplitude:
                      rule.output.severity === "critical"
                        ? 1
                        : rule.output.severity === "high"
                          ? 0.75
                          : rule.output.severity === "medium"
                            ? 0.5
                            : 0.25
                  }}
                />
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {audit && activeResult.verdict !== "HUMAN_REVIEW" && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">Аудит решения</p>
            <div className="grid gap-1">
              {audit.trail.steps.map((step, index) => (
                <TimelineStep
                  key={step.index}
                  index={step.index}
                  title={step.name}
                  detail={step.outputSummary}
                  tookMs={step.tookMs}
                  active={index === audit.trail.steps.length - 1}
                />
              ))}
            </div>
            {audit.decisions.length > 0 && (
              <div className="mt-4 grid gap-2">
                <p className="text-xs uppercase tracking-wide text-textMuted">История пересчётов</p>
                {audit.decisions.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-textSecondary">
                    {formatDate(entry.recordedAt)} · {entry.summary}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.section>
      )}
    </motion.div>
  );
}
