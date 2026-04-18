import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCaseStore } from "@/state/caseStore";
import { apiClient } from "@/lib/apiClient";
import { Badge, Button, Card } from "@/ui/primitives";
import { CaseCard } from "@/ui/CaseCard";
import { EmptyState } from "@/ui/EmptyState";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { recentEvents } from "@/instrumentation/events";

export function ProfileScreen() {
  useScreenView("profile");
  const navigate = useNavigate();
  const toast = useToast();
  const { activeCaseId, bootstrap } = useCaseStore();
  const [cases, setCases] = useState<
    Array<{ id: string; title: string; createdAt: string; updatedAt: string; signalCount: number; forkedFrom: string | null }>
  >([]);

  useEffect(() => {
    void bootstrap();
    void (async () => {
      try {
        const loaded = await apiClient.listCases();
        setCases(
          loaded.map((item) => ({
            id: item.id,
            title: item.title,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            signalCount: item.signalCount,
            forkedFrom: item.forkedFrom
          }))
        );
      } catch (error) {
        toast.push(
          error instanceof Error ? error.message : "Не удалось загрузить список кейсов.",
          "error"
        );
      }
    })();
  }, [bootstrap, toast]);

  const events = recentEvents();

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
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Профиль</p>
              <h2 className="text-2xl font-semibold text-textPrimary">
                Ваши кейсы и события
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                Каждый кейс живёт в памяти сервера, форки создают независимые копии,
                которые можно сравнивать рядом.
              </p>
            </div>
            <Badge tone="neutral">{cases.length} кейсов</Badge>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild} className="grid gap-2">
        {cases.length === 0 ? (
          <EmptyState
            title="Пока нет кейсов"
            description="Создайте первый кейс с анкеты или откройте запечатанный сценарий с главного экрана."
            action={
              <Button variant="secondary" onClick={() => navigate("/")}>
                Открыть сценарии
              </Button>
            }
          />
        ) : (
          cases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              caseData={{
                id: caseData.id,
                title: caseData.title,
                updatedAt: caseData.updatedAt,
                signals: Array.from({ length: caseData.signalCount }, () => ({
                  id: "citizenship" as const,
                  value: "RU",
                  source: "seed" as const,
                  capturedAt: caseData.updatedAt
                })),
                forkedFrom: caseData.forkedFrom
              }}
              active={caseData.id === activeCaseId}
              onOpen={(id) => navigate(`/result?case=${encodeURIComponent(id)}`)}
            />
          ))
        )}
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-3 text-sm font-medium text-textPrimary">Последние события</p>
          {events.length === 0 ? (
            <p className="text-xs text-textSecondary">
              Аналитика пишется в кольцевой буфер — события появятся после взаимодействий.
            </p>
          ) : (
            <ul className="grid gap-1 text-xs text-textSecondary">
              {events.slice(-8).reverse().map((event, index) => (
                <li key={index} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-1.5">
                  <span className="text-textPrimary">{event.type}</span>
                  <span className="text-textMuted">{JSON.stringify(event).slice(0, 64)}…</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.section>
    </motion.div>
  );
}
