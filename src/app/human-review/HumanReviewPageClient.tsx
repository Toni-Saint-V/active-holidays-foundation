'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { AmberCTA } from '@/components/AmberCTA'
import { MockPreviewBadge } from '@/components/MockPreviewBadge'
import { RouteMap } from '@/components/RouteMap'
import { fetchHumanReviewAi } from '@/lib/aiSurfaceClient'
import type { HumanReviewAiOutput } from '@/lib/aiSurfaceContracts'
import { apiClient } from '@/lib/apiClient'
import { COUNTRIES } from '@/lib/countryData'
import { VERDICT_HEADLINE, type CountryCode, type VerdictKind } from '@/lib/constants'
import type { Case, SignalRecord } from '@shared/contracts'

const VALID_COUNTRIES: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
const VALID_VERDICTS: VerdictKind[] = ['GO', 'GO_WITH_CONDITIONS', 'NOT_NOW', 'HUMAN_REVIEW']

function parseCountry(value: string | null): CountryCode {
  const upper = value?.toUpperCase() as CountryCode | undefined
  return upper && VALID_COUNTRIES.includes(upper) ? upper : 'IT'
}

function parseVerdict(value: string | null): VerdictKind {
  return value && VALID_VERDICTS.includes(value as VerdictKind)
    ? (value as VerdictKind)
    : 'GO_WITH_CONDITIONS'
}

function signalValue(caseData: Case, signalId: SignalRecord['id']): unknown {
  const found = caseData.signals.find((signal) => signal.id === signalId)
  return found?.value
}

function countryFromCase(caseData: Case): CountryCode {
  const destination = signalValue(caseData, 'destination')
  if (typeof destination === 'string') {
    return parseCountry(destination)
  }
  return 'IT'
}

function tripDatesFromCase(caseData: Case): string {
  const timelineWeeks = signalValue(caseData, 'timeline_weeks')
  if (typeof timelineWeeks === 'number' && Number.isFinite(timelineWeeks) && timelineWeeks > 0) {
    return `срок поездки около ${timelineWeeks} нед.`
  }
  return 'даты уточняются'
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="group relative block">
      {children}
      <span className="pointer-events-none absolute left-4 top-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-primary">
        {label}
      </span>
    </label>
  )
}

export function HumanReviewPageClient() {
  const params = useSearchParams()
  const caseId = (params.get('caseId') ?? '').trim()
  const [fullName, setFullName] = useState('')
  const [contact, setContact] = useState('')
  const [context, setContext] = useState('')
  const [aiPack, setAiPack] = useState<HumanReviewAiOutput | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [routeState, setRouteState] = useState<'loading' | 'ready' | 'invalid'>(
    caseId ? 'loading' : 'invalid'
  )
  const [routeError, setRouteError] = useState<string | null>(
    caseId ? null : 'Кейс отсутствует в ссылке.'
  )
  const [country, setCountry] = useState<CountryCode>('IT')
  const [verdict, setVerdict] = useState<VerdictKind>('HUMAN_REVIEW')
  const [tripDates, setTripDates] = useState('даты уточняются')

  useEffect(() => {
    if (!caseId) {
      setRouteState('invalid')
      setRouteError('Кейс отсутствует в ссылке. Вернитесь к анкете и создайте кейс заново.')
      return
    }

    let cancelled = false
    setRouteState('loading')
    setRouteError(null)

    void Promise.all([apiClient.getCase(caseId), apiClient.getResult(caseId)])
      .then(([caseData, result]) => {
        if (cancelled) return
        setCountry(countryFromCase(caseData))
        setVerdict(parseVerdict(result.verdict))
        setTripDates(tripDatesFromCase(caseData))
        setRouteState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setRouteState('invalid')
        setRouteError('Кейс не найден или недоступен. Вернитесь к анкете и соберите кейс заново.')
      })

    return () => {
      cancelled = true
    }
  }, [caseId])

  const resultHref = useMemo(() => {
    if (!caseId) return '/intake'
    return `/result?caseId=${encodeURIComponent(caseId)}`
  }, [caseId])

  const canSend = fullName.trim().length > 1 && contact.trim().length > 3

  async function generateBrief() {
    if (!canSend || routeState !== 'ready') return
    setAiLoading(true)
    try {
      const data = await fetchHumanReviewAi({
        country,
        verdict,
        fullName: fullName.trim(),
        contact: contact.trim(),
        context: context.trim() || undefined,
      })
      setAiPack(data)
    } catch {
      setAiPack(null)
    } finally {
      setAiLoading(false)
    }
  }

  if (routeState !== 'ready') {
    return (
      <main className="w-full p-0">
        <article className="min-h-screen bg-black/20 p-5 pb-10 pt-6 md:p-8">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/intake"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/85 transition-colors hover:border-white/20 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> К анкете
            </Link>
            <AHEyebrow>Эксперт</AHEyebrow>
          </header>

          <section className="mt-8 max-w-xl rounded-2xl border border-white/12 bg-[#0e1728]/78 p-5">
            <p className="text-[15px] text-foreground/84">
              {routeState === 'loading'
                ? 'Проверяем caseId и загружаем данные кейса.'
                : routeError ?? 'Кейс недоступен.'}
            </p>
            {routeState === 'invalid' && (
              <Link
                href="/intake"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/88 transition-colors hover:border-white/25"
              >
                Вернуться к анкете
              </Link>
            )}
          </section>
        </article>
      </main>
    )
  }

  return (
    <main className="w-full p-0">
      <article className="min-h-screen bg-black/20 p-5 pb-10 pt-6 md:p-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href={resultHref}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/85 transition-colors hover:border-white/20 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Назад
          </Link>
          <AHEyebrow>Эксперт</AHEyebrow>
        </header>

        <RouteMap forceStop={2} className="mt-3" />

        <h1 className="ah-display mt-2 text-[28px]">Нужна<br />ручная проверка</h1>

        <p className="mt-4 text-[15px] text-foreground/85">Кейс нестандартный — нужен взгляд эксперта.</p>

        <section className="mt-5 rounded-2xl border border-orange-300/30 bg-orange-500/[0.06] p-4">
          <div className="ah-eyebrow">Эскалация</div>
          <p className="mt-1 text-[16px] font-semibold text-orange-300">После отправки формы эксперт связывается и уточняет следующий шаг</p>
          <ol className="mt-3 space-y-2 text-[13px] leading-snug text-foreground/85">
            <li>1. Проверяем сроки поездки, окно подачи и критичные документы.</li>
            <li>2. Формируем короткий рабочий план без лишних шагов.</li>
            <li>3. Отправляем рекомендации и вопросы для уточнения в Telegram или email.</li>
          </ol>
        </section>

        <section className="mt-6 rounded-2xl ah-chat-bubble p-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden
              className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10"
            >
              <span className="absolute inset-[-2px] rounded-full ah-glow-halo" />
              <span className="relative h-[10px] w-[10px] rounded-full ah-glow-dot" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ah-eyebrow">АГЕНТ · ACTIVE HOLIDAYS</div>
              <p className="mt-1 text-[14px] leading-snug text-foreground/85">
                Понял ваш кейс: {COUNTRIES[country].flag} {COUNTRIES[country].label} · {tripDates} · вердикт «{VERDICT_HEADLINE[verdict]}». Передаю эксперту с фокусом на сроки, документы и следующий шаг.
              </p>
            </div>
          </div>
          <div className="mt-3 ml-auto w-fit">
            <MockPreviewBadge />
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <p className="text-[12px] text-muted-foreground">
            Обязательные поля: имя и контакт. Контекст помогает эксперту быстрее закрыть риски.
          </p>
          <LabeledField label="ИМЯ">
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-16 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-2 pt-7 text-[15px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
            />
          </LabeledField>

          <LabeledField label="TELEGRAM ИЛИ EMAIL">
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              className="h-16 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-2 pt-7 text-[15px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
            />
          </LabeledField>

          <LabeledField label="ДОП. КОНТЕКСТ">
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              className="min-h-[132px] w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-4 pt-8 text-[14px] text-foreground outline-none transition-colors hover:border-white/20 focus:border-primary/60"
            />
          </LabeledField>
        </section>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => void generateBrief()}
            disabled={!canSend || aiLoading}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] text-primary transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aiLoading ? 'AI собирает бриф…' : aiPack ? 'Обновить AI-бриф' : 'Подготовить AI-бриф'}
          </button>
        </div>

        {aiPack && (
          <section className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-4">
            <div className="ah-eyebrow">Бриф эксперта</div>
            <p className="mt-1 text-[16px] font-semibold text-primary">{aiPack.title}</p>
            <p className="mt-2 text-[13px] text-foreground/88">{aiPack.urgency}</p>

            <div className="mt-3">
              <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">Блокеры</div>
              <ul className="mt-2 space-y-1 text-[13px] text-foreground/85">
                {aiPack.blockers.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3">
              <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">Вопросы эксперту</div>
              <ul className="mt-2 space-y-1 text-[13px] text-foreground/85">
                {aiPack.expertQuestions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <p className="mt-3 text-[13px] text-foreground/88">{aiPack.packetSummary}</p>
            <button
              type="button"
              onClick={() => setContext((prev) => (prev ? `${prev}\n\n${aiPack.packetSummary}` : aiPack.packetSummary))}
              className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-3 py-2 text-[12px] text-foreground/85 transition-colors hover:border-white/25"
            >
              Добавить summary в поле
            </button>
          </section>
        )}

        <div className="mt-6">
          <AmberCTA disabled={!canSend}>Отправить эксперту</AmberCTA>
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground">
          Бесплатно · <span className="text-foreground/85">Эксперт-человек, не AI</span>
        </p>
      </article>
    </main>
  )
}
