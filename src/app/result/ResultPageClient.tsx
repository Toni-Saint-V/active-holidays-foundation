'use client'

import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { AmberCTA } from '@/components/AmberCTA'
import {
  AiExplanationDrawer,
  type CockpitStatus,
  EvidenceChips,
  PremiumStatusCard,
  ResultCockpitHeader,
  ResultRecoveryCard,
  SecondaryActionButton,
} from '@/components/ResultCockpit'
import { COUNTRIES } from '@/lib/countryData'
import { ENGINE_CLASS, type CountryCode, type VerdictKind } from '@/lib/constants'
import { IMAGE_BLURS } from '@/lib/imageBlurs'
import { deriveVerdict } from '@/lib/verdict'

const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
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

function statusFromState(verdict: VerdictKind, documentsUploaded: boolean): CockpitStatus {
  if (verdict === 'HUMAN_REVIEW') return 'EXPERT_REQUIRED'
  if (!documentsUploaded) return 'DOCS_REVIEW_REQUIRED'
  return 'PRELIMINARY'
}

function statusSubtitle(status: CockpitStatus): string {
  if (status === 'EXPERT_REQUIRED') {
    return 'Кейс нестандартный или сжат по срокам. Нужен экспертный разбор перед следующим действием.'
  }
  if (status === 'DOCS_REVIEW_REQUIRED') {
    return 'Пока это предварительная карта: документы не загружены, поэтому часть рисков не подтверждена.'
  }
  return 'Карта собрана по текущим ответам пользователя и не заменяет решение консульства.'
}

export function ResultPageClient() {
  const params = useSearchParams()
  const router = useRouter()
  const resultUploadRef = useRef<HTMLInputElement | null>(null)
  const [heroImageBroken, setHeroImageBroken] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [documentSelectedLocally, setDocumentSelectedLocally] = useState(false)

  const country = parseCountry(params.get('country'))
  const departureDate = params.get('departure')
  const returnDate = params.get('return')
  const purpose = params.get('purpose')
  const explicitDays = parseDays(params.get('days'))
  const daysToTrip = departureDate ? daysFromDeparture(departureDate) : explicitDays
  const countryEntry = COUNTRIES[country]
  const hasBlur = Boolean(IMAGE_BLURS[country])
  // Until Stream 1 case-bound upload contracts are wired, docs verification truth stays server-owned.
  const documentsUploaded = false
  const documentsAddedByUser = documentSelectedLocally

  const missingCriticalFields = useMemo(() => {
    return !departureDate || !returnDate || !purpose
  }, [departureDate, purpose, returnDate])

  const derivedVerdict = deriveVerdict(daysToTrip, missingCriticalFields)
  const verdict = derivedVerdict
  // Until Stream 1 case payload binding is wired, /result stays explicitly preliminary.
  const sourceLabel = 'ответы пользователя'
  const mapType = 'Предварительная карта'

  const hasContext = useMemo(() => {
    return [
      params.get('country'),
      params.get('departure'),
      params.get('return'),
      params.get('purpose'),
      params.get('days'),
    ].some((value) => Boolean(value))
  }, [params])

  const hasBaseTravelContext = Boolean(
    params.get('country') && params.get('departure') && params.get('return')
  )
  const hasMinimalTravelContext = hasBaseTravelContext
  const needsRecovery = !hasContext || !hasMinimalTravelContext

  const status = statusFromState(verdict, documentsUploaded)
  const mainCtaLabel = verdict === 'HUMAN_REVIEW' ? 'Передать эксперту' : 'Разобрать с экспертом'

  const humanReviewUrl = useMemo(() => {
    const qp = new URLSearchParams()
    qp.set('country', country)
    qp.set('verdict', verdict)
    qp.set('resultType', 'preliminary')
    if (departureDate) qp.set('departure', departureDate)
    if (returnDate) qp.set('return', returnDate)
    return `/human-review?${qp.toString()}`
  }, [country, departureDate, returnDate, verdict])

  function handleResultDocumentPicked(file: File | undefined) {
    if (!file) return
    setDocumentSelectedLocally(true)
  }

  return (
    <main className="w-full p-0">
      <article
        data-engine-class={ENGINE_CLASS}
        className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#070806] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-6 text-foreground md:p-8"
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
            className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-[0.16] saturate-[0.86]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,8,6,0.24),#070806_72%),linear-gradient(145deg,rgba(242,163,58,0.12),transparent_36%)]" />

        <header className="mb-6 flex min-h-[44px] items-center justify-between gap-4">
          <Link
            href="/intake"
            aria-label="Вернуться к анкете"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/72 transition-colors hover:border-white/24 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> ACTIVE HOLIDAY
          </Link>
        </header>

        <input
          ref={resultUploadRef}
          type="file"
          className="sr-only"
          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
          onChange={(event) => handleResultDocumentPicked(event.target.files?.[0])}
        />

        {needsRecovery ? (
          <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col">
            <ResultRecoveryCard />
            <div className="mt-auto pt-6">
              <AmberCTA onClick={() => router.push('/intake')}>Вернуться к анкете</AmberCTA>
            </div>
          </section>
        ) : (
          <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-4 pb-28 md:pb-0">
            <ResultCockpitHeader country={country} daysToTrip={daysToTrip} mapType={mapType} />

            <PremiumStatusCard status={status} subtitle={statusSubtitle(status)} />

            <EvidenceChips
              country={country}
              daysToTrip={daysToTrip}
              documentsUploaded={documentsAddedByUser}
              source={sourceLabel}
            />

            <div className="flex flex-wrap gap-2">
              <SecondaryActionButton onClick={() => resultUploadRef.current?.click()}>
                {documentsAddedByUser ? 'Выбрать другой документ' : 'Добавить документы'}
              </SecondaryActionButton>
              <button
                type="button"
                onClick={() => router.push('/intake')}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-white/12 px-3 py-2 text-[12px] text-foreground/70 transition-colors hover:border-white/24 hover:text-foreground"
              >
                Вернуться к анкете
              </button>
            </div>
            <p aria-live="polite" className="text-[11px] text-foreground/58">
              {documentsAddedByUser
                ? 'Файл выбран локально. Проверка документов появится после подтверждения в системе.'
                : 'Документы ещё не подтверждены системой.'}
            </p>

            <AiExplanationDrawer
              open={drawerOpen}
              onToggle={() => setDrawerOpen((current) => !current)}
              verdict={verdict}
              documentsUploaded={documentsAddedByUser}
            />

            <section className="fixed inset-x-5 bottom-[calc(8px+env(safe-area-inset-bottom))] z-20 border-t border-white/10 bg-[#070806]/95 pt-2 md:static md:inset-auto md:z-auto md:mt-auto md:border-t-0 md:bg-transparent md:pt-0">
              <div className="md:max-w-[760px]">
                <AmberCTA onClick={() => router.push(humanReviewUrl)}>{mainCtaLabel}</AmberCTA>
              </div>
            </section>
          </section>
        )}
      </article>
    </main>
  )
}
