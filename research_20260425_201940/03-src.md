## Source Code


### src/animations/variants.ts

````
import type { Variants } from "framer-motion";

export const fadeRise: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
};

export const staggerParent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
};

export const staggerChild: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
};

export const cinematic: Variants = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

export const morphPage: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeOut" } }
};

export const pulseVariants = (amplitude: number): Variants => ({
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1 + amplitude * 0.2, 1],
    opacity: [0.8, 1, 0.8],
    transition: { duration: Math.max(1.2, 2 - amplitude), repeat: Infinity, ease: "easeInOut" }
  }
});

export const swipeOut = (direction: "left" | "right" | "up") => ({
  x: direction === "left" ? -320 : direction === "right" ? 320 : 0,
  y: direction === "up" ? -240 : 0,
  opacity: 0,
  rotate: direction === "left" ? -12 : direction === "right" ? 12 : 0,
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
});

````

### src/app/AppShell.tsx

````
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
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

````

### src/app/router.tsx

````
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { LandingScreen } from "@/screens/landing/LandingScreen";
import { IntakeScreen } from "@/screens/intake/IntakeScreen";
import { ResultScreen } from "@/screens/result/ResultScreen";
import { DocumentsScreen } from "@/screens/documents/DocumentsScreen";
import { HumanReviewScreen } from "@/screens/human-review/HumanReviewScreen";
import { TrustScreen } from "@/screens/trust/TrustScreen";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { NotFoundScreen } from "@/screens/not-found/NotFoundScreen";
import { ResidencyScreen } from "@/screens/residency-es/ResidencyScreen";
import { InsuranceScreen } from "@/screens/insurance-adult/InsuranceScreen";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LandingScreen />} />
          <Route path="/intake" element={<IntakeScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/documents" element={<DocumentsScreen />} />
          <Route path="/human-review" element={<HumanReviewScreen />} />
          <Route path="/trust" element={<TrustScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/residency-es" element={<ResidencyScreen />} />
          <Route path="/insurance-adult" element={<InsuranceScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

````

### src/components/ah/ScreenCore.tsx

````
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/utils";

type AccentTone = "need" | "result" | "ai" | "info" | "muted";

type HeaderButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
};

const accentTextClass: Record<AccentTone, string> = {
  need: "text-accent",
  result: "text-success",
  ai: "text-ai",
  info: "text-info",
  muted: "text-textMuted"
};

const accentDotClass: Record<AccentTone, string> = {
  need: "bg-accent",
  result: "bg-success",
  ai: "bg-ai",
  info: "bg-info",
  muted: "bg-textMuted"
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-14 w-14 rounded-full bg-[linear-gradient(145deg,#9e8cff_0%,#6fe6ff_100%)]",
        className
      )}
    >
      <span className="absolute inset-[15px] rounded-full bg-base" />
    </div>
  );
}

export function HeaderButton({ icon, className, ...props }: HeaderButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface2 text-textPrimary transition hover:border-borderStrong hover:bg-surface3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50",
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}

export function ScreenHeader({
  left,
  center,
  right,
  className
}: {
  left: ReactNode;
  center?: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  if (!center) {
    return (
      <header className={cn("flex items-center justify-between gap-3", className)}>
        <div className="min-w-0">{left}</div>
        <div className="shrink-0">{right}</div>
      </header>
    );
  }

  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">{left}</div>
      {center ? <div className="shrink-0">{center}</div> : <div className="flex-1" />}
      <div className="flex min-w-0 flex-1 justify-end">{right}</div>
    </header>
  );
}

export function SectionLabel({
  children,
  tone = "need",
  className
}: {
  children: ReactNode;
  tone?: AccentTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em]",
        accentTextClass[tone],
        className
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", accentDotClass[tone])} />
      <span>{children}</span>
    </div>
  );
}

export function SurfacePill({
  label,
  active = false,
  onClick,
  className
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition",
        active
          ? "border-accent/40 bg-accent/12 text-accent"
          : "border-border bg-surface2 text-textSecondary hover:border-borderStrong hover:bg-surface3 hover:text-textPrimary",
        className
      )}
    >
      {label}
    </button>
  );
}

export function UtilityLink({
  children,
  onClick,
  className
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-sm font-semibold text-textSecondary transition hover:text-textPrimary",
        className
      )}
    >
      {children}
    </button>
  );
}

export function PrimaryCTA({
  label,
  subcopy,
  onClick,
  className,
  trailing,
  compact = false
}: {
  label: string;
  subcopy?: string;
  onClick?: () => void;
  className?: string;
  trailing?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f4f5f7] px-5 font-bold text-[#090a0d] transition hover:translate-y-[-1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f5f7]/60",
          compact ? "h-[56px] text-[16px]" : "h-[60px] text-[18px]"
        )}
      >
        <span>{label}</span>
        {trailing}
      </button>
      {subcopy ? <p className="text-center text-sm text-textSecondary">{subcopy}</p> : null}
    </div>
  );
}

````

### src/components/ah/SemanticBridge.tsx

````
import { cn } from "@/ui/utils";

type NodeTone = "need" | "info" | "result" | "manual";

type BridgeNode = {
  id: string;
  label: string;
  tone: NodeTone;
};

const nodeToneClass: Record<NodeTone, string> = {
  need: "bg-accent",
  info: "bg-info",
  result: "bg-success",
  manual: "bg-manual"
};

type Props = {
  leftChip: string;
  rightChip: string;
  nodes: BridgeNode[];
  activeNodeId: string;
  onNodeSelect?: (id: string) => void;
  onBridgeTap?: () => void;
  className?: string;
};

export function SemanticBridge({
  leftChip,
  rightChip,
  nodes,
  activeNodeId,
  onNodeSelect,
  onBridgeTap,
  className
}: Props) {
  const widthDivisor = Math.max(nodes.length - 1, 1);

  return (
    <div
      role={onBridgeTap ? "button" : undefined}
      tabIndex={onBridgeTap ? 0 : undefined}
      onClick={onBridgeTap}
      onKeyDown={
        onBridgeTap
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onBridgeTap();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-[32px] border border-border bg-[rgba(11,12,15,0.92)] px-5 py-5 shadow-soft",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <BridgeChip>{leftChip}</BridgeChip>
        <BridgeChip align="right">{rightChip}</BridgeChip>
      </div>

      <div className="relative mt-8">
        <div className="ah-route-line absolute left-5 right-5 top-[18px] h-[4px] rounded-full bg-route/55" />
        <div className="relative flex items-start justify-between px-5">
          {nodes.map((node, index) => {
            const isActive = node.id === activeNodeId;
            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={isActive}
                onClick={(event) => {
                  event.stopPropagation();
                  onNodeSelect?.(node.id);
                }}
                className="relative flex w-[96px] flex-col items-center gap-6 text-center transition focus-visible:outline-none"
                style={{
                  marginLeft: index === 0 ? 0 : undefined,
                  marginRight: index === nodes.length - 1 ? 0 : undefined
                }}
              >
                <span
                  className={cn(
                    "relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent transition",
                    nodeToneClass[node.tone],
                    isActive ? "ah-soft-pulse scale-100 text-base ring-8 ring-current/10" : "scale-[0.88] opacity-92"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.24em]",
                    isActive ? "text-textPrimary" : "text-textMuted"
                  )}
                >
                  {node.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BridgeChip({
  children,
  align = "left"
}: {
  children: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-full border border-border bg-surface2 px-5 text-xl font-semibold text-textPrimary",
        align === "right" && "justify-end text-right"
      )}
    >
      {children}
    </div>
  );
}

````

### src/components/ah/SignalBlocks.tsx

````
import { Sparkles } from "lucide-react";
import { cn } from "@/ui/utils";

export type SignalTone = "need" | "info" | "manual" | "result" | "muted";

export type EvidenceSignal = {
  id: string;
  label: string;
  tone?: SignalTone;
};

const toneClass: Record<SignalTone, string> = {
  need: "bg-accent",
  info: "bg-info",
  manual: "bg-manual",
  result: "bg-success",
  muted: "bg-textMuted"
};

export function EvidenceStrip({
  signals,
  className
}: {
  signals: EvidenceSignal[];
  className?: string;
}) {
  const visibleSignals = signals.slice(0, 3);

  return (
    <div
      className={cn(
        "flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-2 rounded-[24px] border border-border bg-surface2 px-4 py-3",
        className
      )}
    >
      {visibleSignals.map((signal, index) => (
        <div key={signal.id} className="flex items-center gap-3 text-sm text-textSecondary">
          <span className={cn("h-2.5 w-2.5 rounded-full", toneClass[signal.tone ?? "muted"])} />
          <span className="font-medium text-textPrimary">{signal.label}</span>
          {index < visibleSignals.length - 1 ? (
            <span className="text-textMuted">•</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AIInsightChip({
  summary,
  reasons,
  action,
  expanded,
  onToggle,
  onOpenFull,
  className
}: {
  summary: string;
  reasons: string[];
  action: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenFull?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="ah-ai-breathe inline-flex min-h-[44px] items-center gap-3 rounded-full border border-ai/25 bg-surface2 px-4 py-2 text-left transition hover:border-ai/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/40"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ai/18 text-ai">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-textPrimary">
          {summary}
        </span>
      </button>

      {expanded ? (
        <div className="ah-reveal-up rounded-[24px] border border-ai/20 bg-surface2 px-4 py-4">
          <div className="grid gap-2">
            {reasons.map((reason) => (
              <p key={reason} className="text-sm text-textSecondary">
                {reason}
              </p>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-textPrimary">{action}</p>
            {onOpenFull ? (
              <button
                type="button"
                onClick={onOpenFull}
                className="text-sm font-semibold text-ai transition hover:text-textPrimary"
              >
                Полный разбор
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentRow({
  title,
  meta,
  status,
  tone = "need"
}: {
  title: string;
  meta: string;
  status: string;
  tone?: SignalTone;
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-[20px] border border-border bg-surface2 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", toneClass[tone])} />
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold text-textPrimary">{title}</p>
          <p className="truncate text-sm text-textSecondary">{meta}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-surface3 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">
        {status}
      </span>
    </div>
  );
}

````

### src/hooks/useProductAutopilot.ts

````
import { useMemo } from "react";
import type { ProductType } from "@shared/contracts";

type Suggestion = {
  suggestion: ProductType;
  reason: string | null;
};

function detectTimeZoneRegion(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function detectLocaleCountry(): string | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages ?? [navigator.language];
  for (const entry of candidates) {
    const parts = entry.split("-");
    if (parts[1]) return parts[1].toUpperCase();
  }
  return null;
}

export function useProductAutopilot(): Suggestion {
  return useMemo(() => {
    const tz = detectTimeZoneRegion();
    if (tz && tz.startsWith("Europe/Madrid")) {
      return { suggestion: "residency_es", reason: "часовой пояс Europe/Madrid" };
    }
    if (tz && tz.startsWith("Europe/Rome")) {
      return { suggestion: "insurance_adult", reason: "часовой пояс Europe/Rome" };
    }
    const country = detectLocaleCountry();
    if (country === "ES") {
      return { suggestion: "residency_es", reason: "локаль ES" };
    }
    if (country === "IT" || country === "DE" || country === "FR") {
      return { suggestion: "insurance_adult", reason: `локаль ${country}` };
    }
    return { suggestion: "travel", reason: null };
  }, []);
}

````

### src/hooks/usePullToRefresh.ts

````
import { useEffect, useRef, useState } from "react";

type Options = {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
};

export function usePullToRefresh({ onRefresh, threshold = 80 }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    function onTouchStart(event: TouchEvent) {
      if (!node || node.scrollTop > 0 || isRefreshing) return;
      startY.current = event.touches[0]?.clientY ?? null;
    }
    function onTouchMove(event: TouchEvent) {
      if (startY.current === null) return;
      const currentY = event.touches[0]?.clientY ?? startY.current;
      const delta = Math.max(0, currentY - startY.current);
      setPullDistance(Math.min(140, delta * 0.45));
    }
    async function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (pullDistance >= threshold && !isRefreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", onTouchEnd);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance, threshold, isRefreshing]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    refresh: async () => {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    }
  };
}

````

### src/hooks/useReducedMotion.ts

````
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  return reduced;
}

````

### src/hooks/useSignalAutopilot.ts

````
import { useCallback } from "react";
import type { CaseSignals } from "@shared/contracts";

function resolveLocaleCountry(): string | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages ?? [navigator.language];
  for (const entry of candidates) {
    const parts = entry.split("-");
    if (parts[1]) return parts[1].toUpperCase();
  }
  return null;
}

function resolveTimeZone(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

const supportedCitizenship = new Set(["RU", "TR", "US", "RS", "AE", "GE", "AM", "BY"]);

export function useSignalAutopilot() {
  return useCallback((): CaseSignals => {
    const nowIso = new Date().toISOString();
    const citizenship = resolveLocaleCountry();
    const timezone = resolveTimeZone();
    const autopilot: CaseSignals = [];
    if (citizenship && supportedCitizenship.has(citizenship)) {
      autopilot.push({
        id: "citizenship",
        value: citizenship,
        source: "autopilot",
        capturedAt: nowIso
      });
    }
    if (timezone?.startsWith("Europe/")) {
      autopilot.push({
        id: "destination",
        value: timezone === "Europe/Moscow" ? "RU" : "IT",
        source: "autopilot",
        capturedAt: nowIso
      });
    }
    return autopilot;
  }, []);
}

````

### src/instrumentation/events.ts

````
import { z } from "zod";

export const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("screen_view"), screen: z.string() }),
  z.object({ type: z.literal("section_toggle"), screen: z.string(), sectionId: z.string(), open: z.boolean() }),
  z.object({ type: z.literal("signal_drilldown"), signalId: z.string() }),
  z.object({ type: z.literal("path_compare"), pathIds: z.array(z.string()) }),
  z.object({ type: z.literal("path_switch"), pathId: z.string() }),
  z.object({ type: z.literal("intake_answered"), signalId: z.string(), informationGain: z.number() }),
  z.object({ type: z.literal("preview_seen"), verdict: z.string(), confidence: z.number() }),
  z.object({ type: z.literal("replay_opened"), caseId: z.string() }),
  z.object({ type: z.literal("replay_finished"), caseId: z.string(), steps: z.number() }),
  z.object({ type: z.literal("whatif_triggered"), signalId: z.string() }),
  z.object({ type: z.literal("temporal_slider_dragged"), delta: z.number() }),
  z.object({ type: z.literal("cta_visible"), cta: z.string() }),
  z.object({ type: z.literal("cta_clicked"), cta: z.string() }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
  z.object({ type: z.literal("engine_timing"), step: z.string(), tookMs: z.number() })
]);

export type InstrumentationEvent = z.infer<typeof eventSchema>;

const ringSize = 200;
const ring: InstrumentationEvent[] = [];
const listeners: Array<(event: InstrumentationEvent) => void> = [];

export function track(event: InstrumentationEvent): void {
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) {
    console.warn("[active-holidays] invalid event", event);
    return;
  }
  if (ring.length >= ringSize) ring.shift();
  ring.push(parsed.data);
  if (typeof console !== "undefined" && typeof console.debug === "function") {
    console.debug("[active-holidays] event", parsed.data);
  }
  for (const listener of listeners) listener(parsed.data);
}

export function recentEvents(): InstrumentationEvent[] {
  return ring.slice();
}

export function onEvent(listener: (event: InstrumentationEvent) => void): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

export function clearEvents(): void {
  ring.length = 0;
}

````

### src/instrumentation/screenView.ts

````
import { useEffect } from "react";
import { track } from "./events";

export function useScreenView(screen: string): void {
  useEffect(() => {
    track({ type: "screen_view", screen });
  }, [screen]);
}

````

### src/lib/apiClient.ts

````
import { z } from "zod";
import {
  caseSchema,
  resultPayloadSchema,
  intakeQueueSchema,
  intakePreviewSchema,
  decisionsLogSchema,
  rulesCatalogSchema,
  ruleMetadataSchema,
  sourcesCatalogSchema,
  sourceSchema,
  auditTrailSchema,
  documentsReadinessSchema,
  caseOverrideSchema,
  caseSignalsSchema,
  humanReviewCreateRequestSchema,
  humanReviewCreateResponseSchema,
  humanReviewResponseSchema,
  pathPreferencesSchema,
  recommendationDetailRequestSchema,
  recommendationDetailSchema,
  recommendationShortlistSchema,
  scenarioLabFamilySchema,
  scenarioLabCompareRequestSchema,
  scenarioLabCompareResponseSchema,
  scenarioLabPayloadSchema,
  offersSchema,
  productTypeSchema,
  verdictSchema,
  actionTypeSchema,
  type Case,
  type CaseOverride,
  type CaseSignals,
  type DecisionLogEntry,
  type HumanReviewCreateRequest,
  type HumanReviewRequest,
  type IntakePreview,
  type IntakeQueue,
  type Offer,
  type PathPreferences,
  type ProductType,
  type RecommendationDetail,
  type RecommendationShortlist,
  type ResultPayload,
  type RuleMetadata,
  type ScenarioLabCompareRequest,
  type ScenarioLabCompareResponse,
  type ScenarioLabFamily,
  type ScenarioLabPayload,
  type Source
} from "@shared/contracts";

const DEFAULT_BASE = (() => {
  if (typeof window === "undefined") return "http://localhost:3001";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3001`;
})();

let baseUrl = DEFAULT_BASE;

export function configureApiBase(url: string): void {
  baseUrl = url;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

async function request<Schema extends z.ZodTypeAny>(
  path: string,
  schema: Schema,
  init: RequestInit = {}
): Promise<z.infer<Schema>> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  if (!response.ok) {
    let code: string | undefined;
    let message = `Запрос ${path} завершился ошибкой ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      if (body.message) message = body.message;
      code = body.error;
    } catch {
      // swallow
    }
    throw new ApiError(message, response.status, code);
  }
  const raw = (await response.json()) as unknown;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[apiClient] schema mismatch", path, parsed.error.issues);
    throw new ApiError(
      `Ответ ${path} не прошёл проверку схемы.`,
      200,
      "schema_mismatch"
    );
  }
  return parsed.data;
}

const caseListSchema = z.object({
  cases: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      productType: productTypeSchema.default("travel"),
      createdAt: z.string(),
      updatedAt: z.string(),
      signalCount: z.number(),
      forkedFrom: z.string().nullable()
    })
  )
});

export const scenarioCardSchema = z.object({
  caseId: z.string(),
  productType: productTypeSchema.default("travel"),
  title: z.string(),
  subtitle: z.string(),
  expectedVerdict: verdictSchema,
  expectedActionType: actionTypeSchema,
  expectedPrimaryPath: z.string().nullable(),
  note: z.string()
});
export type ScenarioCard = z.infer<typeof scenarioCardSchema>;

const scenariosResponseSchema = z.object({
  scenarios: z.array(scenarioCardSchema)
});

const decisionsResponseSchema = z.object({ decisions: decisionsLogSchema });
const caseResultResponseSchema = z.object({ case: caseSchema, result: resultPayloadSchema });
const pathsResponseSchema = z.object({ paths: offersSchema });
const rulesResponseSchema = z.object({ rules: rulesCatalogSchema });
const sourcesResponseSchema = z.object({ sources: sourcesCatalogSchema });
const auditResponseSchema = z.object({
  trail: auditTrailSchema,
  decisions: decisionsLogSchema
});

export const apiClient = {
  async health() {
    return request(
      "/api/health",
      z.object({
        status: z.literal("ok"),
        service: z.literal("active-holidays-foundation"),
        phase: z.literal("m1"),
        version: z.literal("rdc.v1")
      })
    );
  },
  async listCases() {
    const response = await request("/api/cases", caseListSchema);
    return response.cases;
  },
  async getCase(id: string): Promise<Case> {
    return request(`/api/cases/${encodeURIComponent(id)}`, caseSchema);
  },
  async getResult(id: string): Promise<ResultPayload> {
    return request(`/api/cases/${encodeURIComponent(id)}/result`, resultPayloadSchema);
  },
  async recommendationShortlist(id: string): Promise<RecommendationShortlist> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/shortlist`,
      recommendationShortlistSchema
    );
  },
  async recommendationDetail(
    id: string,
    offerId: string
  ): Promise<RecommendationDetail> {
    const body = recommendationDetailRequestSchema.parse({ offerId });
    return request(
      `/api/cases/${encodeURIComponent(id)}/recommendations/detail`,
      recommendationDetailSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async patchSignals(id: string, signals: CaseSignals) {
    return request(`/api/cases/${encodeURIComponent(id)}/signals`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ signals })
    });
  },
  async recompute(id: string, preferences?: PathPreferences) {
    return request(`/api/cases/${encodeURIComponent(id)}/recompute`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ preferences })
    });
  },
  async overrideSignal(id: string, override: CaseOverride) {
    return request(
      `/api/cases/${encodeURIComponent(id)}/override-signal`,
      caseResultResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(override)
      }
    );
  },
  async audit(id: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/audit`, auditResponseSchema);
  },
  async humanReview(id: string): Promise<HumanReviewRequest | null> {
    const response = await request(
      `/api/cases/${encodeURIComponent(id)}/human-review`,
      humanReviewResponseSchema
    );
    return response.request;
  },
  async submitHumanReview(id: string, payload: HumanReviewCreateRequest) {
    const body = humanReviewCreateRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/human-review`,
      humanReviewCreateResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async documents(id: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/documents`, documentsReadinessSchema);
  },
  async fork(id: string, title?: string) {
    return request(`/api/cases/${encodeURIComponent(id)}/fork`, caseResultResponseSchema, {
      method: "POST",
      body: JSON.stringify({ title })
    });
  },
  async scenarioFamily(id: string): Promise<ScenarioLabFamily> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenarios`,
      scenarioLabFamilySchema
    );
  },
  async compareScenario(
    id: string,
    payload: ScenarioLabCompareRequest
  ): Promise<ScenarioLabCompareResponse> {
    const body = scenarioLabCompareRequestSchema.parse(payload);
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenarios/compare`,
      scenarioLabCompareResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  },
  async decisionScenarioLab(id: string): Promise<ScenarioLabPayload> {
    return request(
      `/api/cases/${encodeURIComponent(id)}/scenario-lab`,
      scenarioLabPayloadSchema
    );
  },
  async paths(caseId: string): Promise<Offer[]> {
    const response = await request(
      `/api/paths/${encodeURIComponent(caseId)}`,
      pathsResponseSchema
    );
    return response.paths;
  },
  async rules(): Promise<RuleMetadata[]> {
    const response = await request("/api/rules", rulesResponseSchema);
    return response.rules;
  },
  async rule(id: string): Promise<RuleMetadata> {
    return request(`/api/rules/${encodeURIComponent(id)}`, ruleMetadataSchema);
  },
  async sources(): Promise<Source[]> {
    const response = await request("/api/sources", sourcesResponseSchema);
    return response.sources;
  },
  async source(id: string): Promise<Source> {
    return request(`/api/sources/${encodeURIComponent(id)}`, sourceSchema);
  },
  async nextQuestion(caseId: string): Promise<IntakeQueue> {
    return request(`/api/intake/next-question`, intakeQueueSchema, {
      method: "POST",
      body: JSON.stringify({ caseId })
    });
  },
  async preview(caseId: string): Promise<IntakePreview> {
    return request(
      `/api/intake/preview/${encodeURIComponent(caseId)}`,
      intakePreviewSchema
    );
  },
  async decisions(): Promise<DecisionLogEntry[]> {
    const response = await request("/api/decisions", decisionsResponseSchema);
    return response.decisions;
  },
  async scenarios(): Promise<ScenarioCard[]> {
    const response = await request("/api/scenarios", scenariosResponseSchema);
    return response.scenarios;
  }
};

export { caseOverrideSchema, caseSignalsSchema, pathPreferencesSchema };
export type { ProductType };

````

### src/lib/caseDefaults.ts

````
import type { ProductType } from "@shared/contracts";
import type { ScenarioCard } from "@/lib/apiClient";

export const defaultCaseByProduct: Record<ProductType, string> = {
  travel: "s1-rf-italy",
  residency_es: "s4-rf-residency-dnv",
  insurance_adult: "s5-rf-italy-insurance"
};

export function defaultCaseIdForProduct(productType: ProductType): string {
  return defaultCaseByProduct[productType];
}

export function findScenarioCaseId(
  scenarios: ScenarioCard[],
  productType: ProductType
): string {
  return (
    scenarios.find((scenario) => scenario.productType === productType)?.caseId ??
    defaultCaseByProduct[productType]
  );
}

export function findHumanReviewCaseId(scenarios: ScenarioCard[]): string {
  return (
    scenarios.find((scenario) => scenario.expectedVerdict === "HUMAN_REVIEW")?.caseId ??
    "s3-us-spb-business"
  );
}

const productTypeLabels: Record<ProductType, string> = {
  travel: "Визовый маршрут",
  residency_es: "ВНЖ Испании",
  insurance_adult: "Страховой сценарий"
};

export function productTypeLabel(productType: ProductType): string {
  return productTypeLabels[productType];
}

````

### src/lib/format.ts

````
const ruFormatter = new Intl.NumberFormat("ru-RU");
const ruDate = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short"
});
const ruDateOnly = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" });

export function formatRub(value: number): string {
  if (value === 0) return "0 ₽";
  return `${ruFormatter.format(value)} ₽`;
}

export function formatWeeks(weeks: number): string {
  if (weeks === 0) return "сразу";
  if (weeks === 1) return "1 неделя";
  if (weeks > 1 && weeks < 5) return `${weeks} недели`;
  return `${weeks} недель`;
}

export function formatPercent(value: number, fractionDigits = 0): string {
  const clamped = Math.min(1, Math.max(0, value));
  return `${(clamped * 100).toFixed(fractionDigits)}%`;
}

export function formatDate(iso: string): string {
  try {
    return ruDate.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateOnly(iso: string): string {
  try {
    return ruDateOnly.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function pluralizeSignals(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} сигналов`;
  if (mod10 === 1) return `${count} сигнал`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} сигнала`;
  return `${count} сигналов`;
}

export function pluralizeRules(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} правил`;
  if (mod10 === 1) return `${count} правило`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} правила`;
  return `${count} правил`;
}

````

### src/main.tsx

````
import React from "react";
import ReactDOM from "react-dom/client";
import { AppRouter } from "@/app/router";
import "@/styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);

````

### src/presentation/activeHolidays/documentsScreenModel.ts

````
import type { DocumentsReadinessItem, ResultPayload } from "@shared/contracts";
import {
  scoreBadgeTone,
  type PresentationBadgeTone
} from "./screenModelUtils";

export type DocumentsScreenModel = {
  gate:
    | {
        title: string;
        description: string;
        actionLabel: string;
      }
    | null;
  readiness: {
    eyebrow: string;
    heading: string;
    summary: string;
    badgeLabel: string;
    badgeTone: PresentationBadgeTone;
    primaryActionLabel: string;
    secondaryActionLabel: string;
  };
  requirements: {
    heading: string;
    emptyMessage: string;
    items: Array<Pick<DocumentsReadinessItem, "id" | "label" | "status" | "detail">>;
  };
  nextStep: {
    heading: string;
    description: string;
    ctaLabel: string;
    targetScreen: string;
  };
};

function readinessSummary(score: number): string {
  if (score >= 0.99) return "Пакет собран — можно подавать.";
  if (score >= 0.5) return "Базовая часть готова, осталось добрать несколько документов.";
  return "Рано подавать: нужно готовить ключевые документы.";
}

export function buildDocumentsScreenModel({
  result
}: {
  result: ResultPayload;
}): DocumentsScreenModel {
  return {
    gate:
      result.verdict === "HUMAN_REVIEW"
        ? {
            title: "Документный трек откроет оператор",
            description:
              "Пока кейс на ручной проверке, мы не показываем пакет документов и шаги подачи.",
            actionLabel: "Вернуться к ручной проверке"
          }
        : null,
    readiness: {
      eyebrow: "Документы",
      heading: "Индекс готовности",
      summary: readinessSummary(result.documents.score),
      badgeLabel: `${Math.round(result.documents.score * 100)}%`,
      badgeTone: scoreBadgeTone(result.documents.score),
      primaryActionLabel: "Отметить документ как готовый",
      secondaryActionLabel: "Вернуться к вердикту"
    },
    requirements: {
      heading: "Требования основного маршрута",
      emptyMessage: "Список появится, когда движок найдёт основной маршрут.",
      items: result.documents.items.map(({ id, label, status, detail }) => ({
        id,
        label,
        status,
        detail
      }))
    },
    nextStep: {
      heading: "Следующий шаг от движка",
      description: result.nextAction.detail,
      ctaLabel: result.nextAction.label,
      targetScreen: result.nextAction.targetScreen
    }
  };
}

````

### src/presentation/activeHolidays/humanReviewScreenModel.ts

````
import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewChannel,
  HumanReviewRequest,
  ResultPayload,
  RuleResult
} from "@shared/contracts";
import { formatDate } from "@/lib/format";
import {
  HUMAN_REVIEW_PIPELINE_ORDER,
  HUMAN_REVIEW_STATUS_LABELS,
  HUMAN_REVIEW_VERDICT_LABELS,
  pulseAmplitudeForSeverity
} from "./screenModelUtils";

type AuditSnapshot = {
  trail: AuditTrail;
  decisions: DecisionLogEntry[];
};

type OverviewTone = "default" | "notice";
type PipelineState = "completed" | "current" | "pending";
type HumanReviewScreenMode = "loading" | "open_review" | "required_review" | "optional_review";

export type HumanReviewScreenModel = {
  mode: HumanReviewScreenMode;
  header: {
    eyebrow: string;
    heading: string;
    description: string;
    badgeLabel: string;
    badgeTone: "review" | "neutral";
  };
  loadingState:
    | {
        title: string;
        description: string;
      }
    | null;
  overview: {
    rows: Array<{
      id: string;
      text: string;
      tone: OverviewTone;
    }>;
  };
  openReview:
    | {
        pipelineEyebrow: string;
        pipeline: Array<{
          id: HumanReviewRequest["status"];
          label: string;
          state: PipelineState;
        }>;
        snapshotTitle: string;
        channelLabel: string;
        contactLabel: string;
        verdictLabel: string;
        nextActionLabel: string;
        message: string;
        openCaseLabel: string;
      }
    | null;
  submitForm:
    | {
        messageLabel: string;
        messagePlaceholder: string;
        messageHint: string;
        channelLabel: string;
        channels: Array<{
          value: HumanReviewChannel;
          label: string;
        }>;
        contactPlaceholders: Record<HumanReviewChannel, string>;
        primaryActionLabel: string;
        secondaryActionLabel: string;
        availabilityNote: string;
      }
    | null;
  triggersSection:
    | {
        heading: string;
        items: Array<{
          id: string;
          title: string;
          detail: string;
        }>;
      }
    | null;
  warningsSection:
    | {
        heading: string;
        items: Array<{
          id: string;
          severity: "critical" | "high" | "medium" | "low";
          label: string;
          detail: string;
          triggeredBy: string[];
          pulseAmplitude: number;
        }>;
      }
    | null;
  auditSection:
    | {
        heading: string;
        historyLabel: string;
        steps: AuditTrail["steps"];
        history: Array<{
          id: string;
          label: string;
        }>;
      }
    | null;
};

function openRequest(request: HumanReviewRequest | null): HumanReviewRequest | null {
  if (!request) return null;
  if (request.status === "resolved" || request.status === "cancelled") return null;
  return request;
}

function headerDescription(result: ResultPayload, hasOpenReview: boolean): string {
  if (hasOpenReview) {
    return "Статус запроса живёт на сервере и показывается честно: без выдуманного ETA и без повторного пересчёта кейса.";
  }

  if (result.verdict === "HUMAN_REVIEW") {
    return "Автомат ушёл в ручную проверку: есть неоднозначности, которые должен закрыть человек.";
  }

  return "Для этого кейса ручная проверка не обязательна, но можно передать его менеджеру вручную.";
}

function humanReviewTriggers(ruleResults: RuleResult[]) {
  return ruleResults
    .filter((rule) => rule.fired && rule.output.type === "human_review_trigger")
    .map((rule) => ({
      id: rule.ruleId,
      title: "Причина проверки",
      detail: rule.explanation
    }));
}

function warningRows(ruleResults: RuleResult[]) {
  return ruleResults
    .filter((rule) => rule.fired && rule.output.type === "warning")
    .map((rule) => ({
      id: rule.ruleId,
      severity: rule.output.severity ?? "medium",
      label: rule.explanation.split(".")[0],
      detail: rule.explanation,
      triggeredBy: [rule.ruleId],
      pulseAmplitude: pulseAmplitudeForSeverity(rule.output.severity)
    }));
}

export function buildHumanReviewScreenModel({
  result,
  caseUpdatedAt,
  request,
  audit,
  humanReviewStatus
}: {
  result: ResultPayload;
  caseUpdatedAt: string;
  request: HumanReviewRequest | null;
  audit: AuditSnapshot | null;
  humanReviewStatus: "idle" | "loading" | "ready" | "error";
}): HumanReviewScreenModel {
  const activeRequest = openRequest(request);
  const hasOpenReview = activeRequest !== null;
  const isLoadingCurrentState =
    activeRequest === null && humanReviewStatus !== "ready" && humanReviewStatus !== "error";
  const mode: HumanReviewScreenMode = isLoadingCurrentState
    ? "loading"
    : hasOpenReview
      ? "open_review"
      : result.verdict === "HUMAN_REVIEW"
        ? "required_review"
        : "optional_review";
  const triggerItems = humanReviewTriggers(result.ruleResults);
  const warningItems = warningRows(result.ruleResults);
  const currentPipelineIndex = hasOpenReview
    ? HUMAN_REVIEW_PIPELINE_ORDER.indexOf(activeRequest.status)
    : -1;

  return {
    mode,
    header: {
      eyebrow: "Ручная проверка",
      heading:
        mode === "loading"
          ? "Проверяем активный запрос"
          : hasOpenReview
            ? "Запрос уже в работе"
            : "Передаём кейс менеджеру",
      description:
        mode === "loading"
          ? "Сначала честно проверим, есть ли уже активный запрос по этому кейсу. Только потом покажем форму или текущий статус."
          : headerDescription(result, hasOpenReview),
      badgeLabel:
        mode === "loading"
          ? "проверяем"
          : hasOpenReview
            ? HUMAN_REVIEW_STATUS_LABELS[activeRequest.status]
            : mode === "required_review"
              ? "нужна ручная проверка"
              : "по запросу",
      badgeTone: mode === "optional_review" ? "neutral" : "review"
    },
    loadingState:
      mode === "loading"
        ? {
            title: "Проверяем, есть ли активный запрос",
            description:
              "Если запрос уже отправлен, покажем его текущий статус. Если нет — откроем форму передачи кейса."
          }
        : null,
    overview: {
      rows: [
        {
          id: "updated-at",
          text: `Последнее обновление: ${formatDate(caseUpdatedAt)}`,
          tone: "default"
        },
        {
          id: "next-action",
          text: `Следующее действие: ${result.nextAction.label}`,
          tone: "default"
        },
        ...(request
          ? [
              {
                id: "durability",
                text:
                  request.durability === "persisted"
                    ? "Статус ручной проверки хранится на сервере и вернётся после обновления страницы или повторного открытия кейса."
                    : "Статус ручной проверки хранится только в текущей сессии сервера. Если сервер перезапустится, попросим отправить запрос заново, а не покажем фейковый pipeline.",
                tone: "notice" as const
              }
            ]
          : [])
      ]
    },
    openReview: hasOpenReview
      ? {
          pipelineEyebrow: "статус запроса",
          pipeline: HUMAN_REVIEW_PIPELINE_ORDER.map((step, index) => ({
            id: step,
            label: HUMAN_REVIEW_STATUS_LABELS[step],
            state:
              activeRequest.status === step
                ? "current"
                : currentPipelineIndex >= index
                  ? "completed"
                  : "pending"
          })),
          snapshotTitle: "Что зафиксировали в запросе",
          channelLabel: activeRequest.channel === "email" ? "Почта" : "Телеграм",
          contactLabel: activeRequest.contact,
          verdictLabel: HUMAN_REVIEW_VERDICT_LABELS[activeRequest.snapshot.verdict],
          nextActionLabel: activeRequest.snapshot.nextActionLabel,
          message: activeRequest.message,
          openCaseLabel: "Открыть кейс"
        }
      : null,
    submitForm: hasOpenReview
      ? null
      : mode === "loading"
      ? null
      : {
          messageLabel: "Опишите случай",
          messagePlaceholder:
            "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас.",
          messageHint:
            "Эксперт увидит исходный текст без переписывания. Чем конкретнее контекст, тем меньше уточнений потом.",
          channelLabel: "Как ответить",
          channels: [
            { value: "email", label: "Почта" },
            { value: "telegram", label: "Телеграм" }
          ],
          contactPlaceholders: {
            email: "you@example.com",
            telegram: "@username"
          },
          primaryActionLabel: "Передать менеджеру",
          secondaryActionLabel: "Открыть кейс",
          availabilityNote:
            "Обычно отвечаем в течение рабочего дня. Пока backend не стал durable, здесь нет fake ETA и нет обещаний, что статус переживёт restart."
        },
    triggersSection:
      triggerItems.length > 0
        ? {
            heading: "Что именно требует ручной проверки",
            items: triggerItems
          }
        : null,
    warningsSection:
      warningItems.length > 0
        ? {
            heading: "Активные предупреждения",
            items: warningItems
          }
        : null,
    auditSection:
      audit && result.verdict !== "HUMAN_REVIEW"
        ? {
            heading: "Аудит решения",
            historyLabel: "История пересчётов",
            steps: audit.trail.steps,
            history: audit.decisions.slice(0, 5).map((entry) => ({
              id: entry.id,
              label: `${formatDate(entry.recordedAt)} · ${entry.summary}`
            }))
          }
        : null
  };
}

````

### src/presentation/activeHolidays/index.ts

````
export {
  buildLandingScreenModel,
  type LandingBenefitTone,
  type LandingScreenModel
} from "./landingScreenModel";
export { buildDocumentsScreenModel, type DocumentsScreenModel } from "./documentsScreenModel";
export { buildHumanReviewScreenModel, type HumanReviewScreenModel } from "./humanReviewScreenModel";
export { buildResultScreenModel, type ResultScreenModel } from "./resultScreenModel";
export { buildTrustScreenModel, type TrustScreenModel } from "./trustScreenModel";

````

### src/presentation/activeHolidays/landingScreenModel.ts

````
import type { ProductType } from "@shared/contracts";
import { productLabelsRu } from "@shared/contracts";

export type LandingBenefitTone = "result" | "need" | "ai";

export type LandingScreenModel = {
  eyebrow: string;
  headline: [string, string, string];
  subline: string;
  productPills: Array<{
    productType: ProductType;
    label: string;
  }>;
  bridge: {
    leftChip: string;
    rightChip: string;
    nodes: Array<{
      id: string;
      label: string;
      tone: "info" | "need" | "result";
    }>;
    defaultNodeId: string;
    nodeSummary: Record<string, string>;
  };
  benefits: Array<{
    id: string;
    title: string;
    text: string;
    tone: LandingBenefitTone;
  }>;
  ai: {
    summary: string;
    reasons: string[];
    action: string;
  };
  cta: {
    label: string;
    subcopy: string;
    startPath: string;
    examplePath: string;
  };
};

type LandingCopy = Omit<
  LandingScreenModel,
  "productPills" | "bridge" | "cta"
> & {
  ctaSubcopy: string;
  leftChip: string;
  rightChip: string;
};

const routeByProduct: Record<ProductType, string> = {
  travel: "/result",
  residency_es: "/residency-es",
  insurance_adult: "/insurance-adult"
};

const productOrder: ProductType[] = ["travel", "residency_es", "insurance_adult"];

const bridgeNodes: LandingScreenModel["bridge"]["nodes"] = [
  { id: "check", label: "Проверка", tone: "info" },
  { id: "documents", label: "Документы", tone: "need" },
  { id: "submit", label: "Подача", tone: "result" }
];

const bridgeNodeSummary = {
  check: "Сначала сверяем кейс и не обещаем лишнего.",
  documents: "Потом собираем ровно тот пакет, который влияет на маршрут.",
  submit: "Только после этого ведём к следующему действию."
};

const landingCopyByProduct: Record<ProductType, LandingCopy> = {
  travel: {
    eyebrow: "умный помощник по визам",
    headline: ["Пойми маршрут.", "Собери пакет.", "Подайся спокойно."],
    subline:
      "Active Holidays помогает понять, можно ли подавать, что собрать и какой следующий шаг действительно правильный.",
    leftChip: "Паспорт",
    rightChip: "Италия 🇮🇹",
    benefits: [
      {
        id: "result",
        title: "Ясный результат",
        text: "Сразу видишь, можно ли идти дальше",
        tone: "result"
      },
      {
        id: "plan",
        title: "Пакет действий",
        text: "Сразу понимаешь, что нужно собрать",
        tone: "need"
      },
      {
        id: "ai",
        title: "AI-подсказки",
        text: "Получаешь живые рекомендации по шагам",
        tone: "ai"
      }
    ],
    ai: {
      summary: "AI: сначала собери выписку — это самый долгий шаг",
      reasons: [
        "Сначала фиксируем маршрут и слабые места, а не обещаем подачу заранее.",
        "Если кейс спорный, экран сразу переводит его в ручную проверку."
      ],
      action: "Следующий шаг: откроем первый сценарий и покажем результат."
    },
    ctaSubcopy: "Откроем первый сценарий и покажем результат."
  },
  residency_es: {
    eyebrow: "умный помощник по ВНЖ",
    headline: ["Определи путь.", "Собери досье.", "Подавайся спокойно."],
    subline:
      "Active Holidays раскладывает путь к ВНЖ на допустимый маршрут, нужные документы и момент, когда уже нужен человек.",
    leftChip: "Досье",
    rightChip: "Испания 🇪🇸",
    benefits: [
      {
        id: "path",
        title: "Допустимый путь",
        text: "Сразу видно, какой маршрут реально рабочий",
        tone: "result"
      },
      {
        id: "steps",
        title: "Список шагов",
        text: "Документы и сроки собраны в один план",
        tone: "need"
      },
      {
        id: "ai",
        title: "AI-подсказки",
        text: "Подсказываем, с какого шага начинать",
        tone: "ai"
      }
    ],
    ai: {
      summary: "AI: сначала проверь доход — это главный фильтр по маршруту",
      reasons: [
        "Сервис держит маршрут, документы и эскалацию в одном экране.",
        "Закрытые направления не выглядят как готовое действие."
      ],
      action: "Следующий шаг: откроем рабочий путь и первый блок документов."
    },
    ctaSubcopy: "Откроем рабочий путь и первый блок документов."
  },
  insurance_adult: {
    eyebrow: "умный помощник по страховке",
    headline: ["Проверь допуск.", "Собери условия.", "Покупай спокойно."],
    subline:
      "Active Holidays помогает выбрать полис по реальной пригодности к кейсу, а не по витрине или красивому обещанию.",
    leftChip: "Полис",
    rightChip: "Шенген 🇪🇺",
    benefits: [
      {
        id: "eligibility",
        title: "Ясный допуск",
        text: "Сразу видно, подходит ли полис под кейс",
        tone: "result"
      },
      {
        id: "terms",
        title: "Чёткие условия",
        text: "Понимаешь, что нужно добрать до покупки",
        tone: "need"
      },
      {
        id: "ai",
        title: "AI-подсказки",
        text: "Получаешь краткий разбор по шагам",
        tone: "ai"
      }
    ],
    ai: {
      summary: "AI: сначала проверь покрытие — это главный фильтр перед покупкой",
      reasons: [
        "Primary path не выглядит подтверждённым раньше времени.",
        "Слабые места показываются до целевого действия."
      ],
      action: "Следующий шаг: откроем результат и покажем пригодный сценарий."
    },
    ctaSubcopy: "Откроем результат и покажем пригодный сценарий."
  }
};

export function buildLandingScreenModel({
  productType,
  selectedScenarioCaseId
}: {
  productType: ProductType;
  selectedScenarioCaseId?: string | null;
}): LandingScreenModel {
  const copy = landingCopyByProduct[productType];
  const route = routeByProduct[productType];
  const query = selectedScenarioCaseId
    ? `?case=${encodeURIComponent(selectedScenarioCaseId)}`
    : "";

  return {
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    subline: copy.subline,
    productPills: productOrder.map((item) => ({
      productType: item,
      label: productLabelsRu[item]
    })),
    bridge: {
      leftChip: copy.leftChip,
      rightChip: copy.rightChip,
      nodes: bridgeNodes,
      defaultNodeId: "check",
      nodeSummary: bridgeNodeSummary
    },
    benefits: copy.benefits,
    ai: copy.ai,
    cta: {
      label: "Начать маршрут",
      subcopy: copy.ctaSubcopy,
      startPath: selectedScenarioCaseId
        ? `/intake?case=${encodeURIComponent(selectedScenarioCaseId)}`
        : "/intake",
      examplePath: `${route}${query}`
    }
  };
}

````

### src/presentation/activeHolidays/resultScreenModel.ts

````
import type {
  DocumentsReadinessItem,
  ResultPayload,
  ScenarioLabPayload
} from "@shared/contracts";
import { productTypeLabel } from "@/lib/caseDefaults";
import { documentsCountLabel } from "./screenModelUtils";

export type ResultScreenModel = {
  eyebrow: string;
  heading: string;
  meta: string;
  supportingLine: string;
  cta: {
    label: string;
    subcopy: string;
    targetScreen: string;
  };
  bridge: {
    leftChip: string;
    rightChip: string;
    activeNodeId: "docs" | "step" | "review";
    nodes: Array<{
      id: "docs" | "step" | "review";
      label: string;
      tone: "need" | "info" | "manual";
    }>;
    summary: Record<string, string>;
  };
  evidence: Array<{
    id: string;
    label: string;
    tone: "need" | "info" | "manual" | "result";
  }>;
  workSection: {
    eyebrow: string;
    heading: string;
    rows: Array<{
      id: string;
      title: string;
      meta: string;
      status: string;
      tone: "need" | "info" | "manual" | "result";
    }>;
  };
  ai: {
    summary: string;
    reasons: string[];
    action: string;
  };
  compareCard:
    | {
        title: string;
        summary: string;
      }
    | null;
  basisSheet: {
    whyBullets: string[];
    trustSummary: string;
    topRiskLabels: string[];
  };
};

const bridgeNodes: ResultScreenModel["bridge"]["nodes"] = [
  { id: "docs", label: "Документы", tone: "need" },
  { id: "step", label: "Действие", tone: "info" },
  { id: "review", label: "Проверка", tone: "manual" }
];

const bridgeSummary: ResultScreenModel["bridge"]["summary"] = {
  docs: "Показываем, что нужно закрыть до следующего шага.",
  step: "Следующее действие всегда опирается на текущий результат движка.",
  review: "Если автомат не может честно подтвердить маршрут, кейс уходит человеку."
};

const verdictHeadingByType: Record<ResultPayload["verdict"], string> = {
  GO: "Подача возможна",
  GO_WITH_CONDITIONS: "Можно идти дальше",
  NOT_NOW: "Пока не подавать",
  HUMAN_REVIEW: "Нужна ручная проверка"
};

const countryLabels: Record<string, string> = {
  IT: "Италия",
  ES: "Испания",
  RU: "Россия",
  TR: "Турция",
  US: "США"
};

const countryFlags: Record<string, string> = {
  IT: "🇮🇹",
  ES: "🇪🇸",
  RU: "🇷🇺",
  TR: "🇹🇷",
  US: "🇺🇸"
};

function countryLabel(code: string | undefined): string | null {
  if (!code) return null;
  return countryLabels[code] ?? code;
}

function resultMeta(result: ResultPayload): string {
  const primary = result.primaryPath;
  if (!primary) return productTypeLabel(result.productType);

  if (primary.productType === "travel") {
    return `${countryLabel(primary.destination) ?? primary.destination} • ${primary.title}`;
  }

  if (primary.productType === "residency_es") {
    return `Испания • ${primary.nameRu}`;
  }

  return `${primary.providerNameRu} • ${primary.productNameRu}`;
}

function actionSummary(result: ResultPayload): string {
  switch (result.nextAction.type) {
    case "book_appointment":
    case "schedule_consulate_appointment":
      return "запись на подачу";
    case "upload_missing_docs":
    case "collect_financial_docs":
      return "документы";
    case "send_for_review":
      return "ручная проверка";
    case "buy_policy":
    case "upgrade_coverage":
      return "страховой шаг";
    case "start_application":
      return "следующий шаг";
    default:
      return result.nextAction.label.toLowerCase();
  }
}

function supportingLine(
  result: ResultPayload,
  missingDocs: DocumentsReadinessItem[],
  isHumanReview: boolean
): string {
  if (isHumanReview) return "Автомат не подтвердил путь. Дальше — ручная проверка.";
  if (missingDocs.length > 0) {
    return `Нужно ${documentsCountLabel(missingDocs.length)}. Дальше — ${actionSummary(result)}.`;
  }
  return `Маршрут собран. Дальше — ${actionSummary(result)}.`;
}

function bridgeChipLabel(result: ResultPayload): string {
  if (result.productType === "residency_es") return "Досье";
  if (result.productType === "insurance_adult") return "Полис";
  return "Пакет";
}

function bridgeDestinationLabel(result: ResultPayload): string {
  const primary = result.primaryPath;
  if (primary?.productType === "travel") {
    const label = countryLabel(primary.destination) ?? primary.destination;
    const flag = countryFlags[primary.destination] ?? "";
    return `${label}${flag ? ` ${flag}` : ""}`;
  }
  if (result.productType === "residency_es") return "Испания 🇪🇸";
  if (result.productType === "insurance_adult") return "Шенген 🇪🇺";
  return productTypeLabel(result.productType);
}

function bridgeActiveNode(
  result: ResultPayload,
  missingDocs: DocumentsReadinessItem[]
): "docs" | "step" | "review" {
  if (result.verdict === "HUMAN_REVIEW") return "review";
  if (missingDocs.length > 0) return "docs";
  return "step";
}

function ctaSubcopy(result: ResultPayload): string {
  switch (result.nextAction.type) {
    case "book_appointment":
    case "schedule_consulate_appointment":
      return "Откроем запись и собранный шаг по кейсу.";
    case "upload_missing_docs":
    case "collect_financial_docs":
      return "Откроем документы и недостающий чеклист.";
    case "send_for_review":
      return "Откроем ручную проверку по текущему кейсу.";
    default:
      return "Откроем следующий шаг по текущему кейсу.";
  }
}

function evidenceSignals(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null,
  missingDocs: DocumentsReadinessItem[]
): ResultScreenModel["evidence"] {
  return [
    {
      id: "docs",
      label:
        missingDocs.length > 0
          ? `${documentsCountLabel(missingDocs.length)} сейчас`
          : "Пакет собран",
      tone: missingDocs.length > 0 ? "need" : "result"
    },
    {
      id: "next-step",
      label: result.nextAction.label,
      tone: "info"
    },
    {
      id: "scenario",
      label:
        result.verdict === "HUMAN_REVIEW"
          ? "Нужен оператор"
          : recommendedScenario
            ? "Есть сценарий усиления"
            : "Маршрут зафиксирован",
      tone:
        result.verdict === "HUMAN_REVIEW"
          ? "manual"
          : recommendedScenario
            ? "manual"
            : "result"
    }
  ];
}

function aiInsight(
  result: ResultPayload,
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null,
  missingDocs: DocumentsReadinessItem[]
): ResultScreenModel["ai"] {
  if (result.verdict === "HUMAN_REVIEW") {
    return {
      summary: "AI: подготовьте кейс для менеджера — автомат не может честно подтвердить маршрут",
      reasons: [
        "Система не показывает подтверждённый путь, пока кейс не разберёт человек.",
        "Лучше передать материалы сразу, чем пытаться пройти дальше вслепую."
      ],
      action: "Следующий шаг: открыть ручную проверку и передать текущий пакет."
    };
  }

  if (missingDocs.length > 0) {
    return {
      summary: `AI: сначала ${missingDocs[0].label.toLowerCase()} — это блокирует следующий шаг`,
      reasons: [
        "Движок уже показал рабочий маршрут, но пакет ещё не закреплён.",
        "Чем раньше закрыть недостающий документ, тем проще следующий переход."
      ],
      action: "Следующий шаг: открыть документы и закрыть обязательный чеклист."
    };
  }

  if (recommendedScenario) {
    return {
      summary: `AI: проверьте сценарий «${recommendedScenario.title}» — он может усилить путь`,
      reasons: [
        "У вас уже есть рабочий маршрут, поэтому сравнение помогает улучшать, а не спасать кейс.",
        "Сценарии ниже не подменяют основной путь и остаются compare-only."
      ],
      action: "Следующий шаг: открыть сценарии и сравнить усиление без смены базового маршрута."
    };
  }

  return {
    summary: "AI: маршрут подтверждён — можно переходить к следующему действию",
    reasons: [
      "Основной путь уже зафиксирован детерминированным движком.",
      "Сейчас важно не распыляться и пройти основной шаг без лишних отклонений."
    ],
    action: `Следующий шаг: ${result.nextAction.label}.`
  };
}

function documentRows(
  result: ResultPayload,
  missingDocs: DocumentsReadinessItem[],
  recommendedScenario: ScenarioLabPayload["scenarios"][number] | null
): ResultScreenModel["workSection"]["rows"] {
  if (missingDocs.length > 0) {
    return missingDocs.slice(0, 2).map((item) => ({
      id: item.id,
      title: item.label,
      meta: item.detail,
      status: item.status === "blocked" ? "стоп" : "нужно",
      tone: item.status === "blocked" ? "manual" : "need"
    }));
  }

  if (result.verdict === "HUMAN_REVIEW") {
    return [
      {
        id: "manual-review",
        title: "Передать кейс",
        meta: result.nextAction.detail,
        status: "проверка",
        tone: "manual"
      }
    ];
  }

  if (recommendedScenario) {
    return [
      {
        id: recommendedScenario.id,
        title: recommendedScenario.title,
        meta: recommendedScenario.summary,
        status: "сценарий",
        tone: "info"
      }
    ];
  }

  return [
    {
      id: "next-action",
      title: result.nextAction.label,
      meta: result.nextAction.detail,
      status: "дальше",
      tone: "result"
    }
  ];
}

export function buildResultScreenModel({
  result,
  scenarioLab
}: {
  result: ResultPayload;
  scenarioLab: ScenarioLabPayload | null;
}): ResultScreenModel {
  const missingDocs = result.documents.items.filter((item) => item.status !== "ready");
  const isHumanReview = result.verdict === "HUMAN_REVIEW";
  const recommendedScenario =
    scenarioLab?.scenarios.find((scenario) => scenario.id === scenarioLab.recommendedScenarioId) ??
    scenarioLab?.scenarios[0] ??
    null;

  return {
    eyebrow: isHumanReview ? "ручная проверка" : "основной маршрут",
    heading: verdictHeadingByType[result.verdict],
    meta: resultMeta(result),
    supportingLine: supportingLine(result, missingDocs, isHumanReview),
    cta: {
      label: result.nextAction.label,
      subcopy: ctaSubcopy(result),
      targetScreen: result.nextAction.targetScreen
    },
    bridge: {
      leftChip: bridgeChipLabel(result),
      rightChip: bridgeDestinationLabel(result),
      activeNodeId: bridgeActiveNode(result, missingDocs),
      nodes: bridgeNodes,
      summary: bridgeSummary
    },
    evidence: evidenceSignals(result, recommendedScenario, missingDocs),
    workSection: {
      eyebrow: "нужно сейчас",
      heading: "Собрать пакет",
      rows: documentRows(result, missingDocs, recommendedScenario)
    },
    ai: aiInsight(result, recommendedScenario, missingDocs),
    compareCard:
      recommendedScenario || result.alternativePaths.length > 0
        ? {
            title: recommendedScenario?.title ?? "Есть альтернативный путь",
            summary:
              recommendedScenario?.summary ??
              "Сравните запасной маршрут, не ломая основной путь."
          }
        : null,
    basisSheet: {
      whyBullets:
        result.whyBullets.length > 0
          ? result.whyBullets.slice(0, 4).map((bullet) => bullet.text)
          : [result.nextAction.detail],
      trustSummary: `Уверенность движка: ${Math.round(result.trust.confidence * 100)}%. Пределы: ${
        result.trust.confidenceBreakdown.capsApplied.length > 0
          ? result.trust.confidenceBreakdown.capsApplied.join(", ")
          : "нет активных ограничителей"
      }.`,
      topRiskLabels: result.risks.slice(0, 3).map((risk) => risk.label)
    }
  };
}

````

### src/presentation/activeHolidays/screenModelUtils.ts

````
import type { HumanReviewRequest, SourceTier } from "@shared/contracts";

export type PresentationBadgeTone = "positive" | "warning" | "negative" | "review";

export const HUMAN_REVIEW_STATUS_LABELS: Record<HumanReviewRequest["status"], string> = {
  submitted: "Принято",
  in_queue: "В очереди",
  in_review: "У человека",
  resolved: "Ответ готов",
  cancelled: "Закрыто"
};

export const HUMAN_REVIEW_PIPELINE_ORDER: HumanReviewRequest["status"][] = [
  "submitted",
  "in_queue",
  "in_review",
  "resolved"
];

export const HUMAN_REVIEW_VERDICT_LABELS: Record<
  HumanReviewRequest["snapshot"]["verdict"],
  string
> = {
  GO: "Можно идти дальше",
  GO_WITH_CONDITIONS: "Можно, но с условиями",
  NOT_NOW: "Пока рано",
  HUMAN_REVIEW: "Нужна ручная проверка"
};

export function scoreBadgeTone(score: number): PresentationBadgeTone {
  if (score >= 0.8) return "positive";
  if (score >= 0.5) return "warning";
  return "negative";
}

export function documentsCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} документов`;
  if (mod10 === 1) return `${count} документ`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} документа`;
  return `${count} документов`;
}

export function sourceSummaryByTier(tier: SourceTier): string {
  if (tier === "official") {
    return "Официальный источник — учитываем с минимальной волатильностью.";
  }

  if (tier === "operator") {
    return "Оператор: актуальные слоты и цены.";
  }

  return "Краудсорс: учитываем как вторичный сигнал.";
}

export function pulseAmplitudeForSeverity(
  severity: HumanReviewWarningSeverity | undefined
): number {
  if (severity === "critical") return 1;
  if (severity === "high") return 0.75;
  if (severity === "medium") return 0.5;
  return 0.25;
}

type HumanReviewWarningSeverity = "critical" | "high" | "medium" | "low";

````

### src/presentation/activeHolidays/trustScreenModel.ts

````
import type { ResultPayload, Source } from "@shared/contracts";
import { formatPercent } from "@/lib/format";
import {
  scoreBadgeTone,
  sourceSummaryByTier,
  type PresentationBadgeTone
} from "./screenModelUtils";

export type TrustScreenModel = {
  gate:
    | {
        title: string;
        description: string;
      }
    | null;
  hero: {
    eyebrow: string;
    heading: string;
    badgeLabel: string;
    badgeTone: PresentationBadgeTone;
  };
  explanation: {
    eyebrow: string;
    heading: string;
  };
  sourcesSection: {
    heading: string;
    volatilityLabel: string;
    items: Source[];
  };
};

export function buildTrustScreenModel({
  result
}: {
  result: ResultPayload;
}): TrustScreenModel {
  return {
    gate:
      result.verdict === "HUMAN_REVIEW"
        ? {
            title: "Доверие уточнит оператор",
            description:
              "Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки."
          }
        : null,
    hero: {
      eyebrow: "Доверие",
      heading: "Почему движку можно верить",
      badgeLabel: formatPercent(result.trust.confidence),
      badgeTone: scoreBadgeTone(result.trust.confidence)
    },
    explanation: {
      eyebrow: "Цепочка объяснения",
      heading: "Сигналы → правила → выводы"
    },
    sourcesSection: {
      heading: "Источники",
      volatilityLabel: `Средняя волатильность ${formatPercent(result.trust.volatilityScore, 0)}`,
      items: result.trust.sources.map((source) => ({
        ...source,
        summary: sourceSummaryByTier(source.tier)
      }))
    }
  };
}

````

### src/screens/documents/DocumentsScreen.tsx

````
import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { ReadinessCircle } from "@/ui/ReadinessCircle";
import { DocumentCard } from "@/ui/DocumentCard";
import { EmptyState } from "@/ui/EmptyState";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { track } from "@/instrumentation/events";
import { defaultCaseIdForProduct } from "@/lib/caseDefaults";
import { buildDocumentsScreenModel } from "@/presentation/activeHolidays";

export function DocumentsScreen() {
  useScreenView("documents");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    scenarios,
    bootstrap,
    loadCase,
    patchSignal,
    status,
    errorMessage
  } = useCaseStore();

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target =
      caseIdFromUrl ??
      activeCaseId ??
      defaultCaseIdForProduct(activeCase?.productType ?? activeResult?.productType ?? "travel");
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, activeCase?.productType, activeResult?.productType, loadCase]);

  if (status === "error") {
    return (
      <EmptyState
        title="Ошибка загрузки документов"
        description={errorMessage ?? "Попробуйте обновить страницу."}
      />
    );
  }

  if (!activeCase || !activeResult) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Готовим документный трек…</p>
      </Card>
    );
  }

  const readiness = activeResult.documents;
  const screenModel = buildDocumentsScreenModel({ result: activeResult });

  if (activeResult.verdict === "HUMAN_REVIEW") {
    return (
      <EmptyState
        title={screenModel.gate?.title ?? "Документный трек откроет оператор"}
        description={
          screenModel.gate?.description ??
          "Пока кейс на ручной проверке, мы не показываем пакет документов и шаги подачи."
        }
        action={
          <Button variant="secondary" onClick={() => navigate("/human-review")}>
            {screenModel.gate?.actionLabel ?? "Вернуться к ручной проверке"}
          </Button>
        }
      />
    );
  }

  async function markReady() {
    if (!activeCase) return;
    const next = Math.min(readiness.readyCount + 1, readiness.requiredCount);
    track({ type: "cta_clicked", cta: "documents_mark_ready" });
    await patchSignal(activeCase.id, "documents_ready_count", next);
    toast.push("Отметили документ как готовый — пересчитали движком.", "success");
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                {screenModel.readiness.eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-textPrimary">
                {screenModel.readiness.heading}
              </h2>
              <p className="mt-2 text-sm text-textSecondary">{screenModel.readiness.summary}</p>
            </div>
            <Badge tone={screenModel.readiness.badgeTone}>
              {screenModel.readiness.badgeLabel}
            </Badge>
          </div>
          <div className="mt-4">
            <ReadinessCircle readiness={readiness} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={markReady}>
              <FileText className="h-3 w-3" /> {screenModel.readiness.primaryActionLabel}
            </Button>
            <Link to={`/result?case=${encodeURIComponent(activeCase.id)}`}>
              <Button variant="secondary" size="sm">
                {screenModel.readiness.secondaryActionLabel}
              </Button>
            </Link>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-3 text-sm font-medium text-textPrimary">{screenModel.requirements.heading}</p>
          {screenModel.requirements.items.length === 0 ? (
            <p className="text-sm text-textSecondary">
              {screenModel.requirements.emptyMessage}
            </p>
          ) : (
            <div className="grid gap-2">
              {screenModel.requirements.items.map((item) => (
                <DocumentCard
                  key={item.id}
                  item={{ id: item.id, label: item.label, status: item.status, detail: item.detail }}
                />
              ))}
            </div>
          )}
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-2 text-sm font-medium text-textPrimary">{screenModel.nextStep.heading}</p>
          <p className="text-sm text-textSecondary">{screenModel.nextStep.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/${screenModel.nextStep.targetScreen}?case=${encodeURIComponent(activeCase.id)}`)}>
              {screenModel.nextStep.ctaLabel}
            </Button>
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}

````

### src/screens/human-review/HumanReviewScreen.tsx

````
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Phone } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import type { HumanReviewChannel } from "@shared/contracts";
import { Badge, Button, Card, Chip } from "@/ui/primitives";
import { RiskPulse } from "@/ui/RiskPulse";
import { TimelineStep } from "@/ui/TimelineStep";
import { EmptyState } from "@/ui/EmptyState";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { staggerChild, staggerParent } from "@/animations/variants";
import { findHumanReviewCaseId } from "@/lib/caseDefaults";
import { buildHumanReviewScreenModel } from "@/presentation/activeHolidays";

export function HumanReviewScreen() {
  useScreenView("human-review");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const mountedRef = useRef(true);
  const [channel, setChannel] = useState<HumanReviewChannel>("email");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    activeHumanReview,
    scenarios,
    audit,
    bootstrap,
    loadCase,
    loadAudit,
    loadHumanReview,
    submitHumanReview,
    status,
    errorMessage,
    humanReviewStatus,
    humanReviewError
  } = useCaseStore();
  const currentReview = activeHumanReview?.caseId === activeCase?.id ? activeHumanReview : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target =
      caseIdFromUrl ??
      activeCaseId ??
      findHumanReviewCaseId(scenarios);
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

  useEffect(() => {
    if (activeCase && activeResult?.verdict !== "HUMAN_REVIEW") {
      void loadAudit(activeCase.id);
    }
  }, [activeCase, activeResult?.verdict, loadAudit]);

  useEffect(() => {
    if (activeCase?.id) {
      void loadHumanReview(activeCase.id);
    }
  }, [activeCase?.id, loadHumanReview]);

  useEffect(() => {
    setChannel("email");
    setContact("");
    setMessage("");
  }, [activeCase?.id]);

  if (status === "error") {
    return (
      <EmptyState
        title="Не удалось открыть ручную проверку"
        description={errorMessage ?? "Попробуйте снова или выберите другой кейс."}
      />
    );
  }

  if (!activeResult || !activeCase) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Готовим пакет для менеджера…</p>
      </Card>
    );
  }

  const screenModel = buildHumanReviewScreenModel({
    result: activeResult,
    caseUpdatedAt: activeCase.updatedAt,
    request: currentReview,
    audit,
    humanReviewStatus
  });
  const openReview = screenModel.openReview !== null;
  const auditSection = screenModel.auditSection;

  async function handleSubmit() {
    if (!activeCase) return;
    const submittedCaseId = activeCase.id;
    if (message.trim().length < 10) {
      toast.push("Опишите случай чуть подробнее: минимум 10 символов.", "error");
      return;
    }
    if (contact.trim().length < 3) {
      toast.push("Добавьте контакт, чтобы менеджер мог ответить.", "error");
      return;
    }

    try {
      const response = await submitHumanReview(activeCase.id, {
        channel,
        contact: contact.trim(),
        message: message.trim()
      });
      if (!mountedRef.current || useCaseStore.getState().humanReviewCaseId !== submittedCaseId) return;
      toast.push(
        response.reused
          ? "Активный запрос уже есть — открыли его текущий статус."
          : "Запрос передан в ручную проверку.",
        "success"
      );
    } catch (error) {
      if (!mountedRef.current || useCaseStore.getState().humanReviewCaseId !== submittedCaseId) return;
      toast.push(
        error instanceof Error ? error.message : "Не удалось отправить запрос менеджеру.",
        "error"
      );
    }
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                {screenModel.header.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold text-textPrimary">{screenModel.header.heading}</h2>
              <p className="mt-2 text-sm text-textSecondary">{screenModel.header.description}</p>
            </div>
            <Badge tone={screenModel.header.badgeTone}>{screenModel.header.badgeLabel}</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {screenModel.overview.rows.map((row) => (
              <div
                key={row.id}
                className={
                  row.tone === "notice"
                    ? "rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    : "rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary"
                }
              >
                {row.text}
              </div>
            ))}
          </div>
          {screenModel.loadingState ? (
            <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-4 text-sm text-textSecondary">
              <p className="font-medium text-textPrimary">{screenModel.loadingState.title}</p>
              <p className="mt-2">{screenModel.loadingState.description}</p>
            </div>
          ) : screenModel.openReview ? (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 rounded-2xl bg-surface-2 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-textMuted">
                  {screenModel.openReview.pipelineEyebrow}
                </p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {screenModel.openReview.pipeline.map((step) => {
                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-3 py-3 text-sm ${
                          step.state === "current" || step.state === "completed"
                            ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
                            : "border-border bg-surface text-textMuted"
                        }`}
                      >
                        <p className="font-medium">{step.label}</p>
                        <p className="mt-1 text-xs opacity-80">
                          {step.state === "current"
                            ? "текущий этап"
                            : step.state === "completed"
                              ? "этап пройден"
                              : "ожидает"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 px-4 py-4 text-sm text-textSecondary">
                <p className="font-medium text-textPrimary">{screenModel.openReview.snapshotTitle}</p>
                <p className="mt-2">Канал: {screenModel.openReview.channelLabel}</p>
                <p className="mt-1">Контакт: {screenModel.openReview.contactLabel}</p>
                <p className="mt-1">Вердикт на момент отправки: {screenModel.openReview.verdictLabel}</p>
                <p className="mt-1">Следующий шаг: {screenModel.openReview.nextActionLabel}</p>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface px-3 py-3 text-textPrimary">
                  {screenModel.openReview.message}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-textPrimary">{screenModel.submitForm?.messageLabel}</p>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  className="min-h-36 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent/60"
                  placeholder={screenModel.submitForm?.messagePlaceholder}
                />
                <p className="text-xs text-textMuted">
                  {screenModel.submitForm?.messageHint}
                </p>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-textPrimary">{screenModel.submitForm?.channelLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {screenModel.submitForm?.channels.map((item) => (
                    <Chip
                      key={item.value}
                      selected={channel === item.value}
                      onClick={() => setChannel(item.value)}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent/60"
                  placeholder={screenModel.submitForm?.contactPlaceholders[channel]}
                />
              </div>
              {humanReviewError && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {humanReviewError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  leadingIcon={<Phone className="h-4 w-4" />}
                  onClick={() => void handleSubmit()}
                  loading={humanReviewStatus === "loading"}
                >
                  {screenModel.submitForm?.primaryActionLabel}
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={<Briefcase className="h-4 w-4" />}
                  onClick={() => navigate(`/result?case=${encodeURIComponent(activeCase.id)}`)}
                >
                  {screenModel.submitForm?.secondaryActionLabel}
                </Button>
              </div>
            </div>
          )}
          {!openReview && !screenModel.loadingState && (
            <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm text-textSecondary">
              {screenModel.submitForm?.availabilityNote}
            </div>
          )}
          {screenModel.openReview && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                leadingIcon={<Briefcase className="h-4 w-4" />}
                onClick={() => navigate(`/result?case=${encodeURIComponent(activeCase.id)}`)}
              >
                {screenModel.openReview.openCaseLabel}
              </Button>
            </div>
          )}
        </Card>
      </motion.section>

      {screenModel.triggersSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">{screenModel.triggersSection.heading}</p>
            <div className="grid gap-2">
              {screenModel.triggersSection.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3"
                >
                  <p className="text-sm font-medium text-sky-100">{item.title}</p>
                  <p className="mt-1 text-xs text-sky-100/80">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {screenModel.warningsSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">{screenModel.warningsSection.heading}</p>
            <div className="grid gap-2">
              {screenModel.warningsSection.items.map((item) => (
                <RiskPulse
                  key={item.id}
                  risk={{
                    id: item.id,
                    severity: item.severity,
                    label: item.label,
                    detail: item.detail,
                    triggeredBy: item.triggeredBy,
                    pulseAmplitude: item.pulseAmplitude
                  }}
                />
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {auditSection && (
        <motion.section variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">{auditSection.heading}</p>
            <div className="grid gap-1">
              {auditSection.steps.map((step, index) => (
                <TimelineStep
                  key={step.index}
                  index={step.index}
                  title={step.name}
                  detail={step.outputSummary}
                  tookMs={step.tookMs}
                  active={index === auditSection.steps.length - 1}
                />
              ))}
            </div>
            {auditSection.history.length > 0 && (
              <div className="mt-4 grid gap-2">
                <p className="text-xs uppercase tracking-wide text-textMuted">{auditSection.historyLabel}</p>
                {auditSection.history.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-textSecondary">
                    {entry.label}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.section>
      )}
    </motion.div>
  );
}

````

### src/screens/insurance-adult/InsuranceScreen.tsx

````
import { ResultScreen } from "@/screens/result/ResultScreen";

export function InsuranceScreen() {
  return <ResultScreen productType="insurance_adult" screenName="insurance-adult" />;
}

````

### src/screens/intake/IntakeScreen.tsx

````
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { QuestionCard } from "@/ui/QuestionCard";
import { MiniVerdictPreview } from "@/ui/MiniVerdictPreview";
import { ProgressMeter } from "@/ui/ProgressMeter";
import { EmptyState } from "@/ui/EmptyState";
import { StickyFooter } from "@/ui/StickyFooter";
import { SignalRow } from "@/ui/SignalRow";
import { staggerChild, staggerParent } from "@/animations/variants";
import { track } from "@/instrumentation/events";
import { useScreenView } from "@/instrumentation/screenView";
import { useSignalAutopilot } from "@/hooks/useSignalAutopilot";
import { useToast } from "@/ui/Toast";

export function IntakeScreen() {
  useScreenView("intake");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    intakeQueue,
    intakePreview,
    scenarios,
    bootstrap,
    loadCase,
    patchSignal,
    patchSignals,
    status,
    errorMessage
  } = useCaseStore();
  const [autopilotRan, setAutopilotRan] = useState(false);
  const autopilotFn = useSignalAutopilot();

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target = caseIdFromUrl ?? activeCaseId ?? scenarios[0]?.caseId ?? "s1-rf-italy";
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, scenarios, loadCase]);

  const currentQuestion = intakeQueue?.nextQuestion ?? null;
  const progress = intakeQueue?.progress ?? 0;

  const answeredPreview = useMemo(() => {
    if (!activeResult) return null;
    return activeResult.decisionSignals.filter((signal) => signal.present).slice(0, 6);
  }, [activeResult]);

  async function handleAnswer(value: string | number | boolean | null) {
    if (!activeCase || !currentQuestion) return;
    track({
      type: "intake_answered",
      signalId: currentQuestion.id,
      informationGain: currentQuestion.informationGain
    });
    await patchSignal(activeCase.id, currentQuestion.id, value);
    if (intakePreview) {
      track({
        type: "preview_seen",
        verdict: intakePreview.tentativeVerdict,
        confidence: intakePreview.tentativeConfidence
      });
    }
  }

  async function handleAutopilot() {
    if (!activeCase) return;
    const inferred = autopilotFn();
    if (inferred.length === 0) {
      toast.push("Автопилот не нашёл подсказок по локали — заполните вручную.", "warning");
      setAutopilotRan(true);
      return;
    }
    await patchSignals(activeCase.id, inferred);
    toast.push(`Автопилот заполнил ${inferred.length} сигналов из локали браузера.`, "success");
    setAutopilotRan(true);
  }

  function handleContinue() {
    if (!activeCase) return;
    track({ type: "cta_clicked", cta: "intake_to_result" });
    navigate(`/result?case=${encodeURIComponent(activeCase.id)}`);
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Не удалось загрузить анкету"
        description={errorMessage ?? "Попробуйте обновить страницу или выбрать другой кейс."}
        action={
          <Button variant="secondary" onClick={() => loadCase(caseIdFromUrl ?? "s1-rf-italy")}>
            Попробовать снова
          </Button>
        }
      />
    );
  }

  if (!activeCase || !intakeQueue || !intakePreview) {
    return (
      <Card className="animate-pulse">
        <p className="text-sm text-textSecondary">Готовим адаптивную анкету…</p>
      </Card>
    );
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.div variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                Анкета · {activeCase.id}
              </p>
              <h2 className="text-xl font-semibold text-textPrimary">{activeCase.title}</h2>
            </div>
            <Badge tone="warning">
              <Sparkles className="h-3 w-3" />
              адаптивный порядок
            </Badge>
          </div>
          <ProgressMeter
            value={progress}
            label="Готовность обязательных сигналов"
            detail="Порядок вопросов пересчитывается движком по прибыли информации."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleAutopilot()}
              disabled={autopilotRan}
              leadingIcon={<Zap className="h-3.5 w-3.5" />}
            >
              {autopilotRan ? "Автопилот отработал" : "Автопилот: предложить сигналы"}
            </Button>
            <span className="text-xs text-textSecondary">
              Детерминированно: читаем `navigator.languages` и часовой пояс.
            </span>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerChild}>
        <MiniVerdictPreview preview={intakePreview} />
      </motion.div>

      {currentQuestion ? (
        <motion.div variants={staggerChild}>
          <QuestionCard question={currentQuestion} onAnswer={handleAnswer} />
        </motion.div>
      ) : (
        <motion.div variants={staggerChild}>
          <EmptyState
            title="Все обязательные сигналы собраны"
            description="Можно переходить к итоговому вердикту и подбору маршрута."
            action={<Button onClick={handleContinue}>Открыть вердикт</Button>}
          />
        </motion.div>
      )}

      {intakeQueue.remaining.length > 1 && (
        <motion.div variants={staggerChild}>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-textPrimary">
                Что спросим дальше
              </p>
              <Badge tone="neutral">очередь по информативности</Badge>
            </div>
            <div className="grid gap-2">
              {intakeQueue.remaining.slice(1, 4).map((question) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-textSecondary"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-textPrimary">{question.prompt}</span>
                    <span className="text-[11px] text-textMuted">
                      +{Math.round(question.informationGain * 100)}% инфо
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-textMuted">
                    Разблокирует: {question.unlocksRules.join(", ") || "—"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {answeredPreview && (
        <motion.div variants={staggerChild}>
          <Card>
            <p className="mb-3 text-sm font-medium text-textPrimary">
              Уже в работе движка
            </p>
            <div className="grid gap-2">
              {answeredPreview.map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <StickyFooter>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-textSecondary">
            Живой вердикт: {intakePreview.tentativeVerdict} · уверенность {(intakePreview.tentativeConfidence * 100).toFixed(0)}%
          </div>
          <Button onClick={handleContinue} disabled={!intakePreview}>
            Перейти к вердикту
          </Button>
        </div>
      </StickyFooter>
    </motion.div>
  );
}

````

### src/screens/landing/LandingScreen.tsx

````
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ListChecks, Menu, ShieldCheck, Sparkles } from "lucide-react";
import type { ProductType } from "@shared/contracts";
import { useNavigate } from "react-router-dom";
import { useCaseStore } from "@/state/caseStore";
import { useProductAutopilot } from "@/hooks/useProductAutopilot";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";
import { fadeRise, staggerChild, staggerParent } from "@/animations/variants";
import {
  BrandMark,
  HeaderButton,
  PrimaryCTA,
  ScreenHeader,
  SectionLabel,
  SurfacePill
} from "@/components/ah/ScreenCore";
import { SemanticBridge } from "@/components/ah/SemanticBridge";
import { AIInsightChip } from "@/components/ah/SignalBlocks";
import {
  buildLandingScreenModel,
  type LandingBenefitTone
} from "@/presentation/activeHolidays";

const benefitIconByTone: Record<LandingBenefitTone, typeof ShieldCheck> = {
  result: ShieldCheck,
  need: ListChecks,
  ai: Sparkles
};

const benefitIconClassByTone: Record<LandingBenefitTone, string> = {
  result: "text-success",
  need: "text-accent",
  ai: "text-ai"
};

export function LandingScreen() {
  useScreenView("landing");

  const navigate = useNavigate();
  const bootstrap = useCaseStore((state) => state.bootstrap);
  const scenarios = useCaseStore((state) => state.scenarios);
  const status = useCaseStore((state) => state.status);
  const autopilotProduct = useProductAutopilot();
  const [productType, setProductType] = useState<ProductType>(autopilotProduct.suggestion);
  const [activeBridgeNode, setActiveBridgeNode] = useState<string>("check");
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.productType === productType) ?? null,
    [scenarios, productType]
  );
  const screenModel = useMemo(
    () =>
      buildLandingScreenModel({
        productType,
        selectedScenarioCaseId: selectedScenario?.caseId ?? null
      }),
    [productType, selectedScenario?.caseId]
  );

  useEffect(() => {
    setActiveBridgeNode(screenModel.bridge.defaultNodeId);
  }, [screenModel.bridge.defaultNodeId]);

  function handleStart() {
    track({ type: "cta_clicked", cta: `landing_start_${productType}` });
    navigate(screenModel.cta.startPath);
  }

  function handleOpenExample() {
    if (selectedScenario) {
      track({ type: "cta_clicked", cta: `landing_scenario_${selectedScenario.caseId}` });
    }
    navigate(screenModel.cta.examplePath);
  }

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="ah-ambient-frame min-h-screen bg-base px-4 py-4"
    >
      <div className="relative mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[430px] flex-col gap-6">
        <motion.div variants={staggerChild}>
          <ScreenHeader
            left={
              <div className="flex min-w-0 items-center gap-4">
                <BrandMark className="h-12 w-12" />
                <span className="text-[16px] font-bold text-textPrimary">
                  Active Holidays
                </span>
              </div>
            }
            right={
              <HeaderButton
                icon={<Menu className="h-5 w-5" />}
                onClick={() => navigate("/profile")}
                aria-label="Открыть меню"
              />
            }
          />
        </motion.div>

        <motion.section variants={staggerChild} className="grid gap-6">
          <SectionLabel tone="ai">{screenModel.eyebrow}</SectionLabel>
          <motion.div variants={fadeRise} className="grid gap-4">
            <h1 className="max-w-[360px] text-[58px] font-extrabold leading-[0.92] tracking-[-0.05em] text-textPrimary">
              <span className="block">{screenModel.headline[0]}</span>
              <span className="mt-1 block">{screenModel.headline[1]}</span>
              <span className="mt-1 block text-success">{screenModel.headline[2]}</span>
            </h1>
            <p className="max-w-[380px] text-[16px] leading-[1.35] text-textSecondary">
              {screenModel.subline}
            </p>
          </motion.div>
        </motion.section>

        <motion.section variants={staggerChild} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {screenModel.productPills.map((item) => (
            <SurfacePill
              key={item.productType}
              label={item.label}
              active={item.productType === productType}
              onClick={() => {
                setProductType(item.productType);
                setAiOpen(false);
                track({ type: "cta_clicked", cta: `landing_switch_${item.productType}` });
              }}
            />
          ))}
        </motion.section>

        <motion.section variants={staggerChild} className="grid gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-textMuted">
            Живой маршрут
          </p>
          <SemanticBridge
            leftChip={screenModel.bridge.leftChip}
            rightChip={screenModel.bridge.rightChip}
            nodes={screenModel.bridge.nodes}
            activeNodeId={activeBridgeNode}
            onNodeSelect={setActiveBridgeNode}
            onBridgeTap={() => setActiveBridgeNode((current) => {
              const index = screenModel.bridge.nodes.findIndex((node) => node.id === current);
              return (
                screenModel.bridge.nodes[(index + 1) % screenModel.bridge.nodes.length]?.id ??
                screenModel.bridge.defaultNodeId
              );
            })}
          />
          <p className="text-sm text-textSecondary">{screenModel.bridge.nodeSummary[activeBridgeNode]}</p>
        </motion.section>

        <motion.section variants={staggerChild} className="grid gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-textMuted">
            Что получаешь сразу
          </p>
          <div className="grid gap-3">
            {screenModel.benefits.map((item) => {
              const Icon = benefitIconByTone[item.tone];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-[24px] border border-border bg-surface px-4 py-4"
                >
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2 ${benefitIconClassByTone[item.tone]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[18px] font-semibold text-textPrimary">{item.title}</p>
                    <p className="mt-1 text-sm text-textSecondary">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section variants={staggerChild}>
          <AIInsightChip
            summary={screenModel.ai.summary}
            reasons={screenModel.ai.reasons}
            action={screenModel.ai.action}
            expanded={aiOpen}
            onToggle={() => setAiOpen((current) => !current)}
          />
        </motion.section>

        <motion.section variants={staggerChild} className="mt-auto grid gap-4 pb-2">
          <PrimaryCTA
            label={screenModel.cta.label}
            subcopy={screenModel.cta.subcopy}
            onClick={handleStart}
            trailing={<ArrowRight className="h-4 w-4" />}
          />
          <button
            type="button"
            onClick={handleOpenExample}
            className="text-center text-sm font-semibold text-textSecondary transition hover:text-textPrimary"
            data-testid="landing-primary-cta"
          >
            {status === "loading"
              ? "Подгружаем живой пример"
              : selectedScenario
                ? "Посмотреть пример результата"
                : "Открыть экран результата"}
          </button>
        </motion.section>
      </div>
    </motion.div>
  );
}

````

### src/screens/not-found/NotFoundScreen.tsx

````
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/ui/primitives";
import { EmptyState } from "@/ui/EmptyState";
import { Compass } from "lucide-react";
import { useScreenView } from "@/instrumentation/screenView";

export function NotFoundScreen() {
  useScreenView("not-found");
  const location = useLocation();
  const navigate = useNavigate();
  const target = location.pathname;
  return (
    <EmptyState
      icon={<Compass className="h-5 w-5" />}
      title="Такого маршрута в приложении нет"
      description={`Адрес «${target}» не входит в карту экранов M1. Вернитесь к сценариям или откройте последнюю анкету — данные никуда не делись.`}
      action={
        <div className="flex gap-2">
          <Button onClick={() => navigate("/")}>К сценариям</Button>
          <Button variant="secondary" onClick={() => navigate("/intake")}>
            К анкете
          </Button>
        </div>
      }
    />
  );
}

````

### src/screens/notifications/NotificationsScreen.tsx

````
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useCaseStore } from "@/state/caseStore";
import { apiClient } from "@/lib/apiClient";
import { Card, Badge, Button } from "@/ui/primitives";
import { ChangeCard } from "@/ui/ChangeCard";
import { EmptyState } from "@/ui/EmptyState";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";

export function NotificationsScreen() {
  useScreenView("notifications");
  const { decisions, bootstrap, status, errorMessage } = useCaseStore();

  useEffect(() => {
    if (decisions.length === 0) void bootstrap();
  }, [bootstrap, decisions.length]);

  const refresh = async () => {
    try {
      const next = await apiClient.decisions();
      useCaseStore.setState({ decisions: next });
      track({ type: "cta_clicked", cta: "notifications_refresh" });
    } catch (error) {
      useCaseStore.setState({
        errorMessage:
          error instanceof Error ? error.message : "Не удалось обновить ленту."
      });
    }
  };

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: refresh,
    threshold: 70
  });

  const sorted = useMemo(
    () =>
      decisions.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [decisions]
  );

  if (status === "error") {
    return (
      <EmptyState
        title="Лента не загрузилась"
        description={errorMessage ?? "Попробуйте обновить страницу."}
      />
    );
  }

  return (
    <motion.div
      ref={containerRef}
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Сигналы</p>
              <h2 className="text-2xl font-semibold text-textPrimary">
                Изменения и пересчёты
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                Каждый пересчёт, override или обновление источника фиксируются в логе.
                Потяните вниз, чтобы обновить вручную.
              </p>
            </div>
            <Badge tone="neutral">
              <Bell className="h-3 w-3" />
              {sorted.length}
            </Badge>
          </div>
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => void refresh()} loading={isRefreshing}>
              Обновить вручную
            </Button>
          </div>
        </Card>
      </motion.section>

      {pullDistance > 0 && (
        <motion.div
          className="flex h-10 items-center justify-center text-xs text-textSecondary"
          style={{ opacity: Math.min(1, pullDistance / 70) }}
        >
          {isRefreshing ? "Обновляем…" : pullDistance >= 70 ? "Отпустите для обновления" : "Тяните вниз…"}
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <motion.section variants={staggerChild}>
          <EmptyState
            title="Пока тихо"
            description="Как только вы что-то пересчитаете или источник обновится, здесь появится событие."
          />
        </motion.section>
      ) : (
        <motion.section variants={staggerChild} className="grid gap-2">
          {sorted.map((entry) => (
            <ChangeCard key={entry.id} entry={entry} />
          ))}
        </motion.section>
      )}
    </motion.div>
  );
}

````

### src/screens/profile/ProfileScreen.tsx

````
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCaseStore } from "@/state/caseStore";
import { apiClient } from "@/lib/apiClient";
import { Badge, Button, Card } from "@/ui/primitives";
import { CaseCard } from "@/ui/CaseCard";
import { EmptyState } from "@/ui/EmptyState";
import { staggerChild, staggerParent } from "@/animations/variants";
import { useScreenView } from "@/instrumentation/screenView";
import { useToast } from "@/ui/Toast";
import { recentEvents } from "@/instrumentation/events";

export function ProfileScreen() {
  useScreenView("profile");
  const navigate = useNavigate();
  const toast = useToast();
  const { activeCaseId, bootstrap } = useCaseStore();
  const [cases, setCases] = useState<
    Array<{ id: string; title: string; createdAt: string; updatedAt: string; signalCount: number; forkedFrom: string | null }>
  >([]);

  useEffect(() => {
    void bootstrap();
    void (async () => {
      try {
        const loaded = await apiClient.listCases();
        setCases(
          loaded.map((item) => ({
            id: item.id,
            title: item.title,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            signalCount: item.signalCount,
            forkedFrom: item.forkedFrom
          }))
        );
      } catch (error) {
        toast.push(
          error instanceof Error ? error.message : "Не удалось загрузить список кейсов.",
          "error"
        );
      }
    })();
  }, [bootstrap, toast]);

  const events = recentEvents();

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">Профиль</p>
              <h2 className="text-2xl font-semibold text-textPrimary">
                Ваши кейсы и события
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                Каждый кейс живёт в памяти сервера, форки создают независимые копии,
                которые можно сравнивать рядом.
              </p>
            </div>
            <Badge tone="neutral">{cases.length} кейсов</Badge>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={staggerChild} className="grid gap-2">
        {cases.length === 0 ? (
          <EmptyState
            title="Пока нет кейсов"
            description="Создайте первый кейс с анкеты или откройте запечатанный сценарий с главного экрана."
            action={
              <Button variant="secondary" onClick={() => navigate("/")}>
                Открыть сценарии
              </Button>
            }
          />
        ) : (
          cases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              caseData={{
                id: caseData.id,
                title: caseData.title,
                updatedAt: caseData.updatedAt,
                signals: Array.from({ length: caseData.signalCount }, () => ({
                  id: "citizenship" as const,
                  value: "RU",
                  source: "seed" as const,
                  capturedAt: caseData.updatedAt
                })),
                forkedFrom: caseData.forkedFrom
              }}
              active={caseData.id === activeCaseId}
              onOpen={(id) => navigate(`/result?case=${encodeURIComponent(id)}`)}
            />
          ))
        )}
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card>
          <p className="mb-3 text-sm font-medium text-textPrimary">Последние события</p>
          {events.length === 0 ? (
            <p className="text-xs text-textSecondary">
              Аналитика пишется в кольцевой буфер — события появятся после взаимодействий.
            </p>
          ) : (
            <ul className="grid gap-1 text-xs text-textSecondary">
              {events.slice(-8).reverse().map((event, index) => (
                <li key={index} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-1.5">
                  <span className="text-textPrimary">{event.type}</span>
                  <span className="text-textMuted">{JSON.stringify(event).slice(0, 64)}…</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.section>
    </motion.div>
  );
}

````

### src/screens/residency-es/ResidencyScreen.tsx

````
import { ResultScreen } from "@/screens/result/ResultScreen";

export function ResidencyScreen() {
  return <ResultScreen productType="residency_es" screenName="residency-es" />;
}

````

### src/screens/result/AiRecommendationPanel.tsx

````
import { useEffect, useMemo, useState } from "react";
import type {
  PathPreference,
  RecommendationDetail,
  RecommendationFit,
  RecommendationShortlist,
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

````

### src/screens/result/ResultCompareSurface.tsx

````
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

````

### src/screens/result/ResultScreen.tsx

````
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MoreHorizontal } from "lucide-react";
import type { ProductType } from "@shared/contracts";
import { useCaseStore } from "@/state/caseStore";
import { EmptyState } from "@/ui/EmptyState";
import { BottomSheet } from "@/ui/BottomSheet";
import { useToast } from "@/ui/Toast";
import { defaultCaseByProduct, findScenarioCaseId } from "@/lib/caseDefaults";
import { useScreenView } from "@/instrumentation/screenView";
import { track } from "@/instrumentation/events";
import { fadeRise, staggerChild, staggerParent } from "@/animations/variants";
import {
  HeaderButton,
  PrimaryCTA,
  ScreenHeader,
  SectionLabel,
  UtilityLink
} from "@/components/ah/ScreenCore";
import { SemanticBridge } from "@/components/ah/SemanticBridge";
import {
  AIInsightChip,
  DocumentRow,
  EvidenceStrip
} from "@/components/ah/SignalBlocks";
import { ResultCompareSurface } from "./ResultCompareSurface";
import { AiRecommendationPanel } from "./AiRecommendationPanel";
import { buildResultScreenModel } from "@/presentation/activeHolidays";

type ResultScreenProps = {
  productType?: ProductType;
  screenName?: string;
};

type SheetMode = "basis" | "compare" | "tools" | "ai" | null;

export function ResultScreen({ productType, screenName = "result" }: ResultScreenProps = {}) {
  useScreenView(screenName);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeBridgeNode, setActiveBridgeNode] = useState<"docs" | "step" | "review">("docs");

  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    activeScenarioLab,
    scenarios,
    audit,
    bootstrap,
    loadCase,
    loadAudit,
    recompute,
    fork,
    scenarioLabError,
    scenarioLabStatus,
    status,
    errorMessage
  } = useCaseStore();

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  const defaultCaseId = useMemo(() => {
    if (!productType) return scenarios[0]?.caseId ?? defaultCaseByProduct.travel;
    return findScenarioCaseId(scenarios, productType);
  }, [productType, scenarios]);

  const requestedCaseId = useMemo(() => {
    if (!caseIdFromUrl) return null;
    if (!productType) return caseIdFromUrl;
    const scenario = scenarios.find((item) => item.caseId === caseIdFromUrl);
    if (!scenario || scenario.productType !== productType) return null;
    return scenario.caseId;
  }, [caseIdFromUrl, productType, scenarios]);

  const activeCaseProductType = activeCase?.productType ?? activeResult?.productType;
  const activeCaseMatchesProduct = !productType || activeCaseProductType === productType;

  useEffect(() => {
    const target =
      requestedCaseId ?? (activeCaseMatchesProduct ? activeCaseId : null) ?? defaultCaseId;
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [requestedCaseId, activeCaseMatchesProduct, activeCaseId, defaultCaseId, loadCase]);

  const screenModel = useMemo(
    () =>
      activeResult
        ? buildResultScreenModel({
            result: activeResult,
            scenarioLab: activeScenarioLab
          })
        : null,
    [activeResult, activeScenarioLab]
  );

  useEffect(() => {
    if (!screenModel) return;
    setActiveBridgeNode(screenModel.bridge.activeNodeId);
  }, [screenModel]);

  if (status === "error") {
    return (
      <EmptyState
        title="Ошибка загрузки"
        description={errorMessage ?? "Попробуйте обновить кейс или открыть другой сценарий."}
        action={
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface2 px-4 text-sm font-semibold text-textPrimary"
            onClick={() => loadCase(defaultCaseId)}
          >
            Загрузить сценарий
          </button>
        }
      />
    );
  }

  if (!activeResult || !activeCase) {
    return (
      <div className="min-h-screen bg-base px-4 py-4">
        <div className="mx-auto flex min-h-[calc(100dvh-32px)] max-w-[430px] items-center justify-center rounded-[32px] border border-border bg-surface">
          <p className="text-sm text-textSecondary">Собираем результат по кейсу…</p>
        </div>
      </div>
    );
  }

  const result = activeResult;
  const caseData = activeCase;
  const model = buildResultScreenModel({
    result,
    scenarioLab: activeScenarioLab
  });

  function handleNextActionClick() {
    track({ type: "cta_clicked", cta: `result_primary_${result.nextAction.type}` });
    navigate(`/${model.cta.targetScreen}?case=${encodeURIComponent(caseData.id)}`);
  }

  async function handleFork() {
    const forkedId = await fork(caseData.id, `Форк кейса ${caseData.title}`);
    if (forkedId) {
      toast.push("Создан форк кейса.", "success");
      navigate(`/result?case=${encodeURIComponent(forkedId)}`);
      setSheet(null);
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }

  return (
    <>
      <motion.div
        variants={staggerParent}
        initial="initial"
        animate="animate"
        className="ah-ambient-frame min-h-screen bg-base px-4 py-4"
      >
        <div className="relative mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[430px] flex-col gap-4">
          <motion.div variants={staggerChild}>
            <ScreenHeader
              left={
                <HeaderButton
                  icon={<ArrowLeft className="h-5 w-5" />}
                  onClick={handleBack}
                  aria-label="Назад"
                />
              }
              center={
                <span className="text-base font-semibold text-textPrimary">Результат</span>
              }
              right={
                <HeaderButton
                  icon={<MoreHorizontal className="h-5 w-5" />}
                  onClick={() => setSheet("tools")}
                  aria-label="Открыть инструменты"
                />
              }
            />
          </motion.div>

          <motion.section variants={staggerChild} className="grid gap-4">
            <SectionLabel tone={result.verdict === "HUMAN_REVIEW" ? "info" : "need"}>
              {model.eyebrow}
            </SectionLabel>
            <motion.div variants={fadeRise} className="grid gap-3">
              <h1 className="text-[38px] font-extrabold leading-[0.96] tracking-[-0.05em] text-textPrimary">
                {model.heading}
              </h1>
              <p className="text-[14px] text-textMuted">{model.meta}</p>
              <p className="max-w-[380px] text-[16px] leading-[1.34] text-textSecondary">
                {model.supportingLine}
              </p>
            </motion.div>
          </motion.section>

          <motion.section variants={staggerChild}>
            <PrimaryCTA
              label={model.cta.label}
              subcopy={model.cta.subcopy}
              onClick={handleNextActionClick}
              trailing={<ArrowRight className="h-4 w-4" />}
              compact
            />
          </motion.section>

          <motion.section variants={staggerChild} className="grid gap-3">
            <SemanticBridge
              leftChip={model.bridge.leftChip}
              rightChip={model.bridge.rightChip}
              nodes={model.bridge.nodes}
              activeNodeId={activeBridgeNode}
              onNodeSelect={(id) => setActiveBridgeNode(id as "docs" | "step" | "review")}
              onBridgeTap={() => setSheet("basis")}
            />
            <p className="text-sm text-textSecondary">{model.bridge.summary[activeBridgeNode]}</p>
          </motion.section>

          <motion.section variants={staggerChild}>
            <EvidenceStrip signals={model.evidence} />
          </motion.section>

          <motion.section variants={staggerChild} className="grid gap-4">
            <div className="flex items-end justify-between gap-4">
              <div className="grid gap-1">
                <SectionLabel tone="need">{model.workSection.eyebrow}</SectionLabel>
                <h2 className="text-[32px] font-extrabold leading-[1] tracking-[-0.03em] text-textPrimary">
                  {model.workSection.heading}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <UtilityLink onClick={() => setSheet("basis")}>Основание</UtilityLink>
                <UtilityLink onClick={() => setSheet("compare")}>Сравнить</UtilityLink>
              </div>
            </div>
            <div className="grid gap-3">
              {model.workSection.rows.map((item) => (
                <DocumentRow
                  key={item.id}
                  title={item.title}
                  meta={item.meta}
                  status={item.status}
                  tone={item.tone}
                />
              ))}
            </div>
          </motion.section>

          <motion.section variants={staggerChild}>
            <AIInsightChip
              summary={model.ai.summary}
              reasons={model.ai.reasons}
              action={model.ai.action}
              expanded={aiOpen}
              onToggle={() => setAiOpen((current) => !current)}
              onOpenFull={() => setSheet("ai")}
            />
          </motion.section>

          {model.compareCard ? (
            <motion.section variants={staggerChild} className="mt-auto pb-2">
              <button
                type="button"
                onClick={() => setSheet("compare")}
                className="flex w-full items-center justify-between rounded-[24px] border border-border bg-surface2 px-4 py-4 text-left transition hover:border-borderStrong"
              >
                <div>
                  <p className="text-sm font-semibold text-textPrimary">
                    {model.compareCard.title}
                  </p>
                  <p className="mt-1 text-sm text-textSecondary">
                    {model.compareCard.summary}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
                  secondary
                </span>
              </button>
            </motion.section>
          ) : null}
        </div>
      </motion.div>

      <BottomSheet
        open={sheet === "basis"}
        onClose={() => setSheet(null)}
        title="Основание решения"
      >
        <div className="grid gap-4">
          <div className="rounded-[20px] border border-border bg-surface2 px-4 py-4">
            <p className="text-sm font-semibold text-textPrimary">Почему такое решение</p>
            <div className="mt-3 grid gap-2">
              {model.basisSheet.whyBullets.map((bullet) => (
                <p key={bullet} className="text-sm text-textSecondary">
                  {bullet}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-border bg-surface2 px-4 py-4">
            <p className="text-sm font-semibold text-textPrimary">Доверие и ограничения</p>
            <p className="mt-3 text-sm text-textSecondary">{model.basisSheet.trustSummary}</p>
            {model.basisSheet.topRiskLabels.map((riskLabel) => (
              <p key={riskLabel} className="mt-2 text-sm text-textSecondary">
                {riskLabel}
              </p>
            ))}
            <div className="mt-4">
              <Link
                to={`/trust?case=${encodeURIComponent(caseData.id)}`}
                className="text-sm font-semibold text-info"
                onClick={() => setSheet(null)}
              >
                Открыть экран доверия
              </Link>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "compare"}
        onClose={() => setSheet(null)}
        title="Сравнить сценарии"
      >
        <ResultCompareSurface
          lab={activeScenarioLab}
          loading={scenarioLabStatus === "loading"}
          errorMessage={scenarioLabError}
          onOpenTarget={(targetScreen) => {
            setSheet(null);
            navigate(`/${targetScreen}?case=${encodeURIComponent(caseData.id)}`);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "ai"}
        onClose={() => setSheet(null)}
        title="AI-разбор"
      >
        <AiRecommendationPanel
          caseId={caseData.id}
          computedAt={result.computedAt}
          preferences={caseData.preferences}
          onOpenScenario={(scenarioCaseId) => {
            setSheet(null);
            navigate(`/result?case=${encodeURIComponent(scenarioCaseId)}`);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "tools"}
        onClose={() => setSheet(null)}
        title="Инструменты кейса"
      >
        <div className="grid gap-3">
          <button
            type="button"
            className="rounded-[18px] border border-border bg-surface2 px-4 py-4 text-left text-sm font-semibold text-textPrimary"
            onClick={() => {
              void recompute(caseData.id);
              setSheet(null);
            }}
          >
            Пересчитать кейс
          </button>
          <button
            type="button"
            className="rounded-[18px] border border-border bg-surface2 px-4 py-4 text-left text-sm font-semibold text-textPrimary"
            onClick={() => void handleFork()}
          >
            Форкнуть кейс
          </button>
          <button
            type="button"
            className="rounded-[18px] border border-border bg-surface2 px-4 py-4 text-left text-sm font-semibold text-textPrimary"
            onClick={() => {
              void loadAudit(caseData.id);
              setSheet(null);
            }}
          >
            Загрузить аудит
          </button>
          {audit ? (
            <div className="rounded-[18px] border border-border bg-surface2 px-4 py-4">
              <p className="text-sm text-textSecondary">
                Аудит загружен: {audit.trail.totalMs.toFixed(1)} мс.
              </p>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}

````

### src/screens/trust/TrustScreen.tsx

````
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useCaseStore } from "@/state/caseStore";
import { Badge, Button, Card } from "@/ui/primitives";
import { ConfidenceGauge } from "@/ui/ConfidenceGauge";
import { NodeGraph } from "@/ui/NodeGraph";
import { SourceBadge } from "@/ui/SourceBadge";
import { VolatilityRadar } from "@/ui/VolatilityRadar";
import { FractalConfidence } from "@/ui/FractalConfidence";
import { EmptyState } from "@/ui/EmptyState";
import { staggerChild, staggerParent } from "@/animations/variants";
import { defaultCaseIdForProduct } from "@/lib/caseDefaults";
import { useScreenView } from "@/instrumentation/screenView";
import { buildTrustScreenModel } from "@/presentation/activeHolidays";

export function TrustScreen() {
  useScreenView("trust");
  const [searchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get("case");
  const {
    activeCase,
    activeCaseId,
    activeResult,
    scenarios,
    bootstrap,
    loadCase,
    status,
    errorMessage
  } = useCaseStore();
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);

  useEffect(() => {
    if (scenarios.length === 0) void bootstrap();
  }, [bootstrap, scenarios.length]);

  useEffect(() => {
    const target =
      caseIdFromUrl ??
      activeCaseId ??
      defaultCaseIdForProduct(activeCase?.productType ?? activeResult?.productType ?? "travel");
    if (target && target !== activeCaseId) {
      void loadCase(target);
    }
  }, [caseIdFromUrl, activeCaseId, activeCase?.productType, activeResult?.productType, loadCase]);

  if (status === "error") {
    return (
      <EmptyState
        title="Не удалось построить доверие"
        description={errorMessage ?? "Попробуйте обновить страницу."}
        action={
          <Button variant="secondary" onClick={() => loadCase("s1-rf-italy")}>
            Загрузить S1
          </Button>
        }
      />
    );
  }

  if (!activeResult || !activeCase) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-textSecondary">Считаем доверие…</p>
      </Card>
    );
  }

  const screenModel = buildTrustScreenModel({ result: activeResult });

  if (activeResult.verdict === "HUMAN_REVIEW") {
    return (
      <EmptyState
        title={screenModel.gate?.title ?? "Доверие уточнит оператор"}
        description={
          screenModel.gate?.description ??
          "Для этого кейса мы не показываем детальную оценку уверенности до завершения ручной проверки."
        }
      />
    );
  }

  const { confidenceBreakdown } = activeResult.trust;

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-textMuted">
                {screenModel.hero.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold text-textPrimary">{screenModel.hero.heading}</h2>
            </div>
            <Badge tone={screenModel.hero.badgeTone}>{screenModel.hero.badgeLabel}</Badge>
          </div>
          <ConfidenceGauge
            breakdown={confidenceBreakdown}
            selectedFactorId={selectedFactor}
            onFactorClick={(factorId) =>
              setSelectedFactor((current) => (current === factorId ? null : factorId))
            }
          />
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              {screenModel.explanation.eyebrow}
            </p>
            <p className="text-sm text-textPrimary">{screenModel.explanation.heading}</p>
          </div>
          <NodeGraph ruleResults={activeResult.ruleResults} />
        </Card>
      </motion.section>

      <motion.section variants={staggerChild}>
        <VolatilityRadar sources={screenModel.sourcesSection.items} />
      </motion.section>

      <motion.section variants={staggerChild}>
        <FractalConfidence breakdown={confidenceBreakdown} />
      </motion.section>

      <motion.section variants={staggerChild}>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-textPrimary">{screenModel.sourcesSection.heading}</p>
            <span className="text-xs text-textSecondary">{screenModel.sourcesSection.volatilityLabel}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {screenModel.sourcesSection.items.map((source) => (
              <SourceBadge
                key={source.id}
                source={source}
              />
            ))}
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}

````

### src/state/caseStore.ts

````
import { create } from "zustand";
import type {
  Case,
  DecisionLogEntry,
  IntakePreview,
  IntakeQueue,
  Offer,
  PathPreference,
  ResultPayload,
  Source,
  AuditTrail,
  CaseSignals,
  CaseOverride,
  SignalId,
  ScenarioLabPayload,
  HumanReviewChannel,
  HumanReviewRequest
} from "@shared/contracts";
import { apiClient, type ScenarioCard } from "@/lib/apiClient";

type Status = "idle" | "loading" | "ready" | "error";

type AuditSnapshot = {
  trail: AuditTrail;
  decisions: DecisionLogEntry[];
};

type CaseStoreState = {
  status: Status;
  errorMessage: string | null;
  activeCaseId: string | null;
  activeCase: Case | null;
  activeResult: ResultPayload | null;
  activeScenarioLab: ScenarioLabPayload | null;
  cases: Case[];
  scenarios: ScenarioCard[];
  paths: Offer[];
  intakeQueue: IntakeQueue | null;
  intakePreview: IntakePreview | null;
  audit: AuditSnapshot | null;
  activeHumanReview: HumanReviewRequest | null;
  humanReviewCaseId: string | null;
  humanReviewRequestToken: number;
  sources: Source[];
  decisions: DecisionLogEntry[];
  scenarioLabStatus: Status;
  scenarioLabError: string | null;
  humanReviewStatus: Status;
  humanReviewError: string | null;
  bootstrap: () => Promise<void>;
  loadCase: (id: string) => Promise<void>;
  patchSignal: (id: string, signalId: SignalId, value: unknown) => Promise<void>;
  patchSignals: (id: string, signals: CaseSignals) => Promise<void>;
  setPreferences: (id: string, preferences: PathPreference[]) => Promise<void>;
  overrideSignal: (id: string, override: CaseOverride) => Promise<void>;
  recompute: (id: string) => Promise<void>;
  fork: (id: string, title?: string) => Promise<string | null>;
  refreshIntake: (id: string) => Promise<void>;
  loadAudit: (id: string) => Promise<void>;
  loadHumanReview: (id: string) => Promise<void>;
  submitHumanReview: (
    id: string,
    payload: { channel: HumanReviewChannel; contact: string; message: string }
  ) => Promise<{ reused: boolean }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function scenarioLabRequest(id: string, fallbackMessage: string) {
  return apiClient
    .decisionScenarioLab(id)
    .then((lab) => ({ ok: true as const, lab }))
    .catch((error) => ({
      ok: false as const,
      errorMessage: error instanceof Error ? error.message : fallbackMessage
    }));
}

function preservedScenarioLab(
  current: ScenarioLabPayload | null,
  caseId: string,
  next:
    | { ok: true; lab: ScenarioLabPayload }
    | { ok: false; errorMessage: string }
) {
  if (next.ok) return next.lab;
  return current?.caseId === caseId ? current : null;
}

export const useCaseStore = create<CaseStoreState>((set, get) => ({
  status: "idle",
  errorMessage: null,
  activeCaseId: null,
  activeCase: null,
  activeResult: null,
  activeScenarioLab: null,
  cases: [],
  scenarios: [],
  paths: [],
  intakeQueue: null,
  intakePreview: null,
  audit: null,
  activeHumanReview: null,
  humanReviewCaseId: null,
  humanReviewRequestToken: 0,
  sources: [],
  decisions: [],
  scenarioLabStatus: "idle",
  scenarioLabError: null,
  humanReviewStatus: "idle",
  humanReviewError: null,

  async bootstrap() {
    set({ status: "loading", errorMessage: null });
    try {
      const [scenarios, sources, decisions] = await Promise.all([
        apiClient.scenarios(),
        apiClient.sources(),
        apiClient.decisions()
      ]);
      set({ scenarios, sources, decisions, status: "ready" });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось загрузить начальные данные."
      });
    }
  },

  async loadCase(id) {
    const currentLab = get().activeScenarioLab;
    const currentReview = get().activeHumanReview;
    const nextHumanReviewToken = get().humanReviewRequestToken + 1;
    set({
      status: "loading",
      errorMessage: null,
      scenarioLabStatus: "loading",
      scenarioLabError: null,
      activeScenarioLab: currentLab?.caseId === id ? currentLab : null,
      activeHumanReview: currentReview?.caseId === id ? currentReview : null,
      humanReviewCaseId: id,
      humanReviewRequestToken: nextHumanReviewToken,
      humanReviewStatus: currentReview?.caseId === id ? get().humanReviewStatus : "idle",
      humanReviewError: null
    });
    try {
      const [caseData, result, paths, intakeQueue, preview, scenarioLabResult] = await Promise.all([
        apiClient.getCase(id),
        apiClient.getResult(id),
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        apiClient.preview(id),
        scenarioLabRequest(id, "Не удалось собрать сценарную лабораторию.")
      ]);
      set({
        activeCaseId: id,
        activeCase: caseData,
        activeResult: result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        intakeQueue,
        intakePreview: preview,
        status: "ready",
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage,
        humanReviewCaseId: id,
        humanReviewError: null
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось загрузить кейс."
      });
    }
  },

  async patchSignal(id, signalId, value) {
    await get().patchSignals(id, [
      { id: signalId, value, source: "user", capturedAt: nowIso() }
    ]);
  },

  async patchSignals(id, signals) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.patchSignals(id, signals);
      const [paths, intakeQueue, preview, scenarioLabResult] = await Promise.all([
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        apiClient.preview(id),
        scenarioLabRequest(id, "Не удалось обновить сценарную лабораторию.")
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        intakeQueue,
        intakePreview: preview,
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось сохранить сигналы."
      });
    }
  },

  async setPreferences(id, preferences) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.recompute(id, preferences);
      const [paths, scenarioLabResult] = await Promise.all([
        apiClient.paths(id),
        scenarioLabRequest(id, "Не удалось обновить сценарную лабораторию.")
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось применить предпочтения."
      });
    }
  },

  async overrideSignal(id, override) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.overrideSignal(id, override);
      const [paths, intakeQueue, scenarioLabResult] = await Promise.all([
        apiClient.paths(id),
        apiClient.nextQuestion(id),
        scenarioLabRequest(id, "Не удалось обновить сценарную лабораторию.")
      ]);
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        paths,
        intakeQueue,
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось применить override."
      });
    }
  },

  async recompute(id) {
    try {
      const currentLab = get().activeScenarioLab;
      set({ scenarioLabStatus: "loading", scenarioLabError: null });
      const response = await apiClient.recompute(id);
      const scenarioLabResult = await scenarioLabRequest(
        id,
        "Не удалось обновить сценарную лабораторию."
      );
      set({
        activeCase: response.case,
        activeResult: response.result,
        activeScenarioLab: preservedScenarioLab(currentLab, id, scenarioLabResult),
        scenarioLabStatus: scenarioLabResult.ok ? "ready" : "error",
        scenarioLabError: scenarioLabResult.ok ? null : scenarioLabResult.errorMessage
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось пересчитать решение."
      });
    }
  },

  async fork(id, title) {
    try {
      const response = await apiClient.fork(id, title);
      set((state) => ({ cases: [response.case, ...state.cases] }));
      return response.case.id;
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось форкнуть кейс."
      });
      return null;
    }
  },

  async refreshIntake(id) {
    try {
      const [queue, preview] = await Promise.all([
        apiClient.nextQuestion(id),
        apiClient.preview(id)
      ]);
      set({ intakeQueue: queue, intakePreview: preview });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось обновить очередь вопросов."
      });
    }
  },

  async loadAudit(id) {
    try {
      const audit = await apiClient.audit(id);
      set({ audit });
    } catch (error) {
      set({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Не удалось загрузить аудит."
      });
    }
  },

  async loadHumanReview(id) {
    const requestToken = get().humanReviewRequestToken + 1;
    set({
      humanReviewStatus: "loading",
      humanReviewError: null,
      humanReviewCaseId: id,
      humanReviewRequestToken: requestToken
    });
    try {
      const request = await apiClient.humanReview(id);
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              activeHumanReview: request,
              humanReviewStatus: "ready",
              humanReviewError: null
            }
          : {}
      );
    } catch (error) {
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              humanReviewStatus: "error",
              humanReviewError:
                error instanceof Error ? error.message : "Не удалось загрузить ручную проверку."
            }
          : {}
      );
    }
  },

  async submitHumanReview(id, payload) {
    const requestToken = get().humanReviewRequestToken + 1;
    set({
      humanReviewStatus: "loading",
      humanReviewError: null,
      humanReviewCaseId: id,
      humanReviewRequestToken: requestToken
    });
    try {
      const response = await apiClient.submitHumanReview(id, payload);
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              activeHumanReview: response.request,
              humanReviewStatus: "ready",
              humanReviewError: null
            }
          : {}
      );
      return { reused: response.reused };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось отправить ручную проверку.";
      set((state) =>
        state.humanReviewCaseId === id && state.humanReviewRequestToken === requestToken
          ? {
              humanReviewStatus: "error",
              humanReviewError: message
            }
          : {}
      );
      throw error instanceof Error ? error : new Error(message);
    }
  }
}));

````

### src/styles/index.css

````
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
  --color-base: #050506;
  --color-surface: #0b0c0f;
  --color-surface-2: #12141a;
  --color-surface-3: #171a20;
  --color-surface-4: #1d2129;
  --color-border: rgba(245, 247, 250, 0.08);
  --color-border-strong: rgba(245, 247, 250, 0.14);
  --color-text-primary: #f5f7fa;
  --color-text-secondary: #b3b8c2;
  --color-text-muted: #7d8592;
  --color-accent: #ff9d2e;
  --color-accent-hover: #ffad4e;
  --color-danger: #ff7a7a;
  --color-danger-bg: rgba(255, 122, 122, 0.12);
  --color-success: #77f2a3;
  --color-success-bg: rgba(119, 242, 163, 0.14);
  --color-warning: #ffb86b;
  --color-warning-bg: rgba(255, 184, 107, 0.14);
  --color-info: #7ab8ff;
  --color-ai: #a88cff;
  --color-route: #6fe6ff;
  --color-manual: #ffb86b;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: var(--color-base);
  color: var(--color-text-primary);
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
  margin: 0;
}

body {
  background: var(--color-base);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

.ah-ambient-frame {
  position: relative;
  overflow: clip;
}

.ah-ambient-frame::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 16%, rgba(122, 184, 255, 0.1), transparent 22%),
    radial-gradient(circle at 84% 10%, rgba(168, 140, 255, 0.1), transparent 20%),
    radial-gradient(circle at 50% 100%, rgba(255, 157, 46, 0.06), transparent 28%);
  opacity: 0.7;
}

.ah-route-line {
  position: relative;
  overflow: hidden;
}

.ah-route-line::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-110%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(111, 230, 255, 0) 35%,
    rgba(111, 230, 255, 0.42) 50%,
    rgba(111, 230, 255, 0) 65%,
    transparent 100%
  );
  animation: ah-route-shimmer 2.8s ease-in-out infinite;
}

.ah-ai-breathe {
  animation: ah-ai-breathe 2.8s ease-in-out infinite;
}

.ah-soft-pulse {
  animation: ah-soft-pulse 2.8s ease-in-out infinite;
}

.ah-reveal-up {
  animation: ah-reveal-up 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.no-scrollbar {
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

@keyframes ah-route-shimmer {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(110%);
  }
}

@keyframes ah-soft-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(122, 184, 255, 0.22);
  }

  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 10px rgba(122, 184, 255, 0);
  }
}

@keyframes ah-ai-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(168, 140, 255, 0);
  }

  50% {
    box-shadow: 0 0 22px rgba(168, 140, 255, 0.18);
  }
}

@keyframes ah-reveal-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ah-route-line::after,
  .ah-ai-breathe,
  .ah-soft-pulse,
  .ah-reveal-up {
    animation: none !important;
  }
}

````

### src/theme/tokens.ts

````
import type { Verdict } from "@shared/contracts";

export const verdictTone: Record<
  Verdict,
  {
    label: string;
    surface: string;
    text: string;
    ring: string;
    badge: string;
    accent: string;
  }
> = {
  GO: {
    label: "Можно ехать",
    surface: "bg-emerald-500/10",
    text: "text-emerald-300",
    ring: "ring-emerald-400/40",
    badge: "bg-emerald-500 text-black",
    accent: "#34d399"
  },
  GO_WITH_CONDITIONS: {
    label: "Можно, но с условиями",
    surface: "bg-amber-500/10",
    text: "text-amber-200",
    ring: "ring-amber-400/40",
    badge: "bg-amber-400 text-black",
    accent: "#fbbf24"
  },
  NOT_NOW: {
    label: "Пока не сейчас",
    surface: "bg-rose-500/10",
    text: "text-rose-200",
    ring: "ring-rose-400/40",
    badge: "bg-rose-500 text-white",
    accent: "#f97066"
  },
  HUMAN_REVIEW: {
    label: "Нужна проверка менеджером",
    surface: "bg-sky-500/10",
    text: "text-sky-200",
    ring: "ring-sky-400/40",
    badge: "bg-sky-500 text-white",
    accent: "#38bdf8"
  }
};

export const severityTone = {
  critical: { label: "Критично", text: "text-rose-200", surface: "bg-rose-500/15", dot: "bg-rose-400" },
  high: { label: "Высокий риск", text: "text-rose-100", surface: "bg-rose-500/10", dot: "bg-rose-300" },
  medium: { label: "Средний риск", text: "text-amber-100", surface: "bg-amber-500/10", dot: "bg-amber-300" },
  low: { label: "Низкий риск", text: "text-emerald-100", surface: "bg-emerald-500/10", dot: "bg-emerald-300" }
} as const;

export const sourceTierTone = {
  official: { label: "Официальный", surface: "bg-sky-500/10", text: "text-sky-200" },
  operator: { label: "Оператор", surface: "bg-violet-500/10", text: "text-violet-200" },
  crowdsourced: { label: "Краудсорс", surface: "bg-zinc-500/10", text: "text-zinc-200" }
} as const;

````

### src/ui/Accordion.tsx

````
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./utils";
import { track } from "@/instrumentation/events";

export function ExpandableRow({
  id,
  title,
  subtitle,
  right,
  children,
  defaultOpen = false,
  screen = "result"
}: {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  screen?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-surface-2">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          track({ type: "section_toggle", screen, sectionId: id, open: next });
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-textPrimary">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-textSecondary">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <ChevronDown
            className={cn("h-4 w-4 text-textSecondary transition", open && "rotate-180")}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-textSecondary">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

````

### src/ui/AnimatedNumber.tsx

````
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

type Props = {
  value: number;
  fractionDigits?: number;
  suffix?: string;
  className?: string;
};

export function AnimatedNumber({ value, fractionDigits = 0, suffix = "", className }: Props) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) =>
    `${latest.toFixed(fractionDigits)}${suffix}`
  );
  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1]
    });
    return () => controls.stop();
  }, [value, motionValue]);
  return <motion.span className={className}>{rounded}</motion.span>;
}

````

### src/ui/BottomSheet.tsx

````
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl rounded-t-3xl border border-border bg-surface p-5 shadow-soft"
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-borderStrong" />
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-textPrimary">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-textSecondary transition hover:bg-surface-2"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

````

### src/ui/CaseCard.tsx

````
import type { Case } from "@shared/contracts";
import { Card, Badge } from "./primitives";
import { formatDate, pluralizeSignals } from "@/lib/format";

type Props = {
  caseData: Pick<Case, "id" | "title" | "updatedAt" | "signals" | "forkedFrom">;
  onOpen?: (id: string) => void;
  active?: boolean;
};

export function CaseCard({ caseData, onOpen, active }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen ? () => onOpen(caseData.id) : undefined}
      className="w-full text-left"
    >
      <Card
        padding="sm"
        className={`grid gap-1 transition hover:border-borderStrong ${active ? "ring-2 ring-accent/40" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-textPrimary">{caseData.title}</p>
          {caseData.forkedFrom && <Badge tone="neutral">Форк</Badge>}
        </div>
        <p className="text-xs text-textSecondary">{caseData.id}</p>
        <p className="text-xs text-textMuted">
          {pluralizeSignals(caseData.signals.length)} · обновлён {formatDate(caseData.updatedAt)}
        </p>
      </Card>
    </button>
  );
}

````

### src/ui/ChangeCard.tsx

````
import type { DecisionLogEntry } from "@shared/contracts";
import { verdictTone } from "@/theme/tokens";
import { Card, Badge } from "./primitives";
import { formatDate, formatPercent } from "@/lib/format";

const kindLabels: Record<DecisionLogEntry["kind"], string> = {
  recompute: "Пересчёт",
  override: "Override",
  fork: "Форк",
  source_update: "Обновление источника"
};

export function ChangeCard({ entry }: { entry: DecisionLogEntry }) {
  const tone = verdictTone[entry.verdict];
  return (
    <Card padding="sm" className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={entry.verdict === "GO" ? "positive" : entry.verdict === "NOT_NOW" ? "negative" : entry.verdict === "HUMAN_REVIEW" ? "review" : "warning"}>
          {tone.label}
        </Badge>
        <span className="text-xs text-textMuted">{formatDate(entry.recordedAt)}</span>
      </div>
      <p className="text-sm text-textPrimary">{entry.summary}</p>
      <p className="text-xs text-textSecondary">
        {kindLabels[entry.kind]} · уверенность {formatPercent(entry.confidence)}
        {entry.changedSignalIds.length > 0 && ` · сигналы: ${entry.changedSignalIds.join(", ")}`}
      </p>
    </Card>
  );
}

````

### src/ui/ConfidenceGauge.tsx

````
import { motion } from "framer-motion";
import type { ConfidenceBreakdown } from "@shared/contracts";
import { cn } from "./utils";
import { formatPercent } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  breakdown: ConfidenceBreakdown;
  accentColor?: string;
  onFactorClick?: (factorId: string) => void;
  selectedFactorId?: string | null;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConfidenceGauge({
  breakdown,
  accentColor = "#ffd60a",
  onFactorClick,
  selectedFactorId
}: Props) {
  const value = breakdown.value;
  const dash = Math.max(0, Math.min(1, value));
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="relative grid place-items-center">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70"
            cy="70"
            r={RADIUS}
            stroke={accentColor}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - dash)}
            transform="rotate(-90 70 70)"
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - dash) }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <AnimatedNumber
              value={value * 100}
              fractionDigits={0}
              suffix="%"
              className="block text-3xl font-semibold text-textPrimary"
            />
            <p className="mt-1 text-xs text-textSecondary">уверенность</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {breakdown.factors.map((factor) => {
          const positive = factor.value >= 0;
          const magnitude = Math.min(1, Math.abs(factor.value));
          const selected = selectedFactorId === factor.id;
          return (
            <button
              key={factor.id}
              type="button"
              onClick={onFactorClick ? () => onFactorClick(factor.id) : undefined}
              className={cn(
                "group rounded-xl border border-border bg-surface-2 p-3 text-left transition hover:border-borderStrong",
                selected && "border-accent/60 bg-accent/10"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-textPrimary">{factor.label}</p>
                <span className={positive ? "text-emerald-300" : "text-rose-300"}>
                  {positive ? "+" : "−"}
                  {formatPercent(magnitude)}
                </span>
              </div>
              <p className="mt-1 text-xs text-textSecondary">{factor.detail}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className={positive ? "h-full bg-emerald-400" : "h-full bg-rose-400"}
                  initial={{ width: 0 }}
                  animate={{ width: `${magnitude * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              {selected && factor.children.length > 0 && (
                <ul className="mt-3 grid gap-1.5 text-xs text-textSecondary">
                  {factor.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-2">
                      <span>{child.label}</span>
                      <span
                        className={cn(
                          "tabular-nums",
                          child.value >= 0 ? "text-emerald-300" : "text-rose-300"
                        )}
                      >
                        {child.value >= 0 ? "+" : ""}
                        {Math.round(child.value * 100) / 100}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
        {breakdown.capsApplied.length > 0 && (
          <p className="mt-1 text-xs text-textMuted">
            Применены пределы: {breakdown.capsApplied.join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}

````

### src/ui/DocumentCard.tsx

````
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Card } from "./primitives";
import { cn } from "./utils";

type Item = {
  id: string;
  label: string;
  status: "ready" | "attention_needed" | "blocked";
  detail: string;
};

const toneByStatus = {
  ready: "text-emerald-300",
  attention_needed: "text-amber-200",
  blocked: "text-rose-200"
} as const;

const iconByStatus = {
  ready: CheckCircle2,
  attention_needed: AlertCircle,
  blocked: XCircle
} as const;

const labelByStatus = {
  ready: "Готово",
  attention_needed: "Нужно внимание",
  blocked: "Блокер"
} as const;

export function DocumentCard({ item }: { item: Item }) {
  const Icon = iconByStatus[item.status];
  return (
    <Card className="flex items-start gap-3" padding="sm">
      <Icon className={cn("mt-0.5 h-5 w-5", toneByStatus[item.status])} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-textPrimary">{item.label}</p>
          <span className={cn("text-xs", toneByStatus[item.status])}>
            {labelByStatus[item.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-textSecondary">{item.detail}</p>
      </div>
    </Card>
  );
}

````

### src/ui/EmptyState.tsx

````
import { type ReactNode } from "react";
import { Card } from "./primitives";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      {icon && <div className="rounded-xl bg-surface-2 p-3 text-accent">{icon}</div>}
      <h3 className="text-lg font-semibold text-textPrimary">{title}</h3>
      <p className="max-w-md text-sm text-textSecondary">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

````

### src/ui/FlagIcon.tsx

````
const flags: Record<string, string> = {
  RU: "🇷🇺",
  TR: "🇹🇷",
  US: "🇺🇸",
  IT: "🇮🇹",
  RS: "🇷🇸",
  AE: "🇦🇪",
  GE: "🇬🇪",
  AM: "🇦🇲",
  BY: "🇧🇾"
};

export function FlagIcon({ code, size = 20 }: { code: string; size?: number }) {
  const flag = flags[code];
  return (
    <span
      aria-label={code}
      role="img"
      style={{ fontSize: size, lineHeight: 1 }}
      className="inline-block leading-none"
    >
      {flag ?? "🏳"}
    </span>
  );
}

````

### src/ui/ForkDivider.tsx

````
import { motion } from "framer-motion";
import { Button } from "./primitives";
import { GitBranch } from "lucide-react";

export function ForkDivider({ onFork, disabled }: { onFork: () => void; disabled?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative my-3 flex items-center justify-center"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <Button size="sm" variant="secondary" onClick={onFork} disabled={disabled} leadingIcon={<GitBranch className="h-3 w-3" />}>
        Сравнить в отдельной ветке
      </Button>
    </motion.div>
  );
}

````

### src/ui/FractalConfidence.tsx

````
import { useState } from "react";
import type { ConfidenceBreakdown } from "@shared/contracts";
import { Card } from "./primitives";
import { formatPercent } from "@/lib/format";

type Level = 0 | 1 | 2;

type Props = {
  breakdown: ConfidenceBreakdown;
};

export function FractalConfidence({ breakdown }: Props) {
  const [level, setLevel] = useState<Level>(0);

  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-textMuted">Фрактал уверенности</p>
          <h3 className="text-lg font-semibold text-textPrimary">
            Пинч-зум на детали
          </h3>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((current) => (
            <button
              key={current}
              type="button"
              className={`rounded-lg px-3 py-1 text-xs transition ${
                current === level
                  ? "bg-accent text-black"
                  : "bg-surface-2 text-textSecondary hover:bg-surface-3"
              }`}
              onClick={() => setLevel(current as Level)}
            >
              Уровень {current + 1}
            </button>
          ))}
        </div>
      </div>

      {level === 0 && (
        <p className="text-sm text-textSecondary">
          Базовая уверенность: {formatPercent(breakdown.value)}. Сдвиньте уровень,
          чтобы раскрыть отдельные факторы и их дочерние сигналы.
        </p>
      )}

      {level >= 1 && (
        <ul className="grid gap-2">
          {breakdown.factors.map((factor) => (
            <li key={factor.id} className="rounded-xl bg-surface-2 px-3 py-2">
              <p className="text-sm text-textPrimary">{factor.label}</p>
              <p className="text-xs text-textSecondary">{factor.detail}</p>
              {level === 2 && factor.children.length > 0 && (
                <ul className="mt-2 grid gap-1 text-[11px] text-textSecondary">
                  {factor.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-2">
                      <span>{child.label}</span>
                      <span className={child.value >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {child.value >= 0 ? "+" : ""}
                        {(child.value * 100).toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

````

### src/ui/MiniVerdictPreview.tsx

````
import { motion } from "framer-motion";
import type { IntakePreview } from "@shared/contracts";
import { verdictTone } from "@/theme/tokens";
import { Badge } from "./primitives";
import { formatPercent } from "@/lib/format";

export function MiniVerdictPreview({ preview }: { preview: IntakePreview }) {
  const tone = verdictTone[preview.tentativeVerdict];
  return (
    <motion.div
      key={preview.tentativeVerdict + preview.resolvedSignalCount}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border border-border ${tone.surface} p-4`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-textMuted">
            Живой предпросмотр
          </p>
          <p className={`mt-1 text-lg font-semibold ${tone.text}`}>{tone.label}</p>
        </div>
        <Badge tone={preview.tentativeVerdict === "GO" ? "positive" : preview.tentativeVerdict === "NOT_NOW" ? "negative" : preview.tentativeVerdict === "HUMAN_REVIEW" ? "review" : "warning"}>
          {formatPercent(preview.tentativeConfidence)}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-textSecondary">
        Обязательных сигналов: {Math.min(preview.resolvedSignalCount, preview.requiredMandatoryCount)} из {preview.requiredMandatoryCount}
        {preview.hasBlockingRule && " · есть блокер"}
        {preview.hasHumanReviewTrigger && " · есть триггер ручной проверки"}
      </p>
      {preview.capsApplied.length > 0 && (
        <p className="mt-1 text-[11px] text-textMuted">
          Применены пределы уверенности: {preview.capsApplied.join(", ")}.
        </p>
      )}
    </motion.div>
  );
}

````

### src/ui/NodeGraph.tsx

````
import type { RuleResult, SignalId } from "@shared/contracts";
import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
  ruleResults: RuleResult[];
  maxNodes?: number;
};

export function NodeGraph({ ruleResults, maxNodes = 6 }: Props) {
  const fired = ruleResults.filter((rule) => rule.fired).slice(0, maxNodes);
  const signalSet = new Set<SignalId>();
  for (const rule of fired) for (const signal of rule.consumedSignals) signalSet.add(signal);
  const signals = Array.from(signalSet);
  const outputs = Array.from(new Set(fired.map((rule) => rule.output.type)));

  const signalPositions = useMemo(() => {
    return signals.map((signal, index) => ({
      id: signal,
      x: 60,
      y: 48 + index * 52
    }));
  }, [signals]);

  const rulePositions = useMemo(() => {
    return fired.map((rule, index) => ({
      id: rule.ruleId,
      explanation: rule.explanation,
      x: 260,
      y: 48 + index * 52,
      outputType: rule.output.type
    }));
  }, [fired]);

  const outputPositions = useMemo(() => {
    return outputs.map((output, index) => ({
      id: output,
      x: 460,
      y: 60 + index * 72
    }));
  }, [outputs]);

  const height = Math.max(
    signalPositions.length * 52 + 80,
    rulePositions.length * 52 + 80,
    outputPositions.length * 72 + 80
  );

  if (fired.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-textSecondary">
        Сейчас нет сработавших правил — граф появится, когда добавите больше сигналов.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl border border-border bg-surface-2 p-3">
      <svg width="520" height={height} viewBox={`0 0 520 ${height}`}>
        {rulePositions.map((rule, ruleIndex) => {
          const ruleData = fired[ruleIndex];
          const output = outputPositions.find((item) => item.id === rule.outputType);
          return (
            <g key={rule.id}>
              {ruleData.consumedSignals.map((signal) => {
                const signalNode = signalPositions.find((node) => node.id === signal);
                if (!signalNode) return null;
                return (
                  <motion.path
                    key={`${rule.id}-${signal}`}
                    d={`M${signalNode.x + 60} ${signalNode.y} C160 ${signalNode.y}, 200 ${rule.y}, ${rule.x - 60} ${rule.y}`}
                    stroke="rgba(255,214,10,0.4)"
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 * ruleIndex }}
                  />
                );
              })}
              {output && (
                <motion.path
                  d={`M${rule.x + 60} ${rule.y} C360 ${rule.y}, 400 ${output.y}, ${output.x - 60} ${output.y}`}
                  stroke="rgba(56,189,248,0.4)"
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 * ruleIndex }}
                />
              )}
            </g>
          );
        })}

        {signalPositions.map((signal) => (
          <g key={`signal-${signal.id}`}>
            <rect x={signal.x} y={signal.y - 16} rx="10" width="120" height="32" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" />
            <text x={signal.x + 60} y={signal.y + 4} textAnchor="middle" fontSize="12" fill="#f5f5f7">
              {signal.id}
            </text>
          </g>
        ))}

        {rulePositions.map((rule) => (
          <g key={`rule-${rule.id}`}>
            <rect x={rule.x} y={rule.y - 16} rx="10" width="120" height="32" fill="rgba(255,214,10,0.12)" stroke="rgba(255,214,10,0.35)" />
            <text x={rule.x + 60} y={rule.y + 4} textAnchor="middle" fontSize="12" fill="#ffd60a">
              {rule.id}
            </text>
          </g>
        ))}

        {outputPositions.map((output) => (
          <g key={`output-${output.id}`}>
            <rect x={output.x} y={output.y - 20} rx="10" width="120" height="40" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.35)" />
            <text x={output.x + 60} y={output.y + 4} textAnchor="middle" fontSize="12" fill="#38bdf8">
              {output.id.replace("_", " ")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

````

### src/ui/OfferCard.tsx

````
import type { Offer } from "@shared/contracts";
import { isTravelOffer, isResidencyOffer, isInsuranceOffer } from "@shared/contracts";
import { PathCard } from "./PathCard";
import { ProgramCard } from "./ProgramCard";
import { PolicyCard } from "./PolicyCard";

type Props = {
  offer: Offer;
  selected?: boolean;
  onSelect?: (offer: Offer) => void;
  compact?: boolean;
  showBoosts?: boolean;
};

export function OfferCard({ offer, selected, onSelect, compact, showBoosts }: Props) {
  if (isTravelOffer(offer)) {
    return (
      <PathCard
        path={offer}
        selected={selected}
        onSelect={onSelect ? () => onSelect(offer) : undefined}
        compact={compact}
        showBoosts={showBoosts}
      />
    );
  }
  if (isResidencyOffer(offer)) {
    return (
      <ProgramCard
        offer={offer}
        selected={selected}
        onSelect={onSelect ? () => onSelect(offer) : undefined}
        compact={compact}
        showBoosts={showBoosts}
      />
    );
  }
  if (isInsuranceOffer(offer)) {
    return (
      <PolicyCard
        offer={offer}
        selected={selected}
        onSelect={onSelect ? () => onSelect(offer) : undefined}
        compact={compact}
        showBoosts={showBoosts}
      />
    );
  }
  return null;
}

````

### src/ui/PathCard.tsx

````
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { RankedPath } from "@shared/contracts";
import { Badge, Card } from "./primitives";
import { cn } from "./utils";
import { formatPercent, formatRub, formatWeeks } from "@/lib/format";

type Props = {
  path: RankedPath;
  selected?: boolean;
  onSelect?: (path: RankedPath) => void;
  compact?: boolean;
  showBoosts?: boolean;
};

export function PathCard({ path, selected, onSelect, compact, showBoosts }: Props) {
  const ineligibleReason = !path.eligible ? path.blockers[0]?.text ?? "Заблокирован правилом" : null;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group cursor-pointer",
        onSelect ? "" : "cursor-default"
      )}
      onClick={() => onSelect?.(path)}
    >
      <Card
        padding={compact ? "sm" : "md"}
        className={cn(
          "relative overflow-hidden transition",
          selected && "ring-2 ring-accent/50",
          !path.eligible && "opacity-80"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={path.eligible ? "positive" : "negative"}>
                {path.eligible ? "Доступен" : "Заблокирован"}
              </Badge>
              <Badge tone="neutral">{path.kind.replace("_", " ")}</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-textPrimary">{path.title}</h3>
            <p className="mt-1 text-sm text-textSecondary">{path.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-textMuted">Оценка</p>
            <p className="mt-1 text-2xl font-semibold text-textPrimary">
              {formatPercent(path.score, 0)}
            </p>
            <p className="text-xs text-textSecondary">
              база {formatPercent(path.baseScore, 0)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Срок</p>
            <p className="text-textPrimary">{formatWeeks(path.processingWeeks)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Стоимость</p>
            <p className="text-textPrimary">{formatRub(path.estCostRub)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              Документы
            </p>
            <p className="text-textPrimary">{path.requirements.length}</p>
          </div>
        </div>
        {showBoosts && path.ruleBoosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {path.ruleBoosts.map((boost) => (
              <Badge
                key={`${boost.ruleId}-${boost.delta}`}
                tone={boost.delta >= 0 ? "positive" : "warning"}
              >
                <Sparkles className="h-3 w-3" />
                {boost.ruleId} · {boost.delta >= 0 ? "+" : ""}
                {formatPercent(Math.abs(boost.delta), 0)}
              </Badge>
            ))}
          </div>
        )}
        {ineligibleReason && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {ineligibleReason}
          </p>
        )}
        {onSelect && (
          <div className="mt-4 flex items-center gap-2 text-xs text-accent">
            <span>Сделать основным</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

````

### src/ui/PolicyCard.tsx

````
import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, ShieldCheck, Zap, Syringe, Dumbbell, Stethoscope } from "lucide-react";
import type { InsuranceOffer } from "@shared/contracts";
import { Badge, Card } from "./primitives";
import { formatPercent } from "@/lib/format";
import { cn } from "./utils";

type Props = {
  offer: InsuranceOffer;
  selected?: boolean;
  onSelect?: (offer: InsuranceOffer) => void;
  compact?: boolean;
  showBoosts?: boolean;
};

const featureIcon = {
  covid: { Icon: Syringe, label: "COVID" },
  chronic: { Icon: HeartPulse, label: "Хроники" },
  extreme_sports: { Icon: Dumbbell, label: "Экстрим" },
  pregnancy: { Icon: ShieldCheck, label: "Беременность" },
  evacuation: { Icon: Zap, label: "Эвакуация" },
  dental_emergency: { Icon: Stethoscope, label: "Стоматология" }
} as const;

const trustLabels = { a_plus: "A+", a: "A", b: "B" } as const;

export function PolicyCard({ offer, selected, onSelect, compact, showBoosts }: Props) {
  const activeIncludes = (Object.keys(offer.includes) as Array<keyof typeof offer.includes>)
    .filter((key) => offer.includes[key])
    .slice(0, 4);
  const totalPrice = Math.round(offer.pricePerDayEur * 10);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(onSelect ? "cursor-pointer" : "")}
      onClick={() => onSelect?.(offer)}
    >
      <Card
        padding={compact ? "sm" : "md"}
        className={cn(
          "relative overflow-hidden transition",
          selected && "ring-2 ring-accent/50",
          !offer.eligible && "opacity-75"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={offer.schengenCompliant ? "positive" : "warning"}>
                {offer.schengenCompliant ? "Шенген ок" : "Не шенген"}
              </Badge>
              <Badge tone="neutral">Доверие {trustLabels[offer.trustLevel]}</Badge>
              <Badge tone="neutral">insurance_adult</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-textPrimary">
              {offer.providerNameRu} · {offer.productNameRu}
            </h3>
            <p className="mt-1 text-sm text-textSecondary">{offer.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-textMuted">Оценка</p>
            <p className="mt-1 text-2xl font-semibold text-textPrimary">
              {formatPercent(offer.score, 0)}
            </p>
            <p className="text-xs text-textSecondary">
              база {formatPercent(offer.baseScore, 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Покрытие</p>
            <p className="mt-0.5 text-textPrimary">
              €{offer.coverageAmountEur.toLocaleString("ru-RU")}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Цена/день</p>
            <p className="mt-0.5 text-textPrimary">€{offer.pricePerDayEur.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">10 дней</p>
            <p className="mt-0.5 text-textPrimary">€{totalPrice}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeIncludes.map((key) => {
            const item = featureIcon[key];
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-textSecondary"
              >
                <item.Icon className="h-3 w-3 text-accent" />
                {item.label}
              </span>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-textMuted">
          Принимают: {offer.acceptedByConsulates.length > 0 ? offer.acceptedByConsulates.join(", ") : "—"} ·
          выплата ≈ {offer.payoutSpeedDays} дн · возраст {offer.ageMin}-{offer.ageMax}
        </p>

        {showBoosts && offer.ruleBoosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {offer.ruleBoosts.map((boost) => (
              <Badge
                key={`${boost.ruleId}-${boost.delta}`}
                tone={boost.delta >= 0 ? "positive" : "warning"}
              >
                {boost.ruleId} · {boost.delta >= 0 ? "+" : ""}
                {formatPercent(Math.abs(boost.delta), 0)}
              </Badge>
            ))}
          </div>
        )}

        {!offer.eligible && offer.blockers[0] && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {offer.blockers[0].text}
          </p>
        )}

        {onSelect && (
          <div className="mt-4 flex items-center gap-2 text-xs text-accent">
            <span>Выбрать полис</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

````

### src/ui/ProgramCard.tsx

````
import { motion } from "framer-motion";
import { ArrowRight, Clock, CircleDollarSign, Shield, Sparkles } from "lucide-react";
import type { ResidencyOffer } from "@shared/contracts";
import { Badge, Card } from "./primitives";
import { FlagIcon } from "./FlagIcon";
import { formatPercent } from "@/lib/format";
import { cn } from "./utils";

type Props = {
  offer: ResidencyOffer;
  selected?: boolean;
  onSelect?: (offer: ResidencyOffer) => void;
  showBoosts?: boolean;
  compact?: boolean;
};

const statusBadge = {
  active: { tone: "positive" as const, label: "Активна" },
  limited: { tone: "warning" as const, label: "Ограничена" },
  closed: { tone: "negative" as const, label: "Закрыта" }
};

export function ProgramCard({ offer, selected, onSelect, showBoosts, compact }: Props) {
  const badge = statusBadge[offer.status];
  const costLabel = `${offer.costRangeEur[0]}-${offer.costRangeEur[1]}€`;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(onSelect ? "cursor-pointer" : "")}
      onClick={() => onSelect?.(offer)}
    >
      <Card
        padding={compact ? "sm" : "md"}
        className={cn(
          "relative overflow-hidden transition",
          selected && "ring-2 ring-accent/50",
          offer.status === "closed" && "opacity-80"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <FlagIcon code="ES" />
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <Badge tone="neutral">residency_es</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-textPrimary">{offer.nameRu}</h3>
            <p className="mt-1 text-sm text-textSecondary">{offer.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-textMuted">Оценка</p>
            <p className="mt-1 text-2xl font-semibold text-textPrimary">
              {formatPercent(offer.score, 0)}
            </p>
            <p className="text-xs text-textSecondary">база {formatPercent(offer.baseScore, 0)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Вероятность</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-textPrimary">
              <Sparkles className="h-3 w-3" />
              {formatPercent(offer.successProbability, 0)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Срок</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-textPrimary">
              <Clock className="h-3 w-3" />
              {offer.processingDays} дн.
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Стоимость</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-textPrimary">
              <CircleDollarSign className="h-3 w-3" />
              {costLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <p className="text-xs uppercase tracking-wide text-textMuted">Главные требования</p>
          <ul className="grid gap-1 text-xs text-textSecondary">
            {offer.eligibilityRequirements.slice(0, 4).map((req, index) => (
              <li key={index} className="flex items-start gap-2">
                <Shield className="mt-0.5 h-3 w-3 text-accent" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {offer.consulateOptions.length > 0 && (
          <p className="mt-3 text-xs text-textMuted">
            Подача: {offer.consulateOptions.join(" · ")}
          </p>
        )}

        {showBoosts && offer.ruleBoosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {offer.ruleBoosts.map((boost) => (
              <Badge
                key={`${boost.ruleId}-${boost.delta}`}
                tone={boost.delta >= 0 ? "positive" : "warning"}
              >
                <Sparkles className="h-3 w-3" />
                {boost.ruleId} · {boost.delta >= 0 ? "+" : ""}
                {formatPercent(Math.abs(boost.delta), 0)}
              </Badge>
            ))}
          </div>
        )}

        {offer.status === "closed" && offer.statusReason && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {offer.statusReason}
          </p>
        )}

        {onSelect && (
          <div className="mt-4 flex items-center gap-2 text-xs text-accent">
            <span>Сделать основным</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

````

### src/ui/ProgressMeter.tsx

````
import { motion } from "framer-motion";
import { formatPercent } from "@/lib/format";

export function ProgressMeter({
  value,
  label,
  detail
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-textSecondary">
        <span>{label}</span>
        <span className="tabular-nums">{formatPercent(value)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {detail && <p className="mt-1 text-xs text-textMuted">{detail}</p>}
    </div>
  );
}

````

### src/ui/QuestionCard.tsx

````
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { IntakeQuestion } from "@shared/contracts";
import { Button, Card } from "./primitives";
import { Chip } from "./primitives";
import { SegmentedControl } from "./SegmentedControl";
import { formatPercent } from "@/lib/format";

type Answer = string | number | boolean | null;

type Props = {
  question: IntakeQuestion;
  onAnswer: (value: Answer) => void;
  children?: ReactNode;
};

export function QuestionCard({ question, onAnswer, children }: Props) {
  const [draft, setDraft] = useState<string>("");

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="grid gap-4">
        <header className="grid gap-1">
          <p className="text-[11px] uppercase tracking-wide text-textMuted">
            {question.mandatory ? "Обязательный сигнал" : "Уточняющий сигнал"} ·
            информативность {formatPercent(question.informationGain, 0)}
          </p>
          <h2 className="text-xl font-semibold text-textPrimary">{question.prompt}</h2>
          {question.helper && (
            <p className="text-sm text-textSecondary">{question.helper}</p>
          )}
        </header>

        {question.kind === "enum" && question.options && (
          <div className="grid gap-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onAnswer(option.value)}
                className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm text-textPrimary transition hover:border-accent/60 hover:bg-accent/10"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {question.kind === "boolean" && (
          <SegmentedControl
            value="none"
            onChange={(value) => {
              if (value === "none") {
                onAnswer(null);
                return;
              }
              onAnswer(value === "yes");
            }}
            options={[
              { value: "yes", label: "Да" },
              { value: "no", label: "Нет" },
              { value: "none", label: "Не знаю" }
            ]}
          />
        )}

        {question.kind === "number" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = Number(draft);
              if (!Number.isFinite(parsed)) return;
              onAnswer(parsed);
              setDraft("");
            }}
            className="grid gap-3"
          >
            <input
              type="number"
              value={draft}
              min={question.min}
              max={question.max}
              onChange={(event) => setDraft(event.target.value)}
              className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary"
              placeholder="Введите число"
            />
            <div className="flex flex-wrap gap-2">
              {[1, 4, 8, 12].map((value) => (
                <Chip key={value} onClick={() => onAnswer(value)}>
                  {value}
                </Chip>
              ))}
              <Button size="sm" type="submit" variant="secondary">
                Подтвердить
              </Button>
            </div>
          </form>
        )}

        <p className="text-xs text-textMuted">
          Сигнал разблокирует правила: {question.unlocksRules.join(", ") || "—"}.
        </p>

        {children}
      </Card>
    </motion.div>
  );
}

````

### src/ui/ReadinessCircle.tsx

````
import { motion } from "framer-motion";
import type { DocumentsReadiness } from "@shared/contracts";
import { AnimatedNumber } from "./AnimatedNumber";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReadinessCircle({ readiness }: { readiness: DocumentsReadiness }) {
  const dash = Math.max(0, Math.min(1, readiness.score));
  return (
    <div className="flex items-center gap-5">
      <div className="relative grid place-items-center">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="70"
            cy="70"
            r={RADIUS}
            stroke={dash >= 0.8 ? "#34d399" : dash >= 0.4 ? "#fbbf24" : "#f97066"}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - dash)}
            transform="rotate(-90 70 70)"
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - dash) }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <AnimatedNumber
              value={readiness.score * 100}
              suffix="%"
              className="block text-3xl font-semibold text-textPrimary"
            />
            <p className="mt-1 text-xs text-textSecondary">готовность</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm text-textPrimary">
          Готово {readiness.readyCount} из {readiness.requiredCount} документов.
        </p>
        <p className="mt-1 text-xs text-textSecondary">
          Доберите недостающие документы, чтобы закрыть трек без риска отказа.
        </p>
      </div>
    </div>
  );
}

````

### src/ui/ReplayTimeline.tsx

````
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { AuditTrail } from "@shared/contracts";
import { Button, Card } from "./primitives";
import { TimelineStep } from "./TimelineStep";
import { track } from "@/instrumentation/events";

type Props = {
  trail: AuditTrail;
  onFinished?: () => void;
};

export function ReplayTimeline({ trail, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      setIndex((current) => {
        const next = current + 1;
        if (next >= trail.steps.length) {
          setPlaying(false);
          onFinished?.();
          track({ type: "replay_finished", caseId: trail.caseId, steps: trail.steps.length });
          return current;
        }
        return next;
      });
    }, 420);
    return () => window.clearTimeout(id);
  }, [playing, index, trail.steps.length, trail.caseId, onFinished]);

  const currentStep = trail.steps[index];

  return (
    <Card className="grid gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-textMuted">Воспроизведение</p>
          <h3 className="text-lg font-semibold text-textPrimary">Шаги движка</h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPlaying(false);
              setIndex(0);
            }}
          >
            К началу
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (index >= trail.steps.length - 1) setIndex(0);
              setPlaying((value) => !value);
              if (!playing) track({ type: "replay_opened", caseId: trail.caseId });
            }}
          >
            {playing ? "Пауза" : "Проиграть"}
          </Button>
        </div>
      </header>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${((index + 1) / trail.steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="grid gap-2">
        {trail.steps.map((step, stepIndex) => (
          <TimelineStep
            key={step.index}
            index={step.index}
            title={step.name}
            detail={step.outputSummary}
            tookMs={step.tookMs}
            active={stepIndex === index}
          >
            {stepIndex === index && step.firedRuleIds.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-200">
                Сработавшие правила: {step.firedRuleIds.join(", ")}
              </p>
            )}
          </TimelineStep>
        ))}
      </div>

      {currentStep && (
        <p className="text-xs text-textMuted">Текущий шаг: {currentStep.inputsSummary}</p>
      )}
    </Card>
  );
}

````

### src/ui/RiskPulse.tsx

````
import { motion } from "framer-motion";
import type { Risk } from "@shared/contracts";
import { pulseVariants } from "@/animations/variants";
import { severityTone } from "@/theme/tokens";

export function RiskPulse({ risk }: { risk: Risk }) {
  const tone = severityTone[risk.severity];
  return (
    <div className={`rounded-2xl border border-border ${tone.surface} p-4`}>
      <div className="flex items-start gap-3">
        <motion.span
          className={`mt-1 inline-flex h-3 w-3 shrink-0 rounded-full ${tone.dot}`}
          variants={pulseVariants(risk.pulseAmplitude)}
          initial="initial"
          animate="animate"
        />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${tone.text}`}>{risk.label}</p>
          <p className="mt-1 text-xs text-textSecondary">{risk.detail}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-textMuted">
            Сработало: {risk.triggeredBy.join(", ")} · {tone.label}
          </p>
        </div>
      </div>
    </div>
  );
}

````

### src/ui/SegmentedControl.tsx

````
import { motion } from "framer-motion";
import { cn } from "./utils";

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative grid rounded-xl border border-border bg-surface-2 p-1",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 rounded-lg px-3 py-2 text-xs font-medium transition",
              selected ? "text-black" : "text-textSecondary hover:text-textPrimary"
            )}
          >
            {selected && (
              <motion.span
                layoutId="segmented-indicator"
                className="absolute inset-0 -z-10 rounded-lg bg-accent"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

````

### src/ui/SignalRow.tsx

````
import { Check, Minus } from "lucide-react";
import type { DecisionSignal } from "@shared/contracts";
import { cn } from "./utils";

type Props = {
  signal: DecisionSignal;
  onClick?: (signal: DecisionSignal) => void;
  selected?: boolean;
};

export function SignalRow({ signal, onClick, selected }: Props) {
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(signal) : undefined}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-3 text-left transition",
        onClick && "hover:border-borderStrong",
        selected && "border-accent/60 bg-accent/10"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            signal.present ? "bg-emerald-500/15 text-emerald-300" : "bg-surface-3 text-textSecondary"
          )}
        >
          {signal.present ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-sm text-textPrimary">{signal.label}</p>
          <p className="text-xs text-textSecondary">{signal.displayValue}</p>
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-1 text-[11px] uppercase tracking-wide",
          signal.importance >= 0.8
            ? "bg-amber-500/20 text-amber-100"
            : "bg-surface-3 text-textMuted"
        )}
      >
        {signal.importance >= 0.8 ? "ключевой" : signal.present ? "учтён" : "пусто"}
      </span>
    </button>
  );
}

````

### src/ui/SourceBadge.tsx

````
import type { Source } from "@shared/contracts";
import { ExternalLink } from "lucide-react";
import { sourceTierTone } from "@/theme/tokens";
import { Badge } from "./primitives";
import { formatDate, formatPercent } from "@/lib/format";

export function SourceBadge({ source }: { source: Source }) {
  const tone = sourceTierTone[source.tier];
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-borderStrong"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="neutral" className={`${tone.surface} ${tone.text} border-transparent`}>
            {tone.label}
          </Badge>
          <span className="text-[11px] uppercase tracking-wide text-textMuted">
            Волатильность {formatPercent(source.volatilityScore, 0)}
          </span>
        </div>
        <ExternalLink className="h-4 w-4 text-textSecondary" />
      </div>
      <p className="text-sm font-medium text-textPrimary">{source.label}</p>
      <p className="text-xs text-textSecondary">{source.summary}</p>
      <p className="text-[11px] text-textMuted">
        Проверено: {formatDate(source.lastCheckedAt)}
      </p>
    </a>
  );
}

````

### src/ui/StickyFooter.tsx

````
import { type ReactNode } from "react";

export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-24 z-20 mt-4">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-borderStrong bg-surface/95 p-3 shadow-soft backdrop-blur">
        {children}
      </div>
    </div>
  );
}

````

### src/ui/SwipeDeck.tsx

````
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Offer } from "@shared/contracts";
import { OfferCard } from "./OfferCard";
import { Button, Chip } from "./primitives";
import { track } from "@/instrumentation/events";

type Decision = {
  pathId: string;
  weight: number;
  reason?: string;
};

type DismissReason = { id: string; label: string; weight: number };

type Props = {
  offers: Offer[];
  onShortlist: (offerId: string) => void;
  onDismiss: (offerId: string, reason?: string) => void;
  onPreferencesChange: (decisions: Decision[]) => void;
  dismissReasons?: DismissReason[];
};

const defaultReasons: DismissReason[] = [
  { id: "too_expensive", label: "Дорого", weight: -0.4 },
  { id: "doesnt_fit", label: "Не подходит", weight: -0.5 }
];

export function SwipeDeck({
  offers,
  onShortlist,
  onDismiss,
  onPreferencesChange,
  dismissReasons = defaultReasons
}: Props) {
  const [stack, setStack] = useState<Offer[]>(offers);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [pendingReasonFor, setPendingReasonFor] = useState<string | null>(null);

  if (stack.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 p-4 text-sm text-textSecondary">
        Все альтернативы рассмотрены. Вернитесь к основному варианту, если решили его закрепить.
      </div>
    );
  }

  const handleShortlist = () => {
    const top = stack[0];
    if (!top) return;
    const nextDecisions: Decision[] = [...decisions.filter((d) => d.pathId !== top.id), { pathId: top.id, weight: 0.6 }];
    setDecisions(nextDecisions);
    setStack((current) => current.slice(1));
    onPreferencesChange(nextDecisions);
    onShortlist(top.id);
    track({ type: "path_switch", pathId: top.id });
  };

  const handleDismiss = (reason?: DismissReason) => {
    const top = stack[0];
    if (!top) return;
    if (dismissReasons.length > 0 && !reason) {
      setPendingReasonFor(top.id);
      return;
    }
    const weight = reason?.weight ?? -0.4;
    const nextDecisions: Decision[] = [
      ...decisions.filter((d) => d.pathId !== top.id),
      { pathId: top.id, weight, reason: reason?.id }
    ];
    setDecisions(nextDecisions);
    setStack((current) => current.slice(1));
    setPendingReasonFor(null);
    onPreferencesChange(nextDecisions);
    onDismiss(top.id, reason?.label);
    track({ type: "path_switch", pathId: top.id });
  };

  return (
    <div className="grid gap-3">
      <div className="relative h-[360px] w-full">
        <AnimatePresence>
          {stack.slice(0, 3).map((offer, index) => (
            <motion.div
              key={offer.id}
              className="absolute inset-0"
              style={{ zIndex: 10 - index }}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: index * 14, scale: 1 - index * 0.04 }}
              exit={{ opacity: 0, x: 240, rotate: 12, transition: { duration: 0.3 } }}
              drag={index === 0 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 120) handleShortlist();
                else if (info.offset.x < -120) handleDismiss();
              }}
            >
              <OfferCard offer={offer} showBoosts compact />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {pendingReasonFor ? (
        <div className="grid gap-2 rounded-2xl border border-border bg-surface-2 p-3">
          <p className="text-sm text-textSecondary">Почему отклоняете?</p>
          <div className="flex flex-wrap gap-2">
            {dismissReasons.map((reason) => (
              <Chip key={reason.id} onClick={() => handleDismiss(reason)}>
                {reason.label}
              </Chip>
            ))}
            <Chip onClick={() => setPendingReasonFor(null)}>Отмена</Chip>
          </div>
        </div>
      ) : (
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => handleDismiss()}>Отклонить</Button>
          <Button variant="primary" onClick={handleShortlist}>В шорт-лист</Button>
        </div>
      )}

      {decisions.length > 0 && (
        <p className="text-xs text-textMuted">
          Предпочтения: {decisions.map((d) => `${d.pathId} (${d.weight >= 0 ? "+" : ""}${d.weight.toFixed(1)})`).join(", ")}
        </p>
      )}
    </div>
  );
}

export const insuranceDismissReasons: DismissReason[] = [
  { id: "too_expensive", label: "Дорого", weight: -0.5 },
  { id: "low_coverage", label: "Мало покрытия", weight: -0.5 },
  { id: "age_mismatch", label: "Не по возрасту", weight: -0.6 },
  { id: "not_accepted", label: "Не принимает консульство", weight: -0.7 }
];

export const residencyDismissReasons: DismissReason[] = [
  { id: "income_gap", label: "Не прохожу по доходу", weight: -0.6 },
  { id: "too_slow", label: "Слишком долго", weight: -0.4 },
  { id: "too_expensive", label: "Дорого", weight: -0.4 },
  { id: "closed", label: "Программа недоступна", weight: -0.7 }
];

````

### src/ui/TemporalWhatIf.tsx

````
import { useState } from "react";
import { Button, Card } from "./primitives";
import { track } from "@/instrumentation/events";

type Props = {
  baseValue: number;
  label: string;
  unit: (value: number) => string;
  min?: number;
  max?: number;
  onApply: (value: number) => Promise<void>;
  loading?: boolean;
};

export function TemporalWhatIf({
  baseValue,
  label,
  unit,
  min = -12,
  max = 12,
  onApply,
  loading
}: Props) {
  const [delta, setDelta] = useState(0);
  const projected = Math.max(0, baseValue + delta);

  return (
    <Card className="grid gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-textMuted">Сценарий «а что, если…»</p>
        <h3 className="text-lg font-semibold text-textPrimary">{label}</h3>
        <p className="mt-1 text-sm text-textSecondary">
          Двигаем значение сигнала на ±{max - min} и пересчитываем решение реальным движком.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-textSecondary">
          База: <span className="text-textPrimary">{unit(baseValue)}</span>
        </div>
        <div className="text-sm text-textSecondary">
          Новое значение: <span className="text-textPrimary">{unit(projected)}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={delta}
        onChange={(event) => {
          const next = Number(event.target.value);
          setDelta(next);
          track({ type: "temporal_slider_dragged", delta: next });
        }}
        className="w-full accent-yellow-400"
      />
      <Button size="sm" loading={loading} onClick={() => onApply(projected)}>
        Пересчитать движком
      </Button>
    </Card>
  );
}

````

### src/ui/TimelineStep.tsx

````
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  index: number;
  title: string;
  detail?: string;
  tookMs?: number;
  active?: boolean;
  children?: ReactNode;
};

export function TimelineStep({ index, title, detail, tookMs, active, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex gap-3"
    >
      <div className="relative flex flex-col items-center">
        <span
          className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
            active ? "border-accent bg-accent text-black" : "border-border bg-surface-2 text-textSecondary"
          }`}
        >
          {index + 1}
        </span>
        <span className="mt-1 h-full w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm font-medium text-textPrimary">{title}</p>
        {detail && <p className="mt-1 text-xs text-textSecondary">{detail}</p>}
        {typeof tookMs === "number" && (
          <p className="mt-1 text-[11px] uppercase tracking-wide text-textMuted">
            {tookMs.toFixed(1)} мс
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}

````

### src/ui/Toast.tsx

````
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastItem = {
  id: string;
  message: string;
  tone: "info" | "success" | "warning" | "error";
};

type ToastContextValue = {
  push: (message: string, tone?: ToastItem["tone"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const push = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3800);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className={[
                "pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-sm shadow-soft backdrop-blur",
                item.tone === "error"
                  ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                  : item.tone === "success"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                    : item.tone === "warning"
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                      : "border-border bg-surface-3 text-textPrimary"
              ].join(" ")}
            >
              {item.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

````

### src/ui/Tooltip.tsx

````
import { useState, type ReactNode } from "react";
import { cn } from "./utils";

export function Tooltip({
  content,
  children,
  className
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="pointer-events-none absolute -top-2 left-1/2 z-40 w-max -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-xs text-textPrimary shadow-soft">
          {content}
        </span>
      )}
    </span>
  );
}

````

### src/ui/VolatilityRadar.tsx

````
import type { Source } from "@shared/contracts";
import { motion } from "framer-motion";
import { Card } from "./primitives";
import { formatPercent } from "@/lib/format";

type Props = {
  sources: Source[];
  radius?: number;
};

export function VolatilityRadar({ sources, radius = 90 }: Props) {
  const sorted = sources
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const count = Math.max(sorted.length, 3);
  const center = radius + 20;
  const size = (radius + 20) * 2;
  const points = sorted.map((source, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const distance = (1 - source.volatilityScore) * radius;
    return {
      source,
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
      anchorX: center + Math.cos(angle) * radius,
      anchorY: center + Math.sin(angle) * radius
    };
  });

  return (
    <Card className="grid gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-textMuted">Радар волатильности</p>
        <h3 className="text-lg font-semibold text-textPrimary">Свежесть источников</h3>
      </div>
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" />
          <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="rgba(255,255,255,0.06)" />
          <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="rgba(255,255,255,0.06)" />
          {points.map((point) => (
            <line
              key={`line-${point.source.id}`}
              x1={center}
              y1={center}
              x2={point.anchorX}
              y2={point.anchorY}
              stroke="rgba(255,255,255,0.08)"
            />
          ))}
          <motion.polygon
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ duration: 0.5 }}
            fill="rgba(255,214,10,0.2)"
            stroke="#ffd60a"
            strokeWidth="1.5"
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          />
          {points.map((point) => (
            <g key={`point-${point.source.id}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="#ffd60a" />
              <text x={point.anchorX} y={point.anchorY} textAnchor="middle" fontSize="10" fill="#f5f5f7" dy={point.anchorY < center ? -6 : 14}>
                {point.source.id.replace("src_", "")}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <ul className="grid gap-1 text-xs text-textSecondary">
        {sorted.map((source) => (
          <li key={source.id} className="flex items-center justify-between gap-2">
            <span>{source.label}</span>
            <span className="tabular-nums text-textMuted">
              Волатильность {formatPercent(source.volatilityScore, 0)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

````

### src/ui/primitives.tsx

````
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-black hover:bg-accentHover shadow-[0_8px_24px_-12px_rgba(255,214,10,0.5)]",
  secondary:
    "bg-surface-2 text-textPrimary border border-borderStrong hover:bg-surface-3",
  ghost:
    "bg-transparent text-textSecondary hover:bg-surface-2 hover:text-textPrimary",
  danger: "bg-rose-500 text-white hover:bg-rose-400"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs rounded-lg",
  md: "px-4 py-3 text-sm rounded-xl",
  lg: "px-5 py-3.5 text-base rounded-xl"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    loading,
    disabled,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
});

export function Card({
  className,
  children,
  padding = "md",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padding?: "sm" | "md" | "lg" | "none" }) {
  const padClass = padding === "none"
    ? ""
    : padding === "sm"
      ? "p-4"
      : padding === "md"
        ? "p-5"
        : "p-6";
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-soft",
        padClass,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type BadgeTone = "default" | "positive" | "warning" | "negative" | "review" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  default: "bg-surface-3 text-textPrimary",
  positive: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  warning: "bg-amber-500/15 text-amber-100 border-amber-400/30",
  negative: "bg-rose-500/15 text-rose-100 border-rose-400/30",
  review: "bg-sky-500/15 text-sky-100 border-sky-400/30",
  neutral: "bg-slate-500/15 text-slate-100 border-slate-400/30"
};

export function Badge({
  tone = "default",
  className,
  children
}: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  className,
  children,
  onClick,
  selected
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-textPrimary transition hover:bg-surface-3",
        selected && "border-accent/60 bg-accent/10 text-accent",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2",
        className
      )}
    />
  );
}

````

### src/ui/utils.ts

````
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

````
