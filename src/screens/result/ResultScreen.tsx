import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MoreHorizontal } from "lucide-react";
import type { ProductType } from "@shared/contracts";
import { useCaseStore } from "@/state/caseStore";
import { EmptyState } from "@/ui/EmptyState";
import { BottomSheet } from "@/ui/BottomSheet";
import { useToast } from "@/ui/Toast";
import { defaultCaseByProduct, findScenarioCaseId } from "@/lib/caseDefaults";
import {
  resolveCountryHeroImage,
  resolveResultDestinationCountry
} from "@/lib/countryHeroImage";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";
import { fadeRise, staggerChild, staggerParent } from "@/animations/variants";
import {
  HeaderButton,
  PrimaryCTA,
  ScreenHeader,
  SectionLabel,
  UtilityLink
} from "@/components/ah/ScreenCore";
import { SemanticBridge } from "@/components/ah/SemanticBridge";
import {
  AIInsightChip,
  DocumentRow,
  EvidenceStrip
} from "@/components/ah/SignalBlocks";
import { ResultCompareSurface } from "./ResultCompareSurface";
import { AiRecommendationPanel } from "./AiRecommendationPanel";
import { buildResultScreenModel } from "@/presentation/activeHolidays";

type ResultScreenProps = {
  productType?: ProductType;
  screenName?: string;
};

type SheetMode = "basis" | "compare" | "tools" | "ai" | null;

const countryLabels: Record<string, string> = {
  IT: "Италия",
  ES: "Испания",
  FR: "Франция",
  GR: "Греция"
};

export function ResultScreen({ productType, screenName = "result" }: ResultScreenProps = {}) {
  useScreenView(screenName);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeBridgeNode, setActiveBridgeNode] = useState<"docs" | "step" | "review">("docs");

  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    activeScenarioLab,
    scenarios,
    audit,
    bootstrap,
    loadCase,
    loadAudit,
    recompute,
    fork,
    scenarioLabError,
    scenarioLabStatus,
    status,
    errorMessage
  } = useCaseStore();

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  const defaultCaseId = useMemo(() => {
    if (!productType) return scenarios[0]?.caseId ?? defaultCaseByProduct.travel;
    return findScenarioCaseId(scenarios, productType);
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
  }, [requestedCaseId, activeCaseMatchesProduct, activeCaseId, defaultCaseId, loadCase]);

  const screenModel = useMemo(
    () =>
      activeResult
        ? buildResultScreenModel({
            result: activeResult,
            scenarioLab: activeScenarioLab
          })
        : null,
    [activeResult, activeScenarioLab]
  );

  useEffect(() => {
    if (!screenModel) return;
    setActiveBridgeNode(screenModel.bridge.activeNodeId);
  }, [screenModel]);

  if (status === "error") {
    return (
      <EmptyState
        title="Ошибка загрузки"
        description={errorMessage ?? "Попробуйте обновить кейс или открыть другой сценарий."}
        action={
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface2 px-4 text-sm font-semibold text-textPrimary"
            onClick={() => loadCase(defaultCaseId)}
          >
            Загрузить сценарий
          </button>
        }
      />
    );
  }

  if (!activeResult || !activeCase) {
    return (
      <div className="min-h-screen bg-base px-0 py-0">
        <div className="flex min-h-screen w-full items-center justify-center bg-surface/30">
          <p className="text-sm text-textSecondary">Собираем результат по кейсу…</p>
        </div>
      </div>
    );
  }

  const result = activeResult;
  const caseData = activeCase;
  const destinationCountry = resolveResultDestinationCountry(result, caseData);
  const heroImage = resolveCountryHeroImage(destinationCountry);
  const destinationLabel = destinationCountry
    ? countryLabels[destinationCountry] ?? destinationCountry
    : null;
  const model = buildResultScreenModel({
    result,
    scenarioLab: activeScenarioLab
  });

  function handleNextActionClick() {
    track({ type: "cta_clicked", cta: `result_primary_${result.nextAction.type}` });
    navigate(`/${model.cta.targetScreen}?case=${encodeURIComponent(caseData.id)}`);
  }

  async function handleFork() {
    const forkedId = await fork(caseData.id, `Форк кейса ${caseData.title}`);
    if (forkedId) {
      toast.push("Создан форк кейса.", "success");
      navigate(`/result?case=${encodeURIComponent(forkedId)}`);
      setSheet(null);
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }

  return (
    <>
      <motion.div
        variants={staggerParent}
        initial="initial"
        animate="animate"
        className="ah-ambient-frame min-h-screen bg-base px-0 py-0"
      >
        {heroImage ? (
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="h-full w-full scale-[1.08] object-cover opacity-[0.5] blur-[1px]"
            />
            <div className="absolute inset-0 bg-base/44" />
          </div>
        ) : null}
        <div className="relative flex min-h-screen w-full max-w-none flex-col gap-4">
          {heroImage && destinationLabel ? (
            <div className="pointer-events-none absolute right-0 top-16 z-10 rounded-2xl border border-white/15 bg-black/25 p-1.5 backdrop-blur-sm">
              <div className="h-20 w-20 overflow-hidden rounded-xl border border-white/10">
                <img src={heroImage} alt="" aria-hidden className="h-full w-full object-cover" />
              </div>
              <p className="mt-1 text-center text-[10px] uppercase tracking-[0.12em] text-textSecondary">
                {destinationLabel}
              </p>
            </div>
          ) : null}
          <motion.div variants={staggerChild}>
            <ScreenHeader
              left={
                <HeaderButton
                  icon={<ArrowLeft className="h-5 w-5" />}
                  onClick={handleBack}
                  aria-label="Назад"
                />
              }
              center={
                <span className="text-base font-semibold text-textPrimary">Результат</span>
              }
              right={
                <HeaderButton
                  icon={<MoreHorizontal className="h-5 w-5" />}
                  onClick={() => setSheet("tools")}
                  aria-label="Открыть инструменты"
                />
              }
            />
          </motion.div>

          <motion.section variants={staggerChild} className="grid gap-4">
            <SectionLabel tone={result.verdict === "HUMAN_REVIEW" ? "info" : "need"}>
              {model.eyebrow}
            </SectionLabel>
            <motion.div variants={fadeRise} className="grid gap-3">
              <h1 className="text-[38px] font-extrabold leading-[0.96] tracking-[-0.05em] text-textPrimary">
                {model.heading}
              </h1>
              <p className="text-[14px] text-textMuted">{model.meta}</p>
              <p className="max-w-[380px] text-[16px] leading-[1.34] text-textSecondary">
                {model.supportingLine}
              </p>
            </motion.div>
          </motion.section>

          <motion.section variants={staggerChild}>
            <PrimaryCTA
              label={model.cta.label}
              subcopy={model.cta.subcopy}
              onClick={handleNextActionClick}
              trailing={<ArrowRight className="h-4 w-4" />}
              compact
            />
          </motion.section>

          <motion.section variants={staggerChild} className="grid gap-3">
            <SemanticBridge
              leftChip={model.bridge.leftChip}
              rightChip={model.bridge.rightChip}
              nodes={model.bridge.nodes}
              activeNodeId={activeBridgeNode}
              onNodeSelect={(id) => setActiveBridgeNode(id as "docs" | "step" | "review")}
              onBridgeTap={() => setSheet("basis")}
            />
            <p className="text-sm text-textSecondary">{model.bridge.summary[activeBridgeNode]}</p>
          </motion.section>

          <motion.section variants={staggerChild}>
            <EvidenceStrip signals={model.evidence} />
          </motion.section>

          <motion.section variants={staggerChild} className="grid gap-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-1">
                <SectionLabel tone="need">{model.workSection.eyebrow}</SectionLabel>
                <h2 className="break-words text-[28px] font-extrabold leading-[1] tracking-[-0.03em] text-textPrimary sm:text-[32px]">
                  {model.workSection.heading}
                </h2>
              </div>
              <div className="flex w-full items-center gap-4 sm:w-auto">
                <UtilityLink onClick={() => setSheet("basis")}>Основание</UtilityLink>
                <UtilityLink onClick={() => setSheet("compare")}>Сравнить</UtilityLink>
              </div>
            </div>
            <div className="grid gap-3">
              {model.workSection.rows.map((item) => (
                <DocumentRow
                  key={item.id}
                  title={item.title}
                  meta={item.meta}
                  status={item.status}
                  tone={item.tone}
                />
              ))}
            </div>
          </motion.section>

          <motion.section variants={staggerChild}>
            <AIInsightChip
              summary={model.ai.summary}
              reasons={model.ai.reasons}
              action={model.ai.action}
              expanded={aiOpen}
              onToggle={() => setAiOpen((current) => !current)}
              onOpenFull={() => setSheet("ai")}
            />
          </motion.section>

          {model.compareCard ? (
            <motion.section variants={staggerChild} className="mt-auto pb-2">
              <button
                type="button"
                onClick={() => setSheet("compare")}
                className="flex w-full items-center justify-between rounded-[24px] border border-border bg-surface2 px-4 py-4 text-left transition hover:border-borderStrong"
              >
                <div>
                  <p className="text-sm font-semibold text-textPrimary">
                    {model.compareCard.title}
                  </p>
                  <p className="mt-1 text-sm text-textSecondary">
                    {model.compareCard.summary}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
                  secondary
                </span>
              </button>
            </motion.section>
          ) : null}
        </div>
      </motion.div>

      <BottomSheet
        open={sheet === "basis"}
        onClose={() => setSheet(null)}
        title="Основание решения"
      >
        <div className="grid gap-4">
          <div className="rounded-[20px] border border-border bg-surface2 px-4 py-4">
            <p className="text-sm font-semibold text-textPrimary">Почему такое решение</p>
            <div className="mt-3 grid gap-2">
              {model.basisSheet.whyBullets.map((bullet) => (
                <p key={bullet} className="text-sm text-textSecondary">
                  {bullet}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-border bg-surface2 px-4 py-4">
            <p className="text-sm font-semibold text-textPrimary">Доверие и ограничения</p>
            <p className="mt-3 text-sm text-textSecondary">{model.basisSheet.trustSummary}</p>
            {model.basisSheet.topRiskLabels.map((riskLabel) => (
              <p key={riskLabel} className="mt-2 text-sm text-textSecondary">
                {riskLabel}
              </p>
            ))}
            <div className="mt-4">
              <Link
                to={`/human-review?case=${encodeURIComponent(caseData.id)}`}
                className="text-sm font-semibold text-info"
                onClick={() => setSheet(null)}
              >
                Передать кейс эксперту
              </Link>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "compare"}
        onClose={() => setSheet(null)}
        title="Сравнить сценарии"
      >
        <ResultCompareSurface
          lab={activeScenarioLab}
          loading={scenarioLabStatus === "loading"}
          errorMessage={scenarioLabError}
          onOpenTarget={(targetScreen) => {
            setSheet(null);
            navigate(`/${targetScreen}?case=${encodeURIComponent(caseData.id)}`);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "ai"}
        onClose={() => setSheet(null)}
        title="AI-разбор"
      >
        <AiRecommendationPanel
          caseId={caseData.id}
          computedAt={result.computedAt}
          preferences={caseData.preferences}
          onOpenScenario={(scenarioCaseId) => {
            setSheet(null);
            navigate(`/result?case=${encodeURIComponent(scenarioCaseId)}`);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "tools"}
        onClose={() => setSheet(null)}
        title="Инструменты кейса"
      >
        <div className="grid gap-3">
          <button
            type="button"
            className="rounded-[18px] border border-border bg-surface2 px-4 py-4 text-left text-sm font-semibold text-textPrimary"
            onClick={() => {
              void recompute(caseData.id);
              setSheet(null);
            }}
          >
            Пересчитать кейс
          </button>
          <button
            type="button"
            className="rounded-[18px] border border-border bg-surface2 px-4 py-4 text-left text-sm font-semibold text-textPrimary"
            onClick={() => void handleFork()}
          >
            Форкнуть кейс
          </button>
          <button
            type="button"
            className="rounded-[18px] border border-border bg-surface2 px-4 py-4 text-left text-sm font-semibold text-textPrimary"
            onClick={() => {
              void loadAudit(caseData.id);
              setSheet(null);
            }}
          >
            Загрузить аудит
          </button>
          {audit ? (
            <div className="rounded-[18px] border border-border bg-surface2 px-4 py-4">
              <p className="text-sm text-textSecondary">
                Аудит загружен: {audit.trail.totalMs.toFixed(1)} мс.
              </p>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
