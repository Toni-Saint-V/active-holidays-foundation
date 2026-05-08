import { cn } from '@/lib/utils'

export function StepRail({ current, total = 4 }: { current: 1 | 2 | 3 | 4; total?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={cn('h-1 flex-1 rounded-full', n <= current ? 'bg-primary ah-amber-glow' : 'bg-white/8')}
        />
      ))}
    </div>
  )
}
