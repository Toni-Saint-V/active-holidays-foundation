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
