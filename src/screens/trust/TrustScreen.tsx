import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTravelFlowStore } from "@/state/travelFlowStore";
import { getActiveTravelSession } from "@/state/travelFlowSelectors";

const trustStatusLabels = {
  ready: "Сигналы согласованы",
  attention_needed: "Нужна дополнительная проверка",
  blocked: "Сигналы пока неустойчивы"
} as const;

const checkStatusLabels = {
  clear: "Чисто",
  review: "Проверить",
  blocked: "Блокер"
} as const;

const checkToneClasses = {
  clear: "border-success/40 bg-successBg",
  review: "border-warning/40 bg-warningBg",
  blocked: "border-danger/40 bg-dangerBg"
} as const;

export function TrustScreen() {
  const sessions = useTravelFlowStore((state) => state.sessions);
  const activeSessionId = useTravelFlowStore((state) => state.activeSessionId);
  const status = useTravelFlowStore((state) => state.status);
  const errorMessage = useTravelFlowStore((state) => state.errorMessage);
  const hydrateWorkspace = useTravelFlowStore((state) => state.hydrateWorkspace);
  const activeSession = getActiveTravelSession(sessions, activeSessionId);

  useEffect(() => {
    void hydrateWorkspace();
  }, [hydrateWorkspace]);

  if (status === "loading") {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textSecondary">Загружаем проверку доверия...</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textPrimary">
          {errorMessage ?? "Не удалось загрузить данные проверки доверия."}
        </p>
      </section>
    );
  }

  if (!activeSession) {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Доверие</p>
        <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
          Пока нет данных для объяснения решения
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
          Раздел доверия появится после отправки анкеты, когда система соберёт
          активную сессию решения.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/intake"
            className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:bg-accentHover"
          >
            Перейти к анкете
          </Link>
          <Link
            to="/result"
            className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
          >
            Открыть вердикт
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Доверие</p>
        <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
          {trustStatusLabels[activeSession.result.trust.readiness]}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
          {activeSession.result.trust.summary}
        </p>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Проверки доверия</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {activeSession.result.trust.checks.map((check) => (
            <li
              key={check.id}
              className={[
                "rounded-xl border px-4 py-3",
                checkToneClasses[check.status]
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-textPrimary">{check.label}</p>
                <span className="text-xs text-textPrimary">
                  {checkStatusLabels[check.status]}
                </span>
              </div>
              <p className="mt-2">{check.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Объясняющие блоки</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {activeSession.result.trust.explanations.map((item) => (
            <li key={item.id} className="rounded-xl bg-surface-2 px-4 py-3">
              <p className="font-medium text-textPrimary">{item.title}</p>
              <p className="mt-2">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/result"
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:bg-accentHover"
        >
          Вернуться к вердикту
        </Link>
        <Link
          to="/documents"
          className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
        >
          Открыть документы
        </Link>
      </div>
    </div>
  );
}
