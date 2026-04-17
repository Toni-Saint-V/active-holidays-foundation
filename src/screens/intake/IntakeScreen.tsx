import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { QuestionCard } from "@/ui/QuestionCard";
import { MiniVerdictPreview } from "@/ui/MiniVerdictPreview";
import { ProgressMeter } from "@/ui/ProgressMeter";
import { EmptyState } from "@/ui/EmptyState";
import { StickyFooter } from "@/ui/StickyFooter";
import { SignalRow } from "@/ui/SignalRow";
import { staggerChild, staggerParent } from "@/animations/variants";
import { track } from "@/instrumentation/events";
import { useScreenView } from "@/instrumentation/screenView";
import { useSignalAutopilot } from "@/hooks/useSignalAutopilot";
import { useToast } from "@/ui/Toast";

export function IntakeScreen() {
  useScreenView("intake");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    intakeQueue,
    intakePreview,
    scenarios,
    bootstrap,
    loadCase,
    patchSignal,
    patchSignals,
    status,
    errorMessage
  } = useCaseStore();
  const [autopilotRan, setAutopilotRan] = useState(false);
  const autopilotFn = useSignalAutopilot();

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target = caseIdFromUrl ?? activeCaseId ?? scenarios[0]?.caseId ?? "s1-rf-italy";
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

  const currentQuestion = intakeQueue?.nextQuestion ?? null;
  const progress = intakeQueue?.progress ?? 0;

  const answeredPreview = useMemo(() => {
    if (!activeResult) return null;
    return activeResult.decisionSignals.filter((signal) => signal.present).slice(0, 6);
  }, [activeResult]);

  async function handleAnswer(value: string | number | boolean) {
    if (!activeCase || !currentQuestion) return;
    track({
      type: "intake_answered",
      signalId: currentQuestion.id,
      informationGain: currentQuestion.informationGain
    });
    await patchSignal(activeCase.id, currentQuestion.id, value);
    if (intakePreview) {
      track({
        type: "preview_seen",
        verdict: intakePreview.tentativeVerdict,
        confidence: intakePreview.tentativeConfidence
      });
    }
  }

  async function handleAutopilot() {
    if (!activeCase) return;
    const inferred = autopilotFn();
    if (inferred.length === 0) {
      toast.push("Автопилот не нашёл подсказок по локали — заполните вручную.", "warning");
      setAutopilotRan(true);
      return;
    }
    await patchSignals(activeCase.id, inferred);
    toast.push(`Автопилот заполнил ${inferred.length} сигналов из локали браузера.`, "success");
    setAutopilotRan(true);
  }

  function handleContinue() {
    if (!activeCase) return;
    track({ type: "cta_clicked", cta: "intake_to_result" });
    navigate(`/result?case=${encodeURIComponent(activeCase.id)}`);
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Не удалось загрузить анкету"
        description={errorMessage ?? "Попробуйте обновить страницу или выбрать другой кейс."}
        action={
          <Button variant="secondary" onClick={() => loadCase(caseIdFromUrl ?? "s1-rf-italy")}>
            Попробовать снова
          </Button>
        }
      />
    );
  }

  if (!activeCase || !intakeQueue || !intakePreview) {
    return (
      <Card className="animate-pulse">
        <p className="text-sm text-textSecondary">Готовим адаптивную анкету…</p>
      </Card>
    );
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.div variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                Анкета · {activeCase.id}
              </p>
              <h2 className="text-xl font-semibold text-textPrimary">{activeCase.title}</h2>
            </div>
            <Badge tone="warning">
              <Sparkles className="h-3 w-3" />
              адаптивный порядок
            </Badge>
          </div>
          <ProgressMeter
            value={progress}
            label="Готовность обязательных сигналов"
            detail="Порядок вопросов пересчитывается движком по прибыли информации."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleAutopilot()}
              disabled={autopilotRan}
              leadingIcon={<Zap className="h-3.5 w-3.5" />}
            >
              {autopilotRan ? "Автопилот отработал" : "Автопилот: предложить сигналы"}
            </Button>
            <span className="text-xs text-textSecondary">
              Детерминированно: читаем `navigator.languages` и часовой пояс.
            </span>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerChild}>
        <MiniVerdictPreview preview={intakePreview} />
      </motion.div>

      {currentQuestion ? (
        <motion.div variants={staggerChild}>
          <QuestionCard question={currentQuestion} onAnswer={handleAnswer} />
        </motion.div>
      ) : (
        <motion.div variants={staggerChild}>
          <EmptyState
            title="Все обязательные сигналы собраны"
            description="Можно переходить к итоговому вердикту и подбору маршрута."
            action={<Button onClick={handleContinue}>Открыть вердикт</Button>}
          />
        </motion.div>
      )}

      {intakeQueue.remaining.length > 1 && (
        <motion.div variants={staggerChild}>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-textPrimary">
                Что спросим дальше
              </p>
              <Badge tone="neutral">очередь по информативности</Badge>
            </div>
            <div className="grid gap-2">
              {intakeQueue.remaining.slice(1, 4).map((question) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-textSecondary"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-textPrimary">{question.prompt}</span>
                    <span className="text-[11px] text-textMuted">
                      +{Math.round(question.informationGain * 100)}% инфо
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-textMuted">
                    Разблокирует: {question.unlocksRules.join(", ") || "—"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {answeredPreview && (
        <motion.div variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">
              Уже в работе движка
            </p>
            <div className="grid gap-2">
              {answeredPreview.map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <StickyFooter>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-textSecondary">
            Живой вердикт: {intakePreview.tentativeVerdict} · уверенность {(intakePreview.tentativeConfidence * 100).toFixed(0)}%
          </div>
          <Button onClick={handleContinue} disabled={!intakePreview}>
            Перейти к вердикту
          </Button>
        </div>
      </StickyFooter>
    </motion.div>
  );
}
