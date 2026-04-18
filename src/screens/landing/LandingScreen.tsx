import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch, MapPin, Sparkles } from "lucide-react";
import type { ProductType } from "@shared/contracts";
import { productLabelsRu } from "@shared/contracts";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { FlagIcon } from "@/ui/FlagIcon";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";
import { staggerChild, staggerParent, fadeRise } from "@/animations/variants";
import { formatDateOnly } from "@/lib/format";
import { verdictTone } from "@/theme/tokens";
import { useProductAutopilot } from "@/hooks/useProductAutopilot";

const flagPairByCaseId: Record<string, [string, string]> = {
  "s1-rf-italy": ["RU", "IT"],
  "s2-tr-spb": ["TR", "RU"],
  "s3-us-spb-business": ["US", "RU"],
  "s4-rf-residency-dnv": ["RU", "ES"],
  "s5-rf-italy-insurance": ["RU", "IT"]
};

const routeByProduct: Record<ProductType, string> = {
  travel: "/result",
  residency_es: "/residency-es",
  insurance_adult: "/insurance-adult"
};

export function LandingScreen() {
  useScreenView("landing");
  const navigate = useNavigate();
  const bootstrap = useCaseStore((state) => state.bootstrap);
  const scenarios = useCaseStore((state) => state.scenarios);
  const status = useCaseStore((state) => state.status);
  const autopilotProduct = useProductAutopilot();
  const [productType, setProductType] = useState<ProductType>(autopilotProduct.suggestion);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  const filteredScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.productType === productType),
    [scenarios, productType]
  );

  const handleOpen = (caseId: string) => {
    track({ type: "cta_clicked", cta: `landing_scenario_${caseId}` });
    const scenario = scenarios.find((item) => item.caseId === caseId);
    const target = scenario ? routeByProduct[scenario.productType] : "/result";
    navigate(`${target}?case=${encodeURIComponent(caseId)}`);
  };

  function handleStartIntake() {
    track({ type: "cta_clicked", cta: `landing_start_${productType}` });
    const seedCase = scenarios.find((item) => item.productType === productType);
    if (seedCase) {
      navigate(`/intake?case=${encodeURIComponent(seedCase.caseId)}`);
    } else {
      navigate("/intake");
    }
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-5"
    >
      <motion.section variants={staggerChild}>
        <Card className="overflow-hidden">
          <motion.div variants={fadeRise} className="grid gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-accent">
              <Sparkles className="h-3 w-3" />
              Детерминированная платформа решений
            </div>
            <h2 className="text-3xl font-semibold text-textPrimary sm:text-4xl">
              Поездки, ВНЖ Испании и страховки — на одном движке
            </h2>
            <p className="max-w-2xl text-sm text-textSecondary sm:text-base">
              Один RDC-пайплайн, три вертикали. Выбор продукта, адаптивная анкета, живой
              предпросмотр вердикта и общий реплей шагов движка.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                value={productType}
                onChange={(value) => {
                  setProductType(value);
                  track({ type: "cta_clicked", cta: `landing_switch_${value}` });
                }}
                options={[
                  { value: "travel", label: productLabelsRu.travel },
                  { value: "residency_es", label: productLabelsRu.residency_es },
                  { value: "insurance_adult", label: productLabelsRu.insurance_adult }
                ]}
              />
              {autopilotProduct.reason && (
                <span className="text-[11px] text-textMuted">
                  Автопилот предложил: {productLabelsRu[autopilotProduct.suggestion]} ({autopilotProduct.reason}).
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button onClick={handleStartIntake}>
                Начать анкету · {productLabelsRu[productType]}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to={routeByProduct[productType]}>
                <Button variant="secondary">Открыть вердикт для вертикали</Button>
              </Link>
            </div>
          </motion.div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Сценарии</p>
            <h3 className="text-xl font-semibold text-textPrimary">
              Запечатанные кейсы · {productLabelsRu[productType]}
            </h3>
          </div>
          <span className="text-xs text-textSecondary">
            данные на {formatDateOnly("2026-04-17T00:00:00.000Z")}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {status === "loading" && filteredScenarios.length === 0
            ? [0, 1, 2].map((index) => (
                <Card key={index} className="h-44 animate-pulse bg-surface-2" />
              ))
            : filteredScenarios.length === 0
              ? [
                  <Card key="empty" padding="md" className="flex flex-col items-center gap-2 text-center">
                    <p className="text-sm text-textSecondary">
                      Пока нет сценариев в этой вертикали.
                    </p>
                  </Card>
                ]
              : filteredScenarios.map((scenario) => {
                  const tone = verdictTone[scenario.expectedVerdict];
                  const [from, to] = flagPairByCaseId[scenario.caseId] ?? ["RU", "RU"];
                  return (
                    <Card
                      key={scenario.caseId}
                      className="flex cursor-pointer flex-col gap-3 transition hover:border-borderStrong"
                      onClick={() => handleOpen(scenario.caseId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FlagIcon code={from} />
                          <MapPin className="h-3 w-3 text-textSecondary" />
                          <FlagIcon code={to} />
                        </div>
                        <Badge
                          tone={
                            scenario.expectedVerdict === "GO"
                              ? "positive"
                              : scenario.expectedVerdict === "NOT_NOW"
                                ? "negative"
                                : scenario.expectedVerdict === "HUMAN_REVIEW"
                                  ? "review"
                                  : "warning"
                          }
                        >
                          {tone.label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{scenario.title}</p>
                        <p className="mt-1 text-xs text-textSecondary">{scenario.subtitle}</p>
                      </div>
                      <p className="text-xs text-textMuted">{scenario.note}</p>
                      <div className="mt-auto flex items-center gap-2 text-xs text-accent">
                        <span>Открыть готовый вердикт</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </Card>
                  );
                })}
        </div>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Мульти-продукт</p>
              <h3 className="mt-1 text-lg font-semibold text-textPrimary">
                Контракты и рулебук общие, сигналы свои
              </h3>
            </div>
            <div className="sm:col-span-2 grid gap-2 text-sm text-textSecondary">
              <p>
                <span className="text-textPrimary">Поездка</span> — 15 правил по визам,
                срокам, документам и маршрутам.
              </p>
              <p>
                <span className="text-textPrimary">ВНЖ Испании</span> — R16..R22,
                Golden Visa закрыт законом 2025-04-03, переход на NLV и DNV честный.
              </p>
              <p>
                <span className="text-textPrimary">Страховка</span> — R23..R28, фильтр
                по шенген-минимуму, возрасту, хроникам и активностям.
              </p>
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
              Сравните гипотезы
            </p>
            <p className="mt-1 text-sm text-textPrimary">
              Форк-режим создаёт независимые копии кейсов — для параллельного сравнения.
            </p>
          </div>
          <Link to="/profile">
            <Button variant="secondary" leadingIcon={<GitBranch className="h-4 w-4" />}>
              Мои кейсы и форки
            </Button>
          </Link>
        </Card>
      </motion.section>
    </motion.div>
  );
}
