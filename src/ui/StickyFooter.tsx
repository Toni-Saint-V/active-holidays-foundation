import { type ReactNode } from "react";

export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 mt-4 sm:bottom-4">
      <div className="pointer-events-auto mx-auto w-full max-w-none rounded-2xl border border-borderStrong bg-surface/95 p-3 shadow-soft backdrop-blur">
        {children}
      </div>
    </div>
  );
}
