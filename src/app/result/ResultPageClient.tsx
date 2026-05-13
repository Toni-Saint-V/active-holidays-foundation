'use client'

import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AmberCTA } from '@/components/AmberCTA'
import {
  AiExplanationDrawer,
  type CockpitMapType,
  type CockpitSource,
  documentTruthDetail,
  type DocumentTruthState,
  type CockpitStatus,
  EvidenceChips,
  PremiumStatusCard,
  ResultCockpitHeader,
  ResultRecoveryCard,
  SecondaryActionButton,
} from '@/components/ResultCockpit'
import { apiClient, ApiError } from '@/lib/apiClient'
import { COUNTRIES } from '@/lib/countryData'
import { ENGINE_CLASS, type CountryCode, type VerdictKind } from '@/lib/constants'
import { IMAGE_BLURS } from '@/lib/imageBlurs'
import type { Case, ResultPayload, SignalId } from '@shared/contracts'

const DESTINATION_SIGNAL_ID: SignalId = 'destination'
const TIMELINE_WEEKS_SIGNAL_ID: SignalId = 'timeline_weeks'

function parseCountry(value: string | null): CountryCode | null {
  if (!value) return null
  const upper = value.toUpperCase() as CountryCode
  return upper in COUNTRIES ? upper : null
}

function parseTimelineWeeks(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value)) return null
  const weeks = Math.round(value)
  if (weeks < 0) return null
  return weeks
}

function daysFromWeeks(weeks: number | null): number | null {
  if (weeks == null) return null
  if (!Number.isFinite(weeks)) return null
  return Math.max(0, Math.round(weeks * 7))
}

function countryFromCase(caseData: Case | null): CountryCode | null {
  if (!caseData) return null
  const destinationSignal = caseData.signals.find((signal) => signal.id === DESTINATION_SIGNAL_ID)
  if (!destinationSignal || typeof destinationSignal.value !== 'string') return null
  return parseCountry(destinationSignal.value)
}

function timelineWeeksFromCase(caseData: Case | null): number | null {
  if (!caseData) return null
  const timelineSignal = caseData.signals.find((signal) => signal.id === TIMELINE_WEEKS_SIGNAL_ID)
  return parseTimelineWeeks(timelineSignal?.value)
}

function getDocumentTruthState(documentsConfirmedBySystem: boolean, documentsSelectedLocally: boolean): DocumentTruthState {
  if (documentsConfirmedBySystem) {
    return 'SYSTEM_CONFIRMED'
  }
  if (documentsSelectedLocally) {
    return 'LOCAL_PENDING'
  }
  return 'UNCONFIRMED'
}

function useResultCaseBinding(caseId: string) {
  const [resultPayload, setResultPayload] = useState<ResultPayload | null>(null)
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [resultLoading, setResultLoading] = useState(Boolean(caseId))
  const [hasFetched, setHasFetched] = useState(false)
  const [resultError, setResultError] = useState<string | null>(null)
  const [caseDataWarning, setCaseDataWarning] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!caseId) {
      setResultPayload(null)
      setCaseData(null)
      setResultError(null)
      setCaseDataWarning(null)
      setResultLoading(false)
      setHasFetched(false)
      return
    }

    setResultLoading(true)
    setHasFetched(false)
    setResultError(null)
    setCaseDataWarning(null)

    void Promise.allSettled([apiClient.getResult(caseId), apiClient.getCase(caseId)])
      .then(([resultResponse, caseResponse]) => {
        if (cancelled) return
        if (resultResponse.status === 'fulfilled') {
          setResultPayload(resultResponse.value)
        } else {
          setResultPayload(null)
          const reason = resultResponse.reason
          if (reason instanceof ApiError) {
            setResultError(reason.message)
          } else {
            setResultError('Не удалось получить данные кейса.')
          }
        }

        if (caseResponse.status === 'fulfilled') {
          setCaseData(caseResponse.value)
        } else {
          setCaseData(null)
          setCaseDataWarning('Часть фактов по кейсу недоступна. Карта показывает только подтверждённый результат.')
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setResultPayload(null)
        setCaseData(null)
        setCaseDataWarning(null)
        setResultError(error instanceof ApiError ? error.message : 'Не удалось получить данные кейса.')
      })
      .finally(() => {
        if (cancelled) return
        setResultLoading(false)
        setHasFetched(true)
      })

    return () => {
      cancelled = true
    }
  }, [caseId])

  return { resultPayload, caseData, resultLoading, hasFetched, resultError, caseDataWarning }
}

function statusFromState(verdict: VerdictKind, documentsUploaded: boolean): CockpitStatus {
  if (verdict === 'HUMAN_REVIEW') return 'EXPERT_REQUIRED'
  if (!documentsUploaded) return 'DOCS_REVIEW_REQUIRED'
  return 'PRELIMINARY'
}

function assertNever(value: never): never {
  throw new Error(`Unhandled cockpit status: ${String(value)}`)
}

function statusSubtitle(status: CockpitStatus, source: CockpitSource): string {
  switch (status) {
    case 'EXPERT_REQUIRED':
      return 'Кейс нестандартный или сжат по срокам. Нужен экспертный разбор перед следующим действием.'
    case 'DOCS_REVIEW_REQUIRED':
      return 'Пока это предварительная карта: документы не загружены, поэтому часть рисков не подтверждена.'
    case 'PRELIMINARY':
      if (source === 'CASE_DATA') {
        return 'Карта собрана по данным кейса, но не заменяет решение консульства.'
      }
      return 'Карта собрана по текущим ответам пользователя и не заменяет решение консульства.'
    default:
      return assertNever(status)
  }
}

export function ResultPageClient() {
  const params = useSearchParams()
  const router = useRouter()
  const resultUploadRef = useRef<HTMLInputElement | null>(null)
  const [heroImageBroken, setHeroImageBroken] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [documentSelectedLocally, setDocumentSelectedLocally] = useState(false)

  const caseId = params.get('caseId')?.trim() ?? ''
  const { resultPayload, caseData, resultLoading, hasFetched, resultError, caseDataWarning } = useResultCaseBinding(caseId)

  useEffect(() => {
    setDocumentSelectedLocally(false)
    if (resultUploadRef.current) {
      resultUploadRef.current.value = ''
    }
  }, [caseId])

  const resolvedVerdict: VerdictKind = resultPayload?.verdict ?? 'HUMAN_REVIEW'
  const country = useMemo(() => {
    return countryFromCase(caseData)
  }, [caseData])
  const daysToTrip = useMemo(() => {
    const weeks = timelineWeeksFromCase(caseData)
    return daysFromWeeks(weeks)
  }, [caseData])
  const hasBlur = Boolean(country && IMAGE_BLURS[country])
  const countryEntry = country ? COUNTRIES[country] : null
  const documentsBackedBySystem = Boolean(
    resultPayload &&
      resultPayload.documents.readyCount >= resultPayload.documents.requiredCount
  )
  const documentsAddedByUser = documentSelectedLocally
  const documentTruthState = getDocumentTruthState(documentsBackedBySystem, documentsAddedByUser)
  const sourceLabel: CockpitSource = 'CASE_DATA'
  const mapType: CockpitMapType = 'CASE_BOUND'
  const mainRiskLabel =
    resultPayload?.criticalRisk?.label ?? (resolvedVerdict === 'HUMAN_REVIEW' ? 'нужна экспертная проверка' : 'часть данных не подтверждена')

  const hasCaseBoundTruth = Boolean(resultPayload)
  const needsRecovery = !caseId || (hasFetched && !resultLoading && !hasCaseBoundTruth)
  const status = hasCaseBoundTruth ? statusFromState(resolvedVerdict, documentsBackedBySystem) : 'DOCS_REVIEW_REQUIRED'
  const mainCtaLabel = resolvedVerdict === 'HUMAN_REVIEW' ? 'Передать эксперту' : 'Разобрать с экспертом'

  const humanReviewUrl = useMemo(() => {
    if (!hasCaseBoundTruth) return '/human-review'
    const qp = new URLSearchParams()
    qp.set('verdict', resolvedVerdict)
    qp.set('resultType', 'case')
    if (caseId) qp.set('caseId', caseId)
    return `/human-review?${qp.toString()}`
  }, [caseId, hasCaseBoundTruth, resolvedVerdict])

  function handleResultDocumentPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setDocumentSelectedLocally(true)
    event.target.value = ''
  }

  return (
    <main className="w-full p-0">
      <article
        data-engine-class={ENGINE_CLASS}
        className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#070806] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-6 text-foreground md:p-8"
      >
        {!heroImageBroken && (
          <Image
            src={countryEntry?.heroImage ?? COUNTRIES.IT.heroImage}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            placeholder={hasBlur ? 'blur' : 'empty'}
            blurDataURL={hasBlur && country ? IMAGE_BLURS[country] : undefined}
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
          onChange={handleResultDocumentPicked}
        />

        {resultLoading ? (
          <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col">
            <ResultRecoveryCard
              badgeLabel="Загрузка карты"
              title="Открываем карту кейса"
              description="Получаем подтверждённые данные. Если загрузка затянулась, вернитесь к анкете и проверьте caseId."
            />
            <div className="mt-auto pt-6">
              <AmberCTA onClick={() => router.push('/intake')}>Вернуться к анкете</AmberCTA>
            </div>
          </section>
        ) : needsRecovery ? (
          <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col">
            <ResultRecoveryCard
              title="Не удалось открыть карту поездки"
              description={
                resultError ??
                'Данных недостаточно для честного вывода. Вернитесь к анкете и заполните ключевые поля поездки.'
              }
            />
            <div className="mt-auto pt-6">
              <AmberCTA onClick={() => router.push('/intake')}>Вернуться к анкете</AmberCTA>
            </div>
          </section>
        ) : (
          <section
            className={`mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-4 ${
              drawerOpen ? 'pb-[calc(236px+env(safe-area-inset-bottom))]' : 'pb-[calc(128px+env(safe-area-inset-bottom))]'
            } md:pb-0`}
          >
            <ResultCockpitHeader country={country} daysToTrip={daysToTrip} mapType={mapType} />

            <PremiumStatusCard status={status} mainRiskLabel={mainRiskLabel} subtitle={statusSubtitle(status, sourceLabel)} />

            <EvidenceChips
              country={country}
              daysToTrip={daysToTrip}
              documentTruthState={documentTruthState}
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
              {documentTruthDetail(documentTruthState)}
            </p>
            {caseDataWarning ? <p className="text-[11px] text-foreground/58">{caseDataWarning}</p> : null}

            <AiExplanationDrawer
              open={drawerOpen}
              onToggle={() => setDrawerOpen((current) => !current)}
              verdict={resolvedVerdict}
              mainRiskLabel={mainRiskLabel}
              documentTruthState={documentTruthState}
            />

            <section
              className={`${
                drawerOpen
                  ? 'mt-2 border-t border-white/10 bg-[#070806]/95 pt-2'
                  : 'fixed inset-x-5 bottom-[calc(8px+env(safe-area-inset-bottom))] z-20 border-t border-white/10 bg-[#070806]/95 pt-2'
              } md:static md:inset-auto md:z-auto md:mt-auto md:border-t-0 md:bg-transparent md:pt-0`}
            >
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
