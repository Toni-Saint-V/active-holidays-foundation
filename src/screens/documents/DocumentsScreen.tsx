import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { ReadinessCircle } from "@/ui/ReadinessCircle";
import { DocumentCard } from "@/ui/DocumentCard";
import { EmptyState } from "@/ui/EmptyState";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { track } from "@/instrumentation/events";
import { defaultCaseIdForProduct } from "@/lib/caseDefaults";
import { buildDocumentsScreenModel } from "@/presentation/activeHolidays";

export function DocumentsScreen() {
  useScreenView("documents");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    scenarios,
    bootstrap,
    loadCase,
    patchSignal,
    status,
    errorMessage
  } = useCaseStore();

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
        title="Ошибка загрузки документов"
        description={errorMessage ?? "Попробуйте обновить страницу."}
      />
    );
  }

  if (!activeCase || !activeResult) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Готовим документный трек…</p>
      </Card>
    );
  }

  const readiness = activeResult.documents;
  const screenModel = buildDocumentsScreenModel({ result: activeResult });

  if (activeResult.verdict === "HUMAN_REVIEW") {
    return (
      <EmptyState
        title={screenModel.gate?.title ?? "Документный трек откроет оператор"}
        description={
          screenModel.gate?.description ??
          "Пока кейс на ручной проверке, мы не показываем пакет документов и шаги подачи."
        }
        action={
          <Button variant="secondary" onClick={() => navigate("/human-review")}>
            {screenModel.gate?.actionLabel ?? "Вернуться к ручной проверке"}
          </Button>
        }
      />
    );
  }

  async function markReady() {
    if (!activeCase) return;
    const next = Math.min(readiness.readyCount + 1, readiness.requiredCount);
    track({ type: "cta_clicked", cta: "documents_mark_ready" });
    await patchSignal(activeCase.id, "documents_ready_count", next);
    toast.push("Отметили документ как готовый — пересчитали движком.", "success");
  }

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
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                {screenModel.readiness.eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-textPrimary">
                {screenModel.readiness.heading}
              </h2>
              <p className="mt-2 text-sm text-textSecondary">{screenModel.readiness.summary}</p>
            </div>
            <Badge tone={screenModel.readiness.badgeTone}>
              {screenModel.readiness.badgeLabel}
            </Badge>
          </div>
          <div className="mt-4">
            <ReadinessCircle readiness={readiness} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={markReady}>
              <FileText className="h-3 w-3" /> {screenModel.readiness.primaryActionLabel}
            </Button>
            <Link to={`/result?case=${encodeURIComponent(activeCase.id)}`}>
              <Button variant="secondary" size="sm">
                {screenModel.readiness.secondaryActionLabel}
              </Button>
            </Link>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-3 text-sm font-medium text-textPrimary">{screenModel.requirements.heading}</p>
          {screenModel.requirements.items.length === 0 ? (
            <p className="text-sm text-textSecondary">
              {screenModel.requirements.emptyMessage}
            </p>
          ) : (
            <div className="grid gap-2">
              {screenModel.requirements.items.map((item) => (
                <DocumentCard
                  key={item.id}
                  item={{ id: item.id, label: item.label, status: item.status, detail: item.detail }}
                />
              ))}
            </div>
          )}
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-2 text-sm font-medium text-textPrimary">{screenModel.nextStep.heading}</p>
          <p className="text-sm text-textSecondary">{screenModel.nextStep.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/${screenModel.nextStep.targetScreen}?case=${encodeURIComponent(activeCase.id)}`)}>
              {screenModel.nextStep.ctaLabel}
            </Button>
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}
