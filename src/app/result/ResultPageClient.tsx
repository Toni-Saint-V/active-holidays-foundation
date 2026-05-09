'use client'

import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { AHInsight } from '@/components/AHInsight'
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
    action: 'Проверьте даты, бронь, билеты и выписку.',
  },
  {
    horizon: '24–48 ч',
    action: 'Зафиксируйте слот или резервный сценарий.',
  },
  {
    horizon: '48–72 ч',
    action: 'Соберите финальный пакет перед оплатой.',
  },
]

function compactText(value: string | undefined, fallback: string, max = 84) {
  const text = (value ?? fallback).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

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
  const router = useRouter()
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
  const riskyDocuments = countryEntry.documents.filter((doc) => doc.flag === 'risk')
  const primaryDocuments = countryEntry.documents.slice(0, 2)
  const hasBlur = Boolean(IMAGE_BLURS[country])
  const missingItems = useMemo(() => {
    const misses: string[] = []
    if (!departureDate) misses.push('Не указана дата вылета')
    if (!returnDate) misses.push('Не указана дата возвращения')
    if (!params.get('purpose')) misses.push('Не указана цель поездки')
    return misses
  }, [departureDate, params, returnDate])

  const humanReviewUrl = useMemo(() => {
    const qp = new URLSearchParams()
    qp.set('country', country)
    qp.set('verdict', verdict)
    if (departureDate) qp.set('departure', departureDate)
    if (returnDate) qp.set('return', returnDate)
    return `/human-review?${qp.toString()}`
  }, [country, departureDate, returnDate, verdict])
  const visibleTimeline = resultAi?.timeline ?? RESULT_FALLBACK_TIMELINE
  const visibleTripwire =
    resultAi?.tripwire ?? (daysToTrip <= 14 ? 'Если нет финального пакета сегодня — ведите к эксперту.' : 'Если слот или выписка не подтверждены — не двигайте кейс дальше.')
  const visibleContrarian =
    resultAi?.contrarian ?? 'Не добавляйте документы “для веса”: сначала уберите противоречие в датах и деньгах.'
  const isEscalationVerdict = verdict === 'NOT_NOW' || verdict === 'HUMAN_REVIEW'
  const primaryActionLabel =
    verdict === 'GO'
      ? 'Перейти к плану подготовки'
      : verdict === 'GO_WITH_CONDITIONS'
        ? 'Открыть план закрытия условий'
        : verdict === 'NOT_NOW'
          ? 'Передать эксперту срочно'
          : 'Запросить ручную проверку'
  const primaryActionHint =
    verdict === 'GO'
      ? 'Следующий шаг: пройти план на 72 часа и собрать финальный пакет.'
      : verdict === 'GO_WITH_CONDITIONS'
        ? 'Сначала закройте отмеченные условия и риски из плана ниже.'
        : verdict === 'NOT_NOW'
          ? 'Приоритет: сначала снять блокер по срокам и документам.'
          : 'Нужна ручная оценка сроков и рисков перед следующим шагом.'
  const primaryActionFooter =
    verdict === 'GO'
      ? 'Следующий шаг: выполните план на 72 часа и сверитесь со списком документов.'
      : verdict === 'GO_WITH_CONDITIONS'
        ? 'Следующий шаг: закройте условия по кейсу, затем повторно оцените подачу.'
        : 'Следующий шаг: эскалация к эксперту с текущими фактами кейса.'

  function handlePrimaryAction() {
    if (isEscalationVerdict) {
      router.push(humanReviewUrl)
      return
    }
    document.getElementById('result-action-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

        <section
          className={cn(
            'mt-5 rounded-2xl border p-4',
            isEscalationVerdict
              ? 'border-orange-300/35 bg-orange-500/[0.08]'
              : 'border-white/10 bg-white/[0.03]'
          )}
        >
          <div className="ah-eyebrow">Следующий шаг</div>
          <p className={cn('mt-1 text-[18px] font-semibold leading-tight', isEscalationVerdict ? 'text-orange-300' : 'text-foreground')}>
            {primaryActionLabel}
          </p>
          <p className="mt-2 text-[13px] leading-snug text-foreground/78">{primaryActionHint}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-foreground/80">
            <span className="rounded-full border border-white/12 px-2.5 py-1">До поездки: {daysToTrip} дн.</span>
            <span className="rounded-full border border-white/12 px-2.5 py-1">Окно: {countryEntry.optimalWindow}</span>
            <span className="rounded-full border border-white/12 px-2.5 py-1">
              Документы: {countryEntry.documents.length} · риск: {riskyDocuments.length}
            </span>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 border-y border-white/10 md:grid-cols-3">
          <section className="border-b border-white/10 py-4 md:border-b-0 md:border-r md:border-white/10 md:pr-5">
            <div className="ah-eyebrow">Окно подачи</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-2.5 w-2.5 rounded-full',
                  verdict === 'GO'
                    ? 'bg-ok'
                    : verdict === 'NOT_NOW'
                      ? 'bg-warn'
                      : verdict === 'HUMAN_REVIEW'
                        ? 'bg-foreground/70'
                        : 'bg-primary'
                )}
              />
              <p className="text-[15px] font-medium text-foreground/92">{countryEntry.optimalWindow}</p>
            </div>
          </section>

          <section className="border-b border-white/10 py-4 md:border-b-0 md:border-r md:border-white/10 md:px-5">
            <div className="ah-eyebrow">Документы</div>
            <p className="mt-2 text-[15px] font-medium text-foreground/92">
              {countryEntry.documents.length} пунктов · {riskyDocuments.length || 'без'} риск
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryDocuments.map((doc) => (
                <span key={doc.name} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-foreground/72">
                  {compactText(doc.name, doc.name, 42)}
                </span>
              ))}
            </div>
            <details className="mt-3 text-[12px] text-muted-foreground">
              <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-primary">Показать список</summary>
              <ul className="mt-1 space-y-1.5">
                {countryEntry.documents.map((doc) => (
                  <li key={doc.name} className={doc.flag === 'risk' ? 'text-primary' : 'text-foreground/78'}>
                    {doc.flag === 'risk' ? '⚠' : '✓'} {doc.name}
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section className="py-4 md:pl-5">
            <div className="ah-eyebrow">Главный риск</div>
            <p className="mt-2 text-[15px] font-medium leading-snug text-foreground/92">
              {compactText(countryEntry.topRisk, countryEntry.topRisk, 118)}
            </p>
          </section>
        </div>

        <div className="mt-6">
          <AHInsight>{VERDICT_INSIGHT[verdict]}</AHInsight>
        </div>

        <section id="result-action-plan" className="mt-6 border-y border-primary/20 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="ah-eyebrow">План на 72 часа</div>
              <p className="mt-1 max-w-[620px] text-[16px] font-semibold leading-snug text-primary">
                {compactText(resultAi?.title, 'Фокус на 72 часа', 72)}
              </p>
            </div>
            <p className="max-w-[360px] text-[12px] leading-snug text-foreground/72 md:text-right">
              {compactText(visibleTripwire, 'Если ключевой документ не подтверждён — ведём к эксперту.', 96)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {visibleTimeline.map((step) => (
              <div key={`${step.horizon}:${step.action}`} className="border-l border-white/10 pl-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-primary">{step.horizon}</div>
                <p className="mt-1 text-[11px] leading-snug text-foreground/78">
                  {compactText(step.action, 'Проверить ключевой риск.', 64)}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 max-w-[760px] text-[12px] leading-snug text-muted-foreground">
            {compactText(
              resultAiLoading && !resultAi ? `${visibleContrarian} Уточняем детали.` : visibleContrarian,
              'Не расширяйте пакет: сначала уберите противоречия в датах и документах.',
              128
            )}
          </p>
          <p className="mt-2 max-w-[760px] text-[11px] leading-snug text-muted-foreground">
            AI-подсказки помогают собрать пакет, но не гарантируют решение консульства.
          </p>
        </section>

        <div className="mt-8 space-y-3">
          <AmberCTA onClick={handlePrimaryAction}>{primaryActionLabel}</AmberCTA>
          <p className="text-[12px] text-muted-foreground">
            {primaryActionFooter}
          </p>
        </div>
      </article>
    </main>
  )
}
