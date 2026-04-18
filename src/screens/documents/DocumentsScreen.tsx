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
    const target = caseIdFromUrl ?? activeCaseId ?? scenarios[0]?.caseId ?? "s1-rf-italy";
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

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

  if (activeResult.verdict === "HUMAN_REVIEW") {
    return (
      <EmptyState
        title="Документный трек откроет оператор"
        description="Пока кейс на ручной проверке, мы не показываем пакет документов и шаги подачи."
        action={
          <Button variant="secondary" onClick={() => navigate("/human-review")}>
            Вернуться к ручной проверке
          </Button>
        }
      />
    );
  }

  const readiness = activeResult.documents;

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
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Документы</p>
              <h2 className="mt-1 text-2xl font-semibold text-textPrimary">
                Индекс готовности
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                {readiness.score >= 0.99
                  ? "Пакет собран — можно подавать."
                  : readiness.score >= 0.5
                    ? "Базовая часть готова, осталось добрать несколько документов."
                    : "Рано подавать: нужно готовить ключевые документы."}
              </p>
            </div>
            <Badge tone={readiness.score >= 0.8 ? "positive" : readiness.score >= 0.5 ? "warning" : "negative"}>
              {Math.round(readiness.score * 100)}%
            </Badge>
          </div>
          <div className="mt-4">
            <ReadinessCircle readiness={readiness} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={markReady}>
              <FileText className="h-3 w-3" /> Отметить документ как готовый
            </Button>
            <Link to={`/result?case=${encodeURIComponent(activeCase.id)}`}>
              <Button variant="secondary" size="sm">
                Вернуться к вердикту
              </Button>
            </Link>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-3 text-sm font-medium text-textPrimary">
            Требования основного маршрута
          </p>
          {readiness.items.length === 0 ? (
            <p className="text-sm text-textSecondary">
              Список появится, когда движок найдёт основной маршрут.
            </p>
          ) : (
            <div className="grid gap-2">
              {readiness.items.map((item) => (
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
          <p className="mb-2 text-sm font-medium text-textPrimary">
            Следующий шаг от движка
          </p>
          <p className="text-sm text-textSecondary">{activeResult.nextAction.detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/${activeResult.nextAction.targetScreen}?case=${encodeURIComponent(activeCase.id)}`)}>
              {activeResult.nextAction.label}
            </Button>
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}
