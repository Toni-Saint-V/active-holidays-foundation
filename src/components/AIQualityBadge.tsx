import type { AiQuality } from '@/lib/aiSurfaceContracts'

export function AIQualityBadge({ quality }: { quality?: AiQuality }) {
  if (!quality) return null

  return (
    <details className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-foreground/75">
      <summary className="cursor-pointer list-none text-primary">
        Экспертная проверка: {quality.score}/100 · порог {quality.threshold}
      </summary>
      <div className="mt-2 grid gap-1.5">
        {quality.criteria.map((item) => (
          <div key={item.name} className="flex items-start justify-between gap-3">
            <span className="text-foreground/80">{item.name}</span>
            <span className="shrink-0 text-primary">{item.score}/100</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-muted-foreground">{quality.label}</p>
    </details>
  )
}
