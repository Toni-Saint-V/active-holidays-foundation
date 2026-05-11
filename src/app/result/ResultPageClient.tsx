'use client'

import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, CircleAlert, ClipboardCheck, FileWarning } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { AmberCTA } from '@/components/AmberCTA'
import { COUNTRIES } from '@/lib/countryData'
import { ENGINE_CLASS, type CountryCode, type VerdictKind } from '@/lib/constants'
import { IMAGE_BLURS } from '@/lib/imageBlurs'
import { cn } from '@/lib/utils'
import { deriveVerdict } from '@/lib/verdict'

type ResultType = 'preliminary' | 'verified'
type AnalysisConfidence = 'medium' | 'high'
type ResultCard = {
  id: string
  label: string
  title: string
  body: string
  cta: string
  detail: string[]
  icon: React.ReactNode
}

const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
const VERDICT_TABS: VerdictKind[] = ['GO', 'GO_WITH_CONDITIONS', 'NOT_NOW', 'HUMAN_REVIEW']

function parseCountry(value: string | null): CountryCode {
  if (!value) return 'IT'
  const upper = value.toUpperCase() as CountryCode
  return VALID_COUNTRIES.includes(upper) ? upper : 'IT'
}

function parseDays(value: string | null): number {
  if (!value) return 24
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 24
  return Math.max(0, Math.round(parsed))
}

function daysFromDeparture(value: string | null): number {
  if (!value) return 24
  const departure = new Date(`${value}T00:00:00`)
  if (Number.isNaN(departure.getTime())) return 24
  const diff = departure.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function parseResultType(value: string | null, documentsUploaded: boolean): ResultType {
  if (value === 'verified') return 'verified'
  if (value === 'preliminary') return 'preliminary'
  return documentsUploaded ? 'verified' : 'preliminary'
}

function buildVerifiedCards(): ResultCard[] {
  return [
    {
      id: 'risk',
      label: '1/3 Главный риск',
      title: 'Главный риск',
      body: 'Нет подтверждённого слота. Без него пакет нельзя считать готовым к подаче.',
      cta: 'Проверить варианты слота',
      detail: [
        'Ближайшее окно: 11–14 июня',
        'Если слот появится позже 11 июня, маршрут и бронь могут устареть.',
      ],
      icon: <CircleAlert className="h-5 w-5" />,
    },
    {
      id: 'confirmed',
      label: '2/3 Что подтверждено',
      title: 'Что подтверждено',
      body: 'AI сверил загруженные данные и не нашёл главный блокер в документах.',
      cta: 'Показать подтверждения',
      detail: [
        'Проверено: даты поездки, маршрут, страховка',
        'Финансовые подтверждения и базовые паспортные данные сверены.',
      ],
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      id: 'plan',
      label: '3/3 План на 24 дня',
      title: 'План на 24 дня',
      body: 'Сначала закрепить слот. Потом AI пересоберёт финальный порядок подачи.',
      cta: 'Открыть план',
      detail: [
        'Сегодня — проверить окна записи',
        'До 11 июня — закрепить слот. За 3 дня — контрольная проверка.',
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
      body: 'Нет подтверждённого слота. Без него пакет нельзя считать готовым к подаче.',
      cta: 'Проверить варианты слота',
      detail: [
        'Ближайшее окно: 11–14 июня',
        'Если слот появится позже 11 июня, маршрут и бронь могут устареть.',
      ],
      icon: <CircleAlert className="h-5 w-5" />,
    },
    {
      id: 'missing-evidence',
      label: '2/3 Что AI не видел',
      title: 'Что AI не видел',
      body: 'Документы ещё не загружены, поэтому часть вывода предварительная.',
      cta: 'Добавить документы',
      detail: [
        'AI сможет сверить паспорт, бронь, страховку',
        'Также проверит финансы, маршрут и актуальность дат.',
      ],
      icon: <FileWarning className="h-5 w-5" />,
    },
    {
      id: 'next-step',
      label: '3/3 Следующий шаг',
      title: 'Следующий шаг',
      body: 'Можно продолжить с предварительным результатом или уточнить карту по документам.',
      cta: 'Показать план',
      detail: [
        'Сегодня — проверить окна записи',
        'До 11 июня — закрепить слот. После слота — финальная сверка пакета.',
      ],
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
  ]
}

export function ResultPageClient() {
  const params = useSearchParams()
  const router = useRouter()
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const resultUploadRef = useRef<HTMLInputElement | null>(null)
  const [heroImageBroken, setHeroImageBroken] = useState(false)
  const [activeCard, setActiveCard] = useState(0)
  const [expandedCard, setExpandedCard] = useState<string>('risk')
  const [resultUploadVerifying, setResultUploadVerifying] = useState(false)

  const country = parseCountry(params.get('country'))
  const departureDate = params.get('departure')
  const returnDate = params.get('return')
  const explicitDays = parseDays(params.get('days'))
  const daysToTrip = departureDate ? daysFromDeparture(departureDate) : explicitDays
  const countryEntry = COUNTRIES[country]
  const hasBlur = Boolean(IMAGE_BLURS[country])
  const documentsUploaded = params.get('documentsUploaded') === 'true'
  const resultType = parseResultType(params.get('resultType'), documentsUploaded)
  const analysisConfidence: AnalysisConfidence = resultType === 'verified' ? 'high' : 'medium'

  const missingFields = useMemo(() => {
    return !departureDate || !returnDate || !params.get('purpose')
  }, [departureDate, params, returnDate])
  const forcedVerdict = params.get('verdict') as VerdictKind | null
  const derivedVerdict = deriveVerdict(daysToTrip, missingFields)
  const verdict = VERDICT_TABS.includes(forcedVerdict as VerdictKind)
    ? (forcedVerdict as VerdictKind)
    : derivedVerdict

  const cards = useMemo(
    () => (resultType === 'verified' ? buildVerifiedCards() : buildPreliminaryCards()),
    [resultType]
  )

  const humanReviewUrl = useMemo(() => {
    const qp = new URLSearchParams()
    qp.set('country', country)
    qp.set('verdict', verdict)
    qp.set('resultType', resultType)
    qp.set('analysisConfidence', analysisConfidence)
    if (departureDate) qp.set('departure', departureDate)
    if (returnDate) qp.set('return', returnDate)
    return `/human-review?${qp.toString()}`
  }, [analysisConfidence, country, departureDate, resultType, returnDate, verdict])

  const isVerified = resultType === 'verified'
  const frameTitle = isVerified ? 'Карта готовности уточнена' : 'Предварительная карта готовности'
  const trustLine = isVerified
    ? 'AI сверил ответы с документами.'
    : 'Профиль собран по вашим ответам. Документы ещё не проверены.'
  const caseSubtitle = isVerified
    ? 'Пакет почти готов, но без слота его нельзя вести дальше.'
    : 'Пакет выглядит почти готовым по вашим ответам, но документы ещё не проверены.'
  const confidenceLabel = isVerified ? 'точность: высокая' : 'точность: средняя'
  const readinessCaption = isVerified ? 'готовность пакета' : 'по ответам пользователя'

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
    if (card.id === 'missing-evidence') {
      resultUploadRef.current?.click()
      return
    }
    if (activeCard !== index) {
      scrollToCard(index)
      return
    }
    if (card.id === 'risk' || card.id === 'plan' || card.id === 'next-step') {
      router.push(humanReviewUrl)
      return
    }
    setExpandedCard((current) => (current === card.id ? '' : card.id))
  }

  function handleResultDocumentPicked(file: File | undefined) {
    if (!file) return
    setResultUploadVerifying(true)
    window.setTimeout(() => {
      const qp = new URLSearchParams(params.toString())
      qp.set('documentsUploaded', 'true')
      qp.set('documentsSaveConsent', 'false')
      qp.set('resultType', 'verified')
      qp.set('analysisConfidence', 'high')
      router.replace(`/result?${qp.toString()}`)
    }, 900)
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
            blurDataURL={hasBlur ? IMAGE_BLURS[country] : undefined}
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
            {countryEntry.label} · {daysToTrip} дня
          </div>
        </header>

        <section className="mt-10 md:mx-auto md:w-full md:max-w-[720px]">
          <input
            ref={resultUploadRef}
            type="file"
            className="sr-only"
            accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
            onChange={(event) => handleResultDocumentPicked(event.target.files?.[0])}
          />
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/48">
            {frameTitle}
          </div>
          <h1 className="mt-3 max-w-[360px] text-[48px] font-semibold leading-[0.94] tracking-[-0.035em] md:max-w-[620px] md:text-[66px]">
            <span className="text-primary">Слот</span> мешает <span className="text-foreground">подаче</span>
          </h1>
          <p className="mt-4 max-w-[360px] text-[15px] leading-snug text-foreground/68 md:max-w-[560px] md:text-[17px]">
            {caseSubtitle}
          </p>

          <div className="mt-5 flex items-center justify-between gap-4 border-y border-white/10 py-3">
            <div>
              <div className={cn('text-[13px] font-semibold', isVerified ? 'text-ok' : 'text-primary')}>
                {resultUploadVerifying ? 'AI сверяет пакет.' : trustLine}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {resultUploadVerifying ? 'переходим к уточнённой карте' : confidenceLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[34px] font-semibold leading-none tracking-[-0.05em]">86%</div>
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
                              блокер
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
            {isVerified ? 'Открыть экспертный план' : 'Показать план'}
          </AmberCTA>
          <p className="mt-3 text-center text-[11px] leading-snug text-foreground/48">
            AI показывает риски и порядок действий, но не обещает решение консульства.
          </p>
        </section>
      </article>
    </main>
  )
}
