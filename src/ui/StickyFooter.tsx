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
