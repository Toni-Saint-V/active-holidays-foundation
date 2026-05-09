import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export function AmberCTA({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-16 min-h-[44px] w-full items-center justify-center gap-3 rounded-full text-[17px] font-semibold tracking-tight transition-all ah-amber-cta ah-amber-glow active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{children}</span>
      <ArrowRight className="absolute right-6 h-5 w-5" aria-hidden />
    </button>
  )
}
