'use client'

import { AlertTriangle, ChevronDown, ChevronUp, FilePlus2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode, VerdictKind } from '@/lib/constants'
import { cn } from '@/lib/utils'

export type CockpitStatus = 'PRELIMINARY' | 'DOCS_REVIEW_REQUIRED' | 'EXPERT_REQUIRED'

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

export function ResultCockpitHeader({
  country,
  daysToTrip,
  mapType,
}: {
  country: CountryCode
  daysToTrip: number
  mapType: 'Предварительная карта' | 'Карта по данным кейса'
}) {
  return (
    <section className="rounded-3xl border border-white/12 bg-[#0f141f]/80 p-4 backdrop-blur-sm md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">Карта решения</p>
      <div className="mt-3 grid grid-cols-1 gap-2 text-[13px] text-foreground/82 md:grid-cols-3 md:gap-3">
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          {COUNTRIES[country].flag} {COUNTRIES[country].label}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">До поездки: {daysToTrip} дней</p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">{mapType}</p>
      </div>
      <p className="mt-3 text-[12px] leading-snug text-foreground/65">
        AI объясняет риски. Решение принимает консульство.
      </p>
    </section>
  )
}

export function PremiumStatusCard({
  status,
  subtitle,
}: {
  status: CockpitStatus
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
        Главный риск — <span className="text-primary">слот</span>
      </h1>
      <p className="mt-3 max-w-[56ch] text-[14px] leading-snug text-foreground/72 md:text-[15px]">{subtitle}</p>
    </section>
  )
}

export function EvidenceChips({
  country,
  daysToTrip,
  documentsUploaded,
  source,
}: {
  country: CountryCode
  daysToTrip: number
  documentsUploaded: boolean
  source: 'ответы пользователя' | 'данные кейса'
}) {
  return (
    <section aria-label="Факты, на которых основан вывод">
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <Chip>Страна: {COUNTRIES[country].label}</Chip>
        <Chip>До поездки: {daysToTrip} дней</Chip>
        <Chip>
          Документы: {documentsUploaded ? 'документы добавлены пользователем' : 'не загружены'}
        </Chip>
        <Chip>Источник: {source}</Chip>
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
  documentsUploaded,
}: {
  open: boolean
  onToggle: () => void
  verdict: VerdictKind
  documentsUploaded: boolean
}) {
  const id = useId()
  const panelId = `${id}-panel`
  const triggerId = `${id}-trigger`
  const secondPoint = documentsUploaded
    ? 'Документы добавлены пользователем, но финальная верификация консульством не подтверждена.'
    : 'Документы не загружены, поэтому вывод остаётся предварительным.'

  const thirdPoint =
    verdict === 'HUMAN_REVIEW'
      ? 'Следующий шаг: передать кейс эксперту и уточнить рабочий план подачи.'
      : 'Следующий шаг: разобрать кейс с экспертом и зафиксировать ближайший слот.'

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
          <li>1. На риск сильнее всего влияют срок до поездки и доступность слота подачи.</li>
          <li>2. {secondPoint}</li>
          <li>3. {thirdPoint}</li>
        </ol>
      )}
      <p className="mt-3 text-[11px] text-foreground/52">AI даёт объяснение и порядок действий, но не принимает решение за консульство.</p>
    </section>
  )
}

export function ResultRecoveryCard() {
  return (
    <section className="rounded-3xl border border-white/14 bg-[#0f141f]/85 p-5 md:p-6">
      <div className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-orange-300/40 bg-orange-500/10 px-3 text-[12px] font-semibold text-orange-100">
        <AlertTriangle className="h-4 w-4" /> Состояние недоступно
      </div>
      <h1 className="mt-4 text-[32px] font-semibold leading-tight md:text-[42px]">Не удалось открыть карту поездки</h1>
      <p className="mt-2 text-[14px] leading-snug text-foreground/72">Данных недостаточно для честного вывода. Вернитесь к анкете и заполните ключевые поля поездки.</p>
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
