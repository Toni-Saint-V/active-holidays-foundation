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
