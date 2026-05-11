'use client'

import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { AmberCTA } from '@/components/AmberCTA'
import { COUNTRIES } from '@/lib/countryData'
import {
  ENGINE_CLASS,
  type CountryCode,
  type VerdictKind,
} from '@/lib/constants'
import { deriveVerdict } from '@/lib/verdict'
import { IMAGE_BLURS } from '@/lib/imageBlurs'
import { cn } from '@/lib/utils'

const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
const VERDICT_TABS: VerdictKind[] = ['GO', 'GO_WITH_CONDITIONS', 'NOT_NOW', 'HUMAN_REVIEW']

const RESULT_CARDS = [
  {
    title: 'Главный риск',
    lines: ['Слот не подтверждён.', 'Пакет нельзя подавать.'],
    cta: 'Слоты',
  },
  {
    title: 'Что может сломаться',
    lines: ['Поздний слот ломает маршрут и бронь.'],
    cta: 'Слабые места',
  },
  {
    title: 'План на 24 дня',
    lines: ['Слот сначала. Потом финальная сверка.'],
    cta: 'План',
  },
] as const

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

function dayWord(value: number): string {
  const n = Math.abs(value) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return 'дней'
  if (n1 > 1 && n1 < 5) return 'дня'
  if (n1 === 1) return 'день'
  return 'дней'
}

export function ResultPageClient() {
  const params = useSearchParams()
  const router = useRouter()
  const [heroImageBroken, setHeroImageBroken] = useState(false)
  const [activeCard, setActiveCard] = useState(0)
  const carouselTrackRef = useRef<HTMLDivElement | null>(null)

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

  const badgeText =
    country === 'IT' && daysToTrip === 24
      ? '🇮🇹 Италия · 24 дня'
      : `${countryEntry.flag} ${countryEntry.label} · ${daysToTrip} ${dayWord(daysToTrip)}`

  const primaryActionLabel =
    verdict === 'NOT_NOW' || verdict === 'HUMAN_REVIEW'
      ? 'К эксперту'
      : 'Закрепить слот'

  useEffect(() => {
    const track = carouselTrackRef.current
    if (!track) return

    const syncActiveFromScroll = () => {
      const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-testid^="result-card-"]'))
      if (cards.length === 0) return

      const trackRect = track.getBoundingClientRect()
      const trackCenter = trackRect.left + trackRect.width / 2
      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(cardCenter - trackCenter)
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
        }
      })

      setActiveCard(bestIndex)
    }

    syncActiveFromScroll()
    track.addEventListener('scroll', syncActiveFromScroll, { passive: true })
    return () => track.removeEventListener('scroll', syncActiveFromScroll)
  }, [])

  function scrollToCard(index: number) {
    const track = carouselTrackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>(`[data-testid="result-card-${index}"]`)
    if (!card) return

    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setActiveCard(index)
  }

  function handlePrimaryAction() {
    const track = carouselTrackRef.current
    if (!track) return
    track.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main className="w-full p-0" data-ui-polish="result-v1">
      <article
        data-engine-class={ENGINE_CLASS}
        className="relative min-h-screen overflow-x-hidden bg-black/20 p-5 pb-28 pt-6 md:p-8"
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
            className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-20 blur-[1px]"
          />
        )}

        <header className="flex items-start justify-between gap-4">
          <Link
            href="/intake"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground/86 transition-colors hover:border-white/24 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Назад
          </Link>
          <div
            data-testid="result-header-badge"
            className="inline-flex min-h-[34px] items-center rounded-full border border-sky-300/35 bg-sky-400/10 px-3 py-1 text-[12px] font-medium tracking-[0.01em] text-sky-100"
          >
            {badgeText}
          </div>
        </header>

        <section data-testid="result-hero" className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-5">
          <AHEyebrow>Активные каникулы</AHEyebrow>
          <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.01em]">
            <span className="text-white">Подача</span>
            <span className="px-2 text-white/32">·</span>
            <span className="text-orange-300">Слот</span>
          </p>
          <p className="mt-2 max-w-[320px] text-[14px] leading-snug text-foreground/84">
            Без слота пакет нельзя вести дальше.
          </p>
        </section>

        <section data-testid="result-carousel" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] uppercase tracking-[0.14em] text-foreground/56">3 проверки</p>
          </div>

          <div data-testid="result-carousel-viewport" className="relative mt-3 overflow-hidden">
            <div
              ref={carouselTrackRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-1 pr-16 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {RESULT_CARDS.map((card, index) => {
                const isActive = index === activeCard
                return (
                  <article
                    key={card.title}
                    data-testid={`result-card-${index}`}
                    className={cn(
                      'w-[284px] shrink-0 snap-center rounded-3xl border px-4 py-4 transition-all duration-300',
                      isActive
                        ? 'border-white/24 bg-white/[0.06] shadow-[0_10px_26px_rgba(0,0,0,0.23)]'
                        : 'border-white/12 bg-white/[0.03]'
                    )}
                  >
                    <p className="text-[18px] font-semibold leading-tight text-white">{card.title}</p>
                    <div className="mt-3 space-y-2">
                      {card.lines.map((line) => (
                        <p key={line} className="text-[13px] leading-snug text-foreground/84">
                          {line}
                        </p>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-foreground/92 transition-colors hover:border-white/30"
                    >
                      {card.cta}
                    </button>
                  </article>
                )
              })}
            </div>
            <div
              data-testid="result-next-card-peek"
              className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/45 to-transparent"
              aria-hidden
            />
          </div>

          <div data-testid="result-carousel-dots" className="mt-3 flex items-center justify-center gap-2">
            {RESULT_CARDS.map((card, index) => {
              const active = index === activeCard
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => scrollToCard(index)}
                  aria-label={`Карточка ${index + 1}`}
                  aria-current={active}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border transition-all',
                    active
                      ? 'scale-110 border-orange-300 bg-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.35)]'
                      : 'border-white/25 bg-white/15 hover:border-white/40'
                  )}
                />
              )
            })}
          </div>
        </section>

        <div className="mt-7" data-testid="result-primary-cta-wrap">
          <AmberCTA onClick={handlePrimaryAction}>{primaryActionLabel}</AmberCTA>
          <p className="mt-2 text-[12px] text-foreground/64">Слот → сверка.</p>
        </div>
      </article>
    </main>
  )
}
