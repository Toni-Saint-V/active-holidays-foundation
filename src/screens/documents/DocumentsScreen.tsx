import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTravelFlowStore } from "@/state/travelFlowStore";
import { getActiveTravelSession } from "@/state/travelFlowSelectors";

const itemStatusLabels = {
  ready: "Готово",
  attention_needed: "Нужно внимание",
  blocked: "Есть блокер"
} as const;

const itemToneClasses = {
  ready: "border-success/40 bg-successBg",
  attention_needed: "border-warning/40 bg-warningBg",
  blocked: "border-danger/40 bg-dangerBg"
} as const;

export function DocumentsScreen() {
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
        <p className="text-sm text-textSecondary">Загружаем документный статус...</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm text-textPrimary">
          {errorMessage ?? "Не удалось загрузить документный статус."}
        </p>
      </section>
    );
  }

  if (!activeSession) {
    return (
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Документы</p>
        <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
          Пока нет активной сессии
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
          Сначала отправьте анкету, чтобы система построила документный статус и набор
          следующих шагов.
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
        <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Документы</p>
        <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
          {itemStatusLabels[activeSession.result.documents.readiness]}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
          {activeSession.result.documents.summary}
        </p>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Состав документной готовности</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {activeSession.result.documents.items.map((item) => (
            <li
              key={item.id}
              className={[
                "rounded-xl border px-4 py-3",
                itemToneClasses[item.status]
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-textPrimary">{item.label}</p>
                <span className="text-xs text-textPrimary">
                  {itemStatusLabels[item.status]}
                </span>
              </div>
              <p className="mt-2">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-textPrimary">Что делать дальше</h3>
        <ul className="mt-4 grid gap-3 text-sm text-textSecondary">
          {activeSession.result.nextSteps
            .filter((step) => step.target === "documents" || step.target === "intake")
            .map((step) => (
              <li
                key={step.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"
              >
                <span>{step.label}</span>
                <Link
                  to={step.target === "documents" ? "/documents" : "/intake"}
                  className="rounded-lg border border-borderStrong px-3 py-2 text-xs text-textPrimary transition hover:bg-surface-3"
                >
                  Открыть
                </Link>
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
          to="/trust"
          className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
        >
          Открыть раздел доверия
        </Link>
      </div>
    </div>
  );
}
