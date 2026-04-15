import { Link } from "react-router-dom";

export function LandingScreen() {
  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">Старт</p>
      <h2 className="mt-3 text-3xl font-semibold text-textPrimary">
        Первый рабочий каркас поездки
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
        В этой фазе система уже умеет принять базовую анкету, построить
        детерминированный результат и сохранить последнюю сессию локально.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/intake"
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-black transition hover:bg-accentHover"
        >
          Начать анкету
        </Link>
        <Link
          to="/result"
          className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary transition hover:bg-surface-3"
        >
          Открыть последний результат
        </Link>
      </div>
    </section>
  );
}
