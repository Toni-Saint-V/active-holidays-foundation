import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Briefcase,
  Home,
  ShieldCheck,
  Compass,
  type LucideIcon
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { morphPage } from "@/animations/variants";
import { ToastProvider } from "@/ui/Toast";
import { m1AllowedPublicRoutes } from "@shared/contracts/m1Scope";

type NavItem = {
  to: (typeof m1AllowedPublicRoutes)[number];
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/intake", label: "Анкета", icon: Compass },
  { to: "/result", label: "Вердикт", icon: ShieldCheck },
  { to: "/human-review", label: "Проверка", icon: Briefcase }
];

export function AppShell() {
  const location = useLocation();
  const isImmersive =
    location.pathname === "/" ||
    location.pathname === "/result" ||
    location.pathname === "/residency-es" ||
    location.pathname === "/insurance-adult";

  return (
    <ToastProvider>
      <div
        className={[
          "relative mx-auto flex min-h-screen w-full flex-col",
          isImmersive
            ? "max-w-none px-0 pb-0 pt-0"
            : "max-w-4xl px-4 pb-28 pt-4 sm:px-6 sm:pb-4"
        ].join(" ")}
      >
        {isImmersive ? null : (
          <header className="sticky top-3 z-20 mb-4 rounded-2xl border border-border bg-surface/90 p-4 shadow-soft backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-textSecondary">
                  Active Holidays · Санкт-Петербург
                </p>
                <h1 className="mt-1 text-lg font-semibold text-textPrimary">
                  Визовая готовность без догадок
                </h1>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-borderStrong bg-surface-2 px-3 py-1 text-[11px] text-textSecondary">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                движок RDC v1
              </span>
            </div>
            <nav className="mt-4 hidden gap-1 overflow-auto sm:flex">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition",
                      isActive
                        ? "bg-accent text-black"
                        : "text-textSecondary hover:bg-surface-3 hover:text-textPrimary"
                    ].join(" ")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </header>
        )}

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={morphPage}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {!isImmersive && (
          <nav className="fixed bottom-3 left-1/2 z-20 flex w-[min(96vw,720px)] -translate-x-1/2 items-center justify-between gap-1 overflow-auto rounded-2xl border border-border bg-surface/95 p-1.5 shadow-soft backdrop-blur sm:hidden">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "flex min-w-[64px] flex-1 flex-col items-center rounded-xl px-2 py-2 text-[10px] transition",
                    isActive
                      ? "bg-accent text-black"
                      : "text-textSecondary hover:bg-surface-3 hover:text-textPrimary"
                  ].join(" ")
                }
              >
                <Icon className="mb-1 h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </ToastProvider>
  );
}
