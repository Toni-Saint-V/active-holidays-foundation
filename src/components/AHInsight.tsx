import type { ReactNode } from 'react'

export function AHInsight({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3.5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <span aria-hidden className="relative mt-1.5 h-2.5 w-2.5 shrink-0">
        <span className="pointer-events-none absolute -inset-2 rounded-full ah-glow-halo" />
        <span className="relative block h-2.5 w-2.5 rounded-full ah-glow-dot" />
      </span>
      <div className="min-w-0">
        <div className="ah-eyebrow">AH Insight</div>
        <p className="mt-1 text-[13px] leading-snug text-foreground/85">{children}</p>
      </div>
    </div>
  )
}
