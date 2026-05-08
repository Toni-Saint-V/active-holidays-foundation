'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { AmberCTA } from '@/components/AmberCTA'
import { MockPreviewBadge } from '@/components/MockPreviewBadge'
import { RouteMap } from '@/components/RouteMap'
import { fetchHumanReviewAi } from '@/lib/aiSurfaceClient'
import type { HumanReviewAiOutput } from '@/lib/aiSurfaceContracts'
import type { CountryCode, VerdictKind } from '@/lib/constants'

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
  const [fullName, setFullName] = useState('')
  const [contact, setContact] = useState('')
  const [context, setContext] = useState('')
  const [aiPack, setAiPack] = useState<HumanReviewAiOutput | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const canSend = fullName.trim().length > 1 && contact.trim().length > 3

  async function generateBrief() {
    if (!canSend) return
    setAiLoading(true)
    try {
      const rawCountry = params.get('country')
      const rawVerdict = params.get('verdict')
      const country: CountryCode | null =
        rawCountry === 'IT' || rawCountry === 'ES' || rawCountry === 'FR' || rawCountry === 'GR'
          ? rawCountry
          : null
      const verdict: VerdictKind | undefined =
        rawVerdict === 'GO' ||
        rawVerdict === 'GO_WITH_CONDITIONS' ||
        rawVerdict === 'NOT_NOW' ||
        rawVerdict === 'HUMAN_REVIEW'
          ? rawVerdict
          : undefined
      const data = await fetchHumanReviewAi({
        country,
        verdict,
        departureDate: params.get('departure') ?? undefined,
        returnDate: params.get('return') ?? undefined,
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

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-10 pt-6 md:px-10">
      <article className="rounded-4xl border border-white/10 bg-black/20 p-5 md:p-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/result"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-foreground/85 transition-colors hover:border-white/20 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Назад
          </Link>
          <AHEyebrow>Эксперт</AHEyebrow>
        </header>

        <RouteMap forceStop={2} className="mt-3" />

        <h1 className="ah-display mt-2 text-[28px]">Нужна<br />ручная проверка</h1>

        <p className="mt-4 text-[15px] text-foreground/85">Кейс нестандартный — нужен взгляд эксперта.</p>

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
                Понял ваш кейс: 🇮🇹 Италия · 15–29 июня · вердикт «Можно, но есть условия». Передаю эксперту с полным контекстом — он свяжется в течение 30 минут.
              </p>
            </div>
          </div>
          <div className="mt-3 ml-auto w-fit">
            <MockPreviewBadge />
          </div>
        </section>

        <section className="mt-6 space-y-4">
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
            {aiLoading ? 'AI собирает бриф…' : 'Собрать AI-бриф для эксперта'}
          </button>
        </div>

        {aiPack && (
          <section className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-4">
            <div className="ah-eyebrow">AI СЛОЙ</div>
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

        <div className="mt-4">
          <MockPreviewBadge />
        </div>
      </article>
    </main>
  )
}
