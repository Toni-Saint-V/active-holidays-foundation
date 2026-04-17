import { useEffect } from "react";
import { Link } from "react-router-dom";
import type {
  TravelDecisionReasonCode,
  TravelDecisionSession,
  TravelDecisionSurface
} from "@shared/contracts";
import { useTravelFlowStore } from "@/state/travelFlowStore";
import { getActiveTravelSession } from "@/state/travelFlowSelectors";

const outcomeLabels = {
  ready_to_plan: "Можно переходить дальше",
  needs_documents: "Сначала нужны документы",
  needs_review: "Нужна ручная проверка"
} as const;

const readinessLabels = {
  ready: "Документная база готова",
  attention_needed: "Нужна проверка документов",
  blocked: "Есть блокер по документам"
} as const;

const trustReadinessLabels = {
  ready: "Объяснимость устойчива",
  attention_needed: "Нужна проверка доверия",
  blocked: "Решение пока неустойчиво"
} as const;

const reasonLabels: Record<TravelDecisionReasonCode, string> = {
  passport_missing: "Нет действующего паспорта",
  passport_renewal: "Нужно проверить срок действия паспорта",
  destination_not_final: "Направление ещё не зафиксировано",
  visa_support_required: "Нужна отдельная визовая проверка",
  urgent_timeline: "Срок поездки слишком близко"
};

const intakeLabels = {
  departureWindow: {
    lt_30_days: "Менее 30 дней",
    one_to_three_months: "От 1 до 3 месяцев",
    more_than_three_months: "Больше 3 месяцев"
  },
  passportStatus: {
    valid: "Паспорт в порядке",
    needs_renewal: "Нужно проверить или обновить",
    missing: "Паспорта нет"
  },
  destinationReadiness: {
    chosen: "Направление выбрано",
    comparing: "Есть несколько вариантов",
    undecided: "Направление не выбрано"
  }
} as const;

const surfacePaths: Record<TravelDecisionSurface, string> = {
  intake: "/intake",
  result: "/result",
  documents: "/documents",
  trust: "/trust"
};

const insightToneClasses = {
  blocker: "border-danger/40 bg-dangerBg",
  warning: "border-warning/40 bg-warningBg",
  info: "border-borderStrong bg-surface-2"
} as const;

const stepStatusLabels = {
  pending: "В работе",
  done: "Готово"
} as const;

function formatSessionTimestamp(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function ResultEmptyState() {
  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Вердикт</p>
      <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
        Пока нет сохранённого результата
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
        Сначала отправьте анкету. После этого активная сессия и короткая история
        решений будут доступны на этом экране даже после перезагрузки.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/intake"
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:bg-accentHover"
        >
          Перейти к анкете
        </Link>
      </div>
    </section>
  );
}

function ResultDetails({
  session,
  sessions,
  activeSessionId,
  onSelectSession
}: {
  session: TravelDecisionSession;
  sessions: TravelDecisionSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Вердикт</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold text-textPrimary">
            {outcomeLabels[session.result.outcome]}
          </h2>
          <span className="rounded-full border border-borderStrong bg-surface-2 px-3 py-1 text-sm text-textPrimary">
            {readinessLabels[session.result.documents.readiness]}
          </span>
          <span className="rounded-full border border-borderStrong bg-surface-2 px-3 py-1 text-sm text-textPrimary">
            {trustReadinessLabels[session.result.trust.readiness]}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
          {session.result.summary}
        </p>
        <p className="mt-4 text-sm text-textSecondary">
          Следующий фокус: {session.result.nextStepLabel}
        </p>
        <p className="mt-2 text-xs text-textMuted">
          Активная сессия создана: {formatSessionTimestamp(session.createdAt)}
        </p>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Что повлияло на результат</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {session.result.reasonCodes.length === 0 ? (
            <li>Явных рисков на этом уровне не найдено.</li>
          ) : (
            session.result.reasonCodes.map((reasonCode) => (
              <li key={reasonCode} className="rounded-xl bg-surface-2 px-4 py-3">
                {reasonLabels[reasonCode]}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Объяснение решения</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {session.result.trust.explanations.map((item) => (
            <li
              key={item.id}
              className={[
                "rounded-xl border px-4 py-3",
                insightToneClasses[item.severity]
              ].join(" ")}
            >
              <p className="font-medium text-textPrimary">{item.title}</p>
              <p className="mt-2">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Следующие шаги</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {session.result.nextSteps.map((step) => (
            <li
              key={step.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"
            >
              <div>
                <p className="font-medium text-textPrimary">{step.label}</p>
                <p className="mt-1 text-xs text-textSecondary">
                  Статус: {stepStatusLabels[step.status]}
                </p>
              </div>
              <Link
                to={surfacePaths[step.target]}
                className="rounded-lg border border-borderStrong px-3 py-2 text-xs text-textPrimary transition hover:bg-surface-3"
              >
                Открыть раздел
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/documents"
          className="rounded-[20px] border border-border bg-surface p-6 shadow-soft transition hover:bg-surface-2"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">
            Документы
          </p>
          <h3 className="mt-3 text-lg font-semibold text-textPrimary">
            {readinessLabels[session.result.documents.readiness]}
          </h3>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            {session.result.documents.summary}
          </p>
        </Link>
        <Link
          to="/trust"
          className="rounded-[20px] border border-border bg-surface p-6 shadow-soft transition hover:bg-surface-2"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">
            Доверие
          </p>
          <h3 className="mt-3 text-lg font-semibold text-textPrimary">
            {trustReadinessLabels[session.result.trust.readiness]}
          </h3>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            {session.result.trust.summary}
          </p>
        </Link>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Последний снимок анкеты</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-textSecondary">Срок поездки</dt>
            <dd className="mt-1 text-textPrimary">
              {intakeLabels.departureWindow[session.intake.departureWindow]}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-textSecondary">Паспорт</dt>
            <dd className="mt-1 text-textPrimary">
              {intakeLabels.passportStatus[session.intake.passportStatus]}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-textSecondary">Готовность направления</dt>
            <dd className="mt-1 text-textPrimary">
              {intakeLabels.destinationReadiness[session.intake.destinationReadiness]}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <dt className="text-textSecondary">Визовая поддержка</dt>
            <dd className="mt-1 text-textPrimary">
              {session.intake.needsVisaSupport ? "Нужна" : "Не нужна"}
            </dd>
          </div>
        </dl>
      </section>

      {sessions.length > 1 && (
        <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-textPrimary">Недавние сессии</h3>
          <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
            {sessions.map((historySession) => (
              <li
                key={historySession.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"
              >
                <div className="max-w-[32rem]">
                  <p className="font-medium text-textPrimary">
                    {outcomeLabels[historySession.result.outcome]}
                  </p>
                  <p className="mt-1">{historySession.result.summary}</p>
                  <p className="mt-1 text-xs text-textMuted">
                    {formatSessionTimestamp(historySession.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSession(historySession.id)}
                  disabled={historySession.id === activeSessionId}
                  className="rounded-lg border border-borderStrong px-3 py-2 text-xs text-textPrimary transition hover:bg-surface-3 disabled:cursor-default disabled:opacity-60"
                >
                  {historySession.id === activeSessionId
                    ? "Активная сессия"
                    : "Сделать активной"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function ResultScreen() {
  const sessions = useTravelFlowStore((state) => state.sessions);
  const activeSessionId = useTravelFlowStore((state) => state.activeSessionId);
  const status = useTravelFlowStore((state) => state.status);
  const errorMessage = useTravelFlowStore((state) => state.errorMessage);
  const hydrateWorkspace = useTravelFlowStore((state) => state.hydrateWorkspace);
  const setActiveSession = useTravelFlowStore((state) => state.setActiveSession);
  const clearWorkspace = useTravelFlowStore((state) => state.clearWorkspace);
  const activeSession = getActiveTravelSession(sessions, activeSessionId);

  useEffect(() => {
    void hydrateWorkspace();
  }, [hydrateWorkspace]);

  if (status === "loading") {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textSecondary">Загружаем сохранённые сессии...</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textPrimary">
          {errorMessage ?? "Не удалось загрузить результат."}
        </p>
      </section>
    );
  }

  if (!activeSession) {
    return <ResultEmptyState />;
  }

  return (
    <div className="grid gap-4">
      <ResultDetails
        session={activeSession}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(sessionId) => {
          void setActiveSession(sessionId);
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Link
          to="/intake"
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:bg-accentHover"
        >
          Изменить анкету
        </Link>
        <button
          type="button"
          onClick={() => {
            void clearWorkspace();
          }}
          className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
        >
          Очистить все сессии
        </button>
      </div>
    </div>
  );
}
