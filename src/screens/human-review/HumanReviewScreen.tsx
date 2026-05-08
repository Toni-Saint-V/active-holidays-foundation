import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Phone } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import type { HumanReviewChannel } from "@shared/contracts";
import { Badge, Button, Card, Chip } from "@/ui/primitives";
import { RiskPulse } from "@/ui/RiskPulse";
import { TimelineStep } from "@/ui/TimelineStep";
import { EmptyState } from "@/ui/EmptyState";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { staggerChild, staggerParent } from "@/animations/variants";
import { findHumanReviewCaseId } from "@/lib/caseDefaults";
import { buildHumanReviewScreenModel } from "@/presentation/activeHolidays";

export function HumanReviewScreen() {
  useScreenView("human-review");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const mountedRef = useRef(true);
  const [channel, setChannel] = useState<HumanReviewChannel>("email");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    activeHumanReview,
    activeHumanReviewPacket,
    scenarios,
    audit,
    bootstrap,
    loadCase,
    loadAudit,
    loadHumanReview,
    loadHumanReviewPacket,
    submitHumanReview,
    status,
    errorMessage,
    humanReviewStatus,
    humanReviewError
  } = useCaseStore();
  const currentReview = activeHumanReview?.caseId === activeCase?.id ? activeHumanReview : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target =
      caseIdFromUrl ??
      activeCaseId ??
      findHumanReviewCaseId(scenarios);
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

  useEffect(() => {
    if (activeCase && activeResult?.verdict !== "HUMAN_REVIEW") {
      void loadAudit(activeCase.id);
    }
  }, [activeCase, activeResult?.verdict, loadAudit]);

  useEffect(() => {
    if (activeCase?.id) {
      void loadHumanReview(activeCase.id);
    }
  }, [activeCase?.id, loadHumanReview]);

  useEffect(() => {
    if (
      activeCase?.id &&
      currentReview &&
      currentReview.status !== "resolved" &&
      currentReview.status !== "cancelled"
    ) {
      void loadHumanReviewPacket(activeCase.id);
    }
  }, [activeCase?.id, currentReview, loadHumanReviewPacket]);

  useEffect(() => {
    setChannel("email");
    setContact("");
    setMessage("");
  }, [activeCase?.id]);

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

  const screenModel = buildHumanReviewScreenModel({
    result: activeResult,
    caseUpdatedAt: activeCase.updatedAt,
    request: currentReview,
    packet: activeHumanReviewPacket?.case.id === activeCase.id ? activeHumanReviewPacket : null,
    audit,
    humanReviewStatus
  });
  const openReview = screenModel.openReview !== null;
  const auditSection = screenModel.auditSection;
  const priorityLabel: Record<"critical" | "high" | "medium", string> = {
    critical: "критично",
    high: "высокий приоритет",
    medium: "средний приоритет"
  };
  const sourceLabel: Record<"evidence" | "documents" | "risk" | "scenario" | "request", string> = {
    evidence: "источники",
    documents: "документы",
    risk: "риски",
    scenario: "сценарий",
    request: "запрос клиента"
  };

  async function handleSubmit() {
    if (!activeCase) return;
    const submittedCaseId = activeCase.id;
    if (message.trim().length < 10) {
      toast.push("Опишите случай чуть подробнее: минимум 10 символов.", "error");
      return;
    }
    if (contact.trim().length < 3) {
      toast.push("Добавьте контакт, чтобы менеджер мог ответить.", "error");
      return;
    }

    try {
      const response = await submitHumanReview(activeCase.id, {
        channel,
        contact: contact.trim(),
        message: message.trim()
      });
      if (!mountedRef.current || useCaseStore.getState().humanReviewCaseId !== submittedCaseId) return;
      toast.push(
        response.reused
          ? "Активный запрос уже есть — открыли его текущий статус."
          : "Запрос передан в ручную проверку.",
        "success"
      );
    } catch (error) {
      if (!mountedRef.current || useCaseStore.getState().humanReviewCaseId !== submittedCaseId) return;
      toast.push(
        error instanceof Error ? error.message : "Не удалось отправить запрос менеджеру.",
        "error"
      );
    }
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4 pb-24 sm:pb-6"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                {screenModel.header.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold text-textPrimary">{screenModel.header.heading}</h2>
              <p className="mt-2 text-sm text-textSecondary">{screenModel.header.description}</p>
            </div>
            <Badge tone={screenModel.header.badgeTone}>{screenModel.header.badgeLabel}</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {screenModel.overview.rows.map((row) => (
              <div
                key={row.id}
                className={
                  row.tone === "notice"
                    ? "rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    : "rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary"
                }
              >
                {row.text}
              </div>
            ))}
          </div>
          {screenModel.loadingState ? (
            <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-4 text-sm text-textSecondary">
              <p className="font-medium text-textPrimary">{screenModel.loadingState.title}</p>
              <p className="mt-2">{screenModel.loadingState.description}</p>
            </div>
          ) : screenModel.openReview ? (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 rounded-2xl bg-surface-2 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-textMuted">
                  {screenModel.openReview.pipelineEyebrow}
                </p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {screenModel.openReview.pipeline.map((step) => {
                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-3 py-3 text-sm ${
                          step.state === "current" || step.state === "completed"
                            ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
                            : "border-border bg-surface text-textMuted"
                        }`}
                      >
                        <p className="font-medium">{step.label}</p>
                        <p className="mt-1 text-xs opacity-80">
                          {step.state === "current"
                            ? "текущий этап"
                            : step.state === "completed"
                              ? "этап пройден"
                              : "ожидает"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 px-4 py-4 text-sm text-textSecondary">
                <p className="font-medium text-textPrimary">{screenModel.openReview.snapshotTitle}</p>
                <p className="mt-2">Канал: {screenModel.openReview.channelLabel}</p>
                <p className="mt-1">Контакт: {screenModel.openReview.contactLabel}</p>
                <p className="mt-1">Вердикт на момент отправки: {screenModel.openReview.verdictLabel}</p>
                <p className="mt-1">Следующий шаг: {screenModel.openReview.nextActionLabel}</p>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface px-3 py-3 text-textPrimary">
                  {screenModel.openReview.message}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-textPrimary">{screenModel.submitForm?.messageLabel}</p>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  className="min-h-36 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent/60"
                  placeholder={screenModel.submitForm?.messagePlaceholder}
                />
                <p className="text-xs text-textMuted">
                  {screenModel.submitForm?.messageHint}
                </p>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-textPrimary">{screenModel.submitForm?.channelLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {screenModel.submitForm?.channels.map((item) => (
                    <Chip
                      key={item.value}
                      selected={channel === item.value}
                      onClick={() => setChannel(item.value)}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent/60"
                  placeholder={screenModel.submitForm?.contactPlaceholders[channel]}
                />
              </div>
              {humanReviewError && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {humanReviewError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  leadingIcon={<Phone className="h-4 w-4" />}
                  onClick={() => void handleSubmit()}
                  loading={humanReviewStatus === "loading"}
                >
                  {screenModel.submitForm?.primaryActionLabel}
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={<Briefcase className="h-4 w-4" />}
                  onClick={() => navigate(`/result?case=${encodeURIComponent(activeCase.id)}`)}
                >
                  {screenModel.submitForm?.secondaryActionLabel}
                </Button>
              </div>
            </div>
          )}
          {!openReview && !screenModel.loadingState && (
            <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary">
              {screenModel.submitForm?.availabilityNote}
            </div>
          )}
          {screenModel.openReview && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                leadingIcon={<Briefcase className="h-4 w-4" />}
                onClick={() => navigate(`/result?case=${encodeURIComponent(activeCase.id)}`)}
              >
                {screenModel.openReview.openCaseLabel}
              </Button>
            </div>
          )}
        </Card>
      </motion.section>

      {screenModel.packetSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="text-sm font-medium text-textPrimary">{screenModel.packetSection.heading}</p>
            <p className="mt-2 text-sm text-textSecondary">{screenModel.packetSection.reviewReason}</p>
            <p className="mt-1 text-xs text-textMuted">{screenModel.packetSection.evidenceLabel}</p>
            {screenModel.packetSection.scenarioLabel ? (
              <p className="mt-1 text-xs text-textMuted">{screenModel.packetSection.scenarioLabel}</p>
            ) : null}

            <div className="mt-4 grid gap-2">
              {screenModel.packetSection.checklist.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                  <p className="text-sm font-medium text-textPrimary">{item.title}</p>
                  <p className="mt-1 text-xs text-textSecondary">{item.detail}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-textMuted">
                    {priorityLabel[item.priority]} · {sourceLabel[item.source]}
                  </p>
                </div>
              ))}
            </div>

            {screenModel.packetSection.documentsToInspect.length > 0 ? (
              <div className="mt-4 grid gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Проверить документы</p>
                {screenModel.packetSection.documentsToInspect.map((doc) => (
                  <div key={doc.id} className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary">
                    <p className="font-medium text-textPrimary">{doc.label}</p>
                    <p className="mt-1 text-xs">{doc.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {screenModel.packetSection.doNotAutoDecideNotes.length > 0 ? (
              <div className="mt-4 grid gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-100">Не автоматизировать</p>
                {screenModel.packetSection.doNotAutoDecideNotes.map((note) => (
                  <p key={note} className="text-xs text-amber-100/90">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
          </Card>
        </motion.section>
      )}

      {screenModel.triggersSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">{screenModel.triggersSection.heading}</p>
            <div className="grid gap-2">
              {screenModel.triggersSection.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3"
                >
                  <p className="text-sm font-medium text-sky-100">{item.title}</p>
                  <p className="mt-1 text-xs text-sky-100/80">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {screenModel.warningsSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">{screenModel.warningsSection.heading}</p>
            <div className="grid gap-2">
              {screenModel.warningsSection.items.map((item) => (
                <RiskPulse
                  key={item.id}
                  risk={{
                    id: item.id,
                    severity: item.severity,
                    label: item.label,
                    detail: item.detail,
                    triggeredBy: item.triggeredBy,
                    pulseAmplitude: item.pulseAmplitude
                  }}
                />
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {auditSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">{auditSection.heading}</p>
            <div className="grid gap-1">
              {auditSection.steps.map((step, index) => (
                <TimelineStep
                  key={step.index}
                  index={step.index}
                  title={step.name}
                  detail={step.outputSummary}
                  tookMs={step.tookMs}
                  active={index === auditSection.steps.length - 1}
                />
              ))}
            </div>
            {auditSection.history.length > 0 && (
              <div className="mt-4 grid gap-2">
                <p className="text-xs uppercase tracking-wide text-textMuted">{auditSection.historyLabel}</p>
                {auditSection.history.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-textSecondary">
                    {entry.label}
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
