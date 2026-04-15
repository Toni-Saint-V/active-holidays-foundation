import { Outlet, NavLink } from "react-router-dom";
import { Bell, FileText, Home, ShieldCheck, UserCircle2 } from "lucide-react";

const navItems = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/result", label: "Вердикт", icon: ShieldCheck },
  { to: "/documents", label: "Документы", icon: FileText },
  { to: "/notifications", label: "Сигналы", icon: Bell },
  { to: "/profile", label: "Профиль", icon: UserCircle2 }
];

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-24 pt-4">
      <header className="sticky top-0 z-10 mb-6 rounded-2xl border border-border bg-surface/90 p-4 shadow-soft backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">
              Платформа Active Holidays
            </p>
            <h1 className="mt-1 text-xl font-semibold text-textPrimary">
              Архитектурный каркас
            </h1>
          </div>
          <div className="rounded-full border border-borderStrong bg-surface-3 px-3 py-1 text-sm text-textSecondary">
            Фаза 1
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="fixed bottom-4 left-1/2 z-20 flex w-[min(92vw,720px)] -translate-x-1/2 items-center justify-between rounded-2xl border border-border bg-surface/95 px-2 py-2 shadow-soft backdrop-blur">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex min-w-[64px] flex-1 flex-col items-center rounded-xl px-3 py-2 text-xs transition",
                isActive
                  ? "bg-accent text-base"
                  : "text-textSecondary hover:bg-surface-3"
              ].join(" ")
            }
          >
            <Icon className="mb-1 h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
