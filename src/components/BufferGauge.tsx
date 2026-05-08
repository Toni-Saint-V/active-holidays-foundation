export function BufferGauge({ days }: { days: number }) {
  const max = 40
  const pct = Math.min(100, (days / max) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="ah-eyebrow">До поездки</span>
        <span className="text-[13px] font-medium text-foreground/85">{days} дн.</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.04]">
        <div className="absolute inset-y-0 left-0 w-[15%] bg-destructive/15" />
        <div className="absolute inset-y-0 left-[15%] w-[20%] bg-warn/15" />
        <div className="absolute inset-y-0 left-[35%] w-[25%] bg-primary/15" />
        <div className="absolute inset-y-0 left-[60%] w-[40%] bg-ok/15" />
        <div
          className="absolute inset-y-[-2px] w-0.5 rounded-full bg-foreground ah-amber-glow"
          style={{ left: `calc(${pct}% - 1px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Порог</span>
        <span>Буфер</span>
        <span>С запасом</span>
        <span>Безопасно</span>
      </div>
    </div>
  )
}
