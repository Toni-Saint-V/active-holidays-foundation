'use client'

import { AlertTriangle, ChevronDown, ChevronUp, FilePlus2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode, VerdictKind } from '@/lib/constants'
import { cn } from '@/lib/utils'

export type CockpitStatus = 'PRELIMINARY' | 'DOCS_REVIEW_REQUIRED' | 'EXPERT_REQUIRED'
export type DocumentTruthState = 'SYSTEM_CONFIRMED' | 'LOCAL_PENDING' | 'UNCONFIRMED'
export type CockpitMapType = 'PRELIMINARY' | 'CASE_BOUND'
export type CockpitSource = 'USER_ANSWERS' | 'CASE_DATA'

const STATUS_COPY: Record<CockpitStatus, { label: string; tone: string }> = {
  PRELIMINARY: {
    label: 'Предварительно',
    tone: 'text-primary border-primary/40 bg-primary/10',
  },
  DOCS_REVIEW_REQUIRED: {
    label: 'Нужна сверка документов',
    tone: 'text-orange-200 border-orange-300/40 bg-orange-500/10',
  },
  EXPERT_REQUIRED: {
    label: 'Нужен эксперт',
    tone: 'text-foreground border-white/30 bg-white/10',
  },
}

function documentTruthCopy(state: DocumentTruthState) {
  if (state === 'SYSTEM_CONFIRMED') {
    return {
      chipLabel: 'подтверждённые данные в кейсе',
      drawerPoint: 'Часть документов уже подтверждена в кейсе, но финальное решение остаётся за консульством.',
      detail: 'Документы подтверждены в кейсе. Финальная верификация остаётся за консульством.',
    }
  }
  if (state === 'LOCAL_PENDING') {
    return {
      chipLabel: 'выбраны локально, ожидают подтверждения',
      drawerPoint: 'Подтверждённых документов в кейсе нет, поэтому вывод остаётся предварительным.',
      detail: 'Файл выбран локально. Проверка документов появится после подтверждения в системе.',
    }
  }
  return {
    chipLabel: 'не подтверждены системой',
    drawerPoint: 'Подтверждённых документов в кейсе нет, поэтому вывод остаётся предварительным.',
    detail: 'Документы ещё не подтверждены системой.',
  }
}

export function ResultCockpitHeader({
  country,
  daysToTrip,
  mapType,
}: {
  country: CountryCode | null
  daysToTrip: number | null
  mapType: CockpitMapType
}) {
  const countryLabel = country ? `${COUNTRIES[country].flag} ${COUNTRIES[country].label}` : 'Страна не указана'
  const daysLabel = daysToTrip == null ? 'До поездки: не указано' : `До поездки: ${daysToTrip} дней`
  const mapTypeLabel = mapType === 'CASE_BOUND' ? 'Карта по данным кейса' : 'Предварительная карта'
  return (
    <section className="rounded-3xl border border-white/12 bg-[#0f141f]/80 p-4 backdrop-blur-sm md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">Карта решения</p>
      <div className="mt-3 grid grid-cols-1 gap-2 text-[13px] text-foreground/82 md:grid-cols-3 md:gap-3">
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">{countryLabel}</p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">{daysLabel}</p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">{mapTypeLabel}</p>
      </div>
      <p className="mt-3 text-[12px] leading-snug text-foreground/65">
        AI объясняет риски. Решение принимает консульство.
      </p>
    </section>
  )
}

export function PremiumStatusCard({
  status,
  mainRiskLabel,
  subtitle,
}: {
  status: CockpitStatus
  mainRiskLabel: string
  subtitle: string
}) {
  return (
    <section className="rounded-[30px] border border-white/14 bg-[linear-gradient(180deg,#121925,#0d121b)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.34)] md:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/50">Статус карты</p>
        <span className={cn('inline-flex min-h-[32px] items-center rounded-full border px-3 text-[11px] font-semibold', STATUS_COPY[status].tone)}>
          {STATUS_COPY[status].label}
        </span>
      </div>

      <h1 className="mt-4 text-[38px] font-semibold leading-[0.93] tracking-[-0.03em] md:text-[54px]">
        Главный риск — <span className="text-primary">{mainRiskLabel}</span>
      </h1>
      <p className="mt-3 max-w-[56ch] text-[14px] leading-snug text-foreground/72 md:text-[15px]">{subtitle}</p>
    </section>
  )
}

export function EvidenceChips({
  country,
  daysToTrip,
  documentTruthState,
  source,
}: {
  country: CountryCode | null
  daysToTrip: number | null
  documentTruthState: DocumentTruthState
  source: CockpitSource
}) {
  const countryLabel = country ? COUNTRIES[country].label : 'не указана'
  const daysLabel = daysToTrip == null ? 'не указано' : `${daysToTrip} дней`
  const documentsLabel = documentTruthCopy(documentTruthState).chipLabel
  const sourceLabel = source === 'CASE_DATA' ? 'данные кейса' : 'ответы пользователя'
  return (
    <section aria-label="Факты, на которых основан вывод">
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <Chip>Страна: {countryLabel}</Chip>
        <Chip>До поездки: {daysLabel}</Chip>
        <Chip>Документы: {documentsLabel}</Chip>
        <Chip>Источник: {sourceLabel}</Chip>
      </div>
      <p className="mt-2 text-[11px] text-foreground/56 md:hidden">Прокрутите факты вправо, чтобы увидеть все основания.</p>
    </section>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-[44px] shrink-0 snap-start items-center rounded-2xl border border-white/12 bg-white/[0.03] px-3 py-2 text-[12px] leading-snug text-foreground/82">
      {children}
    </span>
  )
}

export function AiExplanationDrawer({
  open,
  onToggle,
  verdict,
  mainRiskLabel,
  documentTruthState,
}: {
  open: boolean
  onToggle: () => void
  verdict: VerdictKind
  mainRiskLabel: string
  documentTruthState: DocumentTruthState
}) {
  const id = useId()
  const panelId = `${id}-panel`
  const triggerId = `${id}-trigger`
  const documentsPoint = documentTruthCopy(documentTruthState).drawerPoint
  const thirdPoint =
    verdict === 'HUMAN_REVIEW'
      ? 'Следующий шаг: передать кейс эксперту.'
      : 'Следующий шаг: разобрать кейс с экспертом.'

  return (
    <section className="rounded-3xl border border-white/12 bg-[#0f141f]/70 p-4 md:p-5">
      <button
        id={triggerId}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left"
      >
        <span className="text-[14px] font-semibold text-foreground">Почему такой вывод</span>
        {open ? <ChevronUp className="h-4 w-4 text-foreground/70" /> : <ChevronDown className="h-4 w-4 text-foreground/70" />}
      </button>

      {open && (
        <ol
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="mt-3 space-y-2 text-[13px] leading-snug text-foreground/78"
        >
          <li>1. На риск сильнее всего влияют срок до поездки и фактор: {mainRiskLabel}.</li>
          <li>2. {documentsPoint}</li>
          <li>3. {thirdPoint}</li>
        </ol>
      )}
      <p className="mt-3 text-[11px] text-foreground/52">AI даёт объяснение и порядок действий, но не принимает решение за консульство.</p>
    </section>
  )
}

export function documentTruthDetail(state: DocumentTruthState): string {
  return documentTruthCopy(state).detail
}

export function ResultRecoveryCard({
  badgeLabel = 'Состояние недоступно',
  title = 'Не удалось открыть карту поездки',
  description = 'Данных недостаточно для честного вывода. Вернитесь к анкете и заполните ключевые поля поездки.',
}: {
  badgeLabel?: string
  title?: string
  description?: string
}) {
  return (
    <section className="rounded-3xl border border-white/14 bg-[#0f141f]/85 p-5 md:p-6">
      <div className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-orange-300/40 bg-orange-500/10 px-3 text-[12px] font-semibold text-orange-100">
        <AlertTriangle className="h-4 w-4" /> {badgeLabel}
      </div>
      <h1 className="mt-4 text-[32px] font-semibold leading-tight md:text-[42px]">{title}</h1>
      <p className="mt-2 text-[14px] leading-snug text-foreground/72">{description}</p>
    </section>
  )
}

export function SecondaryActionButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-[12px] text-foreground/75 transition-colors hover:border-white/25 hover:text-foreground"
    >
      <FilePlus2 className="h-4 w-4" />
      {children}
    </button>
  )
}
