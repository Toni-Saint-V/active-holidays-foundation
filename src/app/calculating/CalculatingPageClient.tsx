'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { RouteMap } from '@/components/RouteMap'

export function CalculatingPageClient() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const target = `/result?${params.toString()}`
    const timer = window.setTimeout(() => {
      router.replace(target)
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [params, router])

  return (
    <main className="flex min-h-screen w-full flex-col p-0">
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-black/20 p-5 md:p-10">
        <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
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
      </section>
    </main>
  )
}
