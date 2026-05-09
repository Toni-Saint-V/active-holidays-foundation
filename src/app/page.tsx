'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import planeImg from '../../public/photos/plane.webp'
import { AHEyebrow } from '@/components/AHEyebrow'
import { AmberCTA } from '@/components/AmberCTA'
import { CountryChipCard } from '@/components/CountryChipCard'
import { PlaneMotif } from '@/components/PlaneMotif'
import { fetchLandingAi } from '@/lib/aiSurfaceClient'
import type { LandingAiOutput } from '@/lib/aiSurfaceContracts'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode } from '@/lib/constants'

const COUNTRY_ORDER: CountryCode[] = ['IT', 'ES', 'FR', 'GR']
const LANDING_FALLBACK_BULLETS = [
  'Сначала проверяем окно подачи и слот.',
  'Потом сверяем деньги, даты и маршрут.',
  'Если есть разрыв — ведём к эксперту.',
]

function compactText(value: string | undefined, fallback: string, max = 96) {
  const text = (value ?? fallback).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

export default function LandingPage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null)
  const [planeImageBroken, setPlaneImageBroken] = useState(false)
  const [aiInsight, setAiInsight] = useState<LandingAiOutput | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const visibleBullets = aiInsight?.bullets ?? LANDING_FALLBACK_BULLETS

  const selectedLabel = useMemo(() => {
    if (!selectedCountry) return 'Выберите страну — покажем окно подачи и главный риск.'
    return `Выбрано: ${COUNTRIES[selectedCountry].label}. Покажем окно подачи и главный риск.`
  }, [selectedCountry])

  useEffect(() => {
    let cancelled = false
    setAiLoading(true)
    fetchLandingAi({ country: selectedCountry })
      .then((data) => {
        if (!cancelled) setAiInsight(data)
      })
      .catch(() => {
        if (!cancelled) setAiInsight(null)
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCountry])

  return (
    <main className="flex min-h-screen w-full flex-col p-0">
      <section className="relative min-h-screen overflow-hidden bg-black/20 p-5 pt-12 md:p-10 md:pt-12">
        {!planeImageBroken ? (
          <Image
            src={planeImg}
            alt=""
            aria-hidden
            priority
            sizes="(max-width: 768px) 280px, 420px"
            placeholder="blur"
            onError={() => setPlaneImageBroken(true)}
            className="pointer-events-none absolute -right-10 -top-6 h-[280px] w-[280px] object-cover opacity-90 ah-plane-mask md:h-[420px] md:w-[420px]"
          />
        ) : (
          <PlaneMotif />
        )}

        <div className="relative z-10 max-w-[620px]">
          <AHEyebrow>Active Holiday · для граждан РФ</AHEyebrow>
          <h1 className="ah-display mt-5 text-[44px]">Можно ли вам<br />подаваться<br />на шенген</h1>
          <p className="mt-5 max-w-[560px] text-[15px] text-foreground/85">
            Ответим за 2 минуты: вердикт, риски, недостающие документы и следующий шаг.
          </p>

          <div className="mt-12">
            <div className="ah-eyebrow">Куда едете</div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {COUNTRY_ORDER.map((countryCode) => {
                const country = COUNTRIES[countryCode]
                return (
                  <CountryChipCard
                    key={countryCode}
                    flag={country.flag}
                    label={country.label}
                    selected={selectedCountry === countryCode}
                    onSelect={() => setSelectedCountry(countryCode)}
                  />
                )
              })}
            </div>
          </div>

          <div className="mt-3 min-h-20 text-[12px] font-light text-muted-foreground/50">{selectedLabel}</div>

          <div className="mt-4 border-y border-primary/20 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="ah-eyebrow">AI-фокус</div>
              <span className="h-2 w-2 shrink-0 rounded-full ah-glow-dot" aria-hidden />
            </div>
            <p className="mt-2 max-w-[520px] text-[15px] font-semibold leading-snug text-primary">
              {aiInsight?.title ?? 'Фокус: окно подачи'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleBullets.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-foreground/78"
                >
                  {compactText(item, 'Проверить ключевой риск', 54)}
                </span>
              ))}
            </div>
            <p className="mt-3 max-w-[460px] text-[12px] leading-snug text-muted-foreground">
              {compactText(
                aiLoading && !aiInsight ? 'Базовый фокус уже готов; уточняем по выбранной стране.' : aiInsight?.note,
                'Выберите страну — покажем главное узкое место.',
                92
              )}
            </p>
          </div>

          <div className="mt-12">
            <AmberCTA
              disabled={!selectedCountry}
              onClick={() => {
                if (!selectedCountry) return
                router.push(`/intake?country=${selectedCountry}`)
              }}
            >
              Проверить визу
            </AmberCTA>
          </div>

          <p className="mt-4 text-center text-[12px] text-muted-foreground">4 коротких вопроса · ответ за 3 секунды</p>

          <Link
            href="https://example.com/insurance?mode=insurance_only"
            className="mt-4 inline-flex min-h-[44px] items-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Нужна только страховка →
          </Link>
        </div>
      </section>
    </main>
  )
}
