'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AHEyebrow } from '@/components/AHEyebrow'
import { RouteMap } from '@/components/RouteMap'
import { apiClient } from '@/lib/apiClient'
import { hasCaseAccessToken } from '@/lib/caseAccessSession'
import { buildResultUrl } from '@/lib/caseRoutes'

export function CalculatingPageClient() {
  const router = useRouter()
  const params = useSearchParams()
  const caseId = (params.get('caseId') ?? '').trim()
  const freezePreview = params.get('freeze') === '1'
  const [isCaseReady, setIsCaseReady] = useState<boolean>(false)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!caseId) {
      setRecoveryMessage('Кейс не найден в ссылке. Откройте анкету и сформируйте кейс заново.')
      setIsCaseReady(false)
      return
    }
    if (!hasCaseAccessToken(caseId)) {
      setRecoveryMessage('Токен доступа к кейсу не найден. Вернитесь к анкете и соберите кейс заново.')
      setIsCaseReady(false)
      return
    }

    let cancelled = false
    let redirectTimer: number | null = null

    setRecoveryMessage(null)
    setIsCaseReady(false)

    void apiClient
      .getCase(caseId)
      .then(() => {
        if (cancelled) return
        setIsCaseReady(true)
        if (!freezePreview) {
          redirectTimer = window.setTimeout(() => {
            router.replace(buildResultUrl(caseId))
          }, 1100)
        }
      })
      .catch(() => {
        if (cancelled) return
        setRecoveryMessage('Кейс не найден или недоступен. Вернитесь к анкете и создайте новый кейс.')
      })

    return () => {
      cancelled = true
      if (redirectTimer !== null) {
        window.clearTimeout(redirectTimer)
      }
    }
  }, [caseId, freezePreview, router])

  return (
    <main className="flex min-h-screen w-full flex-col p-0">
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-black/20 p-5 md:p-10">
        <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-black/32" />
        <div className="relative z-10">
          <AHEyebrow>Расчёт маршрута</AHEyebrow>
          <h1 className="ah-display mt-5 max-w-2xl text-[42px] md:text-[56px]">
            Собираем карту
            <br />
            по вашему кейсу
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-snug text-foreground/80">
            {recoveryMessage
              ? 'Нужен корректный caseId, чтобы открыть результат.'
              : isCaseReady
                ? 'Кейс подтверждён. Следующий экран откроется автоматически.'
                : 'Проверяем caseId и загружаем серверный кейс перед переходом к результату.'}
          </p>

          {!recoveryMessage ? (
            <>
              <RouteMap forceStop={2} className="mt-8 max-w-2xl" />

              <div className="mt-8 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                {['Кейс', 'Проверка', 'Переход'].map((label, index) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-primary ah-amber-glow"
                        style={{ width: `${isCaseReady ? 100 : 35 + index * 15}%` }}
                      />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <section className="mt-8 max-w-xl rounded-3xl border border-white/14 bg-[#0e1728]/80 p-5">
              <p className="text-[13px] leading-snug text-foreground/82">{recoveryMessage}</p>
              <Link
                href="/intake"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/88 transition-colors hover:border-white/25"
              >
                Вернуться к анкете
              </Link>
            </section>
          )}
        </div>

        {!recoveryMessage && (
          <div className="absolute inset-x-5 bottom-9 z-20 md:inset-x-auto md:left-10 md:right-10 md:bottom-10">
            <section
              data-testid="pre-result-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Предварительная проверка перед результатом"
              className="rounded-3xl border border-white/14 bg-[#0e1728]/92 p-4 shadow-[0_22px_56px_rgba(0,0,0,0.42)] backdrop-blur-md"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-sky-100/75">Проверка кейса</p>
              <p className="mt-1 text-[16px] font-semibold leading-snug text-white">
                {isCaseReady
                  ? 'Кейс подтверждён. Переводим в результат.'
                  : 'Проверяем caseId и доступность серверного результата.'}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
                <div className={`h-full rounded-full ${isCaseReady ? 'w-[100%] bg-primary' : 'w-[58%] bg-orange-300'}`} />
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}
