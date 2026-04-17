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
