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
