export const ENGINE_CLASS = 'deterministic-mock-v0' as const
export const ENGINE_BADGE = 'mock preview · не live' as const

export type CountryCode = 'IT' | 'ES' | 'FR' | 'GR'
export type VerdictKind = 'GO' | 'GO_WITH_CONDITIONS' | 'NOT_NOW' | 'HUMAN_REVIEW'

export const VERDICT_HEADLINE: Record<VerdictKind, string> = {
  GO: 'Можно подаваться',
  GO_WITH_CONDITIONS: 'Можно, но есть условия',
  NOT_NOW: 'Сейчас не стоит',
  HUMAN_REVIEW: 'Нужна ручная проверка',
}

export const VERDICT_ACCENT: Record<VerdictKind, string> = {
  GO: 'text-primary',
  GO_WITH_CONDITIONS: 'text-primary',
  NOT_NOW: 'text-orange-400',
  HUMAN_REVIEW: 'text-foreground',
}

export const VERDICT_INSIGHT: Record<VerdictKind, string> = {
  GO: 'Подача по окну. Документы без сюрпризов, время в запасе.',
  GO_WITH_CONDITIONS:
    'Окно узкое — нужна ускоренная запись и буфер на возврат паспорта.',
  NOT_NOW:
    'До поездки мало времени. Лучше сдвинуть даты, чем рисковать отказом по срокам.',
  HUMAN_REVIEW:
    'Кейс на грани автоматики: эксперт разбирает контекст за 20 мин, а не сутки.',
}
