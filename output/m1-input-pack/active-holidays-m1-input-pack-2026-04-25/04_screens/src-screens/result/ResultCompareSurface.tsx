import { useEffect, useMemo, useState } from "react";
import type { ScenarioCandidate, ScenarioIssue, ScenarioLabPayload } from "@shared/contracts";
import { Badge, Button, Card } from "@/ui/primitives";
import { EmptyState } from "@/ui/EmptyState";
import { formatPercent } from "@/lib/format";
import { verdictTone } from "@/theme/tokens";

type Props = {
  errorMessage?: string | null;
  lab: ScenarioLabPayload | null;
  loading?: boolean;
  onOpenTarget: (targetScreen: string) => void;
};

function issueTone(issue: ScenarioIssue): "negative" | "warning" | "review" {
  if (issue.kind === "review") return "review";
  if (issue.kind === "blocking") return "negative";
  return "warning";
}

function screenHint(candidate: ScenarioCandidate): string {
  switch (candidate.nextAction.targetScreen) {
    case "documents":
      return "Открыть документы";
    case "trust":
      return "Разобрать уверенность";
    case "human-review":
      return "Открыть ручную проверку";
    default:
      return candidate.nextAction.label;
  }
}

function formatDelta(before: number, after: number): string {
  const delta = Math.round((after - before) * 100);
  if (delta === 0) return "без изменения";
  return `${delta > 0 ? "+" : ""}${delta} п.п.`;
}

function summaryText(lab: ScenarioLabPayload): string {
  if (lab.baseResult.verdict === "GO") {
    return "Решение уже рабочее. Ниже — что поможет сделать его устойчивее.";
  }
  if (lab.baseResult.verdict === "HUMAN_REVIEW") {
    return "Автомат остановился там, где нужен человек. Ниже — что подготовить перед ручной проверкой.";
  }
  return "Сейчас шанс упирается в конкретные блокеры. Сначала уберите их, потом пересчитайте кейс.";
}

function PlanColumn({
  title,
  items,
  emptyText
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-[11px] uppercase tracking-wide text-textMuted">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm text-textSecondary">
          {items.map((item) => (
            <li key={item} className="rounded-xl bg-surface px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-textSecondary">{emptyText}</p>
      )}
    </div>
  );
}

export function ResultCompareSurface({
  errorMessage,
  lab,
  loading,
  onOpenTarget
}: Props) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (!lab) {
      setSelectedScenarioId(null);
      return;
    }
    setSelectedScenarioId((current) => {
      if (current && lab.scenarios.some((scenario) => scenario.id === current)) {
        return current;
      }
      return lab.recommendedScenarioId ?? lab.scenarios[0]?.id ?? null;
    });
  }, [lab]);

  const selectedScenario = useMemo(
    () => lab?.scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null,
    [lab, selectedScenarioId]
  );

  if (loading) {
    return (
      <Card className="grid gap-3">
        <p className="text-sm font-medium text-textPrimary">Как улучшить шанс</p>
        <p className="text-sm text-textSecondary">Собираем честное сравнение…</p>
        <div className="grid gap-2 md:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="grid gap-3">
        <p className="text-sm font-medium text-textPrimary">Как улучшить шанс</p>
        <EmptyState
          title="Не удалось собрать сравнение"
          description={errorMessage}
        />
      </Card>
    );
  }

  if (!lab) {
    return (
      <Card className="grid gap-3">
        <p className="text-sm font-medium text-textPrimary">Как улучшить шанс</p>
        <EmptyState
          title="Сценарная лаборатория пока недоступна"
          description="Попробуйте пересчитать кейс ещё раз. Когда сервер соберёт сценарии, сравнение появится прямо здесь."
        />
      </Card>
    );
  }

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-textPrimary">Как улучшить шанс</p>
          <p className="mt-1 max-w-3xl text-sm text-textSecondary">
            Ниже только то, что можно подтвердить на текущем кейсе. Без догадок и без обещаний "на глаз".
          </p>
          <p className="mt-2 text-sm text-textSecondary">{summaryText(lab)}</p>
        </div>
        <Badge tone={lab.noHelpfulScenarios ? "review" : "neutral"}>
          {lab.scenarios.length} сценария
        </Badge>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-medium text-textPrimary">Что мешает сейчас</p>
        {lab.issues.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {lab.issues.map((issue) => (
              <div key={issue.id} className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={issueTone(issue)}>{issue.title}</Badge>
                  <span className="text-xs text-textMuted">
                    {issue.severity === "critical"
                      ? "критично"
                      : issue.severity === "high"
                        ? "сильный риск"
                        : issue.severity === "medium"
                          ? "нужно подтянуть"
                          : "можно усилить"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-textSecondary">{issue.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Явных блокеров сейчас нет"
            description="Можно сразу смотреть, какие сценарии делают кейс устойчивее."
          />
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-textPrimary">Что можно сделать сейчас</p>
          {lab.noHelpfulScenarios && (
            <Badge tone="review">полезных сравнений нет</Badge>
          )}
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {lab.scenarios.map((scenario) => {
            const selected = scenario.id === selectedScenarioId;
            const beforeTone = verdictTone[scenario.comparison.verdictBefore];
            const afterTone = verdictTone[scenario.comparison.verdictAfter];
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-accent/60 bg-accent/10"
                    : "border-border bg-surface-2 hover:border-borderStrong hover:bg-surface-3"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={scenario.recommended ? "positive" : "neutral"}>
                      {scenario.recommended ? "рекомендуем" : "сценарий"}
                    </Badge>
                    <Badge tone={afterTone.label === beforeTone.label ? "neutral" : "warning"}>
                      {scenario.type === "documents"
                        ? "документы"
                        : scenario.type === "signal_fix"
                          ? "исправление"
                          : scenario.type === "path_switch"
                            ? "альтернативный путь"
                            : scenario.type === "timing_shift"
                              ? "сроки"
                              : "ручная проверка"}
                    </Badge>
                  </div>
                  <span className="text-xs text-textMuted">
                    {scenario.comparison.primaryPathAfter.label ?? "без маршрута"}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-textPrimary">{scenario.title}</p>
                <p className="mt-2 text-sm text-textSecondary">{scenario.summary}</p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted">Вердикт</p>
                    <p className="mt-1 text-sm font-medium text-textPrimary">
                      {beforeTone.label} → {afterTone.label}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted">Уверенность</p>
                    <p className="mt-1 text-sm font-medium text-textPrimary">
                      {formatPercent(scenario.comparison.confidenceBefore)} →{" "}
                      {formatPercent(scenario.comparison.confidenceAfter)} (
                      {formatDelta(
                        scenario.comparison.confidenceBefore,
                        scenario.comparison.confidenceAfter
                      )}
                      )
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-1 text-xs text-textSecondary">
                  <p>
                    Основной путь:{" "}
                    {scenario.comparison.primaryPathBefore.label ?? "не подтверждён"} →{" "}
                    {scenario.comparison.primaryPathAfter.label ?? "не подтверждён"}
                  </p>
                  <p>
                    Документы: {scenario.comparison.documents.readyCountBefore}/
                    {scenario.comparison.documents.requiredCount} →{" "}
                    {scenario.comparison.documents.readyCountAfter}/
                    {scenario.comparison.documents.requiredCount}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedScenario ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium text-textPrimary">Сравнение до / после</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="grid gap-3">
                <div className="rounded-2xl bg-surface px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">Что исчезло</p>
                  {selectedScenario.comparison.resolvedRisks.length > 0 ? (
                    <ul className="mt-2 grid gap-2 text-sm text-textSecondary">
                      {selectedScenario.comparison.resolvedRisks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-textSecondary">
                      Ничего критичного не исчезает автоматически.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-surface px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">Что осталось</p>
                  {selectedScenario.comparison.remainingRisks.length > 0 ? (
                    <ul className="mt-2 grid gap-2 text-sm text-textSecondary">
                      {selectedScenario.comparison.remainingRisks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-textSecondary">
                      После этого сценария критичные риски не остаются.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-surface px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">Почему изменилось</p>
                  <ul className="mt-2 grid gap-2 text-sm text-textSecondary">
                    {selectedScenario.comparison.whyChanged.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-medium text-textPrimary">План действий</p>
                  <p className="mt-2 text-sm text-textSecondary">
                    {selectedScenario.plan.headline}
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <PlanColumn
                    title="Сначала"
                    items={selectedScenario.plan.firstSteps}
                    emptyText="Сразу переходите к следующему шагу движка."
                  />
                  <PlanColumn
                    title="Критично"
                    items={selectedScenario.plan.criticalSteps}
                    emptyText="Критичных дополнительных шагов нет."
                  />
                  <PlanColumn
                    title="Можно отложить"
                    items={selectedScenario.plan.canWait}
                    emptyText="Лучше закрыть основные шаги без откладывания."
                  />
                </div>

                {selectedScenario.comparison.documents.itemsToCollect.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-sm font-medium text-textPrimary">Что нужно дособрать</p>
                    <ul className="mt-3 grid gap-2 text-sm text-textSecondary">
                      {selectedScenario.comparison.documents.itemsToCollect.map((item) => (
                        <li key={item.id} className="rounded-xl bg-surface-2 px-3 py-2">
                          <p className="text-textPrimary">{item.label}</p>
                          <p className="mt-1 text-xs text-textMuted">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedScenario.plan.humanReviewRequired && (
                  <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                    {selectedScenario.plan.humanReviewReason ??
                      "Автоматического сценария недостаточно — нужен человек."}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => onOpenTarget(selectedScenario.nextAction.targetScreen)}>
                    {screenHint(selectedScenario)}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onOpenTarget("result")}
                  >
                    Вернуться к текущему кейсу
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Выберите, что хотите проверить"
          description="Мы покажем только то сравнение, которое можно честно пересчитать на этом кейсе."
        />
      )}

      {lab.noHelpfulScenarios && (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {lab.humanReviewEscalation.detail}
        </div>
      )}

      <p className="text-xs text-textMuted">
        Лаборатория не меняет сигналы автоматически: она показывает безопасный план, что делать дальше по текущему кейсу.
      </p>
    </Card>
  );
}
