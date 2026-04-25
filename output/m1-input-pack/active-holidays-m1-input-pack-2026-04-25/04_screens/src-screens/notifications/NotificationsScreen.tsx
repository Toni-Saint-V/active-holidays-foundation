import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { apiClient } from "@/lib/apiClient";
import { Card, Badge, Button } from "@/ui/primitives";
import { ChangeCard } from "@/ui/ChangeCard";
import { EmptyState } from "@/ui/EmptyState";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";

export function NotificationsScreen() {
  useScreenView("notifications");
  const { decisions, bootstrap, status, errorMessage } = useCaseStore();

  useEffect(() => {
    if (decisions.length === 0) void bootstrap();
  }, [bootstrap, decisions.length]);

  const refresh = async () => {
    try {
      const next = await apiClient.decisions();
      useCaseStore.setState({ decisions: next });
      track({ type: "cta_clicked", cta: "notifications_refresh" });
    } catch (error) {
      useCaseStore.setState({
        errorMessage:
          error instanceof Error ? error.message : "Не удалось обновить ленту."
      });
    }
  };

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: refresh,
    threshold: 70
  });

  const sorted = useMemo(
    () =>
      decisions.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [decisions]
  );

  if (status === "error") {
    return (
      <EmptyState
        title="Лента не загрузилась"
        description={errorMessage ?? "Попробуйте обновить страницу."}
      />
    );
  }

  return (
    <motion.div
      ref={containerRef}
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Сигналы</p>
              <h2 className="text-2xl font-semibold text-textPrimary">
                Изменения и пересчёты
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                Каждый пересчёт, override или обновление источника фиксируются в логе.
                Потяните вниз, чтобы обновить вручную.
              </p>
            </div>
            <Badge tone="neutral">
              <Bell className="h-3 w-3" />
              {sorted.length}
            </Badge>
          </div>
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => void refresh()} loading={isRefreshing}>
              Обновить вручную
            </Button>
          </div>
        </Card>
      </motion.section>

      {pullDistance > 0 && (
        <motion.div
          className="flex h-10 items-center justify-center text-xs text-textSecondary"
          style={{ opacity: Math.min(1, pullDistance / 70) }}
        >
          {isRefreshing ? "Обновляем…" : pullDistance >= 70 ? "Отпустите для обновления" : "Тяните вниз…"}
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <motion.section variants={staggerChild}>
          <EmptyState
            title="Пока тихо"
            description="Как только вы что-то пересчитаете или источник обновится, здесь появится событие."
          />
        </motion.section>
      ) : (
        <motion.section variants={staggerChild} className="grid gap-2">
          {sorted.map((entry) => (
            <ChangeCard key={entry.id} entry={entry} />
          ))}
        </motion.section>
      )}
    </motion.div>
  );
}
