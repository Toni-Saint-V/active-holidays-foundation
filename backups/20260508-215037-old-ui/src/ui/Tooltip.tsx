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
