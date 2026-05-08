'use client'

import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { AHInsight } from '@/components/AHInsight'
import { AIQualityBadge } from '@/components/AIQualityBadge'
import { AmberCTA } from '@/components/AmberCTA'
import { BufferGauge } from '@/components/BufferGauge'
import { MockPreviewBadge } from '@/components/MockPreviewBadge'
import { RouteMap } from '@/components/RouteMap'
import { fetchResultAi } from '@/lib/aiSurfaceClient'
import type { ResultAiOutput } from '@/lib/aiSurfaceContracts'
import { COUNTRIES } from '@/lib/countryData'
import {
  ENGINE_CLASS,
  VERDICT_ACCENT,
  VERDICT_HEADLINE,
  VERDICT_INSIGHT,
  type CountryCode,
  type VerdictKind,
} from '@/lib/constants'
import { deriveVerdict } from '@/lib/verdict'
import { IMAGE_BLURS } from '@/lib/imageBlurs'
import { cn } from '@/lib/utils'

const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
const VERDICT_TABS: VerdictKind[] = ['GO', 'GO_WITH_CONDITIONS', 'NOT_NOW', 'HUMAN_REVIEW']
const RESULT_FALLBACK_TIMELINE = [
  {
    horizon: '0–24 ч',
    action: 'Соберите финальный список документов в одном порядке.',
  },
  {
    horizon: '24–48 ч',
    action: 'Проверьте целостность дат и подтверждений.',
  },
  {
    horizon: '48–72 ч',
    action: 'Зафиксируйте следующий шаг и не размазывайте фокус по новым задачам.',
  },
]

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

export function ResultPageClient() {
  const params = useSearchParams()
  const [heroImageBroken, setHeroImageBroken] = useState(false)
  const [resultAi, setResultAi] = useState<ResultAiOutput | null>(null)
  const [resultAiLoading, setResultAiLoading] = useState(false)

  const country = parseCountry(params.get('country'))
  const departureDate = params.get('departure')
  const returnDate = params.get('return')
  const explicitDays = parseDays(params.get('days'))
  const daysToTrip = departureDate ? daysFromDeparture(departureDate) : explicitDays

  const missingFields = useMemo(() => {
    return !departureDate || !returnDate || !params.get('purpose')
  }, [departureDate, params, returnDate])

  const forcedVerdict = params.get('verdict') as VerdictKind | null
  const derivedVerdict = deriveVerdict(daysToTrip, missingFields)
  const verdict = VERDICT_TABS.includes(forcedVerdict as VerdictKind)
    ? (forcedVerdict as VerdictKind)
    : derivedVerdict

  const countryEntry = COUNTRIES[country]
  const hasBlur = Boolean(IMAGE_BLURS[country])
  const missingItems = useMemo(() => {
    const misses: string[] = []
    if (!departureDate) misses.push('Не указана дата вылета')
    if (!returnDate) misses.push('Не указана дата возвращения')
    if (!params.get('purpose')) misses.push('Не указана цель поездки')
    return misses
  }, [departureDate, params, returnDate])

  const insuranceUrl = useMemo(() => {
    const qp = new URLSearchParams()
    qp.set('country', country)
    if (departureDate && returnDate) {
      qp.set('dates', `${departureDate}_${returnDate}`)
    }
    return `https://example.com/insurance?${qp.toString()}`
  }, [country, departureDate, returnDate])

  const humanReviewUrl = useMemo(() => {
    const qp = new URLSearchParams()
    qp.set('country', country)
    qp.set('verdict', verdict)
    if (departureDate) qp.set('departure', departureDate)
    if (returnDate) qp.set('return', returnDate)
    return `/human-review?${qp.toString()}`
  }, [country, departureDate, returnDate, verdict])

  useEffect(() => {
    let cancelled = false
    setResultAiLoading(true)
    fetchResultAi({
      country,
      verdict,
      daysToTrip,
      departureDate: departureDate ?? undefined,
      returnDate: returnDate ?? undefined,
      topRisk: countryEntry.topRisk,
      missingItems,
    })
      .then((data) => {
        if (!cancelled) setResultAi(data)
      })
      .catch(() => {
        if (!cancelled) setResultAi(null)
      })
      .finally(() => {
        if (!cancelled) setResultAiLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [country, verdict, daysToTrip, departureDate, returnDate, countryEntry.topRisk, missingItems])

  return (
    <main className="w-full p-0">
      <article
        data-engine-class={ENGINE_CLASS}
        className="relative min-h-screen overflow-hidden bg-black/20 p-5 pb-32 pt-6 md:p-8 md:pb-32"
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
            className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-25 blur-[1px]"
          />
        )}

        <header className="flex items-center justify-between gap-4">
          <Link
            href="/intake"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/85 transition-colors hover:border-white/20 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Назад
          </Link>
          <MockPreviewBadge />
        </header>

        <div className="mt-6">
          <AHEyebrow>
            Вердикт · {countryEntry.label} · {daysToTrip} дней до поездки
          </AHEyebrow>
        </div>

        <RouteMap verdict={verdict} className="mt-3 mb-2" />

        <h1
          className={cn(
            'max-w-[860px] text-[56px] font-bold leading-[0.94] tracking-[-0.03em] md:text-[68px]',
            VERDICT_ACCENT[verdict]
          )}
        >
          {VERDICT_HEADLINE[verdict]}
        </h1>

        <div className="mt-8">
          <BufferGauge days={daysToTrip} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <section className="ah-card-base rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="ah-eyebrow">Окно подачи</div>
            <p className="mt-2 text-[14px] text-foreground/90">{countryEntry.optimalWindow}</p>
            <span
              className={cn(
                'mt-3 inline-flex h-2.5 w-2.5 rounded-full',
                verdict === 'GO'
                  ? 'bg-ok'
                  : verdict === 'NOT_NOW'
                    ? 'bg-warn'
                    : verdict === 'HUMAN_REVIEW'
                      ? 'bg-foreground/70'
                      : 'bg-primary'
              )}
            />
          </section>

          <section className="ah-card-base rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="ah-eyebrow">Документы</div>
            <ul className="mt-2 space-y-2 text-[13px]">
              {countryEntry.documents.map((doc) => (
                <li key={doc.name} className={doc.flag === 'risk' ? 'text-primary' : 'text-ok'}>
                  <span className="mr-2">{doc.flag === 'risk' ? '⚠' : '✓'}</span>
                  <span className="text-foreground/88">{doc.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="ah-card-base rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="ah-eyebrow">Главный риск</div>
            <p className="mt-2 text-[13px] leading-snug text-foreground/85">{countryEntry.topRisk}</p>
          </section>
        </div>

        <div className="mt-6">
          <AHInsight>{VERDICT_INSIGHT[verdict]}</AHInsight>
        </div>

        <section className="mt-6 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-4">
          <div className="ah-eyebrow">AI СЛОЙ</div>
          <p className="mt-1 text-[16px] font-semibold text-primary">
            {resultAi?.title ?? 'AI План атаки 72 часа'}
          </p>

          {resultAiLoading ? (
            <p className="mt-2 text-[13px] text-foreground/70">Собираем сценарный план по вашему вердикту…</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {(resultAi?.timeline ?? RESULT_FALLBACK_TIMELINE).map((step) => (
                  <div key={`${step.horizon}:${step.action}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-primary">{step.horizon}</div>
                    <p className="mt-1 text-[12px] leading-snug text-foreground/85">{step.action}</p>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-foreground/88">Контринсайт: {resultAi?.contrarian ?? 'Уточняем стратегию...'}</p>
              <p className="text-[13px] text-orange-300">Триггер риска: {resultAi?.tripwire ?? 'Уточняем триггер...'}</p>
              <AIQualityBadge quality={resultAi?.quality} />
            </div>
          )}
        </section>

        <div className="mt-8 space-y-3">
          <AmberCTA onClick={() => window.open(insuranceUrl, '_blank', 'noopener,noreferrer')}>
            Оформить страховку
          </AmberCTA>
          <Link
            href={humanReviewUrl}
            className="inline-flex min-h-[44px] items-center text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Передать эксперту →
          </Link>
        </div>
      </article>
    </main>
  )
}
