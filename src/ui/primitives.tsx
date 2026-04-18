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
