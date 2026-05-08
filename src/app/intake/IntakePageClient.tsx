'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { StepRail } from '@/components/StepRail'
import { fetchIntakeAi } from '@/lib/aiSurfaceClient'
import type { IntakeAiOutput } from '@/lib/aiSurfaceContracts'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode } from '@/lib/constants'

type Purpose = 'Туризм' | 'По работе' | 'К родственникам' | 'Спорт/событие'

const PURPOSE_OPTIONS: Purpose[] = ['Туризм', 'По работе', 'К родственникам', 'Спорт/событие']
const COUNTRY_ORDER: CountryCode[] = ['IT', 'ES', 'FR', 'GR']

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

  const daysToTrip = useMemo(() => daysToTripFromDate(departureDate), [departureDate])

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(country)
    if (step === 2) return Boolean(departureDate && returnDate)
    if (step === 3) return Boolean(purpose)
    if (step === 4) {
      if (hadRefusal === null) return false
      if (hadRefusal) return refusalContext.trim().length > 0
      return true
    }
    return false
  }, [country, departureDate, hadRefusal, purpose, refusalContext, returnDate, step])

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
    router.push(`/result?${params.toString()}`)
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-10 pt-6 md:px-8">
      <section className="flex min-h-full flex-1 flex-col rounded-4xl border border-white/10 bg-black/20 p-5 md:p-8">
        <StepRail current={step} />

        <div className="mt-8">
          <AHEyebrow>ВОПРОС {step}</AHEyebrow>
          <h2 className="mt-3 text-[28px] font-semibold tracking-tight">
            {step === 1 && 'Куда планируете поездку?'}
            {step === 2 && 'Укажите даты поездки'}
            {step === 3 && 'Какая цель поездки?'}
            {step === 4 && 'Были ли предыдущие отказы?'}
          </h2>
        </div>

        <div className="mt-8 flex-1">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {COUNTRY_ORDER.map((countryCode) => {
                const item = COUNTRIES[countryCode]
                const selected = countryCode === country
                return (
                  <button
                    key={countryCode}
                    type="button"
                    onClick={() => setCountry(countryCode)}
                    className={`min-h-[44px] rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 focus-visible:border-primary/60'
                    }`}
                  >
                    <div className="text-xl">{item.flag}</div>
                    <div className="mt-2 text-sm text-foreground/90">{item.label}</div>
                  </button>
                )
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <LabeledField label="ДАТА ВЫЛЕТА">
                <input
                  type="date"
                  value={departureDate}
                  onChange={(event) => setDepartureDate(event.target.value)}
                  className="h-16 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-2 pt-7 text-[15px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
                />
              </LabeledField>
              <LabeledField label="ДАТА ВОЗВРАЩЕНИЯ">
                <input
                  type="date"
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                  className="h-16 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-2 pt-7 text-[15px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
                />
              </LabeledField>
              <p className="text-[13px] text-foreground/85">✨ До поездки: {daysToTrip} дней</p>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PURPOSE_OPTIONS.map((option) => {
                const selected = option === purpose
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPurpose(option)}
                    className={`min-h-[44px] rounded-2xl border px-4 py-4 text-left text-sm transition-all ${
                      selected
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-white/10 bg-white/[0.02] text-foreground/85 hover:border-white/20 focus-visible:border-primary/60'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHadRefusal(false)}
                  className={`min-h-[44px] rounded-2xl border px-4 py-3 text-sm transition-all ${
                    hadRefusal === false
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-white/10 bg-white/[0.02] text-foreground/85 hover:border-white/20'
                  }`}
                >
                  Нет
                </button>
                <button
                  type="button"
                  onClick={() => setHadRefusal(true)}
                  className={`min-h-[44px] rounded-2xl border px-4 py-3 text-sm transition-all ${
                    hadRefusal === true
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-white/10 bg-white/[0.02] text-foreground/85 hover:border-white/20'
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
                      className="min-h-[132px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-4 pt-8 text-[14px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
                      placeholder="Опишите причину отказа или важные детали"
                    />
                  </LabeledField>

                  <button
                    type="button"
                    onClick={() => void generateRefusalDraft()}
                    disabled={intakeAiLoading || refusalContext.trim().length < 6}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] text-primary transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {intakeAiLoading ? 'AI собирает формулировку…' : 'AI: усилить формулировку'}
                  </button>

                  {intakeAi && (
                    <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-4">
                      <div className="ah-eyebrow">AI СЛОЙ</div>
                      <p className="mt-1 text-[15px] font-semibold text-primary">{intakeAi.title}</p>
                      <p className="mt-2 text-[13px] leading-snug text-foreground/90">{intakeAi.rewrite}</p>
                      <button
                        type="button"
                        onClick={() => setRefusalContext(intakeAi.rewrite)}
                        className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-3 py-2 text-[12px] text-foreground/85 transition-colors hover:border-white/25"
                      >
                        Вставить в поле
                      </button>
                      <ul className="mt-3 space-y-2 text-[12px] text-foreground/80">
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

        <div className="mt-auto flex items-center gap-3 pt-6">
          <button
            type="button"
            onClick={goBack}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-foreground/85 transition-all hover:border-white/20"
          >
            <ChevronLeft className="h-4 w-4" /> Назад
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="ah-amber-cta flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step < 4 ? 'Далее' : 'Показать вердикт'} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  )
}
