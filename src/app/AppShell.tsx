import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Maximize2,
  Minimize2,
  Bell,
  Briefcase,
  FileText,
  Home,
  ShieldCheck,
  Sparkles,
  Compass,
  UserCircle2
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { morphPage } from "@/animations/variants";
import { ToastProvider } from "@/ui/Toast";

const navItems = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/intake", label: "Анкета", icon: Compass },
  { to: "/result", label: "Вердикт", icon: ShieldCheck },
  { to: "/documents", label: "Документы", icon: FileText },
  { to: "/trust", label: "Доверие", icon: Sparkles },
  { to: "/human-review", label: "Проверка", icon: Briefcase },
  { to: "/notifications", label: "Сигналы", icon: Bell },
  { to: "/profile", label: "Профиль", icon: UserCircle2 }
];

export function AppShell() {
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const kioskMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(location.search);
    const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    return params.get("kiosk") === "1" || displayModeStandalone || iosStandalone;
  }, [location.search]);
  const isImmersive =
    location.pathname === "/" ||
    location.pathname === "/result" ||
    location.pathname === "/residency-es" ||
    location.pathname === "/insurance-adult";
  const hideAppChrome = isImmersive || kioskMode;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!kioskMode || typeof document === "undefined") return;
    if (document.fullscreenElement) return;

    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Ignore: browser blocks fullscreen until explicit gesture in some contexts.
      }
    };

    const onFirstTap = () => {
      void enterFullscreen();
    };

    window.addEventListener("pointerdown", onFirstTap, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstTap);
    };
  }, [kioskMode]);

  async function toggleFullscreen() {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser policy may block fullscreen without explicit gesture in some contexts.
    }
  }

  return (
    <ToastProvider>
      <div
        className={[
          "relative flex min-h-screen w-full flex-col",
          hideAppChrome
            ? "max-w-none px-0 pb-0 pt-0"
            : "max-w-none px-0 pb-28 pt-0 sm:pb-0"
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="fixed right-2 top-20 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface/92 px-2.5 text-[11px] font-semibold text-textPrimary shadow-soft backdrop-blur transition hover:border-borderStrong hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:right-5 sm:top-5 sm:h-11 sm:px-3 sm:text-sm"
          aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Включить полноэкранный режим"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{isFullscreen ? "Свернуть" : "Полный экран"}</span>
        </button>

        {hideAppChrome ? null : (
          <header className="sticky top-0 z-20 mb-3 border-b border-border bg-surface/92 px-4 py-3 shadow-soft backdrop-blur sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-textSecondary">
                  Active Holidays · Санкт-Петербург
                </p>
                <h1 className="mt-1 text-lg font-semibold text-textPrimary">
                  Детерминированный помощник по поездкам
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

        {!hideAppChrome && (
          <nav className="fixed bottom-0 left-0 right-0 z-20 flex w-full items-center justify-between gap-1 overflow-auto border-t border-border bg-surface/96 p-1.5 shadow-soft backdrop-blur sm:hidden">
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
