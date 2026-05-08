import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ListChecks, Menu, ShieldCheck, Sparkles } from "lucide-react";
import type { ProductType } from "@shared/contracts";
import { useNavigate } from "react-router-dom";
import { useCaseStore } from "@/state/caseStore";
import { useProductAutopilot } from "@/hooks/useProductAutopilot";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";
import { fadeRise, staggerChild, staggerParent } from "@/animations/variants";
import {
  BrandMark,
  HeaderButton,
  PrimaryCTA,
  ScreenHeader,
  SectionLabel,
  SurfacePill
} from "@/components/ah/ScreenCore";
import { SemanticBridge } from "@/components/ah/SemanticBridge";
import { AIInsightChip } from "@/components/ah/SignalBlocks";
import {
  buildLandingScreenModel,
  type LandingBenefitTone
} from "@/presentation/activeHolidays";

const benefitIconByTone: Record<LandingBenefitTone, typeof ShieldCheck> = {
  result: ShieldCheck,
  need: ListChecks,
  ai: Sparkles
};

const benefitIconClassByTone: Record<LandingBenefitTone, string> = {
  result: "text-success",
  need: "text-accent",
  ai: "text-ai"
};

export function LandingScreen() {
  useScreenView("landing");

  const navigate = useNavigate();
  const bootstrap = useCaseStore((state) => state.bootstrap);
  const scenarios = useCaseStore((state) => state.scenarios);
  const status = useCaseStore((state) => state.status);
  const autopilotProduct = useProductAutopilot();
  const [productType, setProductType] = useState<ProductType>(autopilotProduct.suggestion);
  const [activeBridgeNode, setActiveBridgeNode] = useState<string>("check");
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.productType === productType) ?? null,
    [scenarios, productType]
  );
  const screenModel = useMemo(
    () =>
      buildLandingScreenModel({
        productType,
        selectedScenarioCaseId: selectedScenario?.caseId ?? null
      }),
    [productType, selectedScenario?.caseId]
  );

  useEffect(() => {
    setActiveBridgeNode(screenModel.bridge.defaultNodeId);
  }, [screenModel.bridge.defaultNodeId]);

  function handleStart() {
    track({ type: "cta_clicked", cta: `landing_start_${productType}` });
    navigate(screenModel.cta.startPath);
  }

  function handleOpenExample() {
    if (selectedScenario) {
      track({ type: "cta_clicked", cta: `landing_scenario_${selectedScenario.caseId}` });
    }
    navigate(screenModel.cta.examplePath);
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="ah-ambient-frame min-h-screen bg-base"
    >
      <div className="relative flex min-h-screen w-full max-w-none flex-col gap-6 px-0 py-0">
        <motion.div variants={staggerChild}>
          <ScreenHeader
            left={
              <div className="flex min-w-0 items-center gap-4">
                <BrandMark className="h-12 w-12" />
                <span className="text-[16px] font-bold text-textPrimary">
                  Active Holidays
                </span>
              </div>
            }
            right={
              <HeaderButton
                icon={<Menu className="h-5 w-5" />}
                onClick={() => navigate(screenModel.cta.startPath)}
                aria-label="Открыть меню"
              />
            }
          />
        </motion.div>

        <motion.section variants={staggerChild} className="grid gap-6">
          <SectionLabel tone="ai">{screenModel.eyebrow}</SectionLabel>
          <motion.div variants={fadeRise} className="grid gap-4">
            <h1 className="max-w-[360px] text-[58px] font-extrabold leading-[0.92] tracking-[-0.05em] text-textPrimary">
              <span className="block">{screenModel.headline[0]}</span>
              <span className="mt-1 block">{screenModel.headline[1]}</span>
              <span className="mt-1 block text-accent">{screenModel.headline[2]}</span>
            </h1>
            <p className="max-w-[380px] text-[16px] leading-[1.35] text-textSecondary">
              {screenModel.subline}
            </p>
          </motion.div>
        </motion.section>

        <motion.section variants={staggerChild} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {screenModel.productPills.map((item) => (
            <SurfacePill
              key={item.productType}
              label={item.label}
              active={item.productType === productType}
              onClick={() => {
                setProductType(item.productType);
                setAiOpen(false);
                track({ type: "cta_clicked", cta: `landing_switch_${item.productType}` });
              }}
            />
          ))}
        </motion.section>

        <motion.section variants={staggerChild} className="grid gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-textMuted">
            Живой маршрут
          </p>
          <SemanticBridge
            leftChip={screenModel.bridge.leftChip}
            rightChip={screenModel.bridge.rightChip}
            nodes={screenModel.bridge.nodes}
            activeNodeId={activeBridgeNode}
            onNodeSelect={setActiveBridgeNode}
            onBridgeTap={() => setActiveBridgeNode((current) => {
              const index = screenModel.bridge.nodes.findIndex((node) => node.id === current);
              return (
                screenModel.bridge.nodes[(index + 1) % screenModel.bridge.nodes.length]?.id ??
                screenModel.bridge.defaultNodeId
              );
            })}
          />
          <p className="text-sm text-textSecondary">{screenModel.bridge.nodeSummary[activeBridgeNode]}</p>
        </motion.section>

        <motion.section variants={staggerChild} className="grid gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-textMuted">
            Что получаешь сразу
          </p>
          <div className="grid gap-3">
            {screenModel.benefits.map((item) => {
              const Icon = benefitIconByTone[item.tone];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-[24px] border border-border bg-surface px-4 py-4"
                >
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2 ${benefitIconClassByTone[item.tone]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[18px] font-semibold text-textPrimary">{item.title}</p>
                    <p className="mt-1 text-sm text-textSecondary">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section variants={staggerChild}>
          <AIInsightChip
            summary={screenModel.ai.summary}
            reasons={screenModel.ai.reasons}
            action={screenModel.ai.action}
            expanded={aiOpen}
            onToggle={() => setAiOpen((current) => !current)}
          />
        </motion.section>

        <motion.section variants={staggerChild} className="mt-auto grid gap-4 pb-2">
          <PrimaryCTA
            label={screenModel.cta.label}
            subcopy={screenModel.cta.subcopy}
            onClick={handleStart}
            trailing={<ArrowRight className="h-4 w-4" />}
          />
          <button
            type="button"
            onClick={handleOpenExample}
            className="text-center text-sm font-semibold text-textSecondary transition hover:text-textPrimary"
            data-testid="landing-primary-cta"
          >
            {status === "loading"
              ? "Подгружаем живой пример"
              : selectedScenario
                ? "Посмотреть пример результата"
                : "Открыть экран результата"}
          </button>
        </motion.section>
      </div>
    </motion.div>
  );
}
