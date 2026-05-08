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
  'Главный выигрыш даёт ранняя фиксация окна подачи, а не подача в последний момент.',
  'Качество одного связного пакета документов важнее объёма случайных вложений.',
  'Если дедлайн близко, безопаснее заранее переключаться на ручную проверку.',
]

export default function LandingPage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null)
  const [planeImageBroken, setPlaneImageBroken] = useState(false)
  const [aiInsight, setAiInsight] = useState<LandingAiOutput | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-10 pt-12 md:px-10">
      <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/20 p-6 md:p-10">
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

          <div className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-4">
            <div className="ah-eyebrow">AI СЛОЙ</div>
            <p className="mt-1 text-[15px] font-semibold text-primary">
              {aiInsight?.title ?? 'AI Навигатор момента'}
            </p>
            {aiLoading ? (
              <p className="mt-2 text-[13px] text-foreground/70">Собираем персональную стратегию для вашего кейса…</p>
            ) : (
              <ul className="mt-2 space-y-2 text-[13px] leading-snug text-foreground/85">
                {(aiInsight?.bullets ?? LANDING_FALLBACK_BULLETS).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-muted-foreground">{aiInsight?.note ?? 'Выберите страну и обновите подсказку.'}</p>
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
