import { useEffect, useMemo, useState } from "react";
import type {
  PathPreference,
  RecommendationDetail,
  RecommendationFit,
  RecommendationShortlist,
  RecommendationWhatIfBrief,
  ScenarioLabCompareResponse
} from "@shared/contracts";
import { ApiError, apiClient } from "@/lib/apiClient";
import { formatDate, formatPercent } from "@/lib/format";
import { verdictTone } from "@/theme/tokens";
import { Badge, Button, Card, Skeleton } from "@/ui/primitives";

type Props = {
  caseId: string;
  computedAt: string;
  preferences: PathPreference[];
  onOpenScenario: (caseId: string) => void;
};

type Status = "idle" | "loading" | "ready" | "error";

const fitTone: Record<RecommendationFit, "positive" | "neutral" | "warning"> = {
  best_match: "positive",
  good_option: "neutral",
  watch: "warning"
};

const fitLabel: Record<RecommendationFit, string> = {
  best_match: "лучший матч",
  good_option: "вариант в запасе",
  watch: "смотреть внимательно"
};

function preferredScenarioPreferences(
  preferences: PathPreference[],
  offerId: string
): PathPreference[] {
  const next = new Map(preferences.map((item) => [item.id, item.weight]));
  next.set(offerId, 1);
  return Array.from(next.entries()).map(([id, weight]) => ({ id, weight }));
}

function formatDelta(value: number): string {
  const points = Math.round(value * 100);
  if (points === 0) return "без изменения";
  return `${points > 0 ? "+" : ""}${points} п.п.`;
}

function pathLabel(value: string | null): string {
  return value ?? "не подтверждён";
}

export function AiRecommendationPanel({
  caseId,
  computedAt,
  preferences,
  onOpenScenario
}: Props) {
  const [shortlistStatus, setShortlistStatus] = useState<Status>("idle");
  const [shortlistError, setShortlistError] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<RecommendationShortlist | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<Status>("idle");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RecommendationDetail>>({});
  const [compareLoadingOfferId, setCompareLoadingOfferId] = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<
    Record<string, ScenarioLabCompareResponse>
  >({});
  const [compareErrors, setCompareErrors] = useState<Record<string, string>>({});
  const [whatIfStatus, setWhatIfStatus] = useState<Record<string, Status>>({});
  const [whatIfBriefs, setWhatIfBriefs] = useState<Record<string, RecommendationWhatIfBrief>>(
    {}
  );
  const [whatIfErrors, setWhatIfErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadShortlist() {
      setShortlistStatus("loading");
      setShortlistError(null);
      setShortlist(null);
      setSelectedOfferId(null);
      setDetailStatus("idle");
      setDetailError(null);
      setDetails({});
      setCompareLoadingOfferId(null);
      setCompareResults({});
      setCompareErrors({});
      setWhatIfStatus({});
      setWhatIfBriefs({});
      setWhatIfErrors({});

      try {
        const response = await apiClient.recommendationShortlist(caseId);
        if (cancelled) return;
        setShortlist(response);
        setShortlistStatus("ready");

        const defaultOfferId = response.recommendedOfferId ?? response.items[0]?.offerId ?? null;
        setSelectedOfferId(defaultOfferId);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setShortlistStatus("ready");
          return;
        }
        setShortlistStatus("error");
        setShortlistError(
          error instanceof Error ? error.message : "Не удалось собрать короткий список рекомендаций."
        );
      }
    }

    void loadShortlist();

    return () => {
      cancelled = true;
    };
  }, [caseId, computedAt, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedOfferId) return;
    const selectedId = selectedOfferId;
    if (details[selectedId]) {
      setDetailStatus("ready");
      return;
    }

    async function loadDetail() {
      setDetailStatus("loading");
      setDetailError(null);
      try {
        const response = await apiClient.recommendationDetail(caseId, selectedId);
        if (cancelled) return;
        setDetails((current) => ({ ...current, [selectedId]: response }));
        setDetailStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setDetailStatus("error");
        setDetailError(
          error instanceof Error ? error.message : "Не удалось загрузить детальный разбор."
        );
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [caseId, details, selectedOfferId]);

  const activeDetail = selectedOfferId ? details[selectedOfferId] ?? null : null;
  const activeItem = useMemo(
    () => shortlist?.items.find((item) => item.offerId === selectedOfferId) ?? null,
    [selectedOfferId, shortlist]
  );
  const activeCompare = selectedOfferId ? compareResults[selectedOfferId] ?? null : null;
  const activeCompareError = selectedOfferId ? compareErrors[selectedOfferId] ?? null : null;
  const activeWhatIfBrief = selectedOfferId ? whatIfBriefs[selectedOfferId] ?? null : null;
  const activeWhatIfError = selectedOfferId ? whatIfErrors[selectedOfferId] ?? null : null;
  const activeWhatIfStatus = selectedOfferId ? whatIfStatus[selectedOfferId] ?? "idle" : "idle";
  const comparison = activeCompare?.comparison ?? null;
  const compareBaselineTone = comparison
    ? verdictTone[comparison.baseline.outcome.verdict]
    : null;
  const compareCandidateTone = comparison
    ? verdictTone[comparison.candidate.outcome.verdict]
    : null;
  const isPrimaryByContract = Boolean(
    activeDetail
      ? activeDetail.fit === "best_match"
      : selectedOfferId && shortlist?.recommendedOfferId === selectedOfferId
  );
  const isPrimaryDetail = isPrimaryByContract;
  const canCompareWithEngine = Boolean(activeDetail && !isPrimaryDetail);
  const showDetailSteps = Boolean(activeDetail && (isPrimaryDetail || !activeCompare));
  const detailSteps = activeDetail?.nextSteps ?? [];

  async function handleCompareWithEngine() {
    if (!activeDetail) return;
    if (compareResults[activeDetail.offerId]) return;

    const offerId = activeDetail.offerId;
    setCompareLoadingOfferId(offerId);
    setCompareErrors((current) => {
      const next = { ...current };
      delete next[offerId];
      return next;
    });

    try {
      const response = await apiClient.compareScenario(caseId, {
        title: `AI-проверка · ${activeDetail.title}`,
        signals: [],
        preferences: preferredScenarioPreferences(preferences, offerId)
      });
      setCompareResults((current) => ({ ...current, [offerId]: response }));
    } catch (error) {
      setCompareErrors((current) => ({
        ...current,
        [offerId]:
          error instanceof Error
            ? error.message
            : "Не удалось проверить вариант детерминированным движком."
      }));
    } finally {
      setCompareLoadingOfferId((current) => (current === offerId ? null : current));
    }
  }

  async function handleBuildWhatIfBrief() {
    if (!activeDetail || !activeCompare) return;
    const offerId = activeDetail.offerId;
    setWhatIfStatus((current) => ({ ...current, [offerId]: "loading" }));
    setWhatIfErrors((current) => {
      const next = { ...current };
      delete next[offerId];
      return next;
    });

    try {
      const response = await apiClient.recommendationWhatIfBrief(caseId, {
        candidateCaseId: activeCompare.candidateCase.id,
        offerId: activeDetail.offerId,
        offerLabel: activeDetail.title
      });
      setWhatIfBriefs((current) => ({ ...current, [offerId]: response }));
      setWhatIfStatus((current) => ({ ...current, [offerId]: "ready" }));
    } catch (error) {
      setWhatIfStatus((current) => ({ ...current, [offerId]: "error" }));
      setWhatIfErrors((current) => ({
        ...current,
        [offerId]:
          error instanceof Error ? error.message : "Не удалось собрать AI-вывод по what-if."
      }));
    }
  }

  if (shortlistStatus === "ready" && (!shortlist || shortlist.items.length === 0)) {
    return null;
  }

  if (shortlistStatus === "error") {
    return (
      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-textPrimary">AI-разбор рекомендаций</p>
            <p className="mt-1 text-sm text-textSecondary">
              AI-слой не загрузился, но основной детерминированный вердикт остаётся рабочим.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Повторить
          </Button>
        </div>
        {shortlistError && <p className="text-xs text-textMuted">{shortlistError}</p>}
      </Card>
    );
  }

  if (shortlistStatus === "loading" || !shortlist) {
    return (
      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-textPrimary">AI-разбор рекомендаций</p>
            <p className="mt-1 text-sm text-textSecondary">
              Собираем короткий разбор поверх текущего результата движка.
            </p>
          </div>
          <Badge tone="neutral">загрузка</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface-2 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-6 w-2/3" />
              <Skeleton className="mt-3 h-16 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-textPrimary">AI-разбор рекомендаций</p>
          <p className="mt-1 max-w-2xl text-sm text-textSecondary">
            Сначала короткий список вариантов, затем детальный разбор по выбранному сценарию.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={shortlist.source === "openai" ? "positive" : "neutral"}>
            {shortlist.source === "openai" ? "строгий AI-ответ" : "серверный резерв"}
          </Badge>
          <Badge tone="neutral">привязано к вердикту</Badge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {shortlist.items.map((item) => {
          const active = item.offerId === selectedOfferId;
          return (
            <button
              key={item.offerId}
              type="button"
              onClick={() => {
                setSelectedOfferId(item.offerId);
                setDetailError(null);
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-accent/60 bg-accent/10"
                  : "border-border bg-surface-2 hover:border-borderStrong hover:bg-surface-3"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-textMuted">
                  #{item.rank}
                </span>
                <Badge tone={fitTone[item.fit]}>{fitLabel[item.fit]}</Badge>
              </div>
              <p className="mt-3 text-base font-semibold text-textPrimary">{item.title}</p>
              <p className="mt-2 text-sm text-textSecondary">{item.summary}</p>
              <div className="mt-4 grid gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">
                    Почему в коротком списке
                  </p>
                  <p className="mt-1 text-sm text-textPrimary">{item.fitReason}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">
                    На что смотреть
                  </p>
                  <p className="mt-1 text-sm text-textSecondary">{item.caution}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="grid gap-4 bg-surface-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-textPrimary">
              Детальный разбор{activeItem ? ` · ${activeItem.title}` : ""}
            </p>
            <p className="mt-1 text-sm text-textSecondary">
              Разбор не меняет вердикт движка, а объясняет выбранный вариант простым языком.
            </p>
          </div>
          {activeItem ? <Badge tone={fitTone[activeItem.fit]}>{fitLabel[activeItem.fit]}</Badge> : null}
        </div>

        {detailStatus === "loading" && !activeDetail ? (
          <div className="grid gap-3">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}

        {detailStatus === "error" ? (
          <div className="grid gap-3">
            <p className="text-sm text-textSecondary">
              Детальный разбор не загрузился. Основной сценарий рекомендации остаётся доступным.
            </p>
            {detailError ? <p className="text-xs text-textMuted">{detailError}</p> : null}
          </div>
        ) : null}

        {activeDetail ? (
          <div className="grid gap-4">
            <div>
              <p className="text-lg font-semibold text-textPrimary">{activeDetail.title}</p>
              <p className="mt-2 text-sm text-textSecondary">{activeDetail.summary}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <section>
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  Почему подходит
                </p>
                <ul className="mt-2 grid gap-2 text-sm text-textPrimary">
                  {activeDetail.whyThisFits.map((item) => (
                    <li key={item} className="rounded-xl bg-surface p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  Что проверить
                </p>
                <ul className="mt-2 grid gap-2 text-sm text-textPrimary">
                  {activeDetail.watchouts.map((item) => (
                    <li key={item} className="rounded-xl bg-surface p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {showDetailSteps ? (
                <section>
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">
                    {isPrimaryDetail ? "Следующие шаги" : "Что проверить перед compare"}
                  </p>
                  <ul className="mt-2 grid gap-2 text-sm text-textPrimary">
                    {detailSteps.map((item) => (
                      <li key={item} className="rounded-xl bg-surface p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  Сигналы доверия
                </p>
                <ul className="mt-2 grid gap-2 text-sm text-textPrimary">
                  {activeDetail.trustSignals.map((item) => (
                    <li key={item} className="rounded-xl bg-surface p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">
                    Проверка движком
                  </p>
                  <p className="mt-1 text-sm text-textSecondary">
                    AI объясняет вариант. Кнопка ниже запускает отдельный fork и
                    показывает, что реально подтверждает детерминированный compare.
                  </p>
                </div>
                {canCompareWithEngine ? (
                  <Button
                    size="sm"
                    variant={activeCompare ? "secondary" : "primary"}
                    loading={compareLoadingOfferId === activeDetail.offerId}
                    onClick={() => void handleCompareWithEngine()}
                  >
                    {activeCompare ? "Проверено движком" : "Проверить движком"}
                  </Button>
                ) : (
                  <Badge tone="positive">уже основной вариант</Badge>
                )}
              </div>

              {!canCompareWithEngine ? (
                <p className="text-sm text-textSecondary">
                  Этот вариант уже подтверждён как основной. Отдельный compare не нужен:
                  ниже на экране уже показан рабочий сценарий по текущему кейсу.
                </p>
              ) : null}

              {activeCompareError ? (
                <p className="text-sm text-textSecondary">{activeCompareError}</p>
              ) : null}

              {compareLoadingOfferId === activeDetail.offerId && !activeCompare ? (
                <div className="grid gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : null}

              {activeCompare && comparison && compareBaselineTone && compareCandidateTone ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-surface-2 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-textMuted">
                        Вердикт
                      </p>
                      <p className="mt-1 text-sm font-medium text-textPrimary">
                        {compareBaselineTone.label} → {compareCandidateTone.label}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-textMuted">
                        Уверенность
                      </p>
                      <p className="mt-1 text-sm font-medium text-textPrimary">
                        {formatPercent(comparison.baseline.outcome.confidence)} →{" "}
                        {formatPercent(comparison.candidate.outcome.confidence)} (
                        {formatDelta(comparison.delta.confidenceDelta)})
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-textMuted">
                        Основной путь
                      </p>
                      <p className="mt-1 text-sm font-medium text-textPrimary">
                        {pathLabel(comparison.baseline.outcome.primaryPathLabel)} →{" "}
                        {pathLabel(comparison.candidate.outcome.primaryPathLabel)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface-2 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted">
                      Что делать после compare
                    </p>
                    <p className="mt-1 text-sm font-medium text-textPrimary">
                      {comparison.candidate.actionPlan.headline}
                    </p>
                    <p className="mt-1 text-sm text-textSecondary">
                      {comparison.candidate.actionPlan.detail}
                    </p>
                  </div>

                  <div className="rounded-xl border border-ai/25 bg-surface-2 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-textMuted">
                          What-if Copilot
                        </p>
                        <p className="mt-1 text-sm text-textSecondary">
                          Короткий AI-вывод по текущему compare: что реально изменилось и что делать дальше.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={activeWhatIfBrief ? "secondary" : "primary"}
                        loading={activeWhatIfStatus === "loading"}
                        onClick={() => void handleBuildWhatIfBrief()}
                      >
                        {activeWhatIfBrief ? "Обновить AI-вывод" : "Собрать AI-вывод"}
                      </Button>
                    </div>

                    {activeWhatIfError ? (
                      <p className="mt-3 text-sm text-textSecondary">{activeWhatIfError}</p>
                    ) : null}

                    {activeWhatIfBrief ? (
                      <div className="mt-3 grid gap-3">
                        <div className="rounded-xl bg-surface p-3">
                          <p className="text-sm font-semibold text-textPrimary">
                            {activeWhatIfBrief.headline}
                          </p>
                          <p className="mt-1 text-sm text-textSecondary">
                            {activeWhatIfBrief.verdictDeltaSummary}
                          </p>
                          <p className="mt-1 text-sm text-textSecondary">
                            {activeWhatIfBrief.confidenceDeltaSummary}
                          </p>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="rounded-xl bg-surface p-3">
                            <p className="text-[11px] uppercase tracking-wide text-textMuted">
                              Приоритетные шаги
                            </p>
                            <ul className="mt-2 grid gap-2 text-sm text-textPrimary">
                              {activeWhatIfBrief.priorityActions.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl bg-surface p-3">
                            <p className="text-[11px] uppercase tracking-wide text-textMuted">
                              Риск-callout
                            </p>
                            <p className="mt-2 text-sm text-textPrimary">
                              {activeWhatIfBrief.riskCallout}
                            </p>
                            <p className="mt-2 text-xs text-textSecondary">
                              {activeWhatIfBrief.operatorNote}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-textMuted">{activeWhatIfBrief.disclaimer}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-2xl text-xs text-textMuted">
                      Проверка прошла в отдельном fork-сценарии и не изменила исходный кейс.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenScenario(activeCompare.candidateCase.id)}
                    >
                      Открыть полный сценарий
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="max-w-3xl text-xs text-textMuted">{activeDetail.disclaimer}</p>
              <span className="text-xs text-textMuted">
                Основано на результате от {formatDate(shortlist.basedOnComputedAt)}
              </span>
            </div>
          </div>
        ) : null}
      </Card>

      <p className="text-xs text-textMuted">{shortlist.disclaimer}</p>
    </Card>
  );
}
