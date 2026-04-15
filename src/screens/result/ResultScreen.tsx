import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { TravelDecisionReasonCode, TravelDecisionSession } from "@shared/contracts";
import { useTravelFlowStore } from "@/state/travelFlowStore";

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

function ResultEmptyState() {
  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Вердикт</p>
      <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
        Пока нет сохранённого результата
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
        Сначала отправьте анкету. После этого последняя детерминированная сессия
        будет доступна на этом экране даже после перезагрузки.
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

function ResultDetails({ session }: { session: TravelDecisionSession }) {
  return (
    <div className="grid gap-4">
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Вердикт</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold text-textPrimary">
            {outcomeLabels[session.result.outcome]}
          </h2>
          <span className="rounded-full border border-borderStrong bg-surface-2 px-3 py-1 text-sm text-textPrimary">
            {readinessLabels[session.result.documentReadiness]}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
          {session.result.summary}
        </p>
        <p className="mt-4 text-sm text-textSecondary">
          Следующий фокус: {session.result.nextStepLabel}
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
        <h3 className="text-lg font-semibold text-textPrimary">Следующие шаги</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {session.result.checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl bg-surface-2 px-4 py-3"
            >
              <span
                className={
                  item.done
                    ? "mt-1 inline-block h-2.5 w-2.5 rounded-full bg-success"
                    : "mt-1 inline-block h-2.5 w-2.5 rounded-full bg-warning"
                }
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
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
    </div>
  );
}

export function ResultScreen() {
  const latestSession = useTravelFlowStore((state) => state.latestSession);
  const status = useTravelFlowStore((state) => state.status);
  const errorMessage = useTravelFlowStore((state) => state.errorMessage);
  const hydrateLatestSession = useTravelFlowStore(
    (state) => state.hydrateLatestSession
  );
  const clearSession = useTravelFlowStore((state) => state.clearSession);

  useEffect(() => {
    void hydrateLatestSession();
  }, [hydrateLatestSession]);

  if (status === "loading") {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textSecondary">Загружаем последнюю сохранённую сессию...</p>
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

  if (!latestSession) {
    return <ResultEmptyState />;
  }

  return (
    <div className="grid gap-4">
      <ResultDetails session={latestSession} />
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
            void clearSession();
          }}
          className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
        >
          Очистить текущую сессию
        </button>
      </div>
    </div>
  );
}
