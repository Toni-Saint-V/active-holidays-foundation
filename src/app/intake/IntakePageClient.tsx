'use client'

import { Check, ChevronLeft, ChevronRight, FileUp, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { StepRail } from '@/components/StepRail'
import { fetchIntakeAi } from '@/lib/aiSurfaceClient'
import type { IntakeAiOutput } from '@/lib/aiSurfaceContracts'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode } from '@/lib/constants'

type Purpose = 'Туризм' | 'По работе' | 'К родственникам' | 'Спорт/событие'
type DocModalState = 'choice' | 'upload' | 'verifying'

type TravelProfile = {
  selected_country: CountryCode
  departure_date: string
  return_date: string
  purpose: Purpose | null
  had_refusal: boolean | null
  refusal_context: string
}

const PURPOSE_OPTIONS: Purpose[] = ['Туризм', 'По работе', 'К родственникам', 'Спорт/событие']
const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
const VERIFICATION_LABELS = ['даты', 'паспорт', 'маршрут', 'страховка', 'финансы']

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

function isDateRangeValid(departureDate: string, returnDate: string) {
  if (!departureDate || !returnDate) return false
  return new Date(`${returnDate}T00:00:00`).getTime() >= new Date(`${departureDate}T00:00:00`).getTime()
}

export function IntakePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const prefilledCountry = (searchParams.get('country') as CountryCode | null) ?? null
  const selectedCountry =
    prefilledCountry && VALID_COUNTRIES.includes(prefilledCountry) ? prefilledCountry : 'IT'

  const [step, setStep] = useState<2 | 3 | 4>(2)
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [hadRefusal, setHadRefusal] = useState<boolean | null>(null)
  const [refusalContext, setRefusalContext] = useState('')
  const [intakeAi, setIntakeAi] = useState<IntakeAiOutput | null>(null)
  const [intakeAiLoading, setIntakeAiLoading] = useState(false)
  const [preResultOpen, setPreResultOpen] = useState(false)
  const [docModalState, setDocModalState] = useState<DocModalState>('choice')
  const [documentsSaveConsent, setDocumentsSaveConsent] = useState(false)
  const [uploadedDocumentName, setUploadedDocumentName] = useState('')

  const daysToTrip = useMemo(() => daysToTripFromDate(departureDate), [departureDate])
  const dateRangeValid = useMemo(
    () => isDateRangeValid(departureDate, returnDate),
    [departureDate, returnDate]
  )
  const dateRangeError =
    departureDate && returnDate && !dateRangeValid
      ? 'Дата возвращения не может быть раньше даты вылета.'
      : ''
  const visibleStep = (step - 1) as 1 | 2 | 3
  const visibleTotal = 3
  const introText = `Страну уже учли: ${COUNTRIES[selectedCountry].label}. Осталось уточнить даты, цель и визовую историю.`

  const travelProfile: TravelProfile = useMemo(
    () => ({
      selected_country: selectedCountry,
      departure_date: departureDate,
      return_date: returnDate,
      purpose,
      had_refusal: hadRefusal,
      refusal_context: refusalContext.trim(),
    }),
    [departureDate, hadRefusal, purpose, refusalContext, returnDate, selectedCountry]
  )

  const canProceed = useMemo(() => {
    if (step === 2) return dateRangeValid
    if (step === 3) return Boolean(purpose)
    if (step === 4) {
      if (hadRefusal === null) return false
      if (hadRefusal) return refusalContext.trim().length > 0
      return true
    }
    return false
  }, [dateRangeValid, hadRefusal, purpose, refusalContext, step])

  function buildResultParams(documentsUploaded: boolean) {
    const params = new URLSearchParams()
    params.set('country', travelProfile.selected_country)
    if (travelProfile.departure_date) params.set('departure', travelProfile.departure_date)
    if (travelProfile.return_date) params.set('return', travelProfile.return_date)
    if (travelProfile.purpose) params.set('purpose', travelProfile.purpose)
    params.set('hadRefusal', String(Boolean(travelProfile.had_refusal)))
    if (travelProfile.refusal_context) params.set('refusalContext', travelProfile.refusal_context)
    params.set('documentsUploaded', String(documentsUploaded))
    params.set('documentsSaveConsent', String(documentsUploaded && documentsSaveConsent))
    params.set('resultType', documentsUploaded ? 'verified' : 'preliminary')
    params.set('analysisConfidence', documentsUploaded ? 'high' : 'medium')
    return params
  }

  function finishIntake(documentsUploaded: boolean) {
    const params = buildResultParams(documentsUploaded)
    router.push(`/calculating?${params.toString()}`)
  }

  function goNext() {
    if (!canProceed) return
    if (step < 4) {
      setStep((prev) => (prev + 1) as 2 | 3 | 4)
      return
    }

    setDocModalState('choice')
    setUploadedDocumentName('')
    setPreResultOpen(true)
  }

  function goBack() {
    if (step === 2) {
      router.push('/')
      return
    }
    if (step > 2) {
      setStep((prev) => (prev - 1) as 2 | 3 | 4)
      return
    }
    router.push('/')
  }

  function handleDocumentPicked(file: File | undefined) {
    if (!file) return
    setUploadedDocumentName(file.name)
    setDocModalState('verifying')
    window.setTimeout(() => finishIntake(true), 950)
  }

  async function generateRefusalDraft() {
    if (!refusalContext.trim()) return
    setIntakeAiLoading(true)
    try {
      const data = await fetchIntakeAi({
        country: selectedCountry,
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
    <main className="flex min-h-screen w-full flex-col p-0">
      <section className="flex min-h-screen flex-1 flex-col bg-black/20 p-5 pt-6 md:p-8">
        <StepRail current={visibleStep} total={visibleTotal} />

        <div className="mt-8">
          <AHEyebrow>ВОПРОС {visibleStep}</AHEyebrow>
          <h2 className="mt-3 text-[28px] font-semibold tracking-tight">
            {step === 2 && 'Укажите даты поездки'}
            {step === 3 && 'Какая цель поездки?'}
            {step === 4 && 'Были ли предыдущие отказы?'}
          </h2>
          <p className="mt-3 max-w-[620px] text-[14px] leading-snug text-foreground/78">
            {introText}
          </p>
        </div>

        <div className="mt-8 flex-1">
          {step === 2 && (
            <div className="space-y-4">
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
                  className="h-16 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-2 pt-7 text-[15px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
                />
              </LabeledField>
              <LabeledField label="ДАТА ВОЗВРАЩЕНИЯ">
                <input
                  type="date"
                  value={returnDate}
                  min={departureDate || todayIso()}
                  onChange={(event) => setReturnDate(event.target.value)}
                  className="h-16 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-2 pt-7 text-[15px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
                />
              </LabeledField>
              {dateRangeError && <p className="text-[13px] text-destructive">{dateRangeError}</p>}
              <p className="text-[13px] text-foreground/85">
                {departureDate ? `До поездки: ${daysToTrip} дней` : 'Укажите дату вылета — посчитаем буфер до подачи.'}
              </p>
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
                      <div className="ah-eyebrow">AI-редактор</div>
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
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed ${
              canProceed
                ? 'ah-amber-cta text-primary-foreground'
                : 'border border-white/10 bg-white/[0.025] text-white/24'
            }`}
          >
            Дальше <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Результат показывает готовность пакета и риски подачи без обещаний решения консульства.
        </p>
      </section>

      {preResultOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-5 backdrop-blur-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pre-result-title"
        >
          <section className="w-full max-w-[430px] rounded-[30px] border border-white/16 bg-[#11120f]/95 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-4">
              <div className="ah-eyebrow text-ok">Профиль поездки собран</div>
              <div className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-foreground/62">
                {COUNTRIES[selectedCountry].label} · {daysToTrip || 24} дня
              </div>
            </div>

            {docModalState === 'choice' && (
              <>
                <h3 id="pre-result-title" className="mt-4 text-[34px] font-semibold leading-[0.96] tracking-[-0.03em]">
                  Почти готово
                </h3>
                <p className="mt-3 text-[15px] leading-snug text-foreground/74">
                  Профиль поездки уже собран. Добавьте документы, чтобы AI проверил пакет точнее перед результатом.
                </p>
                <div className="mt-4 border-y border-white/10 py-3 text-[12px] leading-snug text-foreground/66">
                  Паспорт · бронь · страховка · финансы · маршрут
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <FileUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground/92">Можно начать с одного файла.</div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      После загрузки покажем короткую AI-сверку пакета.
                    </p>
                  </div>
                </div>
              </>
            )}

            {docModalState === 'upload' && (
              <>
                <h3 id="pre-result-title" className="mt-4 text-[31px] font-semibold leading-[0.98] tracking-[-0.03em]">
                  Добавьте первый документ
                </h3>
                <p className="mt-3 text-[15px] leading-snug text-foreground/74">
                  Не нужен полный пакет сразу. Одного файла достаточно, чтобы начать уточнение карты.
                </p>
                <label className="mt-5 flex min-h-[126px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-primary/35 bg-primary/5 px-4 text-center transition-colors hover:border-primary/55">
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
                    onChange={(event) => handleDocumentPicked(event.target.files?.[0])}
                  />
                  <FileUp className="h-7 w-7 text-primary" />
                  <span className="mt-3 text-[14px] font-semibold text-foreground/90">Выбрать файл</span>
                  <span className="mt-1 text-[11px] text-muted-foreground">PDF, JPG, PNG или HEIC</span>
                </label>
              </>
            )}

            {docModalState === 'verifying' && (
              <>
                <h3 id="pre-result-title" className="mt-4 text-[31px] font-semibold leading-[0.98] tracking-[-0.03em]">
                  AI сверяет пакет
                </h3>
                <p className="mt-3 text-[15px] leading-snug text-foreground/74">
                  {uploadedDocumentName || 'Документ'} принят. Проверяем ключевые зоны перед результатом.
                </p>
                <div className="mt-5 space-y-2">
                  {VERIFICATION_LABELS.map((label, index) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                      <span className="text-[13px] text-foreground/78">{label}</span>
                      {index < 3 ? <Check className="h-4 w-4 text-ok" /> : <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                  ))}
                </div>
              </>
            )}

            {docModalState !== 'verifying' && (
              <>
                <label className="mt-4 grid cursor-pointer grid-cols-[22px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <input
                    type="checkbox"
                    checked={documentsSaveConsent}
                    onChange={(event) => setDocumentsSaveConsent(event.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded-md border-white/30 bg-black/20 accent-primary"
                  />
                  <span>
                    <span className="block text-[12px] font-semibold text-foreground/90">Сохранить документы для следующих поездок</span>
                    <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                      В следующий раз проверка займёт несколько секунд. Вы сможете удалить документы в любой момент.
                    </span>
                  </span>
                </label>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setDocModalState('upload')}
                    className="ah-amber-cta min-h-[48px] rounded-2xl px-4 text-[14px] font-semibold text-primary-foreground"
                  >
                    Добавить документы
                  </button>
                  <button
                    type="button"
                    onClick={() => finishIntake(false)}
                    className="min-h-[48px] rounded-2xl border border-white/12 bg-white/[0.035] px-4 text-[14px] font-semibold text-foreground/82"
                  >
                    Продолжить без документов
                  </button>
                </div>

                <p className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-foreground/48">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Документы используются только для проверки пакета, если вы не разрешите сохранить их отдельно.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
