'use client'

import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, CircleAlert, ClipboardCheck, FileWarning } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AmberCTA } from '@/components/AmberCTA'
import { apiClient } from '@/lib/apiClient'
import { COUNTRIES } from '@/lib/countryData'
import { ENGINE_CLASS, VERDICT_HEADLINE } from '@/lib/constants'
import { IMAGE_BLURS } from '@/lib/imageBlurs'
import { resolveResultTruth, type ResultTruthReady, type ResultTruthResolution } from '@/lib/resultTruth'
import { cn } from '@/lib/utils'

type ResultCard = {
  id: string
  label: string
  title: string
  body: string
  cta: string
  detail: string[]
  icon: React.ReactNode
}

function buildVerifiedCards(): ResultCard[] {
  return [
    {
      id: 'risk',
      label: '1/3 Главный риск',
      title: 'Главный риск',
      body: 'Проверьте блокирующие факторы перед следующим шагом.',
      cta: 'Передать кейс эксперту',
      detail: [
        'Риск и действие берутся из серверного кейса, не из URL.',
        'При сомнении маршрут уходит на ручную проверку без фейкового GO.',
      ],
      icon: <CircleAlert className="h-5 w-5" />,
    },
    {
      id: 'confirmed',
      label: '2/3 Что подтверждено',
      title: 'Что подтверждено',
      body: 'Проверка основана на детерминированном ResultPayload от сервера.',
      cta: 'Показать детали',
      detail: [
        'Вердикт определяет движок, AI только объясняет.',
        'Уровень готовности — это projection поверх canonical payload.',
      ],
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      id: 'plan',
      label: '3/3 Следующий шаг',
      title: 'Следующий шаг',
      body: 'Для нестандартного кейса лучше закрепить решение с экспертом.',
      cta: 'Открыть экспертный маршрут',
      detail: [
        'Путь и приоритет берутся из `nextAction` сервера.',
        'Никакие query params не могут подменить это решение.',
      ],
      icon: <CalendarDays className="h-5 w-5" />,
    },
  ]
}

function buildPreliminaryCards(): ResultCard[] {
  return [
    {
      id: 'risk',
      label: '1/3 Главный риск',
      title: 'Главный риск',
      body: 'Часть данных не подтверждена, поэтому кейс считается предварительным.',
      cta: 'Передать кейс эксперту',
      detail: [
        'Нужны дополнительные факты или ручная проверка.',
        'Система не рисует «verified», если сервер это не подтвердил.',
      ],
      icon: <CircleAlert className="h-5 w-5" />,
    },
    {
      id: 'missing-evidence',
      label: '2/3 Что не подтверждено',
      title: 'Что не подтверждено',
      body: 'Данные или источники пока недостаточны для подтверждённого статуса.',
      cta: 'Открыть ручную проверку',
      detail: [
        'Нет фейковой верификации документов через URL.',
        'Нужен безопасный переход через серверный workflow.',
      ],
      icon: <FileWarning className="h-5 w-5" />,
    },
    {
      id: 'next-step',
      label: '3/3 Следующий шаг',
      title: 'Следующий шаг',
      body: 'Продолжайте только по серверному действию, а не по параметрам ссылки.',
      cta: 'Показать следующий шаг',
      detail: [
        'Результат всегда привязан к caseId.',
        'При ошибке данных экран честно предлагает вернуться в анкету.',
      ],
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
  ]
}

function readinessLabel(state: ResultTruthReady['readiness']['state']): string {
  switch (state) {
    case 'ready':
      return 'готово'
    case 'almost_ready':
      return 'почти готово'
    case 'not_ready_fixable':
      return 'нужно исправить'
    case 'not_ready_blocked':
      return 'есть блокер'
    case 'needs_human_review':
      return 'нужна ручная проверка'
    case 'insufficient_data':
      return 'недостаточно данных'
  }
}

function confidenceBandLabel(band: ResultTruthReady['confidenceBand']): string {
  switch (band) {
    case 'high':
      return 'высокая'
    case 'medium':
      return 'средняя'
    case 'low':
      return 'низкая'
  }
}

function LoadingState() {
  return (
    <main className="w-full p-0">
      <article className="relative flex min-h-screen flex-col overflow-hidden bg-[#070806] p-5 pt-7 text-foreground md:p-8">
        <div className="mt-16 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/52">Загрузка кейса</div>
        <h1 className="mt-3 max-w-[420px] text-[44px] font-semibold leading-[0.95] tracking-[-0.03em] md:text-[64px]">
          Проверяем серверный
          <br />
          ResultPayload
        </h1>
        <p className="mt-4 max-w-[460px] text-[15px] leading-snug text-foreground/70">
          URL-параметры не используются как источник истины. Загружаем решение по caseId.
        </p>
      </article>
    </main>
  )
}

function RecoveryState({ resolution }: { resolution: Extract<ResultTruthResolution, { status: 'recovery' }> }) {
  const router = useRouter()

  return (
    <main className="w-full p-0">
      <article className="relative flex min-h-screen flex-col overflow-hidden bg-[#070806] p-5 pt-7 text-foreground md:p-8">
        <header className="flex min-h-[36px] items-center justify-between gap-4">
          <Link
            href="/intake"
            aria-label="Вернуться к анкете"
            className="inline-flex min-h-[44px] items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/62 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> ACTIVE HOLIDAY
          </Link>
        </header>

        <section className="mt-12 md:mx-auto md:w-full md:max-w-[720px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/48">
            Честное восстановление
          </div>
          <h1 className="mt-3 max-w-[460px] text-[40px] font-semibold leading-[0.96] tracking-[-0.03em] md:text-[58px]">
            Результат недоступен
            <br />
            без кейса
          </h1>
          <p className="mt-4 max-w-[520px] text-[15px] leading-snug text-foreground/72">{resolution.message}</p>
          <p className="mt-2 text-[12px] text-foreground/52">Код: {resolution.code}</p>
        </section>

        <section className="mt-auto pt-6 md:mx-auto md:w-full md:max-w-[720px]">
          <AmberCTA onClick={() => router.push('/intake')}>Вернуться к анкете</AmberCTA>
        </section>
      </article>
    </main>
  )
}

export function ResultPageClient() {
  const params = useSearchParams()
  const router = useRouter()
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const [heroImageBroken, setHeroImageBroken] = useState(false)
  const [activeCard, setActiveCard] = useState(0)
  const [expandedCard, setExpandedCard] = useState<string>('risk')
  const [resolution, setResolution] = useState<ResultTruthResolution | null>(null)
  const [loading, setLoading] = useState(true)

  const paramsSnapshot = params.toString()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setResolution(null)

    void resolveResultTruth({
      searchParams: new URLSearchParams(paramsSnapshot),
      getCase: apiClient.getCase,
      getResult: apiClient.getResult,
    }).then((nextResolution) => {
      if (cancelled) return
      setResolution(nextResolution)
      setLoading(false)
      setActiveCard(0)
      setExpandedCard('risk')
    })

    return () => {
      cancelled = true
    }
  }, [paramsSnapshot])

  if (loading || !resolution) {
    return <LoadingState />
  }

  if (resolution.status === 'recovery') {
    return <RecoveryState resolution={resolution} />
  }

  const truth = resolution
  const countryEntry = COUNTRIES[truth.country]
  const hasBlur = Boolean(IMAGE_BLURS[truth.country])
  const cards = truth.resultType === 'verified' ? buildVerifiedCards() : buildPreliminaryCards()
  const isVerified = truth.resultType === 'verified'
  const readinessPercent = Math.max(0, Math.min(100, Math.round(truth.result.documents.score * 100)))

  const humanReviewUrl = useMemo(() => {
    const qp = new URLSearchParams()
    qp.set('caseId', truth.caseId)
    return `/human-review?${qp.toString()}`
  }, [truth.caseId])

  const frameTitle = isVerified ? 'Серверный результат подтверждён' : 'Предварительный серверный результат'
  const trustLine = isVerified
    ? 'Документы подтверждены детерминированной проверкой кейса.'
    : 'Результат предварительный: часть данных не подтверждена.'
  const caseSubtitle = truth.readiness.state === 'needs_human_review'
    ? 'Автомат не может безопасно закрыть этот кейс без эксперта.'
    : `Вердикт движка: ${VERDICT_HEADLINE[truth.result.verdict]}. Следуйте серверному next action.`
  const confidenceLabel = `уверенность движка: ${truth.confidencePercent}% (${confidenceBandLabel(truth.confidenceBand)})`
  const readinessCaption = `статус: ${readinessLabel(truth.readiness.state)}`

  function scrollToCard(index: number) {
    setActiveCard(index)
    setExpandedCard(cards[index]?.id ?? 'risk')
    const container = carouselRef.current
    if (!container) return
    const card = container.children[index] as HTMLElement | undefined
    if (!card) return
    container.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
  }

  function syncActiveCard() {
    const container = carouselRef.current
    if (!container) return
    const cardsCount = cards.length
    const width = container.clientWidth - 46 + 12
    const nextIndex = Math.min(cardsCount - 1, Math.max(0, Math.round(container.scrollLeft / width)))
    if (nextIndex !== activeCard) {
      setActiveCard(nextIndex)
      setExpandedCard(cards[nextIndex]?.id ?? expandedCard)
    }
  }

  function handleCardAction(card: ResultCard, index: number) {
    if (activeCard !== index) {
      scrollToCard(index)
      return
    }

    if (card.id === 'risk' || card.id === 'plan' || card.id === 'next-step' || card.id === 'missing-evidence') {
      router.push(humanReviewUrl)
      return
    }

    setExpandedCard((current) => (current === card.id ? '' : card.id))
  }

  return (
    <main className="w-full p-0">
      <article
        data-engine-class={ENGINE_CLASS}
        className="relative flex min-h-screen flex-col overflow-hidden bg-[#070806] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-7 text-foreground md:min-h-screen md:p-8"
      >
        {!heroImageBroken && (
          <Image
            src={countryEntry.heroImage}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            placeholder={hasBlur ? 'blur' : 'empty'}
            blurDataURL={hasBlur ? IMAGE_BLURS[truth.country] : undefined}
            onError={() => setHeroImageBroken(true)}
            className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-[0.18] saturate-[0.85]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,8,6,0.18),#070806_74%),linear-gradient(145deg,rgba(242,163,58,0.11),transparent_34%)]" />

        <header className="flex min-h-[36px] items-center justify-between gap-4">
          <Link
            href="/intake"
            aria-label="Вернуться к анкете"
            className="inline-flex min-h-[44px] items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/62 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> ACTIVE HOLIDAY
          </Link>
          <div className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[12px] font-semibold text-foreground/72">
            {countryEntry.label} · {truth.daysToTrip} дня
          </div>
        </header>

        <section className="mt-10 md:mx-auto md:w-full md:max-w-[720px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/48">{frameTitle}</div>
          <h1 className="mt-3 max-w-[360px] text-[48px] font-semibold leading-[0.94] tracking-[-0.035em] md:max-w-[620px] md:text-[66px]">
            <span className="text-primary">{VERDICT_HEADLINE[truth.result.verdict]}</span>
          </h1>
          <p className="mt-4 max-w-[360px] text-[15px] leading-snug text-foreground/68 md:max-w-[560px] md:text-[17px]">
            {caseSubtitle}
          </p>

          <div className="mt-5 flex items-center justify-between gap-4 border-y border-white/10 py-3">
            <div>
              <div className={cn('text-[13px] font-semibold', isVerified ? 'text-ok' : 'text-primary')}>
                {trustLine}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{confidenceLabel}</div>
            </div>
            <div className="text-right">
              <div className="text-[34px] font-semibold leading-none tracking-[-0.05em]">{readinessPercent}%</div>
              <div className="mt-1 text-[10px] leading-tight text-muted-foreground">{readinessCaption}</div>
            </div>
          </div>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
              <span>3 проверки заявки</span>
              <span>{cards[activeCard]?.label}</span>
            </div>

            <div
              ref={carouselRef}
              onScroll={syncActiveCard}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Карусель проверок заявки"
            >
              {cards.map((card, index) => {
                const selected = activeCard === index
                const expanded = expandedCard === card.id
                return (
                  <article
                    key={card.id}
                    className={cn(
                      'min-h-[292px] min-w-[calc(100%-46px)] snap-start overflow-hidden rounded-[28px] border bg-[#12130f]/92 p-4 shadow-[0_22px_54px_rgba(0,0,0,0.28)] transition-colors',
                      selected ? 'border-white/16' : 'border-white/8'
                    )}
                  >
                    {!selected ? (
                      <button
                        type="button"
                        onClick={() => scrollToCard(index)}
                        className="flex h-full min-h-[260px] w-full items-center justify-start"
                        aria-label={card.label}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.045] text-foreground/50">
                          {card.icon}
                        </span>
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-foreground/48">
                            <span className={cn('grid h-8 w-8 place-items-center rounded-2xl', card.id === 'risk' ? 'bg-primary/12 text-primary' : 'bg-white/[0.045] text-foreground/58')}>
                              {card.icon}
                            </span>
                            {card.label}
                          </div>
                          {card.id === 'risk' && (
                            <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary">
                              контроль
                            </span>
                          )}
                        </div>

                        <h2 className="mt-5 max-w-[260px] text-[25px] font-semibold leading-none tracking-[-0.025em]">
                          {card.title}
                        </h2>
                        <p className="mt-3 max-w-[270px] text-[14px] leading-snug text-foreground/70">
                          {card.body}
                        </p>

                        <div
                          className={cn(
                            'mt-4 border-t border-white/10 pt-3 text-[12px] leading-snug text-foreground/56',
                            !expanded && 'line-clamp-2'
                          )}
                        >
                          {card.detail.map((detail) => (
                            <p key={detail} className="mt-1 first:mt-0">
                              {detail}
                            </p>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCardAction(card, index)}
                          className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-primary/12 px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/18"
                        >
                          {card.cta}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </article>
                )
              })}
            </div>

            <div className="mt-4 flex justify-center gap-2" aria-label="Навигация по проверкам">
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => scrollToCard(index)}
                  aria-label={card.label}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    activeCard === index ? 'w-7 bg-primary' : 'w-2 bg-white/22'
                  )}
                />
              ))}
            </div>
          </section>
        </section>

        <section className="mt-auto pt-6 md:mx-auto md:w-full md:max-w-[720px]">
          <AmberCTA onClick={() => router.push(humanReviewUrl)}>
            {truth.result.nextAction.label}
          </AmberCTA>
          <p className="mt-3 text-center text-[11px] leading-snug text-foreground/48">
            Источник: серверный ResultPayload · {truth.provenance.evidenceStatus} · {truth.provenance.freshnessStatus}
          </p>
        </section>
      </article>
    </main>
  )
}
