import { cn } from '@/lib/utils'

export function CountryChipCard({
  flag,
  label,
  selected,
  onSelect,
}: {
  flag: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex h-28 min-h-[44px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border px-1.5 py-3 transition-all',
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-white/8 bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/15 hover:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-primary/40'
      )}
    >
      <span aria-hidden className="absolute left-3 right-3 top-0 h-px bg-white/8" />
      <span aria-hidden className="relative flex h-9 w-9 items-center justify-center rounded-full">
        <span aria-hidden className="absolute inset-0 rounded-full ah-chip-circle" />
        <span className="relative text-[22px] ah-flag-saturate">{flag}</span>
      </span>
      <span
        className={cn(
          'relative whitespace-nowrap text-[9px] uppercase tracking-[0.14em]',
          selected ? 'text-primary' : 'text-muted-foreground/70'
        )}
      >
        {label}
      </span>
    </button>
  )
}
