'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Check, Lock } from 'lucide-react'
import planeImg from '../../public/photos/plane.webp'
import { COUNTRIES } from '@/lib/countryData'
import type { CountryCode } from '@/lib/constants'
import { cn } from '@/lib/utils'

type CountryView = {
  code: CountryCode
  name: string
  ctaName: string
  duration: string
  image: string
  facts: string[]
}

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

const countries: CountryView[] = [
  {
    code: 'IT',
    name: 'Италия',
    ctaName: 'Италию',
    duration: 'примерно 10+ дней',
    image: '/photos/landmark-it.webp',
    facts: ['окно 25–60 дней', '6 документов', 'риск: слот', 'страховка 30 000 €'],
  },
  {
    code: 'ES',
    name: 'Испания',
    ctaName: 'Испанию',
    duration: 'примерно 15 дней',
    image: '/photos/landmark-es.webp',
    facts: ['окно 30–90 дней', '5 документов', 'риск: финансы', 'от 100 €/день'],
  },
  {
    code: 'FR',
    name: 'Франция',
    ctaName: 'Францию',
    duration: 'примерно 2–3 недели',
    image: '/photos/landmark-fr.webp',
    facts: ['окно 30–90 дней', '6 документов', 'риск: запись', 'личная подача'],
  },
  {
    code: 'GR',
    name: 'Греция',
    ctaName: 'Грецию',
    duration: 'примерно 15+ дней',
    image: '/photos/landmark-gr.webp',
    facts: ['окно 25–60 дней', '5 документов', 'риск: сезон', 'от 50 €/день'],
  },
]

const countryByCode = countries.reduce<Record<CountryCode, CountryView>>(
  (acc, country) => {
    acc[country.code] = country
    return acc
  },
  {} as Record<CountryCode, CountryView>
)

const factTagTones = [
  'border-sky-300/[0.22] bg-sky-300/[0.075] text-sky-50/[0.82]',
  'border-violet-300/[0.22] bg-violet-300/[0.075] text-violet-50/[0.8]',
  'border-cyan-300/[0.18] bg-cyan-300/[0.06] text-cyan-50/[0.74]',
  'border-fuchsia-300/[0.18] bg-fuchsia-300/[0.06] text-fuchsia-50/[0.74]',
]

export default function LandingPage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [brandHintActive, setBrandHintActive] = useState(true)
  const [brandPulseCycle, setBrandPulseCycle] = useState(0)

  const selectedCountryView = selectedCountry ? countryByCode[selectedCountry] : null
  const heroImage = selectedCountry ? COUNTRIES[selectedCountry].heroImage : planeImg.src
  const activeFacts = selectedCountryView?.facts ?? ['окно подачи', 'главный риск', 'документы']
  const liveLine = selectedCountryView
    ? `${selectedCountryView.name} · ${selectedCountryView.duration}`
    : 'Выберите страну · срок появится здесь'

  function getFullscreenElement() {
    const fullscreenDocument = document as FullscreenDocument
    return (
      document.fullscreenElement ??
      fullscreenDocument.webkitFullscreenElement ??
      fullscreenDocument.msFullscreenElement ??
      null
    )
  }

  function triggerBrandHint() {
    setBrandHintActive(false)
    window.requestAnimationFrame(() => {
      setBrandPulseCycle((current) => current + 1)
      setBrandHintActive(true)
    })
  }

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(getFullscreenElement()))
    }

    syncFullscreenState()

    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)
    document.addEventListener('msfullscreenchange', syncFullscreenState)

    const hintInterval = window.setInterval(() => {
      if (!getFullscreenElement()) {
        triggerBrandHint()
      }
    }, 60_000)

    return () => {
      window.clearInterval(hintInterval)
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
      document.removeEventListener('msfullscreenchange', syncFullscreenState)
    }
  }, [])

  function toggleCountry(country: CountryCode) {
    setSelectedCountry((current) => (current === country ? null : country))
  }

  async function toggleFullscreen() {
    try {
      if (!getFullscreenElement()) {
        const fullscreenRoot = document.documentElement as FullscreenRoot
        const requestFullscreen =
          fullscreenRoot.requestFullscreen ??
          fullscreenRoot.webkitRequestFullscreen ??
          fullscreenRoot.msRequestFullscreen

        if (!requestFullscreen) {
          triggerBrandHint()
          return
        }

        await requestFullscreen.call(fullscreenRoot)
        setIsFullscreen(true)
        return
      }

      const fullscreenDocument = document as FullscreenDocument
      const exitFullscreen =
        document.exitFullscreen ??
        fullscreenDocument.webkitExitFullscreen ??
        fullscreenDocument.msExitFullscreen

      await exitFullscreen?.call(document)
      setIsFullscreen(false)
    } catch {
      // Browsers may block fullscreen outside a trusted user gesture.
      setIsFullscreen(Boolean(getFullscreenElement()))
      triggerBrandHint()
    }
  }

  function startVisaCheck() {
    if (!selectedCountry) return
    router.push(`/intake?country=${selectedCountry}`)
  }

  function openInsuranceFlow() {
    if (!selectedCountry) return
    router.push(`/intake?country=${selectedCountry}`)
  }

  return (
    <main className="h-[100svh] w-full overflow-hidden bg-[#020712] text-white">
      <section className="relative isolate h-full overflow-hidden">
        <div
          key={heroImage}
          className="ah-landing-hero-bg pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:42px_42px] opacity-[0.22]" />

        <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-col px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[clamp(22px,4.5svh,38px)]">
          <div className="flex min-h-[32px] items-center gap-2.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              onAnimationEnd={() => setBrandHintActive(false)}
              aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть во весь экран'}
              aria-pressed={isFullscreen}
              data-pulse-cycle={brandPulseCycle}
              className={cn(
                'ah-brand-logo grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full border-0 bg-[rgba(255,140,31,0.055)] p-0 text-[22px] font-bold leading-none tracking-[-0.04em] text-[#ff8c1f] active:scale-95',
                brandHintActive && !isFullscreen && 'ah-brand-logo--hint',
                isFullscreen && 'ah-brand-logo--fullscreen'
              )}
            >
              A
            </button>
            <p className="min-w-0 truncate text-[11px] font-medium uppercase leading-none tracking-[0.22em] text-white/62">
              ACTIVE HOLIDAY · ДЛЯ ГРАЖДАН <span className="text-primary">РФ</span>
            </p>
          </div>

          <h1 className="mt-[clamp(18px,3.2svh,27px)] max-w-[340px] text-[clamp(34px,5svh,45px)] font-semibold leading-[0.95] tracking-normal text-white">
            Готовность
            <br />к подаче
            <br />на <span className="text-primary">шенген</span>
          </h1>

          <p className="mt-[clamp(14px,2.35svh,20px)] text-[clamp(14px,2svh,17px)] font-light leading-[1.28] text-white/68">
            Страна задаёт первый риск.
            <br />
            Дальше проверим даты и портфель.
          </p>

          <div className="mt-[clamp(20px,3.55svh,30px)] text-[11px] font-medium uppercase leading-none tracking-[0.16em] text-white/42">
            Куда едете
          </div>

          <div
            data-testid="country-rail"
            className="mt-2.5 h-[clamp(110px,16svh,136px)] w-full min-w-0 shrink-0 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max gap-3">
              {countries.map((country) => {
                const selected = selectedCountry === country.code

                return (
                  <button
                    key={country.code}
                    type="button"
                    data-testid={`country-card-${country.code}`}
                    aria-pressed={selected}
                    onClick={() => toggleCountry(country.code)}
                    className={cn(
                      'relative h-[clamp(106px,15.4svh,132px)] w-[126px] shrink-0 overflow-hidden rounded-[20px] border text-left transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.985]',
                      selected
                        ? 'border-primary bg-transparent shadow-[inset_0_0_0_1px_rgba(247,163,77,0.18),0_18px_44px_rgba(0,0,0,0.24)]'
                        : 'border-white/24 bg-white/[0.02]'
                    )}
                  >
                    <Image
                      src={country.image}
                      alt=""
                      fill
                      sizes="126px"
                      className={cn(
                        'object-cover opacity-95 transition-opacity duration-200',
                        selected && 'opacity-0'
                      )}
                    />
                    <span
                      className={cn(
                        'absolute inset-0 bg-gradient-to-b from-black/[0.02] via-black/10 to-black/85 transition-opacity duration-200',
                        selected && 'opacity-0'
                      )}
                      aria-hidden
                    />
                    {selected ? (
                      <span className="absolute right-3 top-3 z-10 grid h-[25px] w-[25px] place-items-center rounded-full bg-primary text-[#101318] shadow-[0_0_18px_rgba(255,140,31,0.38)]">
                        <Check className="h-4 w-4" aria-hidden />
                      </span>
                    ) : null}
                    <span className="absolute bottom-[34px] left-[13px] z-10 text-[39px] font-semibold leading-none tracking-normal text-white">
                      {country.code}
                    </span>
                    <span className="absolute bottom-3.5 left-3.5 z-10 text-[14px] font-normal leading-none text-white/90">
                      {country.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <section
            data-testid="live-line"
            className="mt-[clamp(16px,2.5svh,21px)] grid min-h-[44px] grid-cols-[22px_minmax(0,1fr)] items-center gap-[9px]"
          >
            <span className="ah-sun-orb ml-1 h-[13px] w-[13px] rounded-full" aria-hidden />
            <p key={liveLine} className="ah-live-line min-w-0 text-[15px] font-normal leading-[1.35] tracking-[0.006em] text-white/86">
              {liveLine}
            </p>
          </section>

          <div
            key={selectedCountry ?? 'empty'}
            data-testid="fact-tags"
            className="mt-[clamp(18px,2.6svh,22px)] flex min-h-[clamp(72px,9.8svh,82px)] flex-wrap content-start gap-2"
          >
            {activeFacts.map((fact, index) => (
              <span
                key={fact}
                className={cn(
                  'ah-fact-tag inline-flex min-h-[34px] max-w-full items-center rounded-full border px-3 py-2 text-[12px] font-normal leading-[1.2] tracking-[0.003em]',
                  factTagTones[index % factTagTones.length]
                )}
                style={{ '--tag-delay': `${index * 95}ms` } as React.CSSProperties}
              >
                {fact}
              </span>
            ))}
          </div>

          <div className="mt-auto w-full pt-[clamp(8px,1.4svh,12px)]">
            <button
              type="button"
              onClick={openInsuranceFlow}
              disabled={!selectedCountry}
              data-testid="insurance-cta"
              className="mb-4 flex h-[clamp(52px,7.2svh,64px)] w-full items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.025] text-[13px] font-normal tracking-[0.005em] text-white/44 transition-colors active:bg-white/[0.04] disabled:text-white/24"
            >
              Купить страховку
            </button>

            <button
              type="button"
              onClick={startVisaCheck}
              disabled={!selectedCountry}
              data-testid="primary-cta"
              className={cn(
                'relative flex h-[clamp(52px,7.2svh,64px)] w-full items-center justify-center rounded-full text-[19px] font-semibold tracking-normal transition-[transform,opacity,box-shadow] active:translate-y-[1px]',
                selectedCountry
                  ? 'bg-[linear-gradient(180deg,#ffbb73,#ff8c1f)] text-[#101318] shadow-[0_16px_40px_rgba(255,139,31,0.24),inset_0_1px_0_rgba(255,255,255,0.26)]'
                  : 'bg-[linear-gradient(180deg,rgba(255,187,115,0.48),rgba(255,140,31,0.36))] text-[rgba(16,19,24,0.58)] shadow-[0_12px_32px_rgba(255,139,31,0.09),inset_0_1px_0_rgba(255,255,255,0.14)]'
              )}
            >
              {selectedCountryView ? `Проверить ${selectedCountryView.ctaName}` : 'Выберите страну'}
            </button>

            <p className="mt-[clamp(10px,1.7svh,14px)] flex items-center justify-center gap-1.5 text-center text-[11px] leading-[1.3] text-white/26">
              <Lock className="h-3 w-3 text-white/24" aria-hidden />
              Точный вывод — после дат и документов
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .ah-landing-hero-bg {
          height: clamp(330px, 50svh, 425px);
          background-size: cover;
          background-position: center top;
          opacity: 0.96;
          transform: scale(${selectedCountry ? 1.04 : 1.02});
          transition:
            background-image 260ms ease,
            opacity 260ms ease,
            transform 420ms ease;
        }

        .ah-landing-hero-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(2, 7, 18, 0.08) 0%,
              rgba(2, 7, 18, 0.82) 72%,
              #020712 100%
            ),
            linear-gradient(
              92deg,
              rgba(2, 7, 18, 0.92) 0%,
              rgba(2, 7, 18, 0.48) 58%,
              rgba(2, 7, 18, 0.34) 100%
            );
        }

        .ah-brand-logo {
          text-shadow:
            0 0 12px rgba(255, 140, 31, 0.6),
            0 0 26px rgba(255, 140, 31, 0.22);
          box-shadow:
            inset 0 0 0 1px rgba(255, 140, 31, 0.1),
            0 0 0 rgba(255, 140, 31, 0);
          position: relative;
          isolation: isolate;
        }

        .ah-brand-logo::after {
          content: '';
          position: absolute;
          inset: -7px;
          z-index: -1;
          border-radius: inherit;
          background: radial-gradient(
            circle,
            rgba(255, 140, 31, 0.2),
            rgba(255, 140, 31, 0.08) 44%,
            transparent 72%
          );
          filter: blur(4px);
          opacity: 0;
          transform: scale(0.76);
          pointer-events: none;
        }

        .ah-brand-logo--hint {
          animation: brand-hint 1000ms cubic-bezier(0.2, 0.74, 0.18, 1) 1 both;
        }

        .ah-brand-logo--hint::after {
          animation: brand-halo-hint 1000ms cubic-bezier(0.2, 0.74, 0.18, 1) 1 both;
        }

        .ah-brand-logo--fullscreen {
          background: rgba(255, 140, 31, 0.12);
          box-shadow:
            inset 0 0 0 1px rgba(255, 140, 31, 0.18),
            0 0 18px rgba(255, 140, 31, 0.18);
        }

        .ah-sun-orb {
          position: relative;
          background: radial-gradient(
            circle,
            rgba(255, 230, 170, 0.96) 0 8%,
            rgba(255, 178, 84, 0.86) 26%,
            rgba(255, 132, 38, 0.44) 54%,
            rgba(255, 132, 38, 0) 76%
          );
          box-shadow:
            0 0 9px rgba(255, 169, 74, 0.42),
            0 0 26px rgba(255, 139, 31, 0.2),
            0 0 46px rgba(255, 139, 31, 0.1);
          filter: blur(0.55px);
          animation: sun-breathe 5.2s cubic-bezier(0.42, 0, 0.22, 1) infinite;
          will-change: opacity, transform, filter;
        }

        .ah-sun-orb::before {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: inherit;
          background: radial-gradient(
            circle,
            rgba(255, 163, 77, 0.17),
            rgba(255, 163, 77, 0.075) 40%,
            transparent 72%
          );
          filter: blur(3.2px);
          animation: sun-halo 5.2s cubic-bezier(0.42, 0, 0.22, 1) infinite;
        }

        .ah-live-line {
          animation: live-line-in 620ms ease both;
        }

        .ah-fact-tag {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
          opacity: 0;
          transform: translateY(8px) scale(0.96);
          animation: tag-pop 520ms cubic-bezier(0.2, 0.72, 0.18, 1) forwards;
          animation-delay: var(--tag-delay);
        }

        @keyframes brand-hint {
          0% {
            transform: scale(1);
            box-shadow:
              inset 0 0 0 1px rgba(255, 140, 31, 0.08),
              0 0 0 rgba(255, 140, 31, 0);
          }
          42% {
            transform: scale(1.12);
            box-shadow:
              inset 0 0 0 1px rgba(255, 140, 31, 0.22),
              0 0 18px rgba(255, 140, 31, 0.34),
              0 0 44px rgba(255, 140, 31, 0.14);
          }
          100% {
            transform: scale(1);
            box-shadow:
              inset 0 0 0 1px rgba(255, 140, 31, 0.1),
              0 0 0 rgba(255, 140, 31, 0);
          }
        }

        @keyframes brand-halo-hint {
          0% {
            opacity: 0;
            transform: scale(0.76);
          }
          44% {
            opacity: 1;
            transform: scale(1.18);
          }
          100% {
            opacity: 0;
            transform: scale(1.36);
          }
        }

        @keyframes sun-breathe {
          0%,
          100% {
            opacity: 0.74;
            transform: scale(0.96);
            filter: blur(0.72px) saturate(0.94);
          }
          48% {
            opacity: 0.98;
            transform: scale(1.045);
            filter: blur(0.42px) saturate(1.06);
          }
        }

        @keyframes sun-halo {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.96);
          }
          48% {
            opacity: 0.88;
            transform: scale(1.12);
          }
        }

        @keyframes live-line-in {
          0% {
            opacity: 0;
            transform: translateX(-10px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes tag-pop {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-height: 760px) {
          .ah-fact-tag {
            min-height: 30px;
            padding-top: 6px;
            padding-bottom: 6px;
          }
        }
      `}</style>
    </main>
  )
}
