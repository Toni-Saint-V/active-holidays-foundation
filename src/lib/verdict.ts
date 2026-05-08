import type { VerdictKind } from '@/lib/constants'

export function deriveVerdict(daysToTrip: number, missingFields: boolean): VerdictKind {
  if (missingFields) return 'HUMAN_REVIEW'
  if (daysToTrip < 7) return 'HUMAN_REVIEW'
  if (daysToTrip < 15) return 'NOT_NOW'
  if (daysToTrip < 26) return 'GO_WITH_CONDITIONS'
  return 'GO'
}
