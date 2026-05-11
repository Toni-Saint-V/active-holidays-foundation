'use client'

import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, MapPin, Maximize2, Minimize2, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { StepRail } from '@/components/StepRail'
import { fetchIntakeAi } from '@/lib/aiSurfaceClient'
import type { IntakeAiOutput } from '@/lib/aiSurfaceContracts'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode } from '@/lib/constants'

type Purpose = 'Туризм' | 'По работе' | 'К родственникам' | 'Спорт/событие'

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
  msExitFullscreen?: () => Promise<void> | void
  msFullscreenElement?: Element | null
}

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

const PURPOSE_OPTIONS: Purpose[] = ['Туризм', 'По работе', 'К родственникам', 'Спорт/событие']
const COUNTRY_ORDER: CountryCode[] = ['IT', 'ES', 'FR', 'GR']

const STEP_META: Record<1 | 2 | 3 | 4, { title: string; subtitle: string; hint: string }> = {
  1: {
    title: 'Куда едете?',
    subtitle: 'Выберите страну подачи',
    hint: 'Покажем окно подачи и главный риск именно для этой страны.',
  },
  2: {
    title: 'Когда поездка?',
    subtitle: 'Укажите даты маршрута',
    hint: 'По датам проверяем срочность и окно записи.',
  },
  3: {
    title: 'Цель поездки',
    subtitle: 'Выберите основной сценарий',
    hint: 'Цель влияет на набор документов и аргументацию.',
  },
  4: {
    title: 'Были отказы?',
    subtitle: 'Коротко про историю подачи',
    hint: 'Нужна честная вводная, чтобы не пропустить критичный риск.',
  },
}

function LabeledField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="group relative block">
      {children}
      <span className="pointer-events-none absolute left-4 top-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-primary">
        {label}
      </span>
    </label>
  )
}

function daysToTripFromDate(date: string) {
  if (!date) return 0
  const now = new Date()
  const departure = new Date(`${date}T00:00:00`)
  const ms = departure.getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
}

function isDateRangeValid(departureDate: string, returnDate: string) {
  if (!departureDate || !returnDate) return false
  return new Date(`${returnDate}T00:00:00`).getTime() >= new Date(`${departureDate}T00:00:00`).getTime()
}

function formatDateLabel(dateIso: string): string {
  if (!dateIso) return 'не выбрано'
  const date = new Date(`${dateIso}T00:00:00`)
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

export function IntakePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const prefilledCountry = (searchParams.get('country') as CountryCode | null) ?? null

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [country, setCountry] = useState<CountryCode | null>(
    prefilledCountry && COUNTRY_ORDER.includes(prefilledCountry) ? prefilledCountry : null
  )
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [hadRefusal, setHadRefusal] = useState<boolean | null>(null)
  const [refusalContext, setRefusalContext] = useState('')
  const [intakeAi, setIntakeAi] = useState<IntakeAiOutput | null>(null)
  const [intakeAiLoading, setIntakeAiLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [logoPulseActive, setLogoPulseActive] = useState(false)

  const daysToTrip = useMemo(() => daysToTripFromDate(departureDate), [departureDate])
  const dateRangeValid = useMemo(
    () => isDateRangeValid(departureDate, returnDate),
    [departureDate, returnDate]
  )
  const dateRangeError =
    departureDate && returnDate && !dateRangeValid
      ? 'Дата возвращения не может быть раньше даты вылета.'
      : ''

  const stepMeta = STEP_META[step]
  const activeHero = country ? COUNTRIES[country].heroImage : '/photos/plane.webp'

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(country)
    if (step === 2) return dateRangeValid
    if (step === 3) return Boolean(purpose)
    if (step === 4) {
      if (hadRefusal === null) return false
      if (hadRefusal) return refusalContext.trim().length > 0
      return true
    }
    return false
  }, [country, dateRangeValid, hadRefusal, purpose, refusalContext, step])

  useEffect(() => {
    function getFullscreenElement() {
      const fullscreenDocument = document as FullscreenDocument
      return (
        document.fullscreenElement ??
        fullscreenDocument.webkitFullscreenElement ??
        fullscreenDocument.msFullscreenElement ??
        null
      )
    }

    function syncFullscreenState() {
      setIsFullscreen(Boolean(getFullscreenElement()))
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)
    document.addEventListener('msfullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
      document.removeEventListener('msfullscreenchange', syncFullscreenState)
    }
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      setLogoPulseActive(false)
      return
    }

    const intervalId = window.setInterval(() => {
      setLogoPulseActive(true)
      window.setTimeout(() => setLogoPulseActive(false), 1400)
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isFullscreen])

  function applyDatePreset(startInDays: number, durationDays: number) {
    const departure = addDaysIso(startInDays)
    const comeBack = addDaysIso(startInDays + durationDays)
    setDepartureDate(departure)
    setReturnDate(comeBack)
  }

  function goNext() {
    if (!canProceed) return
    if (step < 4) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)
      return
    }

    const params = new URLSearchParams()
    if (country) params.set('country', country)
    if (departureDate) params.set('departure', departureDate)
    if (returnDate) params.set('return', returnDate)
    if (purpose) params.set('purpose', purpose)
    params.set('hadRefusal', String(Boolean(hadRefusal)))
    if (refusalContext.trim()) params.set('refusalContext', refusalContext.trim())
    router.push(`/calculating?${params.toString()}`)
  }

  function goBack() {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)
      return
    }
    router.push('/')
  }

  async function generateRefusalDraft() {
    if (!refusalContext.trim()) return
    setIntakeAiLoading(true)
    try {
      const data = await fetchIntakeAi({
        country,
        purpose: purpose ?? undefined,
        refusalContext: refusalContext.trim(),
      })
      setIntakeAi(data)
    } catch {
      setIntakeAi(null)
    } finally {
      setIntakeAiLoading(false)
    }
  }

  async function toggleImmersiveMode() {
    const fullscreenDocument = document as FullscreenDocument
    const fullscreenRoot = document.documentElement as FullscreenRoot
    const fullscreenElement =
      document.fullscreenElement ??
      fullscreenDocument.webkitFullscreenElement ??
      fullscreenDocument.msFullscreenElement ??
      null

    if (!fullscreenElement) {
      const requestFullscreen =
        fullscreenRoot.requestFullscreen ??
        fullscreenRoot.webkitRequestFullscreen ??
        fullscreenRoot.msRequestFullscreen

      if (requestFullscreen) {
        try {
          await requestFullscreen.call(fullscreenRoot)
          return
        } catch {
          // Fall through to scroll fallback.
        }
      }
    } else {
      const exitFullscreen =
        document.exitFullscreen ??
        fullscreenDocument.webkitExitFullscreen ??
        fullscreenDocument.msExitFullscreen

      if (exitFullscreen) {
        try {
          await exitFullscreen.call(document)
          return
        } catch {
          // Fall through to scroll fallback.
        }
      }
    }

    // iOS Safari may not support fullscreen for regular pages.
    window.scrollTo({ top: 1, behavior: 'smooth' })
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020712] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[43svh] bg-cover bg-center opacity-[0.52]"
        style={{ backgroundImage: `url(${activeHero})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020712]/45 via-[#020712]/82 to-[#020712]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.2]" />

      <section className="relative z-10 flex min-h-screen flex-col px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-6 md:mx-auto md:max-w-[460px] md:px-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative grid h-[31px] w-[31px] shrink-0 place-items-center">
              <span
                aria-hidden
                className={`absolute inset-[-5px] rounded-full bg-primary/35 blur-[10px] transition-all duration-700 ${
                  logoPulseActive ? 'scale-125 opacity-90' : 'scale-100 opacity-0'
                }`}
              />
              <span
                className={`relative grid h-[31px] w-[31px] place-items-center rounded-full border border-primary/35 bg-primary/10 text-[20px] font-bold leading-none tracking-[-0.03em] text-primary transition-all duration-700 ${
                  logoPulseActive ? 'scale-110 shadow-[0_0_18px_rgba(247,163,77,0.45)]' : 'scale-100'
                }`}
              >
                A
              </span>
            </div>
            <p className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.2em] text-white/65">
              ACTIVE HOLIDAY · ДЛЯ ГРАЖДАН РФ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleImmersiveMode()}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/85"
              aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Войти в полноэкранный режим'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFullscreen ? 'Экран' : 'Фокус'}
            </button>
            <div className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80">
              Шаг {step}/4
            </div>
          </div>
        </div>

        <h1 className="mt-3 text-[31px] font-semibold leading-[0.98] tracking-[-0.02em] text-white">
          Можно ли вам
          <br />
          подаваться
          <br />
          на <span className="text-primary">шенген</span>
        </h1>

        <p className="mt-2.5 max-w-[340px] text-[13px] leading-[1.32] text-white/70">
          Пройдите 4 коротких вопроса. На выходе: вердикт, главный риск и следующий шаг.
        </p>

        <section className="mt-4 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,18,33,0.78),rgba(10,14,24,0.88))] p-4 shadow-[0_22px_54px_rgba(0,0,0,0.38)] backdrop-blur">
          <StepRail current={step} />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <AHEyebrow>ВОПРОС {step}</AHEyebrow>
              <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-white">
                {stepMeta.title}
              </h2>
              <p className="mt-1 text-[13px] text-white/65">{stepMeta.subtitle}</p>
            </div>
            <div className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-white/65">
              ~45 сек
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-snug text-white/75">{stepMeta.hint}</p>

          <div className="mt-4">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {COUNTRY_ORDER.map((countryCode) => {
                  const item = COUNTRIES[countryCode]
                  const selected = countryCode === country
                  return (
                    <button
                      key={countryCode}
                      type="button"
                      onClick={() => setCountry(countryCode)}
                      className={`ah-card-base min-h-[88px] rounded-2xl border px-3 py-3 text-left transition-all ${
                        selected
                          ? 'border-primary/55 bg-primary/[0.14] shadow-[0_10px_28px_rgba(247,163,77,0.15)]'
                          : 'border-white/15 bg-white/[0.03]'
                      }`}
                    >
                      <div className="text-[22px]">{item.flag}</div>
                      <div className="mt-1 text-[14px] font-medium text-white/92">{item.label}</div>
                    </button>
                  )
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3.5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyDatePreset(21, 8)}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/82"
                  >
                    Через 3 недели · 8 дней
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDatePreset(35, 12)}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/82"
                  >
                    Через 5 недель · 12 дней
                  </button>
                </div>

                <LabeledField label="ДАТА ВЫЛЕТА">
                  <input
                    type="date"
                    value={departureDate}
                    min={todayIso()}
                    onChange={(event) => {
                      const nextDeparture = event.target.value
                      setDepartureDate(nextDeparture)
                      if (returnDate && nextDeparture && !isDateRangeValid(nextDeparture, returnDate)) {
                        setReturnDate(nextDeparture)
                      }
                    }}
                    className="h-16 min-h-[44px] w-full rounded-2xl border border-white/15 bg-white/[0.03] px-4 pb-2 pt-7 text-[15px] text-white outline-none transition-colors hover:border-white/25 focus:border-primary/70"
                  />
                </LabeledField>
                <LabeledField label="ДАТА ВОЗВРАЩЕНИЯ">
                  <input
                    type="date"
                    value={returnDate}
                    min={departureDate || todayIso()}
                    onChange={(event) => setReturnDate(event.target.value)}
                    className="h-16 min-h-[44px] w-full rounded-2xl border border-white/15 bg-white/[0.03] px-4 pb-2 pt-7 text-[15px] text-white outline-none transition-colors hover:border-white/25 focus:border-primary/70"
                  />
                </LabeledField>
                {dateRangeError && <p className="text-[13px] text-destructive">{dateRangeError}</p>}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white/84">
                  <CalendarDays className="h-4 w-4 text-primary" /> До поездки: {daysToTrip} дней
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-3">
                {PURPOSE_OPTIONS.map((option) => {
                  const selected = option === purpose
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPurpose(option)}
                      className={`ah-card-base min-h-[54px] rounded-2xl border px-4 py-3.5 text-left text-sm transition-all ${
                        selected
                          ? 'border-primary/55 bg-primary/[0.14] text-primary'
                          : 'border-white/15 bg-white/[0.03] text-white/88'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHadRefusal(false)}
                    className={`min-h-[48px] rounded-2xl border px-4 py-3 text-sm transition-all ${
                      hadRefusal === false
                        ? 'border-primary/55 bg-primary/[0.14] text-primary'
                        : 'border-white/15 bg-white/[0.03] text-white/88'
                    }`}
                  >
                    Нет
                  </button>
                  <button
                    type="button"
                    onClick={() => setHadRefusal(true)}
                    className={`min-h-[48px] rounded-2xl border px-4 py-3 text-sm transition-all ${
                      hadRefusal === true
                        ? 'border-primary/55 bg-primary/[0.14] text-primary'
                        : 'border-white/15 bg-white/[0.03] text-white/88'
                    }`}
                  >
                    Да
                  </button>
                </div>

                {hadRefusal && (
                  <>
                    <LabeledField label="КОНТЕКСТ ОТКАЗА">
                      <textarea
                        value={refusalContext}
                        onChange={(event) => setRefusalContext(event.target.value)}
                        className="min-h-[132px] w-full rounded-2xl border border-white/15 bg-white/[0.03] px-4 pb-4 pt-8 text-[14px] text-white outline-none transition-colors hover:border-white/25 focus:border-primary/70"
                        placeholder="Например: отказ из-за слабого финансового подтверждения"
                      />
                    </LabeledField>

                    <button
                      type="button"
                      onClick={() => void generateRefusalDraft()}
                      disabled={intakeAiLoading || refusalContext.trim().length < 6}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-primary/35 bg-primary/[0.14] px-3 py-2 text-[12px] text-primary transition-colors hover:border-primary/55 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Sparkles className="h-4 w-4" />
                      {intakeAiLoading ? 'AI собирает формулировку…' : 'AI: усилить формулировку'}
                    </button>

                    {intakeAi && (
                      <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-4">
                        <div className="ah-eyebrow">AI-редактор</div>
                        <p className="mt-1 text-[15px] font-semibold text-primary">{intakeAi.title}</p>
                        <p className="mt-2 text-[13px] leading-snug text-white/90">{intakeAi.rewrite}</p>
                        <button
                          type="button"
                          onClick={() => setRefusalContext(intakeAi.rewrite)}
                          className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-3 py-2 text-[12px] text-white/88 transition-colors hover:border-white/30"
                        >
                          Вставить в поле
                        </button>
                        <ul className="mt-3 space-y-2 text-[12px] text-white/80">
                          {intakeAi.proofPoints.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[12px] text-muted-foreground">{intakeAi.riskAngle}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="mt-auto pt-3">
          <div className="mb-2 grid grid-cols-2 gap-2 text-[12px] text-white/80">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {country ? COUNTRIES[country].label : 'Страна'}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> {formatDateLabel(departureDate)}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> {formatDateLabel(returnDate)}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5">
              <CircleAlert className="h-3.5 w-3.5 text-primary" /> {purpose ?? 'Цель поездки'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-[#0a0f1e]/80 p-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white/88 transition-all hover:border-white/25"
              >
                <ChevronLeft className="h-4 w-4" /> Назад
              </button>
              <button
                type="button"
                data-testid="intake-primary-cta"
                onClick={goNext}
                disabled={!canProceed}
                className="ah-amber-cta flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step < 4 ? 'Далее' : 'Показать вердикт'} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="mt-3 text-[12px] text-white/54">
            Результат строится на введённых данных и подсвечивает риски без гарантий решения консульства.
          </p>
        </div>
      </section>
    </main>
  )
}
