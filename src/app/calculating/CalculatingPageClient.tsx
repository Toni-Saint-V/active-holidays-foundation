'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { RouteMap } from '@/components/RouteMap'

export function CalculatingPageClient() {
  const router = useRouter()
  const params = useSearchParams()
  const freezePreview = params.get('freeze') === '1'

  useEffect(() => {
    if (freezePreview) return

    const target = `/result?${params.toString()}`
    const timer = window.setTimeout(() => {
      router.replace(target)
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [freezePreview, params, router])

  return (
    <main className="flex min-h-screen w-full flex-col p-0">
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-black/20 p-5 md:p-10">
        <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-black/32" />
        <div className="relative z-10">
          <AHEyebrow>Расчёт маршрута</AHEyebrow>
          <h1 className="ah-display mt-5 max-w-2xl text-[42px] md:text-[56px]">
            Собираем AI-карту
            <br />
            по вашему кейсу
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-snug text-foreground/80">
            Сверяем страну, даты, документы и главный риск. Следующий экран откроется автоматически.
          </p>

          <RouteMap forceStop={2} className="mt-8 max-w-2xl" />

          <div className="mt-8 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            {['Даты', 'Документы', 'Следующий шаг'].map((label, index) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-primary ah-amber-glow"
                    style={{ width: `${70 + index * 10}%` }}
                  />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-9 z-20 md:inset-x-auto md:left-10 md:right-10 md:bottom-10">
          <section
            data-testid="pre-result-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Предварительная проверка перед результатом"
            className="rounded-3xl border border-white/14 bg-[#0e1728]/92 p-4 shadow-[0_22px_56px_rgba(0,0,0,0.42)] backdrop-blur-md"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-sky-100/75">Предварительная проверка</p>
            <p className="mt-1 text-[16px] font-semibold leading-snug text-white">Сверяем слот и базовые риски перед итоговым экраном.</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
              <div className="h-full w-[72%] rounded-full bg-orange-300" />
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
