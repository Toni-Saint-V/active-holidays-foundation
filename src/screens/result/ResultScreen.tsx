import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import {
  caseOverrideSchema,
  isInsuranceOffer,
  isResidencyOffer,
  isTravelOffer,
  type Offer,
  type PathPreference,
  type ProductType
} from "@shared/contracts";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { ExpandableRow } from "@/ui/Accordion";
import { ConfidenceGauge } from "@/ui/ConfidenceGauge";
import { RiskPulse } from "@/ui/RiskPulse";
import { OfferCard } from "@/ui/OfferCard";
import {
  SwipeDeck,
  insuranceDismissReasons,
  residencyDismissReasons
} from "@/ui/SwipeDeck";
import { TemporalWhatIf } from "@/ui/TemporalWhatIf";
import { ReplayTimeline } from "@/ui/ReplayTimeline";
import { ForkDivider } from "@/ui/ForkDivider";
import { SignalRow } from "@/ui/SignalRow";
import { EmptyState } from "@/ui/EmptyState";
import { verdictTone } from "@/theme/tokens";
import { cinematic, staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";
import { useToast } from "@/ui/Toast";
import { formatDate, formatPercent } from "@/lib/format";

type ResultScreenProps = {
  productType?: ProductType;
  screenName?: string;
};

const defaultCaseByProduct: Record<ProductType, string> = {
  travel: "s1-rf-italy",
  residency_es: "s4-rf-residency-dnv",
  insurance_adult: "s5-rf-italy-insurance"
};

function whatIfConfigFor(productType: ProductType) {
  switch (productType) {
    case "travel":
      return {
        label: "Сдвинуть горизонт поездки",
        signalId: "timeline_weeks" as const,
        unit: (value: number) => `${value} нед.`,
        min: -12,
        max: 12,
        reason: (weeks: number) =>
          `Сценарий «а что, если…»: горизонт изменён на ${weeks} недель.`
      };
    case "insurance_adult":
      return {
        label: "Сдвинуть длительность поездки",
        signalId: "trip_duration_days" as const,
        unit: (value: number) => `${value} дн.`,
        min: -14,
        max: 21,
        reason: (days: number) =>
          `Сценарий «а что, если…»: длительность изменена на ${days} дней.`
      };
    case "residency_es":
      return {
        label: "Сдвинуть срок подачи",
        signalId: "slot_available_weeks" as const,
        unit: (value: number) => `${value} нед.`,
        min: -8,
        max: 16,
        reason: (weeks: number) =>
          `Сценарий «а что, если…»: ближайшее окно подачи ${weeks} недель.`
      };
  }
}

export function ResultScreen({ productType, screenName = "result" }: ResultScreenProps = {}) {
  useScreenView(screenName);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    paths,
    scenarios,
    audit,
    bootstrap,
    loadCase,
    loadAudit,
    recompute,
    fork,
    setPreferences,
    overrideSignal,
    status,
    errorMessage
  } = useCaseStore();
  const [preferences, setPreferencesLocal] = useState<PathPreference[]>([]);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  const defaultCaseId = useMemo(() => {
    if (!productType) {
      return scenarios[0]?.caseId ?? defaultCaseByProduct.travel;
    }
    const match = scenarios.find((item) => item.productType === productType);
    return match?.caseId ?? defaultCaseByProduct[productType];
  }, [productType, scenarios]);
  const requestedCaseId = useMemo(() => {
    if (!caseIdFromUrl) return null;
    if (!productType) return caseIdFromUrl;
    const scenario = scenarios.find((item) => item.caseId === caseIdFromUrl);
    if (!scenario || scenario.productType !== productType) return null;
    return scenario.caseId;
  }, [caseIdFromUrl, productType, scenarios]);

  const activeCaseProductType = activeCase?.productType ?? activeResult?.productType;
  const activeCaseMatchesProduct = !productType || activeCaseProductType === productType;

  useEffect(() => {
    const target =
      requestedCaseId ?? (activeCaseMatchesProduct ? activeCaseId : null) ?? defaultCaseId;
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [requestedCaseId, activeCaseId, activeCaseMatchesProduct, defaultCaseId, loadCase]);

  const primaryOffer = activeResult?.primaryPath ?? null;
  const alternativeOffers = activeResult?.alternativePaths ?? [];
  const verdict = activeResult?.verdict ?? null;
  const tone = verdict ? verdictTone[verdict] : null;
  const isHumanReview = verdict === "HUMAN_REVIEW";
  const activeProductType: ProductType | null =
    activeResult?.productType ?? activeCase?.productType ?? null;
  const humanReviewTriggers =
    activeResult?.ruleResults.filter(
      (rule) => rule.fired && rule.output.type === "human_review_trigger"
    ) ?? [];

  const whatIfConfig = activeProductType ? whatIfConfigFor(activeProductType) : null;
  const baseWhatIfValue = useMemo(() => {
    if (!activeCase || !whatIfConfig) return 0;
    const signal = activeCase.signals.find((item) => item.id === whatIfConfig.signalId);
    return typeof signal?.value === "number" ? signal.value : 0;
  }, [activeCase, whatIfConfig]);

  const dismissReasons = useMemo(() => {
    if (activeProductType === "insurance_adult") return insuranceDismissReasons;
    if (activeProductType === "residency_es") return residencyDismissReasons;
    return undefined;
  }, [activeProductType]);

  async function handleTemporalApply(value: number) {
    if (!activeCase || !whatIfConfig) return;
    track({ type: "whatif_triggered", signalId: whatIfConfig.signalId });
    try {
      await overrideSignal(activeCase.id, {
        signalId: caseOverrideSchema.shape.signalId.parse(whatIfConfig.signalId),
        value,
        reason: whatIfConfig.reason(value),
        appliedAt: new Date().toISOString()
      });
      toast.push(`Пересчитали движком для ${whatIfConfig.unit(value)}.`, "success");
    } catch (error) {
      toast.push(
        error instanceof Error ? error.message : "Пересчёт не удался.",
        "error"
      );
    }
  }

  async function handleFork() {
    if (!activeCase) return;
    const forkedId = await fork(activeCase.id, `Форк кейса ${activeCase.title}`);
    if (forkedId) {
      toast.push("Создан форк — сравните решения рядом.", "success");
      navigate(`/result?case=${encodeURIComponent(forkedId)}`);
    }
  }

  async function handlePreferences(decisions: { pathId: string; weight: number; reason?: string }[]) {
    if (!activeCase) return;
    const parsed = decisions.map((item) => ({ id: item.pathId, weight: item.weight }));
    setPreferencesLocal(parsed);
    await setPreferences(activeCase.id, parsed);
  }

  function handleNextActionClick() {
    if (!activeCase || !activeResult) return;
    track({ type: "cta_clicked", cta: `result_primary_${activeResult.nextAction.type}` });
    navigate(`/${activeResult.nextAction.targetScreen}?case=${encodeURIComponent(activeCase.id)}`);
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Ошибка загрузки"
        description={errorMessage ?? "Попробуйте обновить или выбрать другой сценарий."}
        action={
          <Button variant="secondary" onClick={() => loadCase(defaultCaseId)}>
            Загрузить сценарий
          </Button>
        }
      />
    );
  }

  if (!activeResult || !activeCase || !tone) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Прогоняем движок…</p>
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
      <motion.section variants={staggerChild}>
        <motion.div variants={cinematic} initial="initial" animate="animate">
          <Card className={`grid gap-4 ${tone.surface} ring-1 ${tone.ring}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  tone={
                    verdict === "GO"
                      ? "positive"
                      : verdict === "NOT_NOW"
                        ? "negative"
                        : verdict === "HUMAN_REVIEW"
                          ? "review"
                          : "warning"
                  }
                >
                  {tone.label}
                </Badge>
                <Badge tone="neutral">{activeResult.productType}</Badge>
                <span className="text-[11px] uppercase tracking-wide text-textMuted">
                  {activeCase.id} · {formatDate(activeResult.computedAt)}
                </span>
              </div>
              {isHumanReview ? (
                <span className="max-w-xs text-right text-xs text-textSecondary">
                  Маршрут, уверенность и риски подтвердит оператор после ручной проверки.
                </span>
              ) : (
                <Link
                  to={`/trust?case=${encodeURIComponent(activeCase.id)}`}
                  className="inline-flex items-center gap-2 text-xs text-accent"
                >
                  <Sparkles className="h-3 w-3" />
                  Разобрать уверенность
                </Link>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-semibold text-textPrimary sm:text-4xl">
                {activeCase.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-textSecondary">
                Следующее действие: {activeResult.nextAction.label}. {activeResult.nextAction.detail}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleNextActionClick}>
                {activeResult.nextAction.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => void recompute(activeCase.id)}>
                Пересчитать заново
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.section>

      {isHumanReview ? (
        <motion.section variants={staggerChild}>
          <Card className="grid gap-3">
            <p className="text-sm font-medium text-textPrimary">Ручная проверка в работе</p>
            <p className="text-sm text-textSecondary">
              Автомат остановился на передаче кейса оператору: пока человек не подтвердит
              решение, мы не показываем основной маршрут, оценку уверенности и карту рисков.
            </p>
            {humanReviewTriggers.length > 0 && (
              <div className="grid gap-2">
                {humanReviewTriggers.map((rule) => (
                  <div
                    key={rule.ruleId}
                    className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-textPrimary">{rule.ruleId}</p>
                    <p className="mt-1 text-xs text-textSecondary">{rule.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.section>
      ) : (
        <motion.section variants={staggerChild}>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-textPrimary">Уверенность движка</p>
              <span className="text-[11px] uppercase tracking-wide text-textMuted">
                применены пределы:{" "}
                {activeResult.trust.confidenceBreakdown.capsApplied.length
                  ? activeResult.trust.confidenceBreakdown.capsApplied.join(", ")
                  : "нет"}
              </span>
            </div>
            <ConfidenceGauge
              breakdown={activeResult.trust.confidenceBreakdown}
              accentColor={tone.accent}
            />
          </Card>
        </motion.section>
      )}

      {!isHumanReview && activeResult.criticalRisk && (
        <motion.section variants={staggerChild}>
          <Card padding="none" className="overflow-hidden">
            <div className="p-5">
              <p className="text-[11px] uppercase tracking-wide text-textMuted">Критический риск</p>
              <div className="mt-2">
                <RiskPulse risk={activeResult.criticalRisk} />
              </div>
            </div>
          </Card>
        </motion.section>
      )}

      {!isHumanReview && activeResult.risks.length > 0 && (
        <motion.section variants={staggerChild}>
          <Card className="grid gap-3">
            <p className="text-sm font-medium text-textPrimary">Риски в работе</p>
            <div className="grid gap-2 md:grid-cols-2">
              {activeResult.risks.map((risk) => (
                <RiskPulse key={risk.id} risk={risk} />
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {!isHumanReview && primaryOffer ? (
        <motion.section variants={staggerChild} className="grid gap-3">
          <p className="text-sm font-medium text-textPrimary">
            {isTravelOffer(primaryOffer)
              ? "Основной маршрут"
              : isResidencyOffer(primaryOffer)
                ? "Основная программа"
                : "Основной полис"}
          </p>
          <OfferCard offer={primaryOffer} selected showBoosts />
        </motion.section>
      ) : !isHumanReview ? (
        <motion.section variants={staggerChild}>
          <EmptyState
            title="Сейчас подходящего варианта нет"
            description="Либо сработал блокер, либо правило ушло в ручную проверку. Смотрите риски и объяснение решения ниже."
          />
        </motion.section>
      ) : null}

      {!isHumanReview && alternativeOffers.length > 0 && (
        <motion.section variants={staggerChild}>
          <Card className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-textPrimary">Свайп-сравнение альтернатив</p>
                <p className="text-xs text-textSecondary">
                  Свайп влево — отклонить, вправо — добавить в шорт-лист. Предпочтения уходят в ранжировщик.
                </p>
              </div>
              <Badge tone="neutral">{alternativeOffers.length} вариантов</Badge>
            </div>
            <SwipeDeck
              offers={alternativeOffers as Offer[]}
              dismissReasons={dismissReasons}
              onShortlist={(offerId) =>
                toast.push(`Вариант ${offerId} в шорт-листе — ранжировщик учтёт.`, "success")
              }
              onDismiss={(offerId, reason) =>
                toast.push(
                  reason
                    ? `Вариант ${offerId} отклонён: ${reason}.`
                    : `Вариант ${offerId} отклонён — уронит вес в следующий пересчёт.`,
                  "info"
                )
              }
              onPreferencesChange={(decisions) => void handlePreferences(decisions)}
            />
            {preferences.length > 0 && (
              <p className="text-xs text-textMuted">
                Активные предпочтения: {preferences.map((p) => `${p.id} (${p.weight >= 0 ? "+" : ""}${p.weight.toFixed(2)})`).join(", ")}
              </p>
            )}
          </Card>
        </motion.section>
      )}

      {!isHumanReview && (
        <motion.section variants={staggerChild}>
          <Card className="grid gap-3">
            <p className="text-sm font-medium text-textPrimary">Почему такое решение</p>
            <div className="grid gap-2">
              {activeResult.whyBullets.map((bullet) => (
                <ExpandableRow
                  key={bullet.id}
                  id={bullet.id}
                  title={bullet.text}
                  subtitle={`Правило ${bullet.ruleId} · сигналы: ${bullet.signalIds.join(", ")}`}
                  right={
                    <Badge
                      tone={
                        bullet.tone === "positive"
                          ? "positive"
                          : bullet.tone === "negative"
                            ? "negative"
                            : bullet.tone === "review"
                              ? "review"
                              : bullet.tone === "warning"
                                ? "warning"
                                : "neutral"
                      }
                    >
                      {bullet.ruleId}
                    </Badge>
                  }
                  screen={screenName}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-textMuted">Влияющие сигналы</p>
                      <div className="mt-2 grid gap-1">
                        {activeResult.decisionSignals
                          .filter((signal) => bullet.signalIds.includes(signal.id))
                          .map((signal) => (
                            <SignalRow key={signal.id} signal={signal} />
                          ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-textMuted">Действие правила</p>
                      <ul className="mt-2 grid gap-1 text-xs text-textSecondary">
                        {activeResult.ruleResults
                          .filter((rule) => rule.ruleId === bullet.ruleId)
                          .map((rule) => (
                            <li key={rule.ruleId} className="rounded-lg bg-surface-2 px-3 py-2">
                              <p className="text-textPrimary">{rule.explanation}</p>
                              <p className="mt-1 text-textMuted">
                                Тип: {rule.output.type}
                                {rule.output.severity ? `, уровень ${rule.output.severity}` : ""}
                              </p>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </ExpandableRow>
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {whatIfConfig && (
        <motion.section variants={staggerChild}>
          <TemporalWhatIf
            label={whatIfConfig.label}
            baseValue={baseWhatIfValue}
            unit={whatIfConfig.unit}
            min={whatIfConfig.min}
            max={whatIfConfig.max}
            onApply={handleTemporalApply}
            loading={status === "loading"}
          />
        </motion.section>
      )}

      {!isHumanReview && (
        <motion.section variants={staggerChild}>
          <Card className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-textPrimary">Реплей шагов движка</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void loadAudit(activeCase.id);
                  track({ type: "replay_opened", caseId: activeCase.id });
                }}
                leadingIcon={<Sparkles className="h-3 w-3" />}
              >
                Загрузить аудит
              </Button>
            </div>
            <AnimatePresence>
              {audit && (
                <motion.div
                  key="replay"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ReplayTimeline trail={audit.trail} />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.section>
      )}

      <motion.section variants={staggerChild}>
        <ForkDivider onFork={handleFork} disabled={status === "loading"} />
        <Card className="grid gap-3">
          <p className="text-sm font-medium text-textPrimary">Сценарный форк</p>
          <p className="text-xs text-textSecondary">
            Форк создаёт независимую копию кейса. Меняйте сигналы и сравнивайте два
            решения бок-о-бок — исходный кейс остаётся нетронутым.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leadingIcon={<GitBranch className="h-4 w-4" />}
              onClick={handleFork}
            >
              Форкнуть кейс
            </Button>
            <Link to="/profile">
              <Button variant="ghost">Открыть все кейсы</Button>
            </Link>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="grid gap-2">
          <p className="text-sm font-medium text-textPrimary">Общий снимок решения</p>
          <p className="text-xs text-textSecondary">
            Версия контракта: {activeResult.version}. Продукт:{" "}
            {activeResult.productType}.{" "}
            {isHumanReview
              ? "Финальный маршрут, уровень уверенности и карту рисков подтвердит оператор."
              : `Вычислено за ${activeResult.auditTrail.totalMs.toFixed(1)} мс · уверенность ${formatPercent(activeResult.trust.confidence)}.`}
          </p>
          {activeResult.assumptions.length > 0 && (
            <ul className="mt-1 grid gap-1 text-xs text-textMuted">
              {activeResult.assumptions.map((item) => (
                <li key={item.id}>• {item.label}</li>
              ))}
            </ul>
          )}
        </Card>
      </motion.section>
    </motion.div>
  );
}
